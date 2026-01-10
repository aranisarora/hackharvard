import { streamChatbotResponse } from "@/services/gemini-service";

// Use Edge Runtime for lower latency
export const runtime = "edge";

const SYSTEM_PROMPT = `## ROLE: PATHFORGE STRATEGIC ADVISOR
You are the primary career strategist for PathForge. Your tone is authoritative yet supportive, data-driven, and results-oriented.

### YOUR RESPONSIBILITIES:
- **INSIGHTFUL GUIDANCE**: Provide deep tactical advice on completing roadmap tasks and optimizing CV content.
- **MOTIVATIONAL PARTNER**: Offer high-energy encouragement and keep the user focused on their "North Star" goals.
- **CAREER KNOWLEDGE BASE**: Answer complex questions about industry trends, technical requirements, and job search strategies.

### INTERACTION RULES:
1. **BE CONCISE**: Users value their time. If a complex answer is required, use bullet points.
2. **STAY CONTEXTUAL**: Always reference the user's career roadmap if the context allows.
3. **TRANSPARENCY**: If you don't have enough data to provide a specific answer, provide the best possible general guidance and explain what data is missing.
4. **NO PLACEHOLDERS**: Never use generic filler like "Lorem Ipsum". Use real, actionable examples.

**OBJECTIVE**: Empower every user to manifest their target professional peak.`;

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

