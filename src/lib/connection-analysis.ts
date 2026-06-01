import {
  getBillsForCongress,
  getCommitteesForPerson,
  getContributionsForOrganization,
  getContributionsForPerson,
  getOrganizationBySlug,
  getOrganizationIndustryNames,
  getPersonBySlug,
  getVotesForPerson
} from "@/lib/demo-data";
import type { Bill, Contribution, Organization, Person, VoteChoice } from "@/types/domain";

type CongressInput = number | string | null | undefined;

export type ConnectionEvidenceKind = "vote" | "committee" | "interest-clue";

export interface ConnectedBill {
  bill: Bill;
  score: number;
  evidenceKinds: ConnectionEvidenceKind[];
  reasons: string[];
  voteChoice?: VoteChoice;
  voteDate?: string;
}

export interface ContributionAggregate {
  count: number;
  netAmount: number;
  positiveAmount: number;
  refundAmount: number;
  firstContributionDate: string | null;
  lastContributionDate: string | null;
  contributions: Contribution[];
}

export interface PersonDonorConnection extends ContributionAggregate {
  organization: Organization | null;
  organizationSlug: string;
  industryNames: string[];
  connectedBills: ConnectedBill[];
}

export interface DonorRecipientConnection extends ContributionAggregate {
  person: Person | null;
  personSlug: string;
  connectedBills: ConnectedBill[];
}

const INTEREST_KEYWORDS: Array<{
  terms: string[];
  billTerms: string[];
  label: string;
}> = [
  {
    terms: ["medical", "health", "hospital", "physician", "nurse", "pharma", "biotech", "dental"],
    billTerms: ["health", "medicare", "medicaid", "drug", "hospital", "public health"],
    label: "donor name suggests a health-related interest"
  },
  {
    terms: ["energy", "electric", "utility", "oil", "gas", "coal", "solar", "wind", "pipeline"],
    billTerms: ["energy", "natural resources", "pipeline", "electric", "utility", "environment"],
    label: "donor name suggests an energy or utility interest"
  },
  {
    terms: ["bank", "credit", "finance", "financial", "insurance", "securities", "mortgage"],
    billTerms: ["finance", "financial", "bank", "credit", "insurance", "taxation", "housing"],
    label: "donor name suggests a financial-services interest"
  },
  {
    terms: ["farm", "agri", "crop", "dairy", "cattle", "corn", "soybean"],
    billTerms: ["agriculture", "farm", "food", "nutrition", "rural"],
    label: "donor name suggests an agriculture interest"
  },
  {
    terms: ["defense", "aerospace", "aircraft", "shipbuilding", "security"],
    billTerms: ["defense", "armed forces", "national security", "military", "veterans"],
    label: "donor name suggests a defense or security interest"
  },
  {
    terms: ["telecom", "broadband", "communications", "internet", "software", "technology"],
    billTerms: ["communications", "science", "technology", "broadband", "telecommunications"],
    label: "donor name suggests a communications or technology interest"
  },
  {
    terms: ["rail", "trucking", "airline", "transport", "road", "bridge", "builders"],
    billTerms: ["transportation", "infrastructure", "highway", "aviation", "rail"],
    label: "donor name suggests a transportation or infrastructure interest"
  },
  {
    terms: ["school", "education", "university", "college", "teacher"],
    billTerms: ["education", "students", "school", "higher education"],
    label: "donor name suggests an education interest"
  },
  {
    terms: ["union", "labor", "workers", "worker"],
    billTerms: ["labor", "employment", "workforce", "wages"],
    label: "donor name suggests a labor or workforce interest"
  },
  {
    terms: ["realtor", "housing", "home builders", "apartment"],
    billTerms: ["housing", "community development", "mortgage", "real estate"],
    label: "donor name suggests a housing or real-estate interest"
  }
];

function emptyAggregate(): ContributionAggregate {
  return {
    count: 0,
    netAmount: 0,
    positiveAmount: 0,
    refundAmount: 0,
    firstContributionDate: null,
    lastContributionDate: null,
    contributions: []
  };
}

function addContribution(aggregate: ContributionAggregate, contribution: Contribution) {
  aggregate.count += 1;
  aggregate.netAmount += contribution.amount;
  aggregate.positiveAmount += Math.max(contribution.amount, 0);
  aggregate.refundAmount += Math.abs(Math.min(contribution.amount, 0));
  aggregate.contributions.push(contribution);

  if (
    !aggregate.firstContributionDate ||
    contribution.contributionDate < aggregate.firstContributionDate
  ) {
    aggregate.firstContributionDate = contribution.contributionDate;
  }

  if (
    !aggregate.lastContributionDate ||
    contribution.contributionDate > aggregate.lastContributionDate
  ) {
    aggregate.lastContributionDate = contribution.contributionDate;
  }
}

