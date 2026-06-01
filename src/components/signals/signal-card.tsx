import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getBillBySlug,
  getOrganizationBySlug,
  getPersonBySlug,
  withCongressQuery
} from "@/lib/demo-data";
import type { Signal } from "@/types/domain";
import { WhyHighlightedDrawer } from "./why-highlighted-drawer";

function toneFromSeverity(
  severity: Signal["severity"]
): "low" | "medium" {
  if (severity === "MEDIUM") {
    return "medium";
  }
  return "low";
}

export function SignalCard({
  signal,
  selectedCongress
}: {
  signal: Signal;
  selectedCongress?: number;
}) {
  const person = getPersonBySlug(signal.personSlug);
  const donor = getOrganizationBySlug(signal.organizationSlug);
  const bill = getBillBySlug(signal.billSlug);
  const scopedCongress = selectedCongress ?? signal.congress;

  return (
    <Card className="signal-card">
      <div className="signal-card-header">
        <Badge tone={toneFromSeverity(signal.severity)}>
          {signal.severity === "MEDIUM"
            ? "Medium signal strength"
            : "Low signal strength"}
        </Badge>
        <span className="score-pill">Score {signal.score}</span>
      </div>

      <h3>{signal.title}</h3>
      <p>{signal.plainLanguageSummary}</p>

      <div className="signal-links">
        {person ? (
          <Link href={withCongressQuery(`/people/${person.slug}`, scopedCongress)}>
            {person.displayName}
          </Link>
        ) : null}
        {donor ? (
          <Link href={withCongressQuery(`/donors/${donor.slug}`, scopedCongress)}>{donor.name}</Link>
        ) : null}
        {bill ? (
          <Link href={withCongressQuery(`/bills/${bill.slug}`, signal.congress)}>{bill.displayNumber}</Link>
        ) : null}
      </div>

      <WhyHighlightedDrawer signal={signal} />
    </Card>
  );
}
