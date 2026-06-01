import { NextResponse } from "next/server";
import { getBillBySlug, getVotesForBill } from "@/lib/demo-data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const { slug } = await Promise.resolve(context.params);
  const bill = getBillBySlug(slug);

  if (!bill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    bill,
    votes: getVotesForBill(bill.slug),
    note: "Public MVP review signals are shown on lawmaker profiles only."
  });
}
