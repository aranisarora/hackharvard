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
    const body = await request.json();
    console.log("Chat API received request body:", JSON.stringify(body, null, 2));
    
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format:", messages);
      return new Response("Messages are required", { status: 400 });
    }

    console.log("Processing messages:", messages.length, "messages");
    
    // Format messages for the service layer
    // useChat sends messages in UIMessage format with parts array
    const formattedMessages = messages.map((msg: any) => {
      // Extract content from parts if present (UIMessage format)
      let content = "";
      if (msg.parts && Array.isArray(msg.parts)) {
        const textParts = msg.parts.filter((p: any) => p.type === "text");
        content = textParts.map((p: any) => p.text).join("");
      } else if (msg.content) {
        content = msg.content;
      }
      
      return {
        role: msg.role,
        content: content,
      };
    }).filter((msg: any) => msg.content && msg.content.trim());

    console.log("Formatted messages for service:", formattedMessages.length, "messages");

    if (formattedMessages.length === 0) {
      console.error("No valid messages after formatting");
      return new Response("No valid messages found", { status: 400 });
    }

    // Use the generic chatbot service
    console.log("Calling streamChatbotResponse...");
    const result = await streamChatbotResponse(formattedMessages, {
      systemPrompt: DASHBOARD_CHATBOT_SYSTEM_PROMPT,
    });
    console.log("streamChatbotResponse completed");

    // Return the streaming response compatible with useChat
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in chatbot route:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
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

