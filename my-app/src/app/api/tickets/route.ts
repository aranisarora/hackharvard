import { NextResponse } from "next/server";

// Placeholder API route for tickets
export async function GET() {
  return NextResponse.json({ tickets: [] });
}

export async function POST() {
  return NextResponse.json({ success: true }, { status: 201 });
}

