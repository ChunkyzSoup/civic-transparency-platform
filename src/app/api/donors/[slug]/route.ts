import { NextResponse } from "next/server";
import {
  getCongressScope,
  getContributionsForOrganization,
  getOrganizationBySlug,
  resolveCongressSelection
} from "@/lib/demo-data";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const { slug } = await Promise.resolve(context.params);
  const { searchParams } = new URL(request.url);
  const congress = resolveCongressSelection(searchParams.get("congress"));
  const organization = getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    selectedCongress: congress,
    congressScope: getCongressScope(congress),
    organization,
    contributions: getContributionsForOrganization(organization.slug, congress),
    note: "Public MVP review signals are shown on lawmaker profiles only."
  });
}
