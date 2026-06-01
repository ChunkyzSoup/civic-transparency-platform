import { FreshnessNote } from "@/components/ui/freshness-note";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { factorWeights, methodologyRules, thresholds } from "@/lib/scoring/methodology";

export default function MethodologyPage() {
  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">Methodology</span>
        <h1>Explainable review signals with hard public constraints</h1>
        <p className="muted-text">
          The live MVP shows only contextual profile-level review signals when the evidence passes a
          strict public threshold. In this pass the app stays on the current Congress and current
          election cycle only.
        </p>
      </div>

      <FreshnessNote />

      <Card className="section-grid">
        <h2>Current live scope</h2>
        <p>
          The live build is intentionally limited to current House members, current Senators,
          current-Congress bills, current-Congress roll-call votes, and current-cycle direct
          committee-to-candidate contributions.
        </p>
      </Card>

      <Card className="section-grid">
        <h2>Public thresholds</h2>
        <div className="metric-strip">
          <Badge tone="outline">Below {thresholds.hiddenBelow}: insufficient evidence to score</Badge>
          <Badge tone="low">{thresholds.low}-{thresholds.medium - 1}: low signal strength</Badge>
          <Badge tone="medium">{thresholds.medium}+: medium signal strength</Badge>
        </div>
      </Card>

      <Card className="section-grid">
        <h2>Weighted factors</h2>
        <p className="muted-text">
          Only timing proximity and repeat support are active in the current live build. Other
          factors stay documented here but remain withheld until the linkage path is strong enough.
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

      <Card className="section-grid">
        <h2>Hard constraints</h2>
        <ul className="plain-list">
          {methodologyRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
