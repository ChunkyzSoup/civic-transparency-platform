import { getCongressScope, getMetadata, resolveCongressSelection } from "@/lib/demo-data";
import { formatCongress } from "@/lib/formatting";

export function FreshnessNote({ selectedCongress }: { selectedCongress?: number }) {
  const metadata = getMetadata();
  const resolvedCongress = resolveCongressSelection(selectedCongress);
  const scope = getCongressScope(resolvedCongress);

  return (
    <div className="freshness-note">
      <strong>Facts scope</strong>
      <span>
        Viewing {scope.label || formatCongress(resolvedCongress)}. Election cycle: {scope.electionCycle}.
      </span>
      <span>Data mode: {metadata.mode === "live" ? "live official facts" : "synthetic demo snapshot"}.</span>
      <span>Facts as of {metadata.factsAsOf}. Sources last checked {metadata.sourcesLastCheckedAt}.</span>
      {metadata.statusNote ? <span>{metadata.statusNote}</span> : null}
    </div>
  );
}
