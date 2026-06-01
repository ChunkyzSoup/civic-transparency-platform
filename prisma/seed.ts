import { PrismaClient } from "@prisma/client";
import seed from "../data/demo/mvp-seed.json";

const prisma = new PrismaClient();

function toLinkageConfidence(value: string) {
  if (value === "high") {
    return "HIGH" as const;
  }
  if (value === "medium") {
    return "MEDIUM" as const;
  }
  if (value === "low") {
    return "LOW" as const;
  }
  return "NONE" as const;
}

function firstSourceUrl(sourceSlugs: string[]) {
  const match = seed.sources.find((source) => source.slug === sourceSlugs[0]);
  return match?.url ?? null;
}

async function main() {
  await prisma.signalSourceLink.deleteMany();
  await prisma.signalFactor.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.signalAssessment.deleteMany();
  await prisma.committeeVoteLinkage.deleteMany();
  await prisma.contributionVoteLinkage.deleteMany();
  await prisma.votePosition.deleteMany();
  await prisma.voteEvent.deleteMany();
  await prisma.billCommitteeReferral.deleteMany();
  await prisma.billTopicAssignment.deleteMany();
  await prisma.billTopicIndustry.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.billTopic.deleteMany();
  await prisma.committeeMembership.deleteMany();
  await prisma.committee.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.campaignCommittee.deleteMany();
  await prisma.personOfficeTerm.deleteMany();
  await prisma.person.deleteMany();
  await prisma.organizationIndustryAssignment.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.industry.deleteMany();
  await prisma.sourceReference.deleteMany();
  await prisma.alias.deleteMany();
  await prisma.externalIdentifier.deleteMany();

  const industryIds = new Map<string, string>();
  for (const industry of seed.industries) {
    const created = await prisma.industry.create({
      data: {
        slug: industry.slug,
        name: industry.name,
        description: industry.description
      }
    });
    industryIds.set(industry.slug, created.id);
  }

  const topicIds = new Map<string, string>();
  for (const topic of seed.topics) {
    const created = await prisma.billTopic.create({
      data: {
        slug: topic.slug,
        name: topic.name,
        description: topic.description
      }
    });
    topicIds.set(topic.slug, created.id);
  }

  const sourceIds = new Map<string, string>();
  for (const source of seed.sources) {
    const created = await prisma.sourceReference.create({
      data: {
        slug: source.slug,
        label: source.label,
        sourceSystem: source.sourceSystem,
        url: source.url,
        recordScope: source.recordScope,
        isDemo: source.isDemo,
        lastCheckedAt: source.lastCheckedAt ? new Date(source.lastCheckedAt) : null,
        note: source.note ?? null
      }
    });
    sourceIds.set(source.slug, created.id);
  }

  const committeeIds = new Map<string, string>();
  for (const committee of seed.committees) {
    const created = await prisma.committee.create({
      data: {
        slug: committee.slug,
        name: committee.name,
        chamber: committee.chamber as any,
        summary: committee.summary
      }
    });
    committeeIds.set(committee.slug, created.id);
  }

  const personIds = new Map<string, string>();
  const campaignCommitteeIds = new Map<string, string>();
  for (const person of seed.people) {
    const createdPerson = await prisma.person.create({
      data: {
        slug: person.slug,
        displayName: person.displayName,
        firstName: person.firstName,
        lastName: person.lastName,
        party: person.party as any,
        chamber: person.chamber as any,
        state: person.state,
        district: person.district,
        officeLabel: person.officeLabel,
        summary: person.summary,
        officeTerms: {
          create: {
            title: person.officeLabel,
            chamber: person.chamber as any,
            state: person.state,
            district: person.district,
            startDate: new Date("2025-01-03T00:00:00.000Z"),
            isCurrent: true,
            sourceUrl: firstSourceUrl(person.sourceSlugs)
          }
        }
      }
    });

    personIds.set(person.slug, createdPerson.id);

    for (const committeeSlug of person.committees) {
      await prisma.committeeMembership.create({
        data: {
          personId: createdPerson.id,
          committeeId: committeeIds.get(committeeSlug)!,
          role: "MEMBER" as any,
          startDate: new Date("2025-01-03T00:00:00.000Z"),
          isCurrent: true,
          sourceUrl: firstSourceUrl(person.sourceSlugs)
        }
      });
    }

    const createdCommittee = await prisma.campaignCommittee.create({
      data: {
        personId: createdPerson.id,
        slug: person.campaignCommittee.slug,
        name: person.campaignCommittee.name,
        committeeType: "P",
        cycle: seed.metadata.currentElectionCycle,
        sourceUrl: firstSourceUrl(person.sourceSlugs)
      }
    });

    campaignCommitteeIds.set(person.campaignCommittee.slug, createdCommittee.id);
  }

  const organizationIds = new Map<string, string>();
  for (const organization of seed.organizations) {
    const created = await prisma.organization.create({
      data: {
        slug: organization.slug,
        name: organization.name,
        organizationType: organization.organizationType as any,
        connectedOrgName: organization.connectedOrgName,
        summary: organization.summary
      }
    });
    organizationIds.set(organization.slug, created.id);

    for (const assignment of organization.industryAssignments) {
      await prisma.organizationIndustryAssignment.create({
        data: {
          organizationId: created.id,
          industryId: industryIds.get(assignment.industrySlug)!,
          method: assignment.method as any,
          linkageConfidence: toLinkageConfidence(assignment.confidence) as any,
          isDocumented: assignment.isDocumented,
          documentationUrl: firstSourceUrl(organization.sourceSlugs)
        }
      });
    }
  }

  const topicIndustryPairs: Array<[string, string, string]> = [
    ["grid-modernization", "clean-energy", "high"],
    ["pipeline-permitting", "pipeline-infrastructure", "high"],
    ["bridge-safety", "transportation-contracting", "medium"]
  ];

  for (const [topicSlug, industrySlug, confidence] of topicIndustryPairs) {
    await prisma.billTopicIndustry.create({
      data: {
        billTopicId: topicIds.get(topicSlug)!,
        industryId: industryIds.get(industrySlug)!,
        linkageConfidence: toLinkageConfidence(confidence) as any,
        documentationUrl: seed.sources.find((source) => source.slug === "demo-methodology")?.url ?? null
      }
    });
  }

  const billIds = new Map<string, string>();
  for (const bill of seed.bills) {
    const created = await prisma.bill.create({
      data: {
        slug: bill.slug,
        congress: bill.congress,
        chamber: bill.chamber as any,
        billType: bill.billType,
        billNumber: bill.billNumber,
        displayNumber: bill.displayNumber,
        title: bill.title,
        summary: bill.summary,
        statusText: "Introduced",
        officialUrl: firstSourceUrl(bill.sourceSlugs)
      }
    });
    billIds.set(bill.slug, created.id);

    for (const topicSlug of bill.topics) {
      await prisma.billTopicAssignment.create({
        data: {
          billId: created.id,
          topicId: topicIds.get(topicSlug)!,
          isPrimary: true
        }
      });
    }

    for (const committeeSlug of bill.committees) {
      await prisma.billCommitteeReferral.create({
        data: {
          billId: created.id,
          committeeId: committeeIds.get(committeeSlug)!,
          referredAt: new Date("2026-01-01T00:00:00.000Z"),
          sourceUrl: firstSourceUrl(bill.sourceSlugs)
        }
      });
    }
  }

  const voteIds = new Map<string, string>();
  for (const vote of seed.votes) {
    const created = await prisma.voteEvent.create({
      data: {
        slug: vote.slug,
        congress: vote.congress,
        session: vote.session,
        chamber: vote.chamber as any,
        rollCallNumber: vote.rollCallNumber,
        question: vote.question,
        resultText: vote.resultText,
        voteDate: new Date(vote.voteDate),
        billId: billIds.get(vote.billSlug) ?? null,
        sourceUrl: firstSourceUrl(vote.sourceSlugs)
      }
    });
    voteIds.set(vote.slug, created.id);

    for (const position of vote.positions) {
      await prisma.votePosition.create({
        data: {
          voteEventId: created.id,
          personId: personIds.get(position.personSlug)!,
          choice: position.choice as any
        }
      });
    }
  }

  const contributionIds = new Map<string, string>();
  for (const contribution of seed.contributions) {
    const created = await prisma.contribution.create({
      data: {
        donorOrganizationId: organizationIds.get(contribution.organizationSlug)!,
        recipientPersonId: personIds.get(contribution.recipientPersonSlug)!,
        recipientCommitteeId: campaignCommitteeIds.get(contribution.recipientCommitteeSlug)!,
        amount: contribution.amount,
        contributionDate: new Date(contribution.contributionDate),
        cycle: contribution.cycle,
        contributionType: contribution.contributionType as any,
        contributionEligibility: "ELIGIBLE" as any,
        isVerified: contribution.verified,
        verifiedAt: contribution.verified ? new Date(contribution.contributionDate) : null,
        sourceRecordId: contribution.id,
        sourceUrl: firstSourceUrl(contribution.sourceSlugs)
      }
    });
    contributionIds.set(contribution.id, created.id);
  }

  const assessmentIds = new Map<string, string>();
  for (const assessment of seed.assessments) {
    const created = await prisma.signalAssessment.create({
      data: {
        slug: assessment.slug,
        status: assessment.status as any,
        linkageConfidence: assessment.linkageConfidence as any,
        manualReviewRequired: assessment.manualReviewRequired,
        exclusionReasonCode: assessment.exclusionReasonCode as any,
        eligibleFactorCount: assessment.eligibleFactorCount,
        methodologyVersion: seed.metadata.methodologyVersion,
        publicReason: assessment.publicReason,
        personId: personIds.get(assessment.personSlug)!,
        organizationId: assessment.organizationSlug
          ? organizationIds.get(assessment.organizationSlug) ?? null
          : null,
        billId: assessment.billSlug ? billIds.get(assessment.billSlug) ?? null : null,
        voteEventId: assessment.voteSlug ? voteIds.get(assessment.voteSlug) ?? null : null
      }
    });
    assessmentIds.set(assessment.slug, created.id);
  }

  for (const signal of seed.signals) {
    const created = await prisma.signal.create({
      data: {
        slug: signal.slug,
        assessmentId: assessmentIds.get(signal.assessmentSlug) ?? null,
        signalKind: signal.signalKind as any,
        severity: signal.severity as any,
        score: signal.score,
        title: signal.title,
        plainLanguageSummary: signal.plainLanguageSummary,
        explanation: signal.explanation,
        limitations: signal.limitations,
        confidenceLabel: signal.confidenceLabel,
        methodologyVersion: seed.metadata.methodologyVersion,
        personId: personIds.get(signal.personSlug) ?? null,
        organizationId: organizationIds.get(signal.organizationSlug) ?? null,
        billId: billIds.get(signal.billSlug) ?? null,
        voteEventId: voteIds.get(signal.voteSlug) ?? null
      }
    });

    for (const factor of signal.factors) {
      await prisma.signalFactor.create({
        data: {
          signalId: created.id,
          factorKey: factor.factorKey,
          factorLabel: factor.factorLabel,
          valueText: factor.valueText,
          weight: factor.weight,
          points: factor.points,
          evidenceKind: factor.evidenceKind as any,
          explanation: factor.explanation
        }
      });
    }

    for (const sourceSlug of signal.sourceSlugs) {
      await prisma.signalSourceLink.create({
        data: {
          signalId: created.id,
          sourceReferenceId: sourceIds.get(sourceSlug)!
        }
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
