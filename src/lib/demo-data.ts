import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import fallbackSeed from "../../data/demo/mvp-seed.json";
import type {
  AppDataset,
  Assessment,
  Bill,
  Committee,
  CongressScope,
  Contribution,
  Organization,
  Person,
  SearchResult,
  Signal,
  SourceReference,
  Topic,
  Vote
} from "@/types/domain";

type CongressInput = number | string | null | undefined;

const LIVE_DATASET_PATH = path.join(
  process.cwd(),
  "data",
  "live",
  "current-congress",
  "live-seed.json"
);

let cachedDataset: AppDataset | null = null;
let cachedDatasetLoadedAt = 0;
const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_MAX_QUERY_LENGTH = 80;
const SEARCH_MAX_RESULTS_PER_KIND = 10;
const SEARCH_MAX_RESULTS = 40;

function getCacheTtlMs() {
  const rawValue = Number.parseInt(process.env.CIVIC_DATA_CACHE_TTL_MS ?? "", 10);
  return Number.isFinite(rawValue) && rawValue >= 0 ? rawValue : 5 * 60 * 1000;
}

function loadDataset() {
  const cacheAge = Date.now() - cachedDatasetLoadedAt;
  if (cachedDataset && cacheAge < getCacheTtlMs()) {
    return cachedDataset;
  }

  if (existsSync(LIVE_DATASET_PATH)) {
    cachedDataset = JSON.parse(readFileSync(LIVE_DATASET_PATH, "utf8")) as AppDataset;
    cachedDatasetLoadedAt = Date.now();
    return cachedDataset;
  }

  cachedDataset = fallbackSeed as AppDataset;
  cachedDatasetLoadedAt = Date.now();
  return cachedDataset;
}

function getDataset() {
  return loadDataset();
}

function parseCongressValue(value: CongressInput) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function isLiveDatasetLoaded() {
  return getDataset().metadata.mode === "live";
}

export function getMetadata() {
  return getDataset().metadata;
}

export function getCongressScopes() {
  return [...getDataset().metadata.congressScopes].sort((left, right) => right.congress - left.congress);
}

export function getDefaultCongress() {
  const explicitDefault = getCongressScopes().find((scope) => scope.isDefault);
  return explicitDefault?.congress ?? getDataset().metadata.currentCongress;
}

export function resolveCongressSelection(value: CongressInput) {
  const parsed = parseCongressValue(value);
  if (parsed && getCongressScopes().some((scope) => scope.congress === parsed)) {
    return parsed;
  }

  return getDefaultCongress();
}

export function getCongressScope(value: CongressInput = undefined): CongressScope {
  const selectedCongress = resolveCongressSelection(value);
  return getCongressScopes().find((scope) => scope.congress === selectedCongress) ?? getCongressScopes()[0];
}

export function getPeople() {
  return getDataset().people;
}

export function getPeopleForCongress(value: CongressInput = undefined) {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().people.filter((person) => personHasCongressData(person.slug, selectedCongress));
}

export function getOrganizations() {
  return getDataset().organizations;
}

export function getBills() {
  return getDataset().bills;
}

export function getBillsForCongress(value: CongressInput = undefined) {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().bills.filter((bill) => bill.congress === selectedCongress);
}

export function getVotes() {
  return getDataset().votes;
}

export function getVotesForCongress(value: CongressInput = undefined) {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().votes.filter((vote) => vote.congress === selectedCongress);
}

export function getSignals() {
  return getDataset().signals;
}

export function getAssessments() {
  return getDataset().assessments;
}

export function getContributions() {
  return getDataset().contributions;
}

export function getSources() {
  return getDataset().sources;
}

export function getPersonBySlug(slug: string) {
  return getDataset().people.find((person) => person.slug === slug) ?? null;
}

export function getOrganizationBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return getDataset().organizations.find((organization) => organization.slug === slug) ?? null;
}

export function getBillBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return getDataset().bills.find((bill) => bill.slug === slug) ?? null;
}

export function getVoteBySlug(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return getDataset().votes.find((vote) => vote.slug === slug || vote.id === slug) ?? null;
}

export function getCommitteeBySlug(slug: string) {
  return getDataset().committees.find((committee) => committee.slug === slug) ?? null;
}

export function getTopicBySlug(slug: string) {
  return getDataset().topics.find((topic) => topic.slug === slug) ?? null;
}

export function getSourceBySlug(slug: string) {
  return getDataset().sources.find((source) => source.slug === slug) ?? null;
}

export function getAssessmentBySlug(slug: string) {
  return getDataset().assessments.find((assessment) => assessment.slug === slug) ?? null;
}

