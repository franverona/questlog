import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_SECRET = process.env.API_SECRET ?? "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  await requireAuth();
  const { userId } = await params;

  // Proxy to internal API — fetch last 50 events for this user
  const res = await fetch(
    `${API_URL}/v1/users/${encodeURIComponent(userId)}/events`,
    { headers: { "x-api-key": API_SECRET } }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
