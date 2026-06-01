import type { Committee, Person, SourceReference } from "../../src/types/domain";

export interface MemberSyncResult {
  people: Person[];
  committees: Committee[];
  sources: SourceReference[];
  senateLisToBioguide: Record<string, string>;
}

export interface FecCandidateRecord {
  candidateId: string;
  candidateName: string;
  office: "H" | "S" | "P" | string;
  officeState: string;
  officeDistrict: string;
  incumbentChallenger: string;
  status: string;
  principalCommitteeId: string | null;
  electionYear: number;
}

export interface FecCommitteeRecord {
  committeeId: string;
  name: string;
  designation: string;
  committeeType: string;
  partyAffiliation: string;
  filingFrequency: string;
  organizationType: string;
  connectedOrganizationName: string;
  candidateId: string | null;
}

export interface FecContributionRecord {
  donorCommitteeId: string;
  amendmentIndicator: string;
  reportType: string;
  primaryGeneralIndicator: string;
  imageNumber: string;
  transactionType: string;
  entityType: string;
  recipientName: string;
  recipientState: string;
  transactionDate: string;
  amount: number;
  recipientCommitteeId: string | null;
  recipientCandidateId: string | null;
  transactionId: string | null;
  memoCode: string | null;
  memoText: string | null;
  subId: string;
}

export interface FecSyncResult {
  candidates: FecCandidateRecord[];
  committees: FecCommitteeRecord[];
  contributions: FecContributionRecord[];
  sources: SourceReference[];
}

export interface RawBillRecord {
  slug: string;
  congress: number;
  chamber: "HOUSE" | "SENATE";
  billType: string;
  billNumber: number;
  displayNumber: string;
  title: string;
  summary: string;
  statusText: string;
  introducedAt: string | null;
  latestActionAt: string | null;
  policyArea: string | null;
  officialUrl: string;
  committees: Array<{
    name: string;
    committeeCode: string | null;
    chamber: "HOUSE" | "SENATE";
    referredAt: string | null;
  }>;
  sourceSlugs: string[];
}

export interface BillSyncResult {
  bills: RawBillRecord[];
  sources: SourceReference[];
}

export interface RawVoteRecord {
  id: string;
  slug: string;
  congress: number;
  session: number;
  chamber: "HOUSE" | "SENATE";
  rollCallNumber: number;
  question: string;
  resultText: string;
  voteDate: string;
  billSlug: string | null;
  officialUrl: string;
  positions: Array<{
    personSlug: string;
    choice: "YEA" | "NAY" | "PRESENT" | "NOT_VOTING";
    note?: string;
  }>;
  sourceSlugs: string[];
}

export interface VoteSyncResult {
  votes: RawVoteRecord[];
  sources: SourceReference[];
}
