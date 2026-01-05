import { streamChatbotResponse } from "@/services/gemini-service";

// Use Edge Runtime for lower latency
export const runtime = "edge";

// System prompt for dashboard chatbot - general career advisor
const DASHBOARD_CHATBOT_SYSTEM_PROMPT = `You are a helpful and friendly career advisor assistant for PathForge, a platform that helps users achieve their career goals through personalized roadmaps.

Your role is to:
- Answer questions about the user's career roadmap and progress
- Provide guidance on completing tasks and improving their CV
- Help users understand their next steps
- Offer encouragement and motivation
- Answer questions about career development, skills, and job search

Be conversational, supportive, and concise. Keep responses helpful and actionable. If you don't know something specific about the user's data, acknowledge that and provide general guidance.

Always be encouraging and focus on helping the user make progress toward their career goals.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Messages are required", { status: 400 });
    }

    // Use the generic chatbot service
    // useChat sends messages in format: { role: "user" | "assistant", content: string }
    const result = await streamChatbotResponse(messages, {
      systemPrompt: DASHBOARD_CHATBOT_SYSTEM_PROMPT,
    });

    // Return the streaming response compatible with useChat
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in dashboard chatbot route:", error);
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

