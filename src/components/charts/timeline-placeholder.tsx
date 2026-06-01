import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/formatting";
import type { Contribution, Vote } from "@/types/domain";

export function TimelinePlaceholder({
  contributions,
  votes
}: {
  contributions: Contribution[];
  votes: Vote[];
}) {
  const items = [
    ...contributions.map((contribution) => ({
      id: contribution.id,
      date: contribution.contributionDate,
      label: `${formatCurrency(contribution.amount)} contribution`
    })),
    ...votes.map((vote) => ({
      id: vote.id,
      date: vote.voteDate,
      label: `Roll call ${vote.rollCallNumber}`
    }))
  ].sort((left, right) => left.date.localeCompare(right.date));

  return (
    <Card className="visual-card">
      <div className="section-heading">
        <h3>Timeline</h3>
        <p className="muted-text">Simple chronological view for the MVP.</p>
      </div>
      <ul className="timeline-list">
        {items.map((item) => (
          <li key={item.id} className="timeline-item">
            <span className="timeline-date">{formatDate(item.date)}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

