import Link from "next/link";
import { FundingFlowPlaceholder } from "@/components/charts/funding-flow-placeholder";
import { TimelinePlaceholder } from "@/components/charts/timeline-placeholder";
import { PersonConnectionPanel } from "@/components/connections/connection-panels";
import { CongressSelector } from "@/components/filters/congress-selector";
import { LawmakerPhoto } from "@/components/lawmakers/lawmaker-photo";
import { NotScoredCard } from "@/components/signals/not-scored-card";
import { SignalCard } from "@/components/signals/signal-card";
import { FreshnessNote } from "@/components/ui/freshness-note";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SourceLinks } from "@/components/ui/source-links";
import {
  getCongressScope,
  getCongressScopes,
  getBillsForPerson,
  getCommitteesForPerson,
  getContributionTotalForPerson,
  getContributionsForPerson,
  getOrganizations,
  getPersonBySlug,
  getSignalsForPerson,
  getVotesForPerson,
  getWhyNotScoredForPerson,
  getOrganizationBySlug,
  resolveCongressSelection,
  withCongressQuery
} from "@/lib/demo-data";
import { getTopDonorConnectionsForPerson } from "@/lib/connection-analysis";
import { DISCLAIMER } from "@/lib/safety-copy";
import {
  formatChamber,
  formatCongress,
  formatCurrency,
  formatDate,
  formatParty
} from "@/lib/formatting";

type PersonPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<{ congress?: string }> | { congress?: string };
};

