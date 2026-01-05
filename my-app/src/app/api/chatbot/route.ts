import { streamChatbotResponse } from "@/services/gemini-service";

// Use Edge Runtime for lower latency
export const runtime = "edge";

/**
 * Generic chatbot endpoint
 * Accepts a systemPrompt in the request body to customize the chatbot behavior
 */
export async function POST(request: Request) {
  try {
    const { messages, systemPrompt, model, temperature, maxTokens } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages are required", { status: 400 });
    }

    if (!systemPrompt) {
      return new Response("systemPrompt is required", { status: 400 });
    }

    // Use the generic chatbot service
    const result = await streamChatbotResponse(messages, {
      systemPrompt,
      model,
      temperature,
      maxTokens,
    });

    // Return the streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in chatbot route:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

