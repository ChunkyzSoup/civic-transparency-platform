import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  type ConnectedBill,
  type DonorRecipientConnection,
  type PersonDonorConnection
} from "@/lib/connection-analysis";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { withCongressQuery } from "@/lib/demo-data";

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) {
    return "No dated contribution records";
  }

  if (start === end || !end) {
    return formatDate(start!);
  }

  if (!start) {
    return formatDate(end);
  }

  return `${formatDate(start)} to ${formatDate(end)}`;
}

function evidenceTone(kind: ConnectedBill["evidenceKinds"][number]) {
  if (kind === "vote") {
    return "medium";
  }

  if (kind === "committee") {
    return "low";
  }

  return "outline";
}

function evidenceLabel(kind: ConnectedBill["evidenceKinds"][number]) {
  if (kind === "vote") {
    return "vote";
  }

  if (kind === "committee") {
    return "committee";
  }

  return "interest clue";
}

function BillConnectionList({
  bills,
  congress
}: {
  bills: ConnectedBill[];
  congress: number;
}) {
  if (bills.length === 0) {
    return (
      <div className="empty-state compact-empty">
        No vote, committee, or topic clue is currently connected to this money path.
      </div>
    );
  }

  return (
    <div className="connection-bill-list">
      {bills.map((item) => (
        <div key={item.bill.slug} className="connection-bill">
          <div className="meta-row">
            <Link href={withCongressQuery(`/bills/${item.bill.slug}`, congress)}>
              <strong>
                {item.bill.displayNumber} {item.bill.title}
              </strong>
            </Link>
            <div className="chips">
              {item.evidenceKinds.map((kind) => (
                <Badge key={kind} tone={evidenceTone(kind)}>
                  {evidenceLabel(kind)}
                </Badge>
              ))}
            </div>
          </div>
          <p className="muted-text">{item.reasons.slice(0, 2).join("; ")}</p>
          {item.voteDate ? (
            <p className="muted-text">Vote date: {formatDate(item.voteDate)}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ContributionSummary({
  netAmount,
  positiveAmount,
  refundAmount,
  count,
  firstContributionDate,
  lastContributionDate
}: {
  netAmount: number;
  positiveAmount: number;
  refundAmount: number;
  count: number;
  firstContributionDate: string | null;
  lastContributionDate: string | null;
}) {
  return (
    <div className="connection-money">
      <div>
        <span className="flow-label">Net support</span>
        <strong>{formatCurrency(netAmount)}</strong>
      </div>
      <div>
        <span className="flow-label">Gross in / refunds</span>
        <strong>
          {formatCurrency(positiveAmount)} / {formatCurrency(refundAmount)}
        </strong>
      </div>
      <div>
        <span className="flow-label">Records and dates</span>
        <strong>{count} records</strong>
        <p className="muted-text">{formatDateRange(firstContributionDate, lastContributionDate)}</p>
      </div>
    </div>
  );
}

export function PersonConnectionPanel({
  connections,
  selectedCongress
}: {
  connections: PersonDonorConnection[];
  selectedCongress: number;
}) {
  return (
    <Card className="section-grid connection-panel">
      <div className="section-heading">
        <span className="kicker">Connection map</span>
        <h2>Money paths linked to legislative surfaces</h2>
        <p className="muted-text">
          This view joins direct committee contributions to the recipient, then shows bills where the
          same recipient has a recorded vote, a committee referral, or a cautious donor-interest clue.
        </p>
      </div>

      <div className="connection-list">
        {connections.length > 0 ? (
          connections.map((connection) => (
            <div key={connection.organizationSlug} className="connection-row">
              <div className="connection-main">
                <div className="section-grid">
                  <span className="flow-label">Donor committee or PAC</span>
                  {connection.organization ? (
                    <Link href={withCongressQuery(`/donors/${connection.organization.slug}`, selectedCongress)}>
                      <strong>{connection.organization.name}</strong>
                    </Link>
                  ) : (
                    <strong>{connection.organizationSlug}</strong>
                  )}
                  {connection.organization?.connectedOrgName ? (
                    <p className="muted-text">Connected org: {connection.organization.connectedOrgName}</p>
                  ) : null}
                  <div className="chips">
                    {connection.industryNames.map((industry) => (
                      <Badge key={industry} tone="outline">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ContributionSummary {...connection} />
              </div>
              <BillConnectionList bills={connection.connectedBills} congress={selectedCongress} />
            </div>
          ))
        ) : (
          <div className="empty-state">
            No direct committee-to-candidate money path is currently in scope for this profile.
          </div>
        )}
      </div>
    </Card>
  );
}

export function DonorConnectionPanel({
  connections,
  selectedCongress
}: {
  connections: DonorRecipientConnection[];
  selectedCongress: number;
}) {
  return (
    <Card className="section-grid connection-panel">
      <div className="section-heading">
        <span className="kicker">Connection map</span>
        <h2>Recipients and related legislative surfaces</h2>
        <p className="muted-text">
          Each row starts with the donor&apos;s direct support to a recipient, then lists legislation
          connected through that recipient&apos;s votes, committees, or a clearly labeled interest clue.
        </p>
      </div>

      <div className="connection-list">
        {connections.length > 0 ? (
          connections.map((connection) => (
            <div key={connection.personSlug} className="connection-row">
              <div className="connection-main">
                <div className="section-grid">
                  <span className="flow-label">Recipient</span>
                  {connection.person ? (
                    <Link href={withCongressQuery(`/people/${connection.person.slug}`, selectedCongress)}>
                      <strong>{connection.person.displayName}</strong>
                    </Link>
                  ) : (
                    <strong>{connection.personSlug}</strong>
                  )}
                  {connection.person ? (
                    <p className="muted-text">{connection.person.officeLabel}</p>
                  ) : null}
                </div>
                <ContributionSummary {...connection} />
              </div>
              <BillConnectionList bills={connection.connectedBills} congress={selectedCongress} />
            </div>
          ))
        ) : (
          <div className="empty-state">
            No recipient contribution records are currently in scope for this donor.
          </div>
        )}
      </div>
    </Card>
  );
}
