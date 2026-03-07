import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_SECRET = process.env.API_SECRET ?? "";

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();

  const res = await fetch(`${API_URL}/v1/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_SECRET },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
