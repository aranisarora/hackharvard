import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const body = await request.json();
    const { currentPercentage } = body;

    if (typeof currentPercentage !== 'number') {
        return NextResponse.json({ error: "currentPercentage is required" }, { status: 400 });
    }

    // Simulate 5-6 seconds delay
    const delay = 5000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Logic: random number from currentPercentage up to double or 100% (whichever is smaller)
    const max = Math.min(currentPercentage * 2, 100);
    const percentage = Math.floor(Math.random() * (max - currentPercentage + 1)) + currentPercentage;

    return NextResponse.json({ percentage });
}
