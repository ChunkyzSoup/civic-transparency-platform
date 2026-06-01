import Link from "next/link";
import { FreshnessNote } from "@/components/ui/freshness-note";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SourceLinks } from "@/components/ui/source-links";
import { getBillBySlug, getPersonBySlug, getVoteBySlug, withCongressQuery } from "@/lib/demo-data";
import { formatCongress, formatDate } from "@/lib/formatting";

type VotePageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function VotePage({ params }: VotePageProps) {
  const { id } = await Promise.resolve(params);
  const vote = getVoteBySlug(id);

  if (!vote) {
    return (
      <div className="page-shell page-section">
        <Card className="empty-state">No current-Congress vote matched this route.</Card>
      </div>
    );
  }

  const bill = getBillBySlug(vote.billSlug);
  const visiblePositions = vote.positions.slice(0, 50);

  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">Vote detail</span>
        <h1>{vote.question}</h1>
        <p className="muted-text">{vote.resultText}</p>
        <div className="chips">
          <Badge tone="outline">
            {vote.chamber === "HOUSE" ? "House" : "Senate"} roll call {vote.rollCallNumber}
          </Badge>
          <Badge tone="outline">{formatCongress(vote.congress)}</Badge>
          <Badge tone="outline">Session {vote.session}</Badge>
          <Badge tone="outline">{formatDate(vote.voteDate)}</Badge>
          {vote.dataOrigin ? <Badge tone="outline">{vote.dataOrigin.toLowerCase()}</Badge> : null}
          {bill ? (
            <Link href={withCongressQuery(`/bills/${bill.slug}`, vote.congress)}>
              <Badge tone="outline">{bill.displayNumber}</Badge>
            </Link>
          ) : null}
        </div>
      </div>

      <FreshnessNote selectedCongress={vote.congress} />
      <SourceLinks sourceSlugs={vote.sourceSlugs} label="Vote sources" />

      <Card className="section-grid">
        <h2>Recorded positions</h2>
        <div className="table-list">
          {visiblePositions.map((position) => {
            const person = getPersonBySlug(position.personSlug);
            return (
              <div key={`${vote.id}-${position.personSlug}`} className="table-row">
                <div className="meta-row">
                  {person ? (
                    <Link href={withCongressQuery(`/people/${person.slug}`, vote.congress)}>
                      {person.displayName}
                    </Link>
                  ) : null}
                  <Badge tone="outline">{position.choice}</Badge>
                </div>
                {person ? <p className="muted-text">{person.officeLabel}</p> : null}
                {person ? <SourceLinks sourceSlugs={person.sourceSlugs} label="Member sources" /> : null}
              </div>
            );
          })}
        </div>
        {vote.positions.length > visiblePositions.length ? (
          <p className="muted-text">
            Showing the first {visiblePositions.length} recorded positions out of {vote.positions.length}.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
