import { getRelatedSourcesBySlugs } from "@/lib/demo-data";

export function SourceLinks({
  sourceSlugs,
  label = "Sources"
}: {
  sourceSlugs: string[];
  label?: string;
}) {
  const sources = getRelatedSourcesBySlugs(sourceSlugs);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="source-links">
      <strong>{label}</strong>
      <ul className="source-link-list">
        {sources.map((source) => (
          <li key={source.slug}>
            <a href={source.url}>{source.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

