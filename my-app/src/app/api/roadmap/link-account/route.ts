import { NextResponse } from "next/server";

export async function POST() {
    // Simulate 5-6 seconds delay
    const delay = 5000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Return a random number from 20-43
    const percentage = Math.floor(Math.random() * (43 - 20 + 1)) + 20;

    return NextResponse.json({ percentage });
}
