import { SourceLinks } from "@/components/ui/source-links";
import { getAssessmentBySlug, getBillBySlug, getVoteBySlug } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import type { Signal } from "@/types/domain";

export function WhyHighlightedDrawer({ signal }: { signal: Signal }) {
  const assessment = getAssessmentBySlug(signal.assessmentSlug);
  const bill = getBillBySlug(signal.billSlug);
  const vote = getVoteBySlug(signal.voteSlug);

  return (
    <details className="drawer">
      <summary className="drawer-summary">Why does this review signal appear?</summary>
      <div className="drawer-body">
        <p>{signal.plainLanguageSummary}</p>
        {assessment ? (
          <div className="drawer-limitations">
            <strong>Exact data used</strong>
            <p>{assessment.publicReason}</p>
            {assessment.contributionIds.length > 0 ? (
              <p className="muted-text">
                Contribution records: {assessment.contributionIds.join(", ")}
              </p>
            ) : null}
            {bill ? <p className="muted-text">Bill: {bill.displayNumber}</p> : null}
            {vote ? <p className="muted-text">Vote: {vote.question}</p> : null}
          </div>
        ) : null}
        <ul className="plain-list">
          {signal.factors.map((factor) => (
            <li key={factor.factorKey} className="drawer-factor">
              <div className="drawer-factor-header">
                <strong>{factor.factorLabel}</strong>
                <Badge tone="outline">
                  {factor.points}/{factor.weight}
                </Badge>
              </div>
              <p>{factor.valueText}</p>
              <p className="muted-text">{factor.explanation}</p>
            </li>
          ))}
        </ul>
        <div className="drawer-limitations">
          <strong>Limitations</strong>
          <p>{signal.limitations}</p>
        </div>
        <SourceLinks sourceSlugs={signal.sourceSlugs} />
      </div>
    </details>
  );
}
