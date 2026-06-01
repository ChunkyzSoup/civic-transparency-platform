import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import * as unzipper from "unzipper";
import type { Person } from "../../src/types/domain";
import {
  formatFecDistrict,
  getCurrentElectionCycle,
  normalizeNameParts,
  normalizePersonName
} from "../parsers/helpers";
import {
  combineFecSyncResult,
  parseFecCandidateLine,
  parseFecCommitteeLine,
  parseFecContributionLine
} from "../parsers/fec";
import type {
  FecCandidateRecord,
  FecCommitteeRecord,
  FecContributionRecord
} from "../parsers/source-records";
import { repoPath, writeJsonFile } from "../utils/io";
import { syncCurrentMembers } from "./sync-current-members";

function getCycleUrls(cycle: number) {
  const shortCycle = String(cycle).slice(-2);
  return {
    cycle,
    candidateUrl: `https://www.fec.gov/files/bulk-downloads/${cycle}/cn${shortCycle}.zip`,
    committeeUrl: `https://www.fec.gov/files/bulk-downloads/${cycle}/cm${shortCycle}.zip`,
    contributionUrl: `https://www.fec.gov/files/bulk-downloads/${cycle}/pas2${shortCycle}.zip`
  };
}

type PersonCandidateMatch = {
  personSlug: string;
  candidate: FecCandidateRecord;
};

async function streamZipLines(
  url: string,
  entryPattern: RegExp,
  onLine: (line: string) => void | Promise<void>
) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; civic-transparency-platform/0.1; +https://api.congress.gov)",
      Accept: "application/zip,application/octet-stream,*/*"
    }
  });

  if (!response.ok || !response.body) {
    throw new Error(`Fetch failed for ${url} with ${response.status}`);
  }

  const zipStream = Readable.fromWeb(response.body as never).pipe(
    unzipper.Parse({ forceStream: true })
  );

  for await (const entry of zipStream) {
    const fileName = String(entry.path ?? "");
    if (!entryPattern.test(fileName)) {
      entry.autodrain();
      continue;
    }

    const lineReader = createInterface({
      input: entry,
      crlfDelay: Infinity
    });

    for await (const line of lineReader) {
      const trimmed = line.trim();
      if (trimmed) {
        await onLine(trimmed);
      }
    }
  }
}

function candidateNameMatchesPerson(person: Person, candidateName: string) {
  const [lastPart, firstPart = ""] = candidateName.split(",", 2);
  const candidateParts = normalizeNameParts(firstPart, lastPart);
  const personParts = normalizeNameParts(person.firstName, person.lastName);
  return candidateParts.first === personParts.first && candidateParts.last === personParts.last;
}

function matchCandidateForPerson(
  person: Person,
  candidates: FecCandidateRecord[],
  cycle: number
) {
  const officeCode = person.chamber === "HOUSE" ? "H" : person.chamber === "SENATE" ? "S" : "";
  if (!officeCode) {
    return null;
  }

  const exactMatches = candidates.filter((candidate) => {
    if (candidate.electionYear !== cycle || candidate.office !== officeCode) {
      return false;
    }

    if (candidate.officeState !== person.state) {
      return false;
    }

    if (officeCode === "H" && formatFecDistrict(candidate.officeDistrict) !== formatFecDistrict(person.district)) {
      return false;
    }

    return candidateNameMatchesPerson(person, candidate.candidateName);
  });

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const incumbentMatches = exactMatches.filter(
    (candidate) => normalizePersonName(candidate.incumbentChallenger) === "i"
  );

  if (incumbentMatches.length === 1) {
    return incumbentMatches[0];
  }

  return null;
}

export function matchCurrentPeopleToFecCandidates(
  people: Person[],
  candidates: FecCandidateRecord[],
  cycle: number
) {
  return people
    .map<PersonCandidateMatch | null>((person) => {
      const candidate = matchCandidateForPerson(person, candidates, cycle);
      return candidate ? { personSlug: person.slug, candidate } : null;
    })
    .filter(Boolean) as PersonCandidateMatch[];
}

export async function syncFec(checkedAt = new Date().toISOString(), people?: Person[]) {
  const cycle = getCurrentElectionCycle(new Date(checkedAt));
  const { candidateUrl, committeeUrl, contributionUrl } = getCycleUrls(cycle);
  const currentPeople = people ?? (await syncCurrentMembers(checkedAt)).people;

  const candidates: FecCandidateRecord[] = [];
  await streamZipLines(candidateUrl, /^cn.*\.txt$/i, async (line) => {
    const record = parseFecCandidateLine(line);
    if (record) {
      candidates.push(record);
    }
  });

  const matchedCandidates = matchCurrentPeopleToFecCandidates(currentPeople, candidates, cycle);
  const candidateIds = new Set(matchedCandidates.map((match) => match.candidate.candidateId));
  const committeeIdsToKeep = new Set(
    matchedCandidates
      .map((match) => match.candidate.principalCommitteeId)
      .filter(Boolean) as string[]
  );

  const contributions: FecContributionRecord[] = [];
  await streamZipLines(contributionUrl, /^itpas2.*\.txt$/i, async (line) => {
    const record = parseFecContributionLine(line);
    if (!record || record.transactionType !== "24K") {
      return;
    }

    if (!record.recipientCandidateId || !candidateIds.has(record.recipientCandidateId)) {
      return;
    }

    contributions.push(record);
    committeeIdsToKeep.add(record.donorCommitteeId);
    if (record.recipientCommitteeId) {
      committeeIdsToKeep.add(record.recipientCommitteeId);
    }
  });

  const committees: FecCommitteeRecord[] = [];
  await streamZipLines(committeeUrl, /^cm.*\.txt$/i, async (line) => {
    const record = parseFecCommitteeLine(line);
    if (record && committeeIdsToKeep.has(record.committeeId)) {
      committees.push(record);
    }
  });

  const result = {
    checkedAt,
    cycle,
    matchedCandidateCount: matchedCandidates.length,
    matchedPersonSlugs: matchedCandidates.map((match) => match.personSlug),
    ...combineFecSyncResult(
      matchedCandidates.map((match) => match.candidate),
      committees,
      contributions,
      checkedAt,
      cycle
    )
  };

  await writeJsonFile(repoPath("data", "live", "raw", "fec.json"), result);
  return result;
}

async function main() {
  const result = await syncFec();
  console.log(
    `Synced ${result.candidates.length} matched FEC candidates and ${result.contributions.length} direct committee-to-candidate contributions for the current cycle.`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
