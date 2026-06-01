import Link from "next/link";
import { CongressSelector } from "@/components/filters/congress-selector";
import { LawmakerPhoto } from "@/components/lawmakers/lawmaker-photo";
import { SearchBar } from "@/components/search/search-bar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getCongressScope,
  getCongressScopes,
  getPersonBySlug,
  resolveCongressSelection,
  searchEntities
} from "@/lib/demo-data";
import { formatCongress } from "@/lib/formatting";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string; congress?: string }> | { q?: string; congress?: string };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const query = params.q?.trim() ?? "";
  const selectedCongress = resolveCongressSelection(params.congress);
  const congressScope = getCongressScope(selectedCongress);
  const congressScopes = getCongressScopes();
  const results = searchEntities(query, selectedCongress);

  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">Search</span>
        <h1>Find a lawmaker, donor committee, bill, or vote</h1>
        <p className="muted-text">
          Search results are filtered to {congressScope.label || formatCongress(selectedCongress)}.
          Public review signals stay inside individual lawmaker profiles only.
        </p>
      </div>

      <CongressSelector
        action="/search"
        selectedCongress={selectedCongress}
        scopes={congressScopes}
        hiddenFields={{ q: query || undefined }}
        description="Search stays within the selected Congress so bills, votes, and review signals do not get mixed across sessions."
      />

      <SearchBar defaultValue={query} congress={selectedCongress} />

      {query ? (
        <div className="page-header">
          <h2>
            Results for &ldquo;{query}&rdquo;
          </h2>
          <div className="chips">
            <Badge tone="outline">{results.length} matches</Badge>
            <Badge tone="outline">{congressScope.label || formatCongress(selectedCongress)}</Badge>
          </div>
        </div>
      ) : (
        <Card className="empty-state">
          Start with a lawmaker name, donor PAC, bill number, or topic phrase, then choose the
          Congress slice you want to review.
        </Card>
      )}

      {query && results.length === 0 ? (
        <Card className="empty-state">
          No live results matched this query. Try a lawmaker surname, a bill number like
          &ldquo;H.R. 160&rdquo;, or a committee name.
        </Card>
      ) : null}

      {results.length > 0 ? (
        <div className="results-list">
          {results.map((result) => (
            <Link key={`${result.kind}-${result.slug}`} href={result.href} className="result-item">
              <div className="search-result-layout">
                {result.kind === "person" ? (
                  <LawmakerPhoto person={getPersonBySlug(result.slug)!} size={64} />
                ) : null}
                <div className="section-grid">
                  <div className="meta-row">
                    <strong>{result.label}</strong>
                    <div className="chips">
                      <Badge tone="outline">{result.kind}</Badge>
                      {result.congress ? (
                        <Badge tone="outline">{formatCongress(result.congress)}</Badge>
                      ) : null}
                      {result.dataOrigin ? (
                        <Badge tone="outline">{result.dataOrigin.toLowerCase()}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <p className="muted-text">{result.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