export default async function PersonPage({ params, searchParams }: PersonPageProps) {
  const { slug } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const selectedCongress = resolveCongressSelection(query.congress);
  const congressScope = getCongressScope(selectedCongress);
  const congressScopes = getCongressScopes();
  const person = getPersonBySlug(slug);

  if (!person) {
    return (
      <div className="page-shell page-section">
        <Card className="empty-state">No lawmaker matched this demo route.</Card>
      </div>
    );
  }

  const committees = getCommitteesForPerson(person, selectedCongress);
  const contributions = getContributionsForPerson(person.slug, selectedCongress);
  const votes = getVotesForPerson(person.slug, selectedCongress);
  const bills = getBillsForPerson(person.slug, selectedCongress);
  const signals = getSignalsForPerson(person.slug, selectedCongress);
  const whyNotScored = getWhyNotScoredForPerson(person.slug, selectedCongress);
  const donorConnections = getTopDonorConnectionsForPerson(person.slug, selectedCongress, 8);
  const organizationsBySlug = new Map(
    getOrganizations().map((organization) => [organization.slug, organization] as const)
  );
  const visibleContributions = contributions.slice(0, 10);
  const visibleVotes = votes.slice(0, 12);
  const visibleBills = bills.slice(0, 10);

  return (
    <div className="page-shell page-section section-grid">
      <div className="banner">
        <strong>Visible disclaimer</strong>
        <span>{DISCLAIMER}</span>
      </div>

      <div className="section-heading">
        <div className="profile-hero">
          <LawmakerPhoto person={person} size={120} className="profile-photo" />
          <div className="section-grid">
            <span className="kicker">Lawmaker profile</span>
            <h1>{person.displayName}</h1>
            <p className="muted-text">{person.officeLabel}</p>
            <div className="chips">
              <Badge tone="outline">{formatParty(person.party)}</Badge>
              <Badge tone="outline">{formatChamber(person.chamber)}</Badge>
              <Badge tone="outline">{person.state}</Badge>
              <Badge tone="outline">{congressScope.label || formatCongress(selectedCongress)}</Badge>
              {person.district ? <Badge tone="outline">District {person.district}</Badge> : null}
              {person.dataOrigin ? (
                <Badge tone="outline">{person.dataOrigin.toLowerCase()}</Badge>
              ) : null}
            </div>
            {person.photo?.sourceLabel ? (
              <p className="muted-text">
                Photo source: {person.photo.sourceLabel}
                {person.photo.status === "PLACEHOLDER"
                  ? " (placeholder used because a reliable official portrait URL was not confirmed)."
                  : "."}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <CongressSelector
        action={`/people/${person.slug}`}
        selectedCongress={selectedCongress}
        scopes={congressScopes}
        description="This profile stays within one Congress scope so live facts and review signals remain context-specific."
      />

      <FreshnessNote selectedCongress={selectedCongress} />
      <SourceLinks sourceSlugs={person.sourceSlugs} label="Profile sources" />

      <div className="summary-grid">
        <Card>
          <p className="muted-text">Verified committee-origin money</p>
          <p className="stat-value">{formatCurrency(getContributionTotalForPerson(person.slug, selectedCongress))}</p>
          <p>Direct registered-committee contributions within the current election cycle.</p>
        </Card>
        <Card>
          <p className="muted-text">Review signals shown</p>
          <p className="stat-value">{signals.length}</p>
          <p>Signals are shown only within this profile and only when the public rules are met.</p>
        </Card>
        <Card>
          <p className="muted-text">Why not scored</p>
          <p className="stat-value">{whyNotScored.length}</p>
          <p>Contexts withheld from scoring because the public evidence threshold was not met.</p>
        </Card>
        <Card>
          <p className="muted-text">Official roll-call votes</p>
          <p className="stat-value">{votes.length}</p>
          <p>Only official House and Senate vote records are used.</p>
        </Card>
      </div>

      <div className="grid-two">
        <FundingFlowPlaceholder
          person={person}
          contributions={contributions}
          organizationsBySlug={organizationsBySlug}
          selectedCongress={selectedCongress}
        />
        <TimelinePlaceholder contributions={contributions.slice(0, 12)} votes={votes.slice(0, 12)} />
      </div>

      <PersonConnectionPanel
        connections={donorConnections}
        selectedCongress={selectedCongress}
      />

      <section className="section-grid">
        <div className="section-heading">
          <span className="kicker">Section 1</span>
          <h2>Facts</h2>
          <p className="muted-text">
            These records are shown as sourced facts before any review signal is considered.
          </p>
        </div>

        <div className="grid-two">
          <Card className="section-grid">
            <h3>Donations</h3>
            <div className="table-list">
              {visibleContributions.length > 0 ? (
                visibleContributions.map((contribution) => {
                  const donor = getOrganizationBySlug(contribution.organizationSlug);
                  return (
                    <div key={contribution.id} className="table-row">
                      <div className="meta-row">
                        {donor ? (
                          <Link href={withCongressQuery(`/donors/${donor.slug}`, selectedCongress)}>
                            <strong>{donor.name}</strong>
                          </Link>
                        ) : (
                          <strong>{contribution.organizationSlug}</strong>
                        )}
                        <Badge tone="outline">{formatCurrency(contribution.amount)}</Badge>
                      </div>
                      <p className="muted-text">{formatDate(contribution.contributionDate)}</p>
                      <SourceLinks sourceSlugs={contribution.sourceSlugs} label="Item sources" />
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  No verified direct committee-to-candidate contributions are in scope for this profile.
                </div>
              )}
            </div>
            {contributions.length > visibleContributions.length ? (
              <p className="muted-text">
                Showing the 10 most recent contribution records out of {contributions.length}.
              </p>
            ) : null}
          </Card>

          <Card className="section-grid">
            <h3>Committees</h3>
            <div className="table-list">
              {committees.length > 0 ? (
                committees.map((committee) => (
                  <div key={committee.slug} className="table-row">
                    <strong>{committee.name}</strong>
                    <p className="muted-text">{committee.summary}</p>
                    <SourceLinks sourceSlugs={committee.sourceSlugs} label="Item sources" />
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  No committee assignment record is currently shown for this Congress slice.
                </div>
              )}
            </div>
          </Card>

          <Card className="section-grid">
            <h3>Votes</h3>
            <div className="table-list">
              {visibleVotes.length > 0 ? (
                visibleVotes.map((vote) => (
                  <div key={vote.id} className="table-row">
                    <strong>{vote.question}</strong>
                    <p>{vote.resultText}</p>
                    <p className="muted-text">{formatDate(vote.voteDate)}</p>
                    <SourceLinks sourceSlugs={vote.sourceSlugs} label="Item sources" />
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  {person.chamber === "HOUSE"
                    ? "No member-level House vote positions are shown right now because the official House vote detail source was not refreshable from this runtime."
                    : "No official roll-call vote is currently shown for this Congress slice."}
                </div>
              )}
            </div>
            {votes.length > visibleVotes.length ? (
              <p className="muted-text">Showing the 12 most recent official votes out of {votes.length}.</p>
            ) : null}
          </Card>

          <Card className="section-grid">
            <h3>Bills</h3>
            <div className="table-list">
              {visibleBills.length > 0 ? (
                visibleBills.map((bill) => (
                  <div key={bill.slug} className="table-row">
                    <strong>
                      {bill.displayNumber} {bill.title}
                    </strong>
                    <p className="muted-text">{bill.summary}</p>
                    <SourceLinks sourceSlugs={bill.sourceSlugs} label="Item sources" />
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  No related bill record is currently shown for this Congress slice.
                </div>
              )}
            </div>
            {bills.length > visibleBills.length ? (
              <p className="muted-text">Showing the most recent bill-linked records out of {bills.length}.</p>
            ) : null}
          </Card>
        </div>
      </section>

      <section className="section-grid">
        <div className="section-heading">
          <span className="kicker">Section 2</span>
          <h2>Review Signals</h2>
          <p className="muted-text">
            Signals appear only when the profile has a verified money record, a verified legislative
            action, before-vote timing, at least two independent factors, and high linkage confidence.
          </p>
        </div>
        {signals.length > 0 ? (
          signals.map((signal) => (
            <SignalCard key={signal.slug} signal={signal} selectedCongress={selectedCongress} />
          ))
        ) : (
          <Card className="empty-state">
            No review signals met the public threshold for this profile.
          </Card>
        )}
      </section>

      <section className="section-grid">
        <div className="section-heading">
          <span className="kicker">Section 3</span>
          <h2>Why Not Scored</h2>
          <p className="muted-text">
            The system shows withheld contexts explicitly so users can see when it chose not to infer
            a pattern.
          </p>
        </div>
        {whyNotScored.length > 0 ? (
          whyNotScored.map((assessment) => (
            <NotScoredCard
              key={assessment.slug}
              assessment={assessment}
              selectedCongress={selectedCongress}
            />
          ))
        ) : (
          <Card className="empty-state">
            There are no non-scored assessments for this profile in this Congress slice.
          </Card>
        )}
      </section>
    </div>
  );
}
