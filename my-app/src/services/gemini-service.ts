import { streamText, generateText } from "ai";
import { google } from "@ai-sdk/google";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBhX5zBygxV83oKIZooe2_iKTHb_9bUCYQ";

/**
 * Sets the API key for the Google provider
 * Must be called before using the Google models
 */
function ensureApiKey() {
  // The @ai-sdk/google provider reads from GOOGLE_GENERATIVE_AI_API_KEY
  if (typeof process !== "undefined" && process.env) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = GEMINI_API_KEY;
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotOptions {
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onFinish?: (result: { text: string }) => void | Promise<void>;
}

export interface TextGenerationOptions {
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Generic chatbot service for streaming conversations
 * @param messages - Array of conversation messages
 * @param options - Configuration options including system prompt
 * @returns Streaming response
 */
export async function streamChatbotResponse(
  messages: ChatMessage[],
  options: ChatbotOptions
) {
  const {
    systemPrompt,
    model = "gemini-3-flash-preview",
    temperature = 0.7,
    maxTokens = 8192,
    onFinish,
  } = options;

  // Ensure API key is set
  ensureApiKey();

  // Format messages - handle both simple format (content) and UIMessage format (parts)
  const formattedMessages = messages.map((msg: any) => {
    const role = msg.role;
    let content = "";

    // Check if message has content directly (simple format)
    if (msg.content) {
      content = msg.content;
    } else if (msg.parts) {
      // Extract text from parts (UIMessage format)
      const textParts = msg.parts.filter((p: any) => p.type === "text") || [];
      content = textParts.map((p: any) => p.text).join("") || "";
    }

    if (role === "user") {
      return { role: "user" as const, content };
    } else {
      // Parse JSON from assistant messages if needed
      try {
        const parsed = JSON.parse(content);
        return { role: "assistant" as const, content: parsed.reply || content };
      } catch {
        return { role: "assistant" as const, content };
      }
    }
  }).filter((msg) => msg.content); // Filter out empty messages

  // Stream the response
  const result = await streamText({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    temperature,
    maxTokens,
    onFinish,
  });

  return result;
}

/**
 * Generic text generation service for single API calls
 * @param messages - Array of conversation messages
 * @param options - Configuration options including system prompt
 * @returns Generated text response
 */
export async function generateTextResponse(
  messages: ChatMessage[],
  options: TextGenerationOptions
) {
  const {
    systemPrompt,
    model = "gemini-3-flash-preview",
    temperature = 0.7,
    maxTokens = 8192,
  } = options;

  // Ensure API key is set
  ensureApiKey();

  // Format messages - handle both simple format (content) and UIMessage format (parts)
  const formattedMessages = messages.map((msg: any) => {
    const role = msg.role;
    let content = "";

    // Check if message has content directly (simple format)
    if (msg.content) {
      content = msg.content;
    } else if (msg.parts) {
      // Extract text from parts (UIMessage format)
      const textParts = msg.parts.filter((p: any) => p.type === "text") || [];
      content = textParts.map((p: any) => p.text).join("") || "";
    }

    if (role === "user") {
      return { role: "user" as const, content };
    } else {
      // Parse JSON from assistant messages if needed (extract reply from JSON)
      try {
        const parsed = JSON.parse(content);
        return { role: "assistant" as const, content: parsed.reply || content };
      } catch {
        return { role: "assistant" as const, content };
      }
    }
  }).filter((msg) => msg.content);

  // Generate the text
  const result = await generateText({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    temperature,
    maxTokens,
  });

  return result;
}

