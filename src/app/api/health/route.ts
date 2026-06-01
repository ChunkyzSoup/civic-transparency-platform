import { NextResponse } from "next/server";
import { getMetadata } from "@/lib/demo-data";

export async function GET() {
  const metadata = getMetadata();

  return NextResponse.json({
    ok: true,
    service: "civic-transparency-platform",
    mode: metadata.mode,
    factsAsOf: metadata.factsAsOf,
    sourcesLastCheckedAt: metadata.sourcesLastCheckedAt
  });
}
