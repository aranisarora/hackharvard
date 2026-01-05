import { generateTextResponse } from "@/services/gemini-service";
import { NextResponse } from "next/server";

// Use Edge Runtime for lower latency
export const runtime = "edge";

/**
 * Generic text generation endpoint
 * Accepts a systemPrompt in the request body to customize the generation behavior
 */
export async function POST(request: Request) {
  try {
    const { messages, systemPrompt, model, temperature, maxTokens } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    if (!systemPrompt) {
      return NextResponse.json(
        { error: "systemPrompt is required" },
        { status: 400 }
      );
    }

    // Use the generic text generation service
    const result = await generateTextResponse(messages, {
      systemPrompt,
      model,
      temperature,
      maxTokens,
    });

    return NextResponse.json({
      success: true,
      text: result.text,
    });
  } catch (error) {
    console.error("Error in text generation route:", error);
    return NextResponse.json(
      {
        error: "Failed to generate text",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

