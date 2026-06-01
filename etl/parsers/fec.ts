import type { SourceReference } from "../../src/types/domain";
import { cleanText } from "./helpers";
import type { FecCandidateRecord, FecCommitteeRecord, FecContributionRecord, FecSyncResult } from "./source-records";

export function parseFecCandidateLine(line: string): FecCandidateRecord | null {
  const parts = line.split("|");
  if (parts.length < 10) {
    return null;
  }

  return {
    candidateId: cleanText(parts[0]),
    candidateName: cleanText(parts[1]),
    office: cleanText(parts[5]),
    officeState: cleanText(parts[4]).toUpperCase(),
    officeDistrict: cleanText(parts[6]),
    incumbentChallenger: cleanText(parts[7]),
    status: cleanText(parts[8]),
    principalCommitteeId: cleanText(parts[9]) || null,
    electionYear: Number.parseInt(cleanText(parts[3]), 10)
  };
}

export function parseFecCommitteeLine(line: string): FecCommitteeRecord | null {
  const parts = line.split("|");
  if (parts.length < 15) {
    return null;
  }

  return {
    committeeId: cleanText(parts[0]),
    name: cleanText(parts[1]),
    designation: cleanText(parts[8]),
    committeeType: cleanText(parts[9]),
    partyAffiliation: cleanText(parts[10]),
    filingFrequency: cleanText(parts[11]),
    organizationType: cleanText(parts[12]),
    connectedOrganizationName: cleanText(parts[13]),
    candidateId: cleanText(parts[14]) || null
  };
}

export function parseFecContributionLine(line: string): FecContributionRecord | null {
  const parts = line.split("|");
  if (parts.length < 21) {
    return null;
  }

  const amount = Number.parseFloat(cleanText(parts[14]));
  if (!Number.isFinite(amount)) {
    return null;
  }

  return {
    donorCommitteeId: cleanText(parts[0]),
    amendmentIndicator: cleanText(parts[1]),
    reportType: cleanText(parts[2]),
    primaryGeneralIndicator: cleanText(parts[3]),
    imageNumber: cleanText(parts[4]),
    transactionType: cleanText(parts[5]),
    entityType: cleanText(parts[6]),
    recipientName: cleanText(parts[7]),
    recipientState: cleanText(parts[9]).toUpperCase(),
    transactionDate: cleanText(parts[13]),
    amount,
    recipientCommitteeId: cleanText(parts[15]) || null,
    recipientCandidateId: cleanText(parts[16]) || null,
    transactionId: cleanText(parts[17]) || null,
    memoCode: cleanText(parts[19]) || null,
    memoText: cleanText(parts[20]) || null,
    subId: cleanText(parts[21] ?? "")
  };
}

export function buildFecSources(checkedAt: string, cycle: number): SourceReference[] {
  const shortCycle = String(cycle).slice(-2);

  return [
    {
      slug: "fec-candidate-master",
      label: "FEC candidate master file",
      sourceSystem: "FEC",
      url: `https://www.fec.gov/files/bulk-downloads/${cycle}/cn${shortCycle}.zip`,
      recordScope: "Current election-cycle candidate master bulk download",
      isDemo: false,
      lastCheckedAt: checkedAt
    },
    {
      slug: "fec-committee-master",
      label: "FEC committee master file",
      sourceSystem: "FEC",
      url: `https://www.fec.gov/files/bulk-downloads/${cycle}/cm${shortCycle}.zip`,
      recordScope: "Current election-cycle committee master bulk download",
      isDemo: false,
      lastCheckedAt: checkedAt
    },
    {
      slug: "fec-committee-to-candidate",
      label: "FEC committee-to-candidate contributions bulk file",
      sourceSystem: "FEC",
      url: `https://www.fec.gov/files/bulk-downloads/${cycle}/pas2${shortCycle}.zip`,
      recordScope: "Current election-cycle committee disbursements to candidates and related entities",
      isDemo: false,
      lastCheckedAt: checkedAt,
      note: "The live facts layer keeps transaction type eligibility separate from raw ingestion so only conservative contribution types become public signal inputs."
    }
  ];
}

export function combineFecSyncResult(
  candidates: FecCandidateRecord[],
  committees: FecCommitteeRecord[],
  contributions: FecContributionRecord[],
  checkedAt: string,
  cycle: number
): FecSyncResult {
  return {
    candidates,
    committees,
    contributions,
    sources: buildFecSources(checkedAt, cycle)
  };
}
