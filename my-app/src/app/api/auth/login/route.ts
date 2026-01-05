import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Dummy validation - in real app, check against database
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Dummy authentication - always succeeds for demo
  return NextResponse.json({
    success: true,
    user: {
      id: "1",
      email,
      name: "User",
    },
    token: "dummy-jwt-token",
  });
}

