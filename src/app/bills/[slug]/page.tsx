import Link from "next/link";
import { FreshnessNote } from "@/components/ui/freshness-note";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SourceLinks } from "@/components/ui/source-links";
import {
  getBillBySlug,
  getBillTopics,
  getCommitteeBySlug,
  getVotesForBill,
  withCongressQuery
} from "@/lib/demo-data";
import { formatChamber, formatCongress, formatDate } from "@/lib/formatting";

type BillPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function BillPage({ params }: BillPageProps) {
  const { slug } = await Promise.resolve(params);
  const bill = getBillBySlug(slug);

  if (!bill) {
    return (
      <div className="page-shell page-section">
        <Card className="empty-state">No current-Congress bill matched this route.</Card>
      </div>
    );
  }

  const topics = getBillTopics(bill);
  const committees = bill.committees
    .map((committeeSlug) => getCommitteeBySlug(committeeSlug))
    .filter(Boolean);
  const votes = getVotesForBill(bill.slug);

  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">Bill detail</span>
        <h1>
          {bill.displayNumber} {bill.title}
        </h1>
        <p className="muted-text">{bill.summary}</p>
        <div className="chips">
          <Badge tone="outline">{formatChamber(bill.chamber)}</Badge>
          <Badge tone="outline">{formatCongress(bill.congress)}</Badge>
          {bill.dataOrigin ? <Badge tone="outline">{bill.dataOrigin.toLowerCase()}</Badge> : null}
          {topics.map((topic) => (
            <Badge key={topic.slug} tone="outline">
              {topic.name}
            </Badge>
          ))}
        </div>
      </div>

      <FreshnessNote selectedCongress={bill.congress} />
      <SourceLinks sourceSlugs={bill.sourceSlugs} label="Bill sources" />

      <div className="grid-two">
        <Card className="section-grid">
          <h2>Referred committees</h2>
          <div className="table-list">
            {committees.map((committee) => (
              <div key={committee!.slug} className="table-row">
                <strong>{committee!.name}</strong>
                <p className="muted-text">{committee!.summary}</p>
                <SourceLinks sourceSlugs={committee!.sourceSlugs} label="Item sources" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="section-grid">
          <h2>Related votes</h2>
          <div className="table-list">
            {votes.map((vote) => (
              <div key={vote.id} className="table-row">
                <Link href={withCongressQuery(`/votes/${vote.id}`, bill.congress)}>{vote.question}</Link>
                <p>{vote.resultText}</p>
                <p className="muted-text">{formatDate(vote.voteDate)}</p>
                <SourceLinks sourceSlugs={vote.sourceSlugs} label="Item sources" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="section-grid">
        <h2>Public MVP note</h2>
        <p>
          Review signals are shown within lawmaker profiles only. This bill page stays focused on
          live factual records and source links.
        </p>
      </Card>
    </div>
  );
}
