import { NextResponse } from "next/server";
import {
  getCongressScope,
  getBillsForPerson,
  getCommitteesForPerson,
  getContributionsForPerson,
  getPersonBySlug,
  getSignalsForPerson,
  getVotesForPerson,
  getWhyNotScoredForPerson,
  resolveCongressSelection
} from "@/lib/demo-data";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const { slug } = await Promise.resolve(context.params);
  const { searchParams } = new URL(request.url);
  const congress = resolveCongressSelection(searchParams.get("congress"));
  const person = getPersonBySlug(slug);

  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    selectedCongress: congress,
    congressScope: getCongressScope(congress),
    person,
    committees: getCommitteesForPerson(person, congress),
    contributions: getContributionsForPerson(person.slug, congress),
    votes: getVotesForPerson(person.slug, congress),
    bills: getBillsForPerson(person.slug, congress),
    signals: getSignalsForPerson(person.slug, congress),
    whyNotScored: getWhyNotScoredForPerson(person.slug, congress)
  });
}
