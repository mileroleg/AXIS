import { NextRequest, NextResponse } from "next/server";
import { hhFetch } from "@/lib/hh";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await hhFetch(`/vacancies/${id}`, new URLSearchParams());
  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "content-type": "application/json" }
  });
}
