import { XMLParser } from "fast-xml-parser";
import type { Committee, Person, SourceReference } from "../../src/types/domain";
import { STATE_NAMES, asArray, cleanText, slugify, toParty } from "./helpers";
import type { MemberSyncResult } from "./source-records";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: false
});

type SenateRosterNode = {
  lis_member_id?: string;
  bioguideId?: string;
  party?: string;
  state?: string;
  office?: string;
  name?: {
    first?: string;
    last?: string;
    suffix?: string;
  };
  committees?: {
    committee?:
      | Array<{
          code?: string;
          ["#text"]?: string;
        }>
      | {
          code?: string;
          ["#text"]?: string;
        };
  };
};

type SenateContactNode = {
  bioguide_id?: string;
  address?: string;
  phone?: string;
  website?: string;
};

function formatDisplayName(roster: SenateRosterNode) {
  return [cleanText(roster.name?.first), cleanText(roster.name?.last), cleanText(roster.name?.suffix)]
    .filter(Boolean)
    .join(" ");
}

export function parseSenateXml(
  rosterXml: string,
  contactXml: string,
  checkedAt: string,
  congress: number
): MemberSyncResult {
  const parsedRoster = parser.parse(rosterXml) as {
    senators?: {
      senator?: SenateRosterNode[] | SenateRosterNode;
    };
  };

  const parsedContacts = parser.parse(contactXml) as {
    contact_information?: {
      member?: SenateContactNode[] | SenateContactNode;
    };
  };

  const contactsByBioguide = new Map<string, SenateContactNode>();
  for (const contact of asArray(parsedContacts.contact_information?.member)) {
    const bioguideId = cleanText(contact.bioguide_id);
    if (bioguideId) {
      contactsByBioguide.set(bioguideId, contact);
    }
  }

  const committeeMap = new Map<string, Committee>();
  const people: Person[] = [];
  const senateLisToBioguide: Record<string, string> = {};

  for (const senator of asArray(parsedRoster.senators?.senator)) {
    const bioguideId = cleanText(senator.bioguideId);
    const stateCode = cleanText(senator.state).toUpperCase();

    if (!bioguideId || !STATE_NAMES[stateCode]) {
      continue;
    }

    const lisMemberId = cleanText(senator.lis_member_id);
    if (lisMemberId) {
      senateLisToBioguide[lisMemberId] = bioguideId;
    }

    const contact = contactsByBioguide.get(bioguideId);
    const committeeAssignments = asArray(senator.committees?.committee)
      .map((committee) => {
        const name = cleanText(committee["#text"]);
        const committeeCode = cleanText(committee.code).toUpperCase() || null;

        if (!name) {
          return null;
        }

        const slug = slugify(name);
        if (!committeeMap.has(slug)) {
          committeeMap.set(slug, {
            slug,
            name,
            chamber: "SENATE",
            summary: "Current official Senate committee from Senate member XML.",
            committeeCode,
            sourceSlugs: ["senate-current-members"]
          });
        }

        return {
          committeeSlug: slug,
          congress,
          roleLabel: "Member",
          committeeCode,
          sourceSlugs: ["senate-current-members"],
          effectiveStartDate: null,
          effectiveEndDate: null,
          isCurrent: true,
          isTimeAware: false
        };
      })
      .filter(Boolean);

    const displayName = formatDisplayName(senator);
    people.push({
      slug: bioguideId.toLowerCase(),
      displayName,
      firstName: cleanText(senator.name?.first),
      lastName: cleanText(senator.name?.last),
      party: toParty(cleanText(senator.party)),
      chamber: "SENATE",
      state: stateCode,
      district: null,
      officeLabel: `U.S. Senator from ${STATE_NAMES[stateCode]}`,
      summary: "Current Senate member facts from official Senate roster and contact feeds.",
      committees: committeeAssignments.map((assignment) => assignment!.committeeSlug),
      committeeAssignments: committeeAssignments as NonNullable<Person["committeeAssignments"]>,
      campaignCommittee: null,
      sourceSlugs: [
        "senate-current-members",
        "senate-contact-directory",
        "neutral-member-photo-placeholder"
      ],
      dataOrigin: "LIVE",
      bioguideId,
      officeAddress: cleanText(contact?.address) || null,
      officePhone: cleanText(contact?.phone) || cleanText(senator.office) || null,
      websiteUrl: cleanText(contact?.website) || null,
      profileUrl: cleanText(contact?.website) || "https://www.senate.gov/senators/index.htm",
      currentTermStart: null,
      photo: {
        status: "PLACEHOLDER",
        url: null,
        sourceUrl: null,
        sourceLabel: "Neutral placeholder",
        altText: `Neutral placeholder portrait for ${displayName}`
      }
    });
  }

  const sources: SourceReference[] = [
    {
      slug: "senate-current-members",
      label: "Senate current member and committee XML",
      sourceSystem: "U.S. Senate",
      url: "https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml",
      recordScope: "Current senators and committee assignments",
      isDemo: false,
      lastCheckedAt: checkedAt
    },
    {
      slug: "senate-contact-directory",
      label: "Senate contact XML",
      sourceSystem: "U.S. Senate",
      url: "https://www.senate.gov/general/contact_information/senators_cfm.xml",
      recordScope: "Current senator office contact details and websites",
      isDemo: false,
      lastCheckedAt: checkedAt
    },
    {
      slug: "neutral-member-photo-placeholder",
      label: "Neutral member placeholder image",
      sourceSystem: "Local asset",
      url: "/images/placeholders/lawmaker-neutral.svg",
      recordScope: "Fallback image used when a reliable official portrait URL is not confirmed",
      isDemo: false,
      lastCheckedAt: checkedAt,
      note: "Senate portraits stay neutral in the MVP until a reliable official portrait source is confirmed."
    }
  ];

  return {
    people,
    committees: [...committeeMap.values()],
    sources,
    senateLisToBioguide
  };
}
