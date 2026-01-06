import { streamChatbotResponse } from "@/services/gemini-service";

// Use Edge Runtime for lower latency
export const runtime = "edge";

const SYSTEM_PROMPT = `You are a helpful and friendly career advisor assistant for PathForge, a platform that helps users achieve their career goals through personalized roadmaps.

Your role is to:
- Answer questions about the user's career roadmap and progress
- Provide guidance on completing tasks and improving their CV
- Help users understand their next steps
- Offer encouragement and motivation
- Answer questions about career development, skills, and job search

Be conversational, supportive, and concise. Keep responses helpful and actionable. If you don't know something specific about the user's data, acknowledge that and provide general guidance.

Always be encouraging and focus on helping the user make progress toward their career goals.`;

/**
 * Format messages from useChat format to service format
 */
function formatMessages(messages: any[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .map((msg) => {
      // Extract content from parts if present (useChat format) or use content directly
      let content = "";
      if (msg.parts && Array.isArray(msg.parts)) {
        const textParts = msg.parts.filter((p: any) => p.type === "text");
        content = textParts.map((p: any) => p.text).join("");
      } else if (msg.content) {
        content = msg.content;
      }

      return {
        role: msg.role as "user" | "assistant",
        content,
      };
    })
    .filter((msg) => msg.content?.trim());
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages are required", { status: 400 });
    }

    const formattedMessages = formatMessages(messages);

    if (formattedMessages.length === 0) {
      return new Response("No valid messages found", { status: 400 });
    }

    // Stream the chatbot response
    const result = await streamChatbotResponse(formattedMessages, {
      systemPrompt: SYSTEM_PROMPT,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
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

