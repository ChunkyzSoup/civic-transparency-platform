import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    note: "Public MVP review signals are contextual and returned through /api/people/:slug."
  });
}
