import { NextRequest, NextResponse } from "next/server";
import { getCongressScope, resolveCongressSelection, searchEntities } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const congress = resolveCongressSelection(request.nextUrl.searchParams.get("congress"));
  return NextResponse.json({
    query,
    selectedCongress: congress,
    congressScope: getCongressScope(congress),
    results: searchEntities(query, congress)
  });
}