export function getCommitteesForPerson(person: Person, value: CongressInput = undefined): Committee[] {
  const selectedCongress = resolveCongressSelection(value);
  const scopedAssignments =
    person.committeeAssignments
      ?.filter((assignment) => assignment.congress === selectedCongress)
      .map((assignment) => assignment.committeeSlug) ?? [];

  const committeeSlugs = scopedAssignments.length > 0 ? scopedAssignments : person.committees;

  return [...new Set(committeeSlugs)]
    .map((slug) => getCommitteeBySlug(slug))
    .filter(Boolean) as Committee[];
}

export function getContributionsForPerson(
  personSlug: string,
  value: CongressInput = undefined
): Contribution[] {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().contributions
    .filter(
      (contribution) =>
        contribution.recipientPersonSlug === personSlug && contribution.congress === selectedCongress
    )
    .sort((left, right) => right.contributionDate.localeCompare(left.contributionDate));
}

export function getContributionsForOrganization(
  organizationSlug: string,
  value: CongressInput = undefined
): Contribution[] {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().contributions
    .filter(
      (contribution) =>
        contribution.organizationSlug === organizationSlug && contribution.congress === selectedCongress
    )
    .sort((left, right) => right.contributionDate.localeCompare(left.contributionDate));
}

export function getSignalsForPerson(personSlug: string, value: CongressInput = undefined): Signal[] {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().signals.filter(
    (signal) => signal.personSlug === personSlug && signal.congress === selectedCongress
  );
}

export function getSignalsForOrganization(
  organizationSlug: string,
  value: CongressInput = undefined
): Signal[] {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().signals.filter(
    (signal) => signal.organizationSlug === organizationSlug && signal.congress === selectedCongress
  );
}

export function getSignalsForBill(billSlug: string, value: CongressInput = undefined): Signal[] {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().signals.filter(
    (signal) => signal.billSlug === billSlug && signal.congress === selectedCongress
  );
}

export function getAssessmentsForPerson(
  personSlug: string,
  value: CongressInput = undefined
): Assessment[] {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().assessments.filter(
    (assessment) => assessment.personSlug === personSlug && assessment.congress === selectedCongress
  );
}

export function getEligibleAssessmentsForPerson(
  personSlug: string,
  value: CongressInput = undefined
): Assessment[] {
  return getAssessmentsForPerson(personSlug, value).filter((assessment) => assessment.status === "ELIGIBLE");
}

export function getWhyNotScoredForPerson(
  personSlug: string,
  value: CongressInput = undefined
): Assessment[] {
  return getAssessmentsForPerson(personSlug, value).filter(
    (assessment) => assessment.status !== "ELIGIBLE"
  );
}

export function getVotesForPerson(personSlug: string, value: CongressInput = undefined): Vote[] {
  const selectedCongress = resolveCongressSelection(value);
  return getDataset().votes
    .filter(
      (vote) =>
        vote.congress === selectedCongress &&
        vote.positions.some((position) => position.personSlug === personSlug)
    )
    .sort((left, right) => right.voteDate.localeCompare(left.voteDate));
}

export function getVotesForBill(billSlug: string) {
  return getDataset().votes
    .filter((vote) => vote.billSlug === billSlug)
    .sort((left, right) => right.voteDate.localeCompare(left.voteDate));
}

export function getBillTopics(bill: Bill): Topic[] {
  return bill.topics.map((slug) => getTopicBySlug(slug)).filter(Boolean) as Topic[];
}

export function getOrganizationIndustryNames(organization: Organization) {
  return organization.industryAssignments
    .map((assignment) =>
      getDataset().industries.find((industry) => industry.slug === assignment.industrySlug)
    )
    .filter(Boolean)
    .map((industry) => industry!.name);
}

export function getRelatedSourcesBySlugs(sourceSlugs: string[]): SourceReference[] {
  return sourceSlugs
    .map((slug) => getSourceBySlug(slug))
    .filter(Boolean) as SourceReference[];
}

export function getRelatedSources(signal: Signal) {
  return getRelatedSourcesBySlugs(signal.sourceSlugs);
}

export function getContributionTotalForPerson(personSlug: string, value: CongressInput = undefined) {
  return getContributionsForPerson(personSlug, value).reduce(
    (sum, contribution) => sum + contribution.amount,
    0
  );
}

export function getBillsForPerson(personSlug: string, value: CongressInput = undefined): Bill[] {
  const voteBillSlugs = new Set(getVotesForPerson(personSlug, value).map((vote) => vote.billSlug));
  return [...voteBillSlugs]
    .map((slug) => getBillBySlug(slug))
    .filter(Boolean) as Bill[];
}

