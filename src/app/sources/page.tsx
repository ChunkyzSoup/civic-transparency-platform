import { FreshnessNote } from "@/components/ui/freshness-note";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMetadata, getSources, isLiveDatasetLoaded } from "@/lib/demo-data";

export default function SourcesPage() {
  const sources = getSources();
  const metadata = getMetadata();
  const liveMode = isLiveDatasetLoaded();

  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">Sources</span>
        <h1>Every live record should trace back to a public source</h1>
        <p className="muted-text">
          The public MVP keeps source URLs, freshness timestamps, and explicit placeholders when a
          reliable official path is not ready yet.
        </p>
      </div>

      <FreshnessNote />

      <Card className="section-grid">
        <h2>Current source registry</h2>
        <p className="muted-text">
          Data mode: {liveMode ? "live official facts" : "demo fallback"}.
          {metadata.statusNote ? ` ${metadata.statusNote}` : null}
        </p>
        <div className="results-list">
          {sources.map((source) => (
            <a key={source.slug} href={source.url} className="result-item">
              <div className="meta-row">
                <strong>{source.label}</strong>
                <Badge tone="outline">{source.sourceSystem}</Badge>
              </div>
              <p>{source.recordScope}</p>
              {source.lastCheckedAt ? (
                <p className="muted-text">Last checked: {source.lastCheckedAt}</p>
              ) : null}
              {source.note ? <p className="muted-text">{source.note}</p> : null}
            </a>
          ))}
        </div>
      </Card>

      <Card className="section-grid">
        <h2>What still stays limited</h2>
        <ul className="plain-list">
          <li>Senate photos use a neutral placeholder until a reliable official portrait path is confirmed.</li>
          <li>Lobbying, downstream spending, and individual donors remain out of scope for the MVP.</li>
          <li>Weak or fuzzy joins are still withheld and should resolve to insufficient evidence to score.</li>
        </ul>
      </Card>
    </div>
  );
}
