import { extractHouseVoteUrls, parseHouseVoteXml } from "../parsers/votes";
import { getCongressYears } from "../parsers/helpers";
import { fetchText, mapWithConcurrency } from "../utils/io";
import { cleanText, formatBillDisplayNumber, normalizeBillType, slugify, toIsoDateTime, toVoteChoice } from "../parsers/helpers";
import type { RawVoteRecord } from "../parsers/source-records";

const CONGRESS_API_HOUSE_VOTE_URL = "https://api.congress.gov/v3/house-vote";
const DEFAULT_HOUSE_VOTE_DETAIL_LIMIT = 24;

type CongressApiHouseVoteListItem = {
  congress?: number;
  legislationNumber?: string;
  legislationType?: string;
  legislationUrl?: string;
  result?: string;
  rollCallNumber?: number;
  sessionNumber?: number;
  sourceDataURL?: string;
  startDate?: string;
  url?: string;
  voteType?: string;
};

type CongressApiHouseVoteListResponse = {
  houseRollCallVotes?: CongressApiHouseVoteListItem[];
  pagination?: {
    next?: string;
  };
};

type CongressApiHouseVoteMemberResponse = {
  houseRollCallVoteMemberVotes?: CongressApiHouseVoteListItem & {
    voteQuestion?: string;
    results?: Array<{
      bioguideID?: string;
      voteCast?: string;
    }>;
  };
};

function addCongressApiKey(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("format", "json");

  if (process.env.CONGRESS_API_KEY) {
    parsed.searchParams.set("api_key", process.env.CONGRESS_API_KEY);
  }

  return parsed.toString();
}

function houseVoteListUrl(congress: number, session: number, offset = 0) {
  const url = new URL(`${CONGRESS_API_HOUSE_VOTE_URL}/${congress}/${session}`);
  url.searchParams.set("limit", "250");
  url.searchParams.set("offset", String(offset));
  return addCongressApiKey(url.toString());
}

function houseVoteMembersUrl(congress: number, session: number, rollCallNumber: number) {
  const url = new URL(
    `${CONGRESS_API_HOUSE_VOTE_URL}/${congress}/${session}/${rollCallNumber}/members`
  );
  url.searchParams.set("limit", "500");
  return addCongressApiKey(url.toString());
}

async function fetchCongressApiHouseVoteList(congress: number, session: number) {
  const votes: CongressApiHouseVoteListItem[] = [];
  let nextUrl: string | null = houseVoteListUrl(congress, session);

  while (nextUrl) {
    const body = await fetchText(nextUrl);
    const parsed = JSON.parse(body) as CongressApiHouseVoteListResponse;
    votes.push(...(parsed.houseRollCallVotes ?? []));
    nextUrl = parsed.pagination?.next ? addCongressApiKey(parsed.pagination.next) : null;
  }

  return votes;
}

function getBillSlug(
  vote: CongressApiHouseVoteListItem,
  billSlugByDisplayNumber: Map<string, string>
) {
  const billType = normalizeBillType(cleanText(vote.legislationType));
  const billNumber = Number.parseInt(cleanText(vote.legislationNumber), 10);
  if (!billType || !Number.isFinite(billNumber)) {
    return null;
  }

  return billSlugByDisplayNumber.get(formatBillDisplayNumber(billType, billNumber)) ?? null;
}

