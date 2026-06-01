import Link from "next/link";
import { CongressSelector } from "@/components/filters/congress-selector";
import { LawmakerCard } from "@/components/lawmakers/lawmaker-card";
import { FreshnessNote } from "@/components/ui/freshness-note";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SearchBar } from "@/components/search/search-bar";
import {
  getBillsForCongress,
  getCongressScope,
  getCongressScopes,
  getContributions,
  getMetadata,
  getPeopleForCongress,
  getVotesForCongress,
  isLiveDatasetLoaded,
  resolveCongressSelection,
  withCongressQuery
} from "@/lib/demo-data";
import { formatCongress } from "@/lib/formatting";
import { DEMO_BANNER, DISCLAIMER, LIVE_BANNER } from "@/lib/safety-copy";

const sampleQueries = ["Angela", "Energy", "H.R. 160", "Vote"];

type HomePageProps = {
  searchParams?: Promise<{ congress?: string }> | { congress?: string };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const selectedCongress = resolveCongressSelection(params.congress);
  const congressScope = getCongressScope(selectedCongress);
  const congressScopes = getCongressScopes();
  const people = getPeopleForCongress(selectedCongress);
  const bills = getBillsForCongress(selectedCongress);
  const votes = getVotesForCongress(selectedCongress);
  const contributions = getContributions().filter(
    (contribution) => contribution.congress === selectedCongress
  );
  const metadata = getMetadata();
  const liveMode = isLiveDatasetLoaded();
  const featuredPeople = people.slice(0, 8);

  return (
    <div className="page-shell">
      <section className="hero">
        <div className="banner">
          <strong>Visible disclaimer</strong>
          <span>{DISCLAIMER}</span>
          <span>{liveMode ? LIVE_BANNER : DEMO_BANNER}</span>
          {metadata.statusNote ? <span>{metadata.statusNote}</span> : null}
        </div>

        <div className="section-grid">
          <span className="kicker">Federal-first civic transparency MVP</span>
          <h1>Review official public-record patterns carefully, and prefer no signal over a weak one.</h1>
          <p className="hero-copy">
            The MVP stays narrow on purpose: current Congress only, current election cycle only, and
            official member, bill, vote, and direct committee-to-candidate contribution records.
            Review signals remain profile-level, explainable, and conservative.
          </p>
        </div>

        <CongressSelector
          action="/"
          selectedCongress={selectedCongress}
          scopes={congressScopes}
          submitLabel="Switch"
          description="The public MVP stays inside one Congress scope at a time so facts, linkages, and review signals do not get mixed across sessions."
        />

        <SearchBar congress={selectedCongress} />

        <div className="chips">
          {sampleQueries.map((query) => (
            <Link
              key={query}
              href={withCongressQuery(`/search?q=${encodeURIComponent(query)}`, selectedCongress)}
            >
              <Badge tone="outline">{query}</Badge>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-section section-grid">
        <FreshnessNote selectedCongress={selectedCongress} />
      </section>

      <section className="page-section summary-grid">
        <Card>
          <p className="muted-text">Current lawmakers</p>
          <p className="stat-value">{people.length}</p>
          <p>{congressScope.label || formatCongress(selectedCongress)} member profiles are available in this live slice.</p>
        </Card>
        <Card>
          <p className="muted-text">Current Congress bills</p>
          <p className="stat-value">{bills.length}</p>
          <p>Bill details come from current-Congress official status data.</p>
        </Card>
        <Card>
          <p className="muted-text">Roll-call votes</p>
          <p className="stat-value">{votes.length}</p>
          <p>Only the current loaded official roll-call vote snapshot is counted here.</p>
        </Card>
        <Card>
          <p className="muted-text">Direct committee support</p>
          <p className="stat-value">{contributions.length}</p>
          <p>Only direct registered-committee contribution records from the current cycle are counted here.</p>
        </Card>
      </section>

      <section className="page-section grid-two">
        <Card className="section-grid">
          <h2>Locked public rules</h2>
          <ul className="plain-list">
            <li>Use only verified committee and PAC to candidate contributions</li>
            <li>Use only official votes, bills, and committee assignments</li>
            <li>Show a review signal only with high-confidence linkage and at least two factors</li>
            <li>Show insufficient evidence to score when the requirements are not met</li>
          </ul>
        </Card>

        <Card className="section-grid">
          <h2>What the public MVP will not do</h2>
          <ul className="plain-list">
            <li>No politician rankings or cross-profile leaderboards</li>
            <li>No lobbying or downstream spending claims</li>
            <li>No individual donor signals</li>
            <li>No public red styling in the MVP</li>
          </ul>
        </Card>
      </section>

      <section className="page-section section-grid">
        <div className="section-heading">
          <span className="kicker">Browse lawmakers</span>
          <h2>Start with a current federal lawmaker profile</h2>
          <p className="muted-text">
            Profiles show live facts first, then any public review signals that survive the locked rules.
          </p>
        </div>
        <div className="results-list">
          {featuredPeople.map((person) => (
            <LawmakerCard key={person.slug} person={person} selectedCongress={selectedCongress} />
          ))}
        </div>
      </section>

      <section className="page-section grid-two">
        <Card>
          <h3>Section 1: Facts</h3>
          <p>Donations, committees, votes, and bills with source links and freshness context.</p>
        </Card>
        <Card>
          <h3>Section 2: Review signals</h3>
          <p>Only contextual profile-level signals with exact factors, weights, limitations, and sources.</p>
        </Card>
        <Card>
          <h3>Section 3: Why not scored</h3>
          <p>Explicit reasons when the system withheld a signal because the evidence was too weak.</p>
        </Card>
        <Card>
          <h3>Supporting pages</h3>
          <p>
            Read the <Link href="/methodology">methodology</Link>,{" "}
            <Link href="/signals">review signal guide</Link>, and{" "}
            <Link href="/sources">source registry</Link> before drawing conclusions.
          </p>
        </Card>
      </section>
    </div>
  );
}
