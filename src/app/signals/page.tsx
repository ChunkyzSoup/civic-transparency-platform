import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { factorWeights, methodologyRules, thresholds } from "@/lib/scoring/methodology";

export default function SignalsPage() {
  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">Review signal guide</span>
        <h1>Public signals are contextual, limited, and profile-only</h1>
        <p className="muted-text">
          The MVP does not publish rankings, comparison tables, or all-profile signal feeds. Review
          signals appear only within a single lawmaker profile and within the current Congress live
          slice.
        </p>
      </div>

      <Card className="section-grid">
        <h2>Public eligibility rules</h2>
        <ul className="plain-list">
          {methodologyRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Card>

      <Card className="section-grid">
        <h2>Signal strength legend</h2>
        <div className="metric-strip">
          <Badge tone="outline">Below {thresholds.hiddenBelow}: insufficient evidence to score</Badge>
          <Badge tone="low">{thresholds.low}-{thresholds.medium - 1}: low signal strength</Badge>
          <Badge tone="medium">{thresholds.medium}+: medium signal strength</Badge>
        </div>
        <p className="muted-text">
          The public MVP does not use red styling or high-strength public labels.
        </p>
      </Card>

      <Card className="section-grid">
        <h2>Factors available in the public MVP</h2>
        <p className="muted-text">
          The live build currently activates timing proximity and repeat support only. Other factors
          remain documented but withheld until their linkage path is strong enough.
        </p>
        <div className="table-list">
          {factorWeights.map((factor) => (
            <div key={factor.key} className="table-row">
              <div className="meta-row">
                <strong>{factor.label}</strong>
                <Badge tone="outline">Max {factor.maxPoints}</Badge>
              </div>
              <p className="muted-text">{factor.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
