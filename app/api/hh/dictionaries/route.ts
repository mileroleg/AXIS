import { NextResponse } from "next/server";
import { hhFetch } from "@/lib/hh";

export async function GET() {
  const response = await hhFetch("/dictionaries", new URLSearchParams());
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "content-type": "application/json" }
  });
}
