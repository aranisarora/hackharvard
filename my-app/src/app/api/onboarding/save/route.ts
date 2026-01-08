import { NextResponse } from "next/server";

// Simple in-memory store (in production, use database)
let onboardingStore: {
  messages: Array<{ role: string; content: string }>;
  hardcodedAnswers: Record<string, string>;
  personalizedAnswers: string[];
  personalizedQuestions: string[];
  cvFile: { name: string; size: number; type: string } | null;
  timestamp: string;
} | null = null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, hardcodedAnswers, personalizedAnswers, personalizedQuestions, cvFile } = body;

    // Store in memory instead of file
    onboardingStore = {
      messages: messages || [],
      hardcodedAnswers: hardcodedAnswers || {},
      personalizedAnswers: personalizedAnswers || [],
      personalizedQuestions: personalizedQuestions || [],
      cvFile: cvFile ? {
        name: cvFile.name,
        size: cvFile.size,
        type: cvFile.type
      } : null,
      timestamp: new Date().toISOString()
    };

    console.log(`[Onboarding Save] Saved data to memory`);

    return NextResponse.json({
      success: true,
      message: "Onboarding data saved successfully",
      timestamp: onboardingStore.timestamp
    });
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    return NextResponse.json(
      { error: "Failed to save onboarding data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return stored data or null
    if (onboardingStore) {
      return NextResponse.json({ data: onboardingStore });
    }
    return NextResponse.json({ data: null, message: "No onboarding data found" });
  } catch (error) {
    console.error("Error reading onboarding data:", error);
    return NextResponse.json(
      { error: "Failed to read onboarding data" },
      { status: 500 }
    );
  }
}

