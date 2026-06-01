import Link from "next/link";
import { DonorConnectionPanel } from "@/components/connections/connection-panels";
import { CongressSelector } from "@/components/filters/congress-selector";
import { FreshnessNote } from "@/components/ui/freshness-note";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SourceLinks } from "@/components/ui/source-links";
import {
  getCongressScope,
  getCongressScopes,
  getContributionsForOrganization,
  getOrganizationBySlug,
  getOrganizationIndustryNames,
  getPersonBySlug,
  resolveCongressSelection,
  withCongressQuery
} from "@/lib/demo-data";
import { getRecipientConnectionsForOrganization } from "@/lib/connection-analysis";
import { formatCongress, formatCurrency, formatDate } from "@/lib/formatting";

type DonorPageProps = {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<{ congress?: string }> | { congress?: string };
};

export default async function DonorPage({ params, searchParams }: DonorPageProps) {
  const { slug } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const selectedCongress = resolveCongressSelection(query.congress);
  const congressScope = getCongressScope(selectedCongress);
  const congressScopes = getCongressScopes();
  const donor = getOrganizationBySlug(slug);

  if (!donor) {
    return (
      <div className="page-shell page-section">
        <Card className="empty-state">No donor committee matched this route.</Card>
      </div>
    );
  }

  const contributions = getContributionsForOrganization(donor.slug, selectedCongress);
  const industries = getOrganizationIndustryNames(donor);
  const total = contributions.reduce((sum, contribution) => sum + contribution.amount, 0);
  const visibleContributions = contributions.slice(0, 15);
  const recipientConnections = getRecipientConnectionsForOrganization(donor.slug, selectedCongress, 10);

  return (
    <div className="page-shell page-section section-grid">
      <div className="section-heading">
        <span className="kicker">Donor organization</span>
        <h1>{donor.name}</h1>
        <p className="muted-text">{donor.summary}</p>
        <div className="chips">
          <Badge tone="outline">{donor.organizationType}</Badge>
          <Badge tone="outline">{congressScope.label || formatCongress(selectedCongress)}</Badge>
          {donor.dataOrigin ? <Badge tone="outline">{donor.dataOrigin.toLowerCase()}</Badge> : null}
          {industries.map((industry) => (
            <Badge key={industry} tone="outline">
              {industry}
            </Badge>
          ))}
        </div>
      </div>

      <CongressSelector
        action={`/donors/${donor.slug}`}
        selectedCongress={selectedCongress}
        scopes={congressScopes}
        description="Donor pages stay factual and scoped to one Congress and cycle at a time."
      />

      <FreshnessNote selectedCongress={selectedCongress} />
      <SourceLinks sourceSlugs={donor.sourceSlugs} label="Profile sources" />

      <div className="summary-grid">
        <Card>
          <p className="muted-text">Visible giving</p>
          <p className="stat-value">{formatCurrency(total)}</p>
          <p>Committee-origin support in the selected Congress and election cycle.</p>
        </Card>
        <Card>
          <p className="muted-text">Connected organization</p>
          <p className="stat-value">{donor.connectedOrgName}</p>
          <p>Shown as context only. It does not create a review signal by itself.</p>
        </Card>
        <Card>
          <p className="muted-text">Public MVP rule</p>
          <p className="stat-value">Profile only</p>
          <p>Review signals appear on individual lawmaker profiles, not donor overview pages.</p>
        </Card>
      </div>

      <DonorConnectionPanel
        connections={recipientConnections}
        selectedCongress={selectedCongress}
      />

      <Card className="section-grid">
        <h2>Recipients</h2>
        <div className="table-list">
          {visibleContributions.length > 0 ? (
            visibleContributions.map((contribution) => {
              const person = getPersonBySlug(contribution.recipientPersonSlug);
              return (
                <div key={contribution.id} className="table-row">
                  <div className="meta-row">
                    {person ? (
                      <Link href={withCongressQuery(`/people/${person.slug}`, selectedCongress)}>
                        {person.displayName}
                      </Link>
                    ) : (
                      <strong>{contribution.recipientPersonSlug}</strong>
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
              No committee-origin contribution records are shown for this donor in the selected Congress slice.
            </div>
          )}
        </div>
        {contributions.length > visibleContributions.length ? (
          <p className="muted-text">
            Showing the 15 most recent visible contribution records out of {contributions.length}.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
