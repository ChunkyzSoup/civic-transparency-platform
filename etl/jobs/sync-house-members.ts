import { parseHouseMemberXml } from "../parsers/house-members";
import { cleanText, formatDistrict, getCurrentCongress, STATE_NAMES, toParty } from "../parsers/helpers";
import { fetchText } from "../utils/io";
import type { Committee, Person, SourceReference } from "../../src/types/domain";

const HOUSE_MEMBER_XML_URL = "https://clerk.house.gov/xml/lists/MemberData.xml";
const CONGRESS_API_MEMBER_URL = "https://api.congress.gov/v3/member";

type CongressApiMemberListItem = {
  bioguideId?: string;
  depiction?: {
    attribution?: string;
    imageUrl?: string;
  };
  district?: number | string | null;
  name?: string;
  partyName?: string;
  state?: string;
  terms?: {
    item?: Array<{
      chamber?: string;
      startYear?: number;
    }>;
  };
  updateDate?: string;
  url?: string;
};

type CongressApiMemberListResponse = {
  members?: CongressApiMemberListItem[];
  pagination?: {
    next?: string;
  };
};

function getStateCode(value: string | undefined) {
  const cleaned = cleanText(value);
  const direct = Object.entries(STATE_NAMES).find(([, name]) => name === cleaned);
  return direct?.[0] ?? cleaned;
}

function parseInvertedName(value: string | undefined) {
  const cleaned = cleanText(value);
  const [lastName = "", firstName = ""] = cleaned.split(",", 2).map((part) => part.trim());
  return {
    firstName,
    lastName,
    displayName: [firstName, lastName].filter(Boolean).join(" ") || cleaned
  };
}

function getLatestHouseTerm(member: CongressApiMemberListItem) {
  return [...(member.terms?.item ?? [])]
    .filter((term) => cleanText(term.chamber).toLowerCase().includes("house"))
    .sort((left, right) => (right.startYear ?? 0) - (left.startYear ?? 0))[0];
}

function congressApiUrl(offset = 0) {
  const url = new URL(CONGRESS_API_MEMBER_URL);
  url.searchParams.set("currentMember", "true");
  url.searchParams.set("limit", "250");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("format", "json");

  if (process.env.CONGRESS_API_KEY) {
    url.searchParams.set("api_key", process.env.CONGRESS_API_KEY);
  }

  return url.toString();
}

async function fetchCongressApiMembers() {
  const members: CongressApiMemberListItem[] = [];
  let nextUrl: string | null = congressApiUrl();

  while (nextUrl) {
    const body = await fetchText(nextUrl);
    const parsed = JSON.parse(body) as CongressApiMemberListResponse;
    members.push(...(parsed.members ?? []));
    nextUrl = parsed.pagination?.next ?? null;

    if (nextUrl && process.env.CONGRESS_API_KEY) {
      const url = new URL(nextUrl);
      url.searchParams.set("api_key", process.env.CONGRESS_API_KEY);
      nextUrl = url.toString();
    }
  }

  return members;
}

async function syncHouseMembersFromCongressApi(checkedAt: string, congress: number) {
  const rawMembers = await fetchCongressApiMembers();
  const people = rawMembers
    .filter((member) => !!member.bioguideId && !!getLatestHouseTerm(member))
    .map<Person>((member) => {
      const term = getLatestHouseTerm(member);
      const { firstName, lastName, displayName } = parseInvertedName(member.name);
      const stateCode = getStateCode(member.state);
      const district = member.district === undefined || member.district === null
        ? null
        : formatDistrict(String(member.district));
      const bioguideId = cleanText(member.bioguideId);

      return {
        slug: bioguideId.toLowerCase(),
        displayName,
        firstName,
        lastName,
        party: toParty(cleanText(member.partyName)),
        chamber: "HOUSE",
        state: stateCode,
        district,
        officeLabel: district
          ? `U.S. Representative for ${STATE_NAMES[stateCode] ?? stateCode}'s ${district} District`
          : `U.S. Representative for ${STATE_NAMES[stateCode] ?? stateCode}`,
        summary: "Current House member record from the official Congress.gov API.",
        committees: [],
        committeeAssignments: [],
        campaignCommittee: null,
        sourceSlugs: ["congress-gov-member-api"],
        dataOrigin: "LIVE",
        bioguideId,
        profileUrl: member.url ?? null,
        currentTermStart: term?.startYear ? `${term.startYear}-01-03` : null,
        photo: member.depiction?.imageUrl
          ? {
              status: "OFFICIAL",
              url: member.depiction.imageUrl,
              sourceUrl: member.url ?? "https://www.congress.gov/members",
              sourceLabel: member.depiction.attribution ?? "Congress.gov member image",
              altText: `Portrait of ${displayName}`
            }
          : {
              status: "PLACEHOLDER",
              url: "/images/placeholders/lawmaker-neutral.svg",
              sourceUrl: null,
              sourceLabel: "Neutral placeholder",
              altText: `Placeholder portrait for ${displayName}`
            }
      };
    });

  const sources: SourceReference[] = [
    {
      slug: "congress-gov-member-api",
      label: "Congress.gov member API",
      sourceSystem: "Congress.gov",
      url: "https://api.congress.gov/v3/member?currentMember=true&format=json",
      recordScope: "Current House member profiles used when the House Clerk XML feed is blocked",
      isDemo: false,
      lastCheckedAt: checkedAt
    }
  ];

  return {
    checkedAt,
    people,
    committees: [] as Committee[],
    sources
  };
}

export async function syncHouseMembers(checkedAt = new Date().toISOString()) {
  const congress = getCurrentCongress(new Date(checkedAt));

  try {
    const xml = await fetchText(HOUSE_MEMBER_XML_URL);
    return parseHouseMemberXml(xml, checkedAt, congress);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(" with 403")) {
      throw error;
    }

    console.warn(
      "House Clerk member XML was not accessible; using the official Congress.gov member API instead."
    );
    return syncHouseMembersFromCongressApi(checkedAt, congress);
  }
}