function donorText(organization: Organization | null) {
  return [organization?.name, organization?.connectedOrgName, organization?.summary]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function billText(bill: Bill) {
  return [bill.title, bill.summary, bill.policyArea, bill.topics.join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findInterestClue(organization: Organization | null, bill: Bill) {
  const sourceText = donorText(organization);
  const targetText = billText(bill);

  if (!sourceText || !targetText) {
    return null;
  }

  return (
    INTEREST_KEYWORDS.find(
      (mapping) =>
        mapping.terms.some((term) => sourceText.includes(term)) &&
        mapping.billTerms.some((term) => targetText.includes(term))
    )?.label ?? null
  );
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function findLatestContributionBeforeVote(contributions: Contribution[], voteDate: string) {
  return contributions
    .filter((contribution) => contribution.amount > 0 && contribution.contributionDate <= voteDate)
    .sort((left, right) => right.contributionDate.localeCompare(left.contributionDate))[0];
}

function happenedAfterGivingWindow(bill: Bill, aggregate: ContributionAggregate) {
  const actionDate = bill.latestActionAt ?? bill.introducedAt;
  return !!actionDate && !!aggregate.firstContributionDate && actionDate >= aggregate.firstContributionDate;
}

function getConnectedBillsForPerson(
  person: Person,
  organization: Organization | null,
  congress: CongressInput,
  aggregate: ContributionAggregate,
  limit: number
): ConnectedBill[] {
  const memberCommittees = new Map(
    getCommitteesForPerson(person, congress).map((committee) => [committee.slug, committee.name] as const)
  );
  const votesByBill = new Map(
    getVotesForPerson(person.slug, congress)
      .filter((vote) => vote.billSlug)
      .map((vote) => {
        const position = vote.positions.find((item) => item.personSlug === person.slug);
        return [
          vote.billSlug!,
          {
            choice: position?.choice,
            date: vote.voteDate
          }
        ] as const;
      })
  );

  return getBillsForCongress(congress)
    .map<ConnectedBill | null>((bill) => {
      const reasons: string[] = [];
      const evidenceKinds: ConnectionEvidenceKind[] = [];
      let score = 0;
      const vote = votesByBill.get(bill.slug);
      const latestContributionBeforeVote = vote
        ? findLatestContributionBeforeVote(aggregate.contributions, vote.date)
        : null;
      const committeeNames = bill.committees
        .map((slug) => memberCommittees.get(slug))
        .filter(Boolean) as string[];
      const interestClue = findInterestClue(organization, bill);
      const hasActionInGivingWindow = happenedAfterGivingWindow(bill, aggregate);

      if (vote && latestContributionBeforeVote) {
        const dayGap = daysBetween(latestContributionBeforeVote.contributionDate, vote.date);
        score += dayGap <= 90 ? 65 : 50;
        evidenceKinds.push("vote");
        reasons.push(
          `recorded roll-call position: ${vote.choice ?? "shown in source"}; latest positive contribution was ${dayGap} days before the vote`
        );
      }

      if (committeeNames.length > 0) {
        score += hasActionInGivingWindow ? 40 : 28;
        evidenceKinds.push("committee");
        reasons.push(`bill referred to recipient committee: ${committeeNames.slice(0, 2).join(", ")}`);
      }

      if (interestClue) {
        score += 35;
        evidenceKinds.push("interest-clue");
        reasons.push(interestClue);
      }

      if (hasActionInGivingWindow && (committeeNames.length > 0 || interestClue)) {
        score += 5;
      }

      if (score === 0 || (!latestContributionBeforeVote && committeeNames.length === 0 && !interestClue)) {
        return null;
      }

      return {
        bill,
        score,
        evidenceKinds,
        reasons,
        voteChoice: vote?.choice,
        voteDate: vote?.date
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const scoreDelta = right!.score - left!.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (right!.bill.latestActionAt ?? "").localeCompare(left!.bill.latestActionAt ?? "");
    })
    .slice(0, limit) as ConnectedBill[];
}

export function getTopDonorConnectionsForPerson(
  personSlug: string,
  congress: CongressInput,
  limit = 8
): PersonDonorConnection[] {
  const person = getPersonBySlug(personSlug);
  if (!person) {
    return [];
  }

  const grouped = new Map<string, ContributionAggregate>();

  for (const contribution of getContributionsForPerson(personSlug, congress)) {
    const aggregate = grouped.get(contribution.organizationSlug) ?? emptyAggregate();
    addContribution(aggregate, contribution);
    grouped.set(contribution.organizationSlug, aggregate);
  }

  return [...grouped.entries()]
    .map<PersonDonorConnection>(([organizationSlug, aggregate]) => {
      const organization = getOrganizationBySlug(organizationSlug);
      return {
        ...aggregate,
        organizationSlug,
        organization,
        industryNames: organization ? getOrganizationIndustryNames(organization) : [],
        connectedBills: getConnectedBillsForPerson(person, organization, congress, aggregate, 4)
      };
    })
    .sort(
      (left, right) =>
        right.positiveAmount - left.positiveAmount ||
        (right.lastContributionDate ?? "").localeCompare(left.lastContributionDate ?? "")
    )
    .slice(0, limit);
}

export function getRecipientConnectionsForOrganization(
  organizationSlug: string,
  congress: CongressInput,
  limit = 10
): DonorRecipientConnection[] {
  const organization = getOrganizationBySlug(organizationSlug);
  const grouped = new Map<string, ContributionAggregate>();

  for (const contribution of getContributionsForOrganization(organizationSlug, congress)) {
    const aggregate = grouped.get(contribution.recipientPersonSlug) ?? emptyAggregate();
    addContribution(aggregate, contribution);
    grouped.set(contribution.recipientPersonSlug, aggregate);
  }

  return [...grouped.entries()]
    .map<DonorRecipientConnection>(([personSlug, aggregate]) => {
      const person = getPersonBySlug(personSlug);
      return {
        ...aggregate,
        personSlug,
        person,
        connectedBills: person ? getConnectedBillsForPerson(person, organization, congress, aggregate, 4) : []
      };
    })
    .sort(
      (left, right) =>
        right.positiveAmount - left.positiveAmount ||
        (right.lastContributionDate ?? "").localeCompare(left.lastContributionDate ?? "")
    )
    .slice(0, limit);
}