export function personHasCongressData(personSlug: string, value: CongressInput = undefined) {
  const selectedCongress = resolveCongressSelection(value);
  return (
    getVotesForPerson(personSlug, selectedCongress).length > 0 ||
    getContributionsForPerson(personSlug, selectedCongress).length > 0 ||
    getAssessmentsForPerson(personSlug, selectedCongress).length > 0
  );
}

export function withCongressQuery(pathname: string, value: CongressInput = undefined) {
  const selectedCongress = resolveCongressSelection(value);
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}congress=${selectedCongress}`;
}

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_QUERY_LENGTH).toLowerCase();
}

function includesSearchTerm(fields: Array<string | null | undefined>, normalizedQuery: string) {
  return fields.join(" ").toLowerCase().includes(normalizedQuery);
}

export function searchEntities(query: string, value: CongressInput = undefined): SearchResult[] {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < SEARCH_MIN_QUERY_LENGTH) {
    return [];
  }

  const dataset = getDataset();
  const selectedCongress = resolveCongressSelection(value);
  const personSlugsWithCongressData = new Set<string>();
  const organizationSlugsWithContributions = new Set<string>();

  for (const contribution of dataset.contributions) {
    if (contribution.congress !== selectedCongress) {
      continue;
    }

    personSlugsWithCongressData.add(contribution.recipientPersonSlug);
    organizationSlugsWithContributions.add(contribution.organizationSlug);
  }

  for (const assessment of dataset.assessments) {
    if (assessment.congress === selectedCongress) {
      personSlugsWithCongressData.add(assessment.personSlug);
    }
  }

  for (const vote of dataset.votes) {
    if (vote.congress !== selectedCongress) {
      continue;
    }

    for (const position of vote.positions) {
      personSlugsWithCongressData.add(position.personSlug);
    }
  }

  const people = dataset.people
    .filter(
      (person) =>
        personSlugsWithCongressData.has(person.slug) &&
        includesSearchTerm([person.displayName, person.state, person.officeLabel], normalized)
    )
    .slice(0, SEARCH_MAX_RESULTS_PER_KIND)
    .map<SearchResult>((person) => ({
      kind: "person",
      slug: person.slug,
      label: person.displayName,
      description: person.officeLabel,
      href: withCongressQuery(`/people/${person.slug}`, selectedCongress),
      congress: selectedCongress,
      imageUrl: person.photo?.url ?? null,
      imageAlt: person.photo?.altText ?? `Portrait for ${person.displayName}`,
      dataOrigin: person.dataOrigin
    }));

  const organizations = dataset.organizations
    .filter(
      (organization) =>
        organizationSlugsWithContributions.has(organization.slug) &&
        includesSearchTerm([organization.name, organization.connectedOrgName], normalized)
    )
    .slice(0, SEARCH_MAX_RESULTS_PER_KIND)
    .map<SearchResult>((organization) => ({
      kind: "organization",
      slug: organization.slug,
      label: organization.name,
      description: organization.summary,
      href: withCongressQuery(`/donors/${organization.slug}`, selectedCongress),
      congress: selectedCongress,
      dataOrigin: organization.dataOrigin
    }));

  const bills = dataset.bills
    .filter(
      (bill) =>
        bill.congress === selectedCongress &&
        includesSearchTerm([bill.title, bill.displayNumber, bill.summary], normalized)
    )
    .slice(0, SEARCH_MAX_RESULTS_PER_KIND)
    .map<SearchResult>((bill) => ({
      kind: "bill",
      slug: bill.slug,
      label: `${bill.displayNumber} ${bill.title}`,
      description: bill.summary,
      href: withCongressQuery(`/bills/${bill.slug}`, bill.congress),
      congress: bill.congress,
      dataOrigin: bill.dataOrigin
    }));

  const votes = dataset.votes
    .filter(
      (vote) =>
        vote.congress === selectedCongress &&
        includesSearchTerm([vote.question, vote.resultText], normalized)
    )
    .slice(0, SEARCH_MAX_RESULTS_PER_KIND)
    .map<SearchResult>((vote) => ({
      kind: "vote",
      slug: vote.slug,
      label: `${vote.chamber === "HOUSE" ? "House" : "Senate"} Roll Call ${vote.rollCallNumber}`,
      description: vote.question,
      href: withCongressQuery(`/votes/${vote.id}`, vote.congress),
      congress: vote.congress,
      dataOrigin: vote.dataOrigin
    }));

  return [...people, ...organizations, ...bills, ...votes].slice(0, SEARCH_MAX_RESULTS);
}