async function fetchCongressApiHouseVote(
  vote: CongressApiHouseVoteListItem,
  billSlugByDisplayNumber: Map<string, string>
) {
  const congress = Number(vote.congress);
  const session = Number(vote.sessionNumber);
  const rollCallNumber = Number(vote.rollCallNumber);

  if (!Number.isFinite(congress) || !Number.isFinite(session) || !Number.isFinite(rollCallNumber)) {
    return null;
  }

  const sourceUrl = houseVoteMembersUrl(congress, session, rollCallNumber);
  const body = await fetchText(sourceUrl);
  const parsed = JSON.parse(body) as CongressApiHouseVoteMemberResponse;
  const detail = parsed.houseRollCallVoteMemberVotes;
  if (!detail) {
    return null;
  }

  const voteDate = toIsoDateTime(cleanText(detail.startDate ?? vote.startDate));
  if (!voteDate) {
    return null;
  }

  const id = slugify(`house-${congress}-${session}-${rollCallNumber}`);

  return {
    id,
    slug: id,
    congress,
    session,
    chamber: "HOUSE",
    rollCallNumber,
    question: cleanText(detail.voteQuestion) || cleanText(vote.voteType),
    resultText: cleanText(detail.result ?? vote.result),
    voteDate,
    billSlug: getBillSlug(detail, billSlugByDisplayNumber) ?? getBillSlug(vote, billSlugByDisplayNumber),
    officialUrl: cleanText(vote.legislationUrl) || `https://api.congress.gov/v3/house-vote/${congress}/${session}/${rollCallNumber}`,
    positions: (detail.results ?? [])
      .map((member) => {
        const bioguideId = cleanText(member.bioguideID);
        if (!bioguideId) {
          return null;
        }

        return {
          personSlug: bioguideId.toLowerCase(),
          choice: toVoteChoice(cleanText(member.voteCast))
        };
      })
      .filter(Boolean),
    sourceSlugs: ["congress-gov-house-votes"]
  } satisfies RawVoteRecord;
}

async function syncHouseVotesFromCongressApi(
  congress: number,
  billSlugByDisplayNumber: Map<string, string>
) {
  const detailLimit = Number.parseInt(
    process.env.CIVIC_HOUSE_VOTE_DETAIL_LIMIT ?? String(DEFAULT_HOUSE_VOTE_DETAIL_LIMIT),
    10
  );
  const voteSummaries = (
    await Promise.all([1, 2].map((session) => fetchCongressApiHouseVoteList(congress, session)))
  )
    .flat()
    .sort(
      (left, right) =>
        new Date(cleanText(right.startDate)).getTime() - new Date(cleanText(left.startDate)).getTime()
    )
    .slice(0, Number.isFinite(detailLimit) && detailLimit > 0 ? detailLimit : DEFAULT_HOUSE_VOTE_DETAIL_LIMIT);

  console.warn(
    `Fetching member positions for ${voteSummaries.length} recent House roll-call votes from the official Congress.gov API.`
  );

  return (
    await mapWithConcurrency(voteSummaries, 8, (vote) =>
      fetchCongressApiHouseVote(vote, billSlugByDisplayNumber)
    )
  ).filter(Boolean);
}

export async function syncHouseVotes(
  checkedAt: string,
  congress: number,
  billSlugByDisplayNumber: Map<string, string>
) {
  if (process.env.CONGRESS_API_KEY) {
    try {
      return await syncHouseVotesFromCongressApi(congress, billSlugByDisplayNumber);
    } catch (error) {
      console.warn(`Congress.gov House vote API refresh failed; falling back to House Clerk XML. ${error}`);
    }
  }

  const years = getCongressYears(congress);
  const voteUrls = (
    await mapWithConcurrency(years, 2, async (year) => {
      try {
        const indexHtml = await fetchText(`https://clerk.house.gov/evs/${year}/index.asp`);
        const archiveUrls = [
          `https://clerk.house.gov/evs/${year}/index.asp`,
          ...[...new Set(
            [...indexHtml.matchAll(/ROLL_(\d+)\.asp/gi)].map(
              (match) => `https://clerk.house.gov/evs/${year}/ROLL_${match[1]}.asp`
            )
          )]
        ];
        const pages = await mapWithConcurrency(archiveUrls, 4, async (archiveUrl) =>
          fetchText(archiveUrl)
        );
        return pages.flatMap((pageHtml) => extractHouseVoteUrls(pageHtml, year));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes(" with 404") || message.includes(" with 403")) {
          console.warn(
            `House vote detail pages were not accessible for ${year}; skipping House member-level roll-call positions for this run.`
          );
          return [];
        }

        throw error;
      }
    })
  ).flat();

  return (
    await mapWithConcurrency(voteUrls, 12, async (voteUrl) => {
      try {
        const xml = await fetchText(voteUrl);
        return parseHouseVoteXml(xml, voteUrl, billSlugByDisplayNumber);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes(" with 403") || message.includes(" with 404")) {
          console.warn(`House vote detail XML was not accessible; skipping ${voteUrl}.`);
          return null;
        }

        throw error;
      }
    })
  ).filter(Boolean);
}
