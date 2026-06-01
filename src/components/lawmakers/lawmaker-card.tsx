import Link from "next/link";
import { LawmakerPhoto } from "@/components/lawmakers/lawmaker-photo";
import { Badge } from "@/components/ui/badge";
import { formatChamber, formatParty } from "@/lib/formatting";
import { withCongressQuery } from "@/lib/demo-data";
import type { Person } from "@/types/domain";

export function LawmakerCard({
  person,
  selectedCongress
}: {
  person: Person;
  selectedCongress: number;
}) {
  return (
    <Link href={withCongressQuery(`/people/${person.slug}`, selectedCongress)} className="result-item">
      <div className="lawmaker-result">
        <LawmakerPhoto person={person} size={72} />
        <div className="section-grid">
          <div className="meta-row">
            <strong>{person.displayName}</strong>
            <div className="chips">
              <Badge tone="outline">{formatParty(person.party)}</Badge>
              <Badge tone="outline">{formatChamber(person.chamber)}</Badge>
            </div>
          </div>
          <p className="muted-text">{person.officeLabel}</p>
        </div>
      </div>
    </Link>
  );
}

