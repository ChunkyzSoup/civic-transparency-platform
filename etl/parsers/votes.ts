import { XMLParser } from "fast-xml-parser";
import type { SourceReference } from "../../src/types/domain";
import { asArray, cleanText, formatBillDisplayNumber, normalizeBillType, slugify, toIsoDateTime, toVoteChoice } from "./helpers";
import type { RawVoteRecord, VoteSyncResult } from "./source-records";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: false
});

function extractBillReference(text: string) {
  const normalized = cleanText(text)
    .toUpperCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const patterns = [
    /^H R (\d+)$/,
    /^S (\d+)$/,
    /^H RES (\d+)$/,
    /^S RES (\d+)$/,
    /^H J RES (\d+)$/,
    /^S J RES (\d+)$/,
    /^H CON RES (\d+)$/,
    /^S CON RES (\d+)$/
  ];

  const types = ["HR", "S", "HRES", "SRES", "HJRES", "SJRES", "HCONRES", "SCONRES"];
  for (const [index, pattern] of patterns.entries()) {
    const match = normalized.match(pattern);
    if (match) {
      return formatBillDisplayNumber(types[index], Number.parseInt(match[1], 10));
    }
  }

  return null;
}

export function extractHouseVoteUrls(indexHtml: string, year: number) {
  const matches = [...indexHtml.matchAll(/rollnumber=(\d+)/gi)];
  const unique = [...new Set(matches.map((match) => Number.parseInt(match[1], 10)).filter(Number.isFinite))];
  return unique
    .sort((left, right) => left - right)
    .map((rollNumber) => `https://clerk.house.gov/evs/${year}/roll${String(rollNumber).padStart(3, "0")}.xml`);
}

export function extractSenateVoteUrls(menuHtml: string) {
  const matches = [...menuHtml.matchAll(/vote_(\d{3})_(\d)_(\d{5})\.(?:htm|xml)/gi)];
  return [
    ...new Set(
      matches.map(
        (match) =>
          `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${match[1]}${match[2]}/vote_${match[1]}_${match[2]}_${match[3]}.xml`
      )
    )
  ];
}

export function parseHouseVoteXml(
  xml: string,
  sourceUrl: string,
  billSlugByDisplayNumber: Map<string, string>
): RawVoteRecord | null {
  const parsed = parser.parse(xml) as {
    "rollcall-vote"?: {
      "vote-metadata"?: Record<string, unknown>;
      "vote-data"?: {
        "recorded-vote"?:
          | Array<{
              legislator?: {
                "name-id"?: string;
              };
              vote?: string;
            }>
          | {
              legislator?: {
                "name-id"?: string;
              };
              vote?: string;
            };
      };
    };
  };

  const metadata = parsed["rollcall-vote"]?.["vote-metadata"];
  if (!metadata) {
    return null;
  }

  const congress = Number.parseInt(cleanText(metadata.congress), 10);
  const rollCallNumber = Number.parseInt(cleanText(metadata["rollcall-num"]), 10);
  const voteDate = toIsoDateTime(
    `${cleanText(metadata["action-date"])} ${cleanText((metadata["action-time"] as Record<string, unknown> | undefined)?.["#text"] ?? metadata["action-time"])}`
  );

  if (!Number.isFinite(congress) || !Number.isFinite(rollCallNumber) || !voteDate) {
    return null;
  }

  const billDisplayNumber = extractBillReference(cleanText(metadata["legis-num"]));
  const billSlug = billDisplayNumber ? billSlugByDisplayNumber.get(billDisplayNumber) ?? null : null;
  const positions = asArray(parsed["rollcall-vote"]?.["vote-data"]?.["recorded-vote"])
    .map((item) => {
      const bioguideId = cleanText(item.legislator?.["name-id"]);
      if (!bioguideId) {
        return null;
      }

      return {
        personSlug: bioguideId.toLowerCase(),
        choice: toVoteChoice(cleanText(item.vote))
      };
    })
    .filter(Boolean) as RawVoteRecord["positions"];

  return {
    id: slugify(`house-${congress}-${rollCallNumber}`),
    slug: slugify(`house-${congress}-${rollCallNumber}`),
    congress,
    session: cleanText(metadata.session).startsWith("2") ? 2 : 1,
    chamber: "HOUSE",
    rollCallNumber,
    question: cleanText(metadata["vote-question"]),
    resultText: cleanText(metadata["vote-result"]),
    voteDate,
    billSlug,
    officialUrl: sourceUrl,
    positions,
    sourceSlugs: ["house-roll-call-votes"]
  };
}

