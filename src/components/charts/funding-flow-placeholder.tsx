import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatting";
import { withCongressQuery } from "@/lib/demo-data";
import type { Contribution, Organization, Person } from "@/types/domain";

export function FundingFlowPlaceholder({
  person,
  contributions,
  organizationsBySlug,
  selectedCongress
}: {
  person: Person;
  contributions: Contribution[];
  organizationsBySlug: Map<string, Organization>;
  selectedCongress: number;
}) {
  const grouped = new Map<
    string,
    {
      amount: number;
      count: number;
    }
  >();

  for (const contribution of contributions) {
    const existing = grouped.get(contribution.organizationSlug) ?? { amount: 0, count: 0 };
    existing.amount += contribution.amount;
    existing.count += 1;
    grouped.set(contribution.organizationSlug, existing);
  }

  const topFlows = [...grouped.entries()]
    .map(([organizationSlug, totals]) => ({
      organizationSlug,
      organization: organizationsBySlug.get(organizationSlug),
      ...totals
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);

  return (
    <Card className="visual-card">
      <div className="section-heading">
        <h3>Relationship flow</h3>
        <p className="muted-text">
          Current-cycle direct committee and PAC support flowing to this lawmaker under the live MVP rules.
        </p>
      </div>

      {topFlows.length > 0 ? (
        <div className="table-list">
          {topFlows.map((flow) => (
            <div key={flow.organizationSlug} className="flow-row">
              <div>
                <span className="flow-label">Donor committee or PAC</span>
                {flow.organization ? (
                  <Link href={withCongressQuery(`/donors/${flow.organization.slug}`, selectedCongress)}>
                    <strong>{flow.organization.name}</strong>
                  </Link>
                ) : (
                  <strong>{flow.organizationSlug}</strong>
                )}
              </div>
              <div className="flow-arrow" />
              <div>
                <span className="flow-label">Lawmaker</span>
                <strong>{person.displayName}</strong>
              </div>
              <div className="flow-arrow" />
              <div>
                <span className="flow-label">Visible direct support</span>
                <strong>{formatCurrency(flow.amount)}</strong>
                <p className="muted-text">{flow.count} contribution records</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No verified direct committee-to-candidate contribution record is currently in scope for this
          profile.
        </div>
      )}
    </Card>
  );
}

