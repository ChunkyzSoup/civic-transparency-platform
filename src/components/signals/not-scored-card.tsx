import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SourceLinks } from "@/components/ui/source-links";
import {
  getBillBySlug,
  getOrganizationBySlug,
  getVoteBySlug,
  withCongressQuery
} from "@/lib/demo-data";
import type { Assessment } from "@/types/domain";

export function NotScoredCard({
  assessment,
  selectedCongress
}: {
  assessment: Assessment;
  selectedCongress?: number;
}) {
  const organization = assessment.organizationSlug
    ? getOrganizationBySlug(assessment.organizationSlug)
    : null;
  const bill = assessment.billSlug ? getBillBySlug(assessment.billSlug) : null;
  const vote = assessment.voteSlug ? getVoteBySlug(assessment.voteSlug) : null;
  const scopedCongress = selectedCongress ?? assessment.congress;

  return (
    <Card className="signal-card">
      <div className="signal-card-header">
        <Badge tone="outline">Insufficient evidence to score</Badge>
        <span className="score-pill">{assessment.linkageConfidence} linkage confidence</span>
      </div>

      <h3>{organization ? organization.name : "Pattern withheld from scoring"}</h3>
      <p>{assessment.publicReason}</p>

      <div className="signal-links">
        {bill ? (
          <Link href={withCongressQuery(`/bills/${bill.slug}`, scopedCongress)}>{bill.displayNumber}</Link>
        ) : null}
        {vote ? (
          <Link href={withCongressQuery(`/votes/${vote.id}`, scopedCongress)}>{vote.question}</Link>
        ) : null}
        {assessment.exclusionReasonCode ? (
          <Badge tone="outline">{assessment.exclusionReasonCode}</Badge>
        ) : null}
      </div>

      <SourceLinks sourceSlugs={assessment.sourceSlugs} />
    </Card>
  );
}