export function parseSenateVoteXml(
  xml: string,
  sourceUrl: string,
  senateLisToBioguide: Record<string, string>,
  billSlugByDisplayNumber: Map<string, string>
): RawVoteRecord | null {
  const parsed = parser.parse(xml) as {
    roll_call_vote?: {
      congress?: string;
      session?: string;
      vote_number?: string;
      vote_date?: string;
      question?: string;
      vote_result_text?: string;
      vote_result?: string;
      vote_question_text?: string;
      document?: {
        document_type?: string;
        document_number?: string;
      };
      members?: {
        member?:
          | Array<{
              lis_member_id?: string;
              vote_cast?: string;
            }>
          | {
              lis_member_id?: string;
              vote_cast?: string;
            };
      };
    };
  };

  const vote = parsed.roll_call_vote;
  if (!vote) {
    return null;
  }

  const congress = Number.parseInt(cleanText(vote.congress), 10);
  const session = Number.parseInt(cleanText(vote.session), 10);
  const rollCallNumber = Number.parseInt(cleanText(vote.vote_number), 10);
  const voteDate = toIsoDateTime(cleanText(vote.vote_date));

  if (!Number.isFinite(congress) || !Number.isFinite(session) || !Number.isFinite(rollCallNumber) || !voteDate) {
    return null;
  }

  const documentType = normalizeBillType(cleanText(vote.document?.document_type));
  const documentNumber = Number.parseInt(cleanText(vote.document?.document_number), 10);
  const billDisplayNumber =
    documentType && Number.isFinite(documentNumber)
      ? formatBillDisplayNumber(documentType, documentNumber)
      : null;
  const billSlug = billDisplayNumber ? billSlugByDisplayNumber.get(billDisplayNumber) ?? null : null;
  const positions = asArray(vote.members?.member)
    .map((member) => {
      const lisMemberId = cleanText(member.lis_member_id);
      const bioguideId = senateLisToBioguide[lisMemberId];
      if (!bioguideId) {
        return null;
      }

      return {
        personSlug: bioguideId.toLowerCase(),
        choice: toVoteChoice(cleanText(member.vote_cast))
      };
    })
    .filter(Boolean) as RawVoteRecord["positions"];

  return {
    id: slugify(`senate-${congress}-${session}-${rollCallNumber}`),
    slug: slugify(`senate-${congress}-${session}-${rollCallNumber}`),
    congress,
    session,
    chamber: "SENATE",
    rollCallNumber,
    question: cleanText(vote.vote_question_text) || cleanText(vote.question),
    resultText: cleanText(vote.vote_result_text) || cleanText(vote.vote_result),
    voteDate,
    billSlug,
    officialUrl: sourceUrl,
    positions,
    sourceSlugs: ["senate-roll-call-votes"]
  };
}

export function buildVoteSources(checkedAt: string): SourceReference[] {
  return [
    {
      slug: "congress-gov-house-votes",
      label: "Congress.gov House roll call vote API",
      sourceSystem: "Congress.gov",
      url: "https://api.congress.gov/v3/house-vote",
      recordScope: "Current Congress House roll-call vote metadata and member vote positions",
      isDemo: false,
      lastCheckedAt: checkedAt
    },
    {
      slug: "house-roll-call-votes",
      label: "House roll call vote XML",
      sourceSystem: "House Clerk",
      url: "https://clerk.house.gov/evs/index.htm",
      recordScope: "Current Congress House roll-call vote XML files used when Congress.gov is unavailable",
      isDemo: false,
      lastCheckedAt: checkedAt
    },
    {
      slug: "senate-roll-call-votes",
      label: "Senate roll call vote XML",
      sourceSystem: "U.S. Senate",
      url: "https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm",
      recordScope: "Current Congress Senate roll-call vote menu pages and XML files",
      isDemo: false,
      lastCheckedAt: checkedAt
    }
  ];
}

export function combineVoteSyncResults(votes: RawVoteRecord[], checkedAt: string): VoteSyncResult {
  return {
    votes,
    sources: buildVoteSources(checkedAt)
  };
}
