export type Chamber = "HOUSE" | "SENATE" | "JOINT";
export type Party = "DEMOCRATIC" | "REPUBLICAN" | "INDEPENDENT" | "OTHER";
export type DataOrigin = "LIVE" | "DEMO" | "PLACEHOLDER";
export type PhotoStatus = "OFFICIAL" | "PLACEHOLDER";
export type ContributionEligibility = "ELIGIBLE" | "NOT_ELIGIBLE" | "REVIEW_REQUIRED";
export type OrganizationType =
  | "CAMPAIGN_COMMITTEE"
  | "PAC"
  | "PARTY_COMMITTEE"
  | "TRADE_ASSOCIATION"
  | "NONPROFIT"
  | "CORPORATION"
  | "OTHER";
export type VoteChoice = "YEA" | "NAY" | "PRESENT" | "NOT_VOTING";
export type SignalSeverity = "LOW" | "MEDIUM";
export type SignalKind =
  | "TIMING_CORRELATION"
  | "COMMITTEE_ALIGNMENT"
  | "REPEAT_PATTERN"
  | "DOCUMENTED_TOPIC_ALIGNMENT";
export type AssessmentStatus =
  | "ELIGIBLE"
  | "INSUFFICIENT_EVIDENCE"
  | "EXCLUDED"
  | "MANUAL_REVIEW";
export type LinkageConfidence = "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type EvidenceKind = "DIRECT" | "DOCUMENTED_CLASSIFICATION" | "CONTEXTUAL";

export interface CongressScope {
  congress: number;
  label: string;
  electionCycle: number;
  sessions: number[];
  isDefault?: boolean;
}

export interface DatasetMetadata {
  mode: string;
  version: string;
  methodologyVersion: string;
  disclaimer: string;
  factsAsOf: string;
  sourcesLastCheckedAt: string;
  currentCongress: number;
  currentElectionCycle: number;
  congressScopes: CongressScope[];
  statusNote?: string;
}

export type DemoMetadata = DatasetMetadata;

export interface Industry {
  slug: string;
  name: string;
  description: string;
}

export interface Topic {
  slug: string;
  name: string;
  description: string;
}

export interface Committee {
  slug: string;
  name: string;
  chamber: Chamber;
  summary: string;
  committeeCode?: string | null;
  sourceSlugs: string[];
}

export interface CampaignCommitteeSeed {
  slug: string;
  name: string;
  fecCommitteeId?: string | null;
}

export interface CommitteeAssignment {
  committeeSlug: string;
  congress: number;
  roleLabel?: string;
  committeeCode?: string | null;
  sourceSlugs?: string[];
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isCurrent?: boolean;
  isTimeAware?: boolean;
}

export interface PhotoAsset {
  status: PhotoStatus;
  url: string | null;
  sourceUrl: string | null;
  sourceLabel: string;
  altText: string;
}

export interface Person {
  slug: string;
  displayName: string;
  firstName: string;
  lastName: string;
  party: Party;
  chamber: Chamber;
  state: string;
  district: string | null;
  officeLabel: string;
  summary: string;
  committees: string[];
  committeeAssignments?: CommitteeAssignment[];
  campaignCommittee: CampaignCommitteeSeed | null;
  sourceSlugs: string[];
  dataOrigin?: DataOrigin;
  bioguideId?: string | null;
  fecCandidateId?: string | null;
  officeAddress?: string | null;
  officePhone?: string | null;
  websiteUrl?: string | null;
  profileUrl?: string | null;
  currentTermStart?: string | null;
  photo?: PhotoAsset;
}

export interface IndustryAssignment {
  industrySlug: string;
  method: string;
  confidence: string;
  isDocumented: boolean;
}

export interface Organization {
  slug: string;
  name: string;
  organizationType: OrganizationType;
  connectedOrgName: string;
  summary: string;
  industryAssignments: IndustryAssignment[];
  sourceSlugs: string[];
  website?: string | null;
  fecCommitteeId?: string | null;
  dataOrigin?: DataOrigin;
}

export interface Bill {
  slug: string;
  congress: number;
  chamber: Chamber;
  billType: string;
  billNumber: number;
  displayNumber: string;
  title: string;
  summary: string;
  topics: string[];
  committees: string[];
  sourceSlugs: string[];
  officialUrl?: string | null;
  introducedAt?: string | null;
  latestActionAt?: string | null;
  statusText?: string | null;
  policyArea?: string | null;
  dataOrigin?: DataOrigin;
}

export interface VotePosition {
  personSlug: string;
  choice: VoteChoice;
  note?: string;
}

export interface Vote {
  id: string;
  slug: string;
  congress: number;
  session: number;
  chamber: Chamber;
  rollCallNumber: number;
  question: string;
  resultText: string;
  voteDate: string;
  billSlug: string | null;
  positions: VotePosition[];
  sourceSlugs: string[];
  officialUrl?: string | null;
  dataOrigin?: DataOrigin;
}

export interface Contribution {
  id: string;
  congress: number;
  organizationSlug: string;
  recipientPersonSlug: string;
  recipientCommitteeSlug: string | null;
  amount: number;
  contributionDate: string;
  cycle: number;
  contributionType: string;
  contributionEligibility?: ContributionEligibility;
  verified: boolean;
  sourceSlugs: string[];
  sourceRecordId?: string | null;
  memoText?: string | null;
  fecCandidateId?: string | null;
  fecCommitteeId?: string | null;
  dataOrigin?: DataOrigin;
}

export interface Assessment {
  slug: string;
  congress: number;
  status: AssessmentStatus;
  linkageConfidence: LinkageConfidence;
  manualReviewRequired: boolean;
  eligibleFactorCount: number;
  personSlug: string;
  organizationSlug: string | null;
  billSlug: string | null;
  voteSlug: string | null;
  contributionIds: string[];
  exclusionReasonCode?: string;
  publicReason: string;
  sourceSlugs: string[];
}

export interface SourceReference {
  slug: string;
  label: string;
  sourceSystem: string;
  url: string;
  recordScope: string;
  isDemo: boolean;
  lastCheckedAt?: string;
  note?: string;
}

export interface SignalFactor {
  factorKey: string;
  factorLabel: string;
  valueText: string;
  weight: number;
  points: number;
  evidenceKind: EvidenceKind;
  explanation: string;
}

export interface Signal {
  slug: string;
  assessmentSlug: string;
  congress: number;
  signalKind: SignalKind;
  severity: SignalSeverity;
  score: number;
  personSlug: string;
  organizationSlug: string;
  billSlug: string | null;
  voteSlug: string | null;
  title: string;
  plainLanguageSummary: string;
  explanation: string;
  limitations: string;
  confidenceLabel: string;
  factors: SignalFactor[];
  sourceSlugs: string[];
}

export interface AppDataset {
  metadata: DatasetMetadata;
  industries: Industry[];
  topics: Topic[];
  committees: Committee[];
  people: Person[];
  organizations: Organization[];
  bills: Bill[];
  votes: Vote[];
  contributions: Contribution[];
  assessments: Assessment[];
  sources: SourceReference[];
  signals: Signal[];
}

export type DemoDataset = AppDataset;

export interface SearchResult {
  kind: "person" | "organization" | "bill" | "vote";
  slug: string;
  label: string;
  description: string;
  href: string;
  congress?: number;
  imageUrl?: string | null;
  imageAlt?: string;
  dataOrigin?: DataOrigin;
}
