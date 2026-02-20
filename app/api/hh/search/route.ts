import { NextRequest, NextResponse } from "next/server";
import { hhFetch } from "@/lib/hh";

export async function GET(req: NextRequest) {
  const params = new URLSearchParams(req.nextUrl.search);
  const response = await hhFetch("/vacancies", params);
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "content-type": "application/json" }
  });
}
