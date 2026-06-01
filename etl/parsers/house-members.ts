import { XMLParser } from "fast-xml-parser";
import type { Committee, Person, SourceReference } from "../../src/types/domain";
import { STATE_NAMES, asArray, cleanText, formatDistrict, slugify, toIsoDate, toParty } from "./helpers";
import type { MemberSyncResult } from "./source-records";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: false
});

type HouseCommitteeNode = {
  comcode?: string;
  ["committee-fullname"]?: string;
};

type HouseMemberNode = {
  ["member-info"]?: {
    bioguideID?: string;
    lastname?: string;
    firstname?: string;
    ["official-name"]?: string;
    party?: string;
    state?: {
      ["state-fullname"]?: string;
      ["postal-code"]?: string;
    };
    district?: string;
    phone?: string;
    ["office-building"]?: string;
    ["office-room"]?: string;
    ["office-zip"]?: string;
    ["office-zip-suffix"]?: string;
    ["sworn-date"]?: {
      date?: string;
    };
  };
  ["committee-assignments"]?: {
    committee?: Array<{
      comcode?: string;
      leadership?: string;
    }> | {
      comcode?: string;
      leadership?: string;
    };
  };
};

function formatHouseOfficeLabel(stateName: string, district: string | null) {
  if (!district || district === "At Large") {
    return `U.S. Representative for ${stateName}${district ? " At Large" : ""}`;
  }

  return `U.S. Representative for ${stateName}'s ${district} District`;
}

function formatHouseAddress(memberInfo: HouseMemberNode["member-info"]) {
  const building = cleanText(memberInfo?.["office-building"]);
  const room = cleanText(memberInfo?.["office-room"]);
  const zip = cleanText(memberInfo?.["office-zip"]);
  const zipSuffix = cleanText(memberInfo?.["office-zip-suffix"]);
  const officeLine = [building, room].filter(Boolean).join(" ");
  const zipLine = [zip, zipSuffix].filter(Boolean).join("-");
  const parts = [officeLine, zipLine].filter(Boolean);
  return parts.length > 0 ? `${parts.join(", ")}, Washington, DC` : null;
}

export function parseHouseMemberXml(xml: string, checkedAt: string, congress: number): MemberSyncResult {
  const parsed = parser.parse(xml) as {
    MemberData?: {
      committees?: {
        committee?: HouseCommitteeNode[] | HouseCommitteeNode;
      };
      members?: {
        member?: HouseMemberNode[] | HouseMemberNode;
      };
    };
  };

  const committeeLookup = new Map<string, Committee>();
  for (const committee of asArray(parsed.MemberData?.committees?.committee)) {
    const committeeCode = cleanText(committee.comcode).toUpperCase();
    const name = cleanText(committee["committee-fullname"]);

    if (!committeeCode || !name) {
      continue;
    }

    committeeLookup.set(committeeCode, {
      slug: slugify(name),
      name,
      chamber: "HOUSE",
      summary: "Current official House committee from the Clerk of the House member feed.",
      committeeCode,
      sourceSlugs: ["house-clerk-member-data"]
    });
  }

  const people: Person[] = [];
  for (const member of asArray(parsed.MemberData?.members?.member)) {
    const memberInfo = member["member-info"];
    const bioguideId = cleanText(memberInfo?.bioguideID);
    const stateCode = cleanText(memberInfo?.state?.["postal-code"]).toUpperCase();

    if (!bioguideId || !STATE_NAMES[stateCode]) {
      continue;
    }

    const district = formatDistrict(cleanText(memberInfo?.district));
    const stateName = cleanText(memberInfo?.state?.["state-fullname"]) || STATE_NAMES[stateCode];
    const displayName =
      cleanText(memberInfo?.["official-name"]) ||
      `${cleanText(memberInfo?.firstname)} ${cleanText(memberInfo?.lastname)}`.trim();
    const committeeAssignments = asArray(member["committee-assignments"]?.committee)
      .map((assignment) => {
        const committeeCode = cleanText(assignment.comcode).toUpperCase();
        const committee = committeeLookup.get(committeeCode);

        if (!committee) {
          return null;
        }

        return {
          committeeSlug: committee.slug,
          congress,
          roleLabel: cleanText(assignment.leadership) || "Member",
          committeeCode,
          sourceSlugs: ["house-clerk-member-data"],
          effectiveStartDate: toIsoDate(cleanText(memberInfo?.["sworn-date"]?.date)),
          effectiveEndDate: null,
          isCurrent: true,
          isTimeAware: false
        };
      })
      .filter(Boolean);

    people.push({
      slug: bioguideId.toLowerCase(),
      displayName,
      firstName: cleanText(memberInfo?.firstname),
      lastName: cleanText(memberInfo?.lastname),
      party: toParty(cleanText(memberInfo?.party)),
      chamber: "HOUSE",
      state: stateCode,
      district,
      officeLabel: formatHouseOfficeLabel(stateName, district),
      summary: "Current House member facts from the official Clerk of the House current roster feed.",
      committees: committeeAssignments.map((assignment) => assignment!.committeeSlug),
      committeeAssignments: committeeAssignments as NonNullable<Person["committeeAssignments"]>,
      campaignCommittee: null,
      sourceSlugs: ["house-clerk-member-data", "house-clerk-member-photos"],
      dataOrigin: "LIVE",
      bioguideId,
      officeAddress: formatHouseAddress(memberInfo),
      officePhone: cleanText(memberInfo?.phone) || null,
      websiteUrl: null,
      profileUrl: `https://clerk.house.gov/members/${bioguideId}`,
      currentTermStart: toIsoDate(cleanText(memberInfo?.["sworn-date"]?.date)),
      photo: {
        status: "OFFICIAL",
        url: `https://clerk.house.gov/images/members/${bioguideId}.jpg`,
        sourceUrl: `https://clerk.house.gov/members/${bioguideId}`,
        sourceLabel: "Official House Clerk member page",
        altText: `Portrait of ${displayName}`
      }
    });
  }

  const sources: SourceReference[] = [
    {
      slug: "house-clerk-member-data",
      label: "House Clerk member XML",
      sourceSystem: "House Clerk",
      url: "https://clerk.house.gov/xml/lists/MemberData.xml",
      recordScope: "Current House member roster and committee assignments",
      isDemo: false,
      lastCheckedAt: checkedAt
    },
    {
      slug: "house-clerk-member-photos",
      label: "House Clerk member portraits",
      sourceSystem: "House Clerk",
      url: "https://clerk.house.gov/members",
      recordScope: "Official House member profile pages and portrait paths",
      isDemo: false,
      lastCheckedAt: checkedAt,
      note: "House portraits use the Clerk of the House member page and image path for the matching bioguide ID."
    }
  ];

  return {
    people,
    committees: [...committeeLookup.values()],
    sources,
    senateLisToBioguide: {}
  };
}
