import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_SECRET = process.env.API_SECRET ?? "";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();

  const res = await fetch(`${API_URL}/v1/rules/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-api-key": API_SECRET },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const res = await fetch(`${API_URL}/v1/rules/${id}`, {
    method: "DELETE",
    headers: { "x-api-key": API_SECRET },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
