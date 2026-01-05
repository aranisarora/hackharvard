import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, confirmPassword } = body;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Dummy validation
  if (!email || !password || !confirmPassword) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Dummy registration - always succeeds for demo
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

