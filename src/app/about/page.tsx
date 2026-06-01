import { Card } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">About</span>
        <h1>A transparency product designed to withhold weak claims</h1>
        <p className="muted-text">
          The product goal is to help ordinary users review public records carefully. It is not a
          corruption detector and it should not behave like one.
        </p>
      </div>

      <div className="grid-two">
        <Card className="section-grid">
          <h2>Design commitments</h2>
          <ul className="plain-list">
            <li>Facts first, interpretation second</li>
            <li>Profile-level context instead of rankings</li>
            <li>High-confidence linkage or no public signal</li>
            <li>Visible sources, freshness, and limitations</li>
          </ul>
        </Card>

        <Card className="section-grid">
          <h2>What the MVP excludes</h2>
          <ul className="plain-list">
            <li>Public red styling</li>
            <li>Individual donor analysis</li>
            <li>Lobbying and downstream spending claims</li>
            <li>Undocumented or fuzzy topic alignment</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

