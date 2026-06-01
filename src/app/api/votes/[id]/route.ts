import { NextResponse } from "next/server";
import { getVoteBySlug } from "@/lib/demo-data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);
  const vote = getVoteBySlug(id);

  if (!vote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ vote });
}

