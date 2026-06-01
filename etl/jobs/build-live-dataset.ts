import { existsSync } from "node:fs";
import type {
  AppDataset,
  Assessment,
  Bill,
  Committee,
  Contribution,
  Organization,
  Person,
  Signal,
  SourceReference,
  Topic,
  Vote
} from "../../src/types/domain";
import { DISCLAIMER, LIMITATION_COPY } from "../../src/lib/safety-copy";
import { methodologyVersion, thresholds } from "../../src/lib/scoring/methodology";
import { getCurrentCongress, getCurrentElectionCycle, slugify, toIsoDateFromMonthDayYear } from "../parsers/helpers";
import type { FecCandidateRecord, FecCommitteeRecord } from "../parsers/source-records";
import { readJsonFile, repoPath, writeJsonFile } from "../utils/io";
import { syncBills } from "./sync-bills";
import { syncCurrentMembers } from "./sync-current-members";
import { matchCurrentPeopleToFecCandidates, syncFec } from "./sync-fec";
import { syncVotes } from "./sync-votes";

type PersonFecMatch = {
  personSlug: string;
  candidate: FecCandidateRecord;
};

async function runWithRawFallback<T>(
  label: string,
  rawFileName: string,
  worker: () => Promise<T>
) {
  try {
    return {
      value: await worker(),
      usedFallback: false
    };
  } catch (error) {
    const rawPath = repoPath("data", "live", "raw", rawFileName);
    if (existsSync(rawPath)) {
      console.warn(
        `${label} refresh failed; using cached raw snapshot from ${rawFileName}. ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        value: await readJsonFile<T>(rawPath),
        usedFallback: true
      };
    }

    throw error;
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])];
}

function dedupeSources(sources: SourceReference[]) {
  const bySlug = new Map<string, SourceReference>();

  for (const source of sources) {
    const existing = bySlug.get(source.slug);
    if (!existing) {
      bySlug.set(source.slug, source);
      continue;
    }

    bySlug.set(source.slug, {
      ...existing,
      lastCheckedAt: source.lastCheckedAt ?? existing.lastCheckedAt,
      note: source.note ?? existing.note
    });
  }

  return [...bySlug.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function committeeSummary(committee: Committee) {
  if (committee.summary?.trim()) {
    return committee.summary;
  }

  return committee.chamber === "HOUSE"
    ? "Official House committee record."
    : "Official Senate committee record.";
}

function mergeCommittees(memberCommittees: Committee[], bills: Bill[]) {
  const byKey = new Map<string, Committee>();

  function upsert(committee: Committee) {
    const key = committee.committeeCode || committee.slug;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        ...committee,
        summary: committeeSummary(committee),
        sourceSlugs: uniqueStrings(committee.sourceSlugs)
      });
      return;
    }

    byKey.set(key, {
      ...existing,
      name: existing.name || committee.name,
      summary: existing.summary || committee.summary,
      sourceSlugs: uniqueStrings([...existing.sourceSlugs, ...committee.sourceSlugs])
    });
  }

  memberCommittees.forEach(upsert);

  for (const bill of bills) {
    for (const committeeSlug of bill.committees) {
      const existing = [...byKey.values()].find((committee) => committee.slug === committeeSlug);
      if (existing) {
        upsert(existing);
      }
    }
  }

  return [...byKey.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function buildTopics(bills: Bill[]) {
  const bySlug = new Map<string, Topic>();

  for (const bill of bills) {
    for (const topicSlug of bill.topics) {
      if (!topicSlug) {
        continue;
      }

      if (!bySlug.has(topicSlug)) {
        bySlug.set(topicSlug, {
          slug: topicSlug,
          name: bill.policyArea ?? topicSlug.replace(/-/g, " "),
          description: "Official bill policy area from current Congress bill status data."
        });
      }
    }
  }

  return [...bySlug.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function mapOrganizationType(committee: FecCommitteeRecord): Organization["organizationType"] {
  if (committee.candidateId || committee.designation === "P") {
    return "CAMPAIGN_COMMITTEE";
  }

  if (committee.partyAffiliation) {
    return "PARTY_COMMITTEE";
  }

  if (["B", "D", "U"].includes(committee.designation)) {
    return "PAC";
  }

  return "OTHER";
}

function buildOrganizationSummary(committee: FecCommitteeRecord) {
  const baseType = mapOrganizationType(committee);

  if (baseType === "PAC") {
    return "Registered committee or PAC shown from the official FEC committee master file.";
  }

  if (baseType === "PARTY_COMMITTEE") {
    return "Registered party committee shown from the official FEC committee master file.";
  }

  if (baseType === "CAMPAIGN_COMMITTEE") {
    return "Authorized or principal campaign committee shown from the official FEC committee master file.";
  }

  return "Registered committee shown from the official FEC committee master file.";
}

function buildPeople(
  people: Person[],
  committeesById: Map<string, FecCommitteeRecord>,
  candidateMatches: PersonFecMatch[]
) {
  const matchByPersonSlug = new Map(candidateMatches.map((match) => [match.personSlug, match] as const));

  return people.map<Person>((person) => {
    const match = matchByPersonSlug.get(person.slug);
    const campaignCommittee =
      match?.candidate.principalCommitteeId &&
      committeesById.get(match.candidate.principalCommitteeId)
        ? committeesById.get(match.candidate.principalCommitteeId)
        : null;

    return {
      ...person,
      fecCandidateId: match?.candidate.candidateId ?? null,
      campaignCommittee: campaignCommittee
        ? {
            slug: slugify(`${campaignCommittee.name}-${campaignCommittee.committeeId}`),
            name: campaignCommittee.name,
            fecCommitteeId: campaignCommittee.committeeId
          }
        : null,
      sourceSlugs: uniqueStrings([
        ...person.sourceSlugs,
        ...(match ? ["fec-candidate-master"] : []),
        ...(campaignCommittee ? ["fec-committee-master"] : [])
      ])
    };
  });
}

function buildOrganizations(committees: FecCommitteeRecord[]) {
  return committees
    .filter((committee) => !!committee.committeeId)
    .map<Organization>((committee) => ({
      slug: slugify(`${committee.name}-${committee.committeeId}`),
      name: committee.name,
      organizationType: mapOrganizationType(committee),
      connectedOrgName: committee.connectedOrganizationName || "",
      summary: buildOrganizationSummary(committee),
      industryAssignments: [],
      sourceSlugs: uniqueStrings(["fec-committee-master", "fec-committee-to-candidate"]),
      fecCommitteeId: committee.committeeId,
      dataOrigin: "LIVE"
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildBills(
  rawBills: Awaited<ReturnType<typeof syncBills>>["bills"],
  memberCommittees: Committee[]
) {
  const committeesByCode = new Map(
    memberCommittees
      .filter((committee) => committee.committeeCode)
      .map((committee) => [committee.committeeCode!, committee] as const)
  );
  const committeesBySlug = new Map(memberCommittees.map((committee) => [committee.slug, committee] as const));
  const derivedCommittees: Committee[] = [];

  const bills = rawBills.map<Bill>((bill) => {
    const committeeSlugs = bill.committees.map((committee) => {
      const byCode = committee.committeeCode ? committeesByCode.get(committee.committeeCode) : null;
      if (byCode) {
        return byCode.slug;
      }

      const derivedSlug = slugify(committee.name);
      if (!committeesBySlug.has(derivedSlug)) {
        const derivedCommittee: Committee = {
          slug: derivedSlug,
          name: committee.name,
          chamber: committee.chamber,
          summary: "Official bill-referral committee from current Congress bill status data.",
          committeeCode: committee.committeeCode,
          sourceSlugs: ["govinfo-bill-status"]
        };
        committeesBySlug.set(derivedSlug, derivedCommittee);
        if (committee.committeeCode) {
          committeesByCode.set(committee.committeeCode, derivedCommittee);
        }
        derivedCommittees.push(derivedCommittee);
      }

      return derivedSlug;
    });

    const topicSlug = bill.policyArea ? slugify(bill.policyArea) : null;

    return {
      slug: bill.slug,
      congress: bill.congress,
      chamber: bill.chamber,
      billType: bill.billType,
      billNumber: bill.billNumber,
      displayNumber: bill.displayNumber,
      title: bill.title,
      summary: bill.summary,
      topics: topicSlug ? [topicSlug] : [],
      committees: uniqueStrings(committeeSlugs),
      sourceSlugs: uniqueStrings(bill.sourceSlugs),
      officialUrl: bill.officialUrl,
      introducedAt: bill.introducedAt,
      latestActionAt: bill.latestActionAt,
      statusText: bill.statusText,
      policyArea: bill.policyArea,
      dataOrigin: "LIVE"
    };
  });

  return { bills, derivedCommittees };
}

function buildVotes(
  rawVotes: Awaited<ReturnType<typeof syncVotes>>["votes"],
  peopleBySlug: Map<string, Person>
) {
  return rawVotes
    .map<Vote | null>((vote) => {
      const positions = vote.positions.filter((position) => peopleBySlug.has(position.personSlug));
      if (positions.length === 0) {
        return null;
      }

      return {
        id: vote.id,
        slug: vote.slug,
        congress: vote.congress,
        session: vote.session,
        chamber: vote.chamber,
        rollCallNumber: vote.rollCallNumber,
        question: vote.question,
        resultText: vote.resultText,
        voteDate: vote.voteDate,
        billSlug: vote.billSlug,
        positions,
        sourceSlugs: uniqueStrings(vote.sourceSlugs),
        officialUrl: vote.officialUrl,
        dataOrigin: "LIVE"
      };
    })
    .filter(Boolean) as Vote[];
}

function buildContributions(
  currentCongress: number,
  currentCycle: number,
  rawContributions: Awaited<ReturnType<typeof syncFec>>["contributions"],
  organizationsByCommitteeId: Map<string, Organization>,
  peopleByCandidateId: Map<string, Person>,
  peopleBySlug: Map<string, Person>
) {
  const contributions: Contribution[] = [];

  for (const contribution of rawContributions) {
    const donor = organizationsByCommitteeId.get(contribution.donorCommitteeId);
    const person = contribution.recipientCandidateId
      ? peopleByCandidateId.get(contribution.recipientCandidateId)
      : null;

    if (!donor || !person) {
      continue;
    }

    const contributionDate = toIsoDateFromMonthDayYear(contribution.transactionDate);
    if (!contributionDate) {
      continue;
    }

    const campaignCommitteeSlug =
      contribution.recipientCommitteeId && peopleBySlug.get(person.slug)?.campaignCommittee?.fecCommitteeId === contribution.recipientCommitteeId
        ? peopleBySlug.get(person.slug)?.campaignCommittee?.slug ?? null
        : null;

    contributions.push({
      id:
        contribution.subId ||
        contribution.transactionId ||
        slugify(`${donor.slug}-${person.slug}-${contribution.transactionDate}-${contribution.amount}`),
      congress: currentCongress,
      organizationSlug: donor.slug,
      recipientPersonSlug: person.slug,
      recipientCommitteeSlug: campaignCommitteeSlug,
      amount: contribution.amount,
      contributionDate,
      cycle: currentCycle,
      contributionType: "CONTRIBUTION",
      contributionEligibility: "ELIGIBLE",
      verified: true,
      sourceSlugs: uniqueStrings(["fec-committee-to-candidate", "fec-committee-master", "fec-candidate-master"]),
      sourceRecordId: contribution.subId || contribution.transactionId,
      memoText: contribution.memoText,
      fecCandidateId: contribution.recipientCandidateId,
      fecCommitteeId: contribution.donorCommitteeId,
      dataOrigin: "LIVE"
    });
  }

  return contributions.sort((left, right) => left.contributionDate.localeCompare(right.contributionDate));
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function buildSignalsAndAssessments(
  people: Person[],
  organizationsBySlug: Map<string, Organization>,
  billsBySlug: Map<string, Bill>,
  votes: Vote[],
  contributions: Contribution[]
) {
  const assessments: Assessment[] = [];
  const signals: Signal[] = [];
  const votesByPerson = new Map<string, Vote[]>();
  const contributionsByPerson = new Map<string, Contribution[]>();

  for (const vote of votes) {
    for (const position of vote.positions) {
      const existing = votesByPerson.get(position.personSlug) ?? [];
      existing.push(vote);
      votesByPerson.set(position.personSlug, existing);
    }
  }

  for (const contribution of contributions) {
    const existing = contributionsByPerson.get(contribution.recipientPersonSlug) ?? [];
    existing.push(contribution);
    contributionsByPerson.set(contribution.recipientPersonSlug, existing);
  }

  for (const person of people) {
    const personContributions = (contributionsByPerson.get(person.slug) ?? []).sort((left, right) =>
      left.contributionDate.localeCompare(right.contributionDate)
    );
    const personVotes = (votesByPerson.get(person.slug) ?? [])
      .filter((vote) => vote.billSlug)
      .sort((left, right) => right.voteDate.localeCompare(left.voteDate));

    if (personContributions.length === 0) {
      assessments.push({
        slug: `${person.slug}-missing-money`,
        congress: personVotes[0]?.congress ?? getCurrentCongress(),
        status: "INSUFFICIENT_EVIDENCE",
        linkageConfidence: "NONE",
        manualReviewRequired: false,
        eligibleFactorCount: 0,
        personSlug: person.slug,
        organizationSlug: null,
        billSlug: null,
        voteSlug: null,
        contributionIds: [],
        exclusionReasonCode: "MISSING_VERIFIED_MONEY_RECORD",
        publicReason:
          "This profile has official member and vote data, but no verified current-cycle direct committee-to-candidate contribution record was resolved under the public MVP rules.",
        sourceSlugs: uniqueStrings(person.sourceSlugs)
      });
      continue;
    }

    if (personVotes.length === 0) {
      assessments.push({
        slug: `${person.slug}-missing-legislative-action`,
        congress: getCurrentCongress(),
        status: "INSUFFICIENT_EVIDENCE",
        linkageConfidence: "HIGH",
        manualReviewRequired: false,
        eligibleFactorCount: 0,
        personSlug: person.slug,
        organizationSlug: null,
        billSlug: null,
        voteSlug: null,
        contributionIds: personContributions.slice(0, 3).map((contribution) => contribution.id),
        exclusionReasonCode: "MISSING_VERIFIED_LEGISLATIVE_ACTION",
        publicReason:
          "This profile has verified direct committee-to-candidate contribution facts, but no linked bill roll-call vote is currently available in the public MVP signal pipeline.",
        sourceSlugs: uniqueStrings([
          ...person.sourceSlugs,
          ...personContributions.flatMap((contribution) => contribution.sourceSlugs)
        ])
      });
      continue;
    }

    const personSignalCandidates: Array<{
      voteDate: string;
      assessment: Assessment;
      signal: Signal;
    }> = [];

    for (const vote of personVotes) {
      const donorGroups = new Map<string, Contribution[]>();

      for (const contribution of personContributions) {
        if (contribution.contributionDate >= vote.voteDate) {
          continue;
        }

        const existing = donorGroups.get(contribution.organizationSlug) ?? [];
        existing.push(contribution);
        donorGroups.set(contribution.organizationSlug, existing);
      }

      for (const [organizationSlug, donorContributions] of donorGroups) {
        const mostRecentContribution = donorContributions[donorContributions.length - 1];
        const daysBeforeVote = daysBetween(mostRecentContribution.contributionDate, vote.voteDate);
        const repeatCount = donorContributions.length;

        const factors = [];
        let score = 0;

        if (daysBeforeVote >= 0 && daysBeforeVote <= 90) {
          const timingPoints = daysBeforeVote <= 30 ? 25 : 20;
          score += timingPoints;
          factors.push({
            factorKey: "timing_proximity",
            factorLabel: "Timing proximity",
            valueText: `${daysBeforeVote} day${daysBeforeVote === 1 ? "" : "s"} before the vote`,
            weight: 25,
            points: timingPoints,
            evidenceKind: "DIRECT" as const,
            explanation:
              "Only direct committee-to-candidate contributions that occurred before the vote are counted."
          });
        }

        if (repeatCount >= 2) {
          score += 15;
          factors.push({
            factorKey: "repeat_support",
            factorLabel: "Repeat support pattern",
            valueText: `${repeatCount} direct contribution records from the same committee or PAC before the vote`,
            weight: 15,
            points: 15,
            evidenceKind: "DIRECT" as const,
            explanation:
              "Repeated direct support from the same registered committee is counted as a second independent factor."
          });
        }

        if (factors.length >= 2 && score >= thresholds.low) {
          const organization = organizationsBySlug.get(organizationSlug);
          const bill = vote.billSlug ? billsBySlug.get(vote.billSlug) : null;
          const baseSlug = `${person.slug}-${organizationSlug}-${vote.slug}`;
          const assessmentSlug = `${baseSlug}-assessment`;
          const signalSlug = `${baseSlug}-signal`;
          const sourceSlugs = uniqueStrings([
            ...person.sourceSlugs,
            ...vote.sourceSlugs,
            ...(bill?.sourceSlugs ?? []),
            ...donorContributions.flatMap((contribution) => contribution.sourceSlugs),
            ...(organization?.sourceSlugs ?? [])
          ]);

          const assessment: Assessment = {
            slug: assessmentSlug,
            congress: vote.congress,
            status: "ELIGIBLE",
            linkageConfidence: "HIGH",
            manualReviewRequired: false,
            eligibleFactorCount: factors.length,
            personSlug: person.slug,
            organizationSlug,
            billSlug: vote.billSlug,
            voteSlug: vote.slug,
            contributionIds: donorContributions.slice(0, 10).map((contribution) => contribution.id),
            publicReason: `${organization?.name ?? "A registered committee"} made repeated direct contributions before an official roll-call vote tied to ${
              bill?.displayNumber ?? "a current-Congress bill"
            }. This is a timing and repeat-support pattern indicator only.`,
            sourceSlugs
          };

          const signal: Signal = {
            slug: signalSlug,
            assessmentSlug,
            congress: vote.congress,
            signalKind: "REPEAT_PATTERN",
            severity: "LOW",
            score,
            personSlug: person.slug,
            organizationSlug,
            billSlug: vote.billSlug,
            voteSlug: vote.slug,
            title: `Repeated direct committee support before ${bill?.displayNumber ?? "an official vote"}`,
            plainLanguageSummary: `${organization?.name ?? "A registered committee"} gave more than once before this official vote, and the most recent direct contribution arrived ${daysBeforeVote} day${
              daysBeforeVote === 1 ? "" : "s"
            } before the roll call.`,
            explanation:
              "This review signal is based on exact contribution records, an exact candidate match, and an official bill-linked roll-call vote. It highlights timing and repeat-support only.",
            limitations:
              `This signal does not show donor intent, bill-specific interest, causation, or wrongdoing. It excludes lobbying, downstream spending, individual donors, and any weak or fuzzy joins. ${LIMITATION_COPY}`,
            confidenceLabel: "High confidence on direct factual linkage; limited interpretive scope.",
            factors,
            sourceSlugs
          };

          personSignalCandidates.push({
            voteDate: vote.voteDate,
            assessment,
            signal
          });
        }
      }
    }

    const selectedSignals = personSignalCandidates
      .sort(
        (left, right) =>
          right.signal.score - left.signal.score || right.voteDate.localeCompare(left.voteDate)
      )
      .slice(0, 3);

    if (selectedSignals.length === 0) {
      assessments.push({
        slug: `${person.slug}-insufficient-factors`,
        congress: getCurrentCongress(),
        status: "INSUFFICIENT_EVIDENCE",
        linkageConfidence: "HIGH",
        manualReviewRequired: false,
        eligibleFactorCount: 1,
        personSlug: person.slug,
        organizationSlug: null,
        billSlug: null,
        voteSlug: null,
        contributionIds: personContributions.slice(0, 3).map((contribution) => contribution.id),
        exclusionReasonCode: "ONLY_ONE_FACTOR",
        publicReason:
          "This profile has live contribution facts and official roll-call votes, but the current public rules did not find enough before-vote and repeat-support evidence in the same context to show a review signal.",
        sourceSlugs: uniqueStrings([
          ...person.sourceSlugs,
          ...personContributions.flatMap((contribution) => contribution.sourceSlugs),
          ...personVotes.slice(0, 5).flatMap((vote) => vote.sourceSlugs)
        ])
      });
      continue;
    }

    assessments.push(...selectedSignals.map((item) => item.assessment));
    signals.push(...selectedSignals.map((item) => item.signal));
  }

  return { assessments, signals };
}

function buildFallbackAssessments(
  people: Person[],
  contributions: Contribution[],
  currentCongress: number
) {
  const contributionsByPerson = new Map<string, Contribution[]>();

  for (const contribution of contributions) {
    const existing = contributionsByPerson.get(contribution.recipientPersonSlug) ?? [];
    existing.push(contribution);
    contributionsByPerson.set(contribution.recipientPersonSlug, existing);
  }

  return people.map<Assessment>((person) => {
    const personContributions = contributionsByPerson.get(person.slug) ?? [];

    if (personContributions.length === 0) {
      return {
        slug: `${person.slug}-missing-money`,
        congress: currentCongress,
        status: "INSUFFICIENT_EVIDENCE",
        linkageConfidence: "NONE",
        manualReviewRequired: false,
        eligibleFactorCount: 0,
        personSlug: person.slug,
        organizationSlug: null,
        billSlug: null,
        voteSlug: null,
        contributionIds: [],
        exclusionReasonCode: "MISSING_VERIFIED_MONEY_RECORD",
        publicReason:
          "This profile has official member facts, but no verified current-cycle direct committee-to-candidate contribution record was resolved under the public MVP rules.",
        sourceSlugs: uniqueStrings(person.sourceSlugs)
      };
    }

    return {
      slug: `${person.slug}-signals-withheld`,
      congress: currentCongress,
      status: "INSUFFICIENT_EVIDENCE",
      linkageConfidence: "HIGH",
      manualReviewRequired: false,
      eligibleFactorCount: 0,
      personSlug: person.slug,
      organizationSlug: null,
      billSlug: null,
      voteSlug: null,
      contributionIds: personContributions.slice(0, 10).map((contribution) => contribution.id),
      publicReason:
        "Live facts are loaded for this profile, but public review signals are withheld because the current official vote or member snapshot relied on cached source data after direct refresh was blocked from this runtime.",
      sourceSlugs: uniqueStrings([
        ...person.sourceSlugs,
        ...personContributions.flatMap((contribution) => contribution.sourceSlugs)
      ])
    };
  });
}

export async function buildLiveDataset(checkedAt = new Date().toISOString()) {
  const currentCongress = getCurrentCongress(new Date(checkedAt));
  const currentElectionCycle = getCurrentElectionCycle(new Date(checkedAt));

  const membersResult = await runWithRawFallback("Member sync", "members.json", () =>
    syncCurrentMembers(checkedAt)
  );
  const billsResult = await runWithRawFallback("Bill sync", "bills.json", () => syncBills(checkedAt));
  const votesResult = await runWithRawFallback("Vote sync", "votes.json", () =>
    syncVotes(checkedAt, { members: membersResult.value, bills: billsResult.value })
  );
  const fecResult = await runWithRawFallback("FEC sync", "fec.json", () =>
    syncFec(checkedAt, membersResult.value.people)
  );
  const members = membersResult.value;
  const billsSync = billsResult.value;
  const votesSync = votesResult.value;
  const fecSync = fecResult.value;
  const fallbackNotes = [
    membersResult.usedFallback ? "member roster" : null,
    billsResult.usedFallback ? "bill status" : null,
    votesResult.usedFallback ? "vote data" : null,
    fecResult.usedFallback ? "FEC contributions" : null
  ].filter(Boolean);

  const candidateMatches = matchCurrentPeopleToFecCandidates(
    members.people,
    fecSync.candidates,
    currentElectionCycle
  );
  const committeesById = new Map(
    fecSync.committees.map((committee) => [committee.committeeId, committee] as const)
  );
  const people = buildPeople(members.people, committeesById, candidateMatches);
  const peopleBySlug = new Map(people.map((person) => [person.slug, person] as const));
  const peopleByCandidateId = new Map(
    people
      .filter((person) => person.fecCandidateId)
      .map((person) => [person.fecCandidateId!, person] as const)
  );

  const { bills, derivedCommittees } = buildBills(billsSync.bills, members.committees);
  const committees = mergeCommittees([...members.committees, ...derivedCommittees], bills);
  const topics = buildTopics(bills);
  const votes = buildVotes(votesSync.votes, peopleBySlug);
  const organizations = buildOrganizations(fecSync.committees);
  const organizationsByCommitteeId = new Map(
    organizations
      .filter((organization) => organization.fecCommitteeId)
      .map((organization) => [organization.fecCommitteeId!, organization] as const)
  );
  const organizationsBySlug = new Map(
    organizations.map((organization) => [organization.slug, organization] as const)
  );
  const contributions = buildContributions(
    currentCongress,
    currentElectionCycle,
    fecSync.contributions,
    organizationsByCommitteeId,
    peopleByCandidateId,
    peopleBySlug
  );
  const billsBySlug = new Map(bills.map((bill) => [bill.slug, bill] as const));
  const signalGenerationAllowed = !membersResult.usedFallback && !votesResult.usedFallback;
  const { assessments, signals } = signalGenerationAllowed
    ? buildSignalsAndAssessments(people, organizationsBySlug, billsBySlug, votes, contributions)
    : {
        assessments: buildFallbackAssessments(people, contributions, currentCongress),
        signals: []
      };

  const dataset: AppDataset = {
    metadata: {
      mode: "live",
      version: "0.4.0",
      methodologyVersion,
      disclaimer: DISCLAIMER,
      factsAsOf: checkedAt.slice(0, 10),
      sourcesLastCheckedAt: checkedAt,
      currentCongress,
      currentElectionCycle,
      congressScopes: [
        {
          congress: currentCongress,
          label: `${currentCongress}th Congress`,
          electionCycle: currentElectionCycle,
          sessions: uniqueStrings(votes.map((vote) => String(vote.session))).map(Number).sort(),
          isDefault: true
        }
      ],
      statusNote:
        fallbackNotes.length > 0
          ? `Live official facts are loaded, but this snapshot relied on cached official ${fallbackNotes.join(
              ", "
            )} because one or more source feeds blocked direct refresh from this runtime. Public review signals are withheld until the direct refresh path is stable again.`
          : "Live official member, bill, vote, and direct committee-to-candidate contribution facts are loaded. Signals stay conservative and may still show insufficient evidence to score when the public threshold is not met."
    },
    industries: [],
    topics,
    committees,
    people,
    organizations,
    bills,
    votes,
    contributions,
    assessments,
    sources: dedupeSources([
      ...members.sources,
      ...billsSync.sources,
      ...votesSync.sources,
      ...fecSync.sources
    ]),
    signals
  };

  await writeJsonFile(repoPath("data", "live", "current-congress", "live-seed.json"), dataset);
  return dataset;
}

async function main() {
  const dataset = await buildLiveDataset();
  console.log(
    `Built live dataset with ${dataset.people.length} lawmakers, ${dataset.bills.length} bills, ${dataset.votes.length} votes, and ${dataset.contributions.length} direct committee-to-candidate contributions.`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
