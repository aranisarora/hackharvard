import { streamText, generateText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * Gets the API key for the Google provider
 * Must be called before using the Google models
 */
function getApiKey(): string {
  // Try to get from environment variable first
  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
                 "AIzaSyBhX5zBygxV83oKIZooe2_iKTHb_9bUCYQ";
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set");
  }
  
  return apiKey;
}

/**
 * Sets the API key for the Google provider
 * Must be called before using the Google models
 */
function ensureApiKey() {
  const apiKey = getApiKey();
  // The @ai-sdk/google provider reads from GOOGLE_GENERATIVE_AI_API_KEY
  if (typeof process !== "undefined" && process.env) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
  }
  console.log("API key set:", apiKey ? `${apiKey.substring(0, 10)}...` : "NOT SET");
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

  console.log("streamChatbotResponse called with:", {
    messageCount: messages.length,
    model,
    hasSystemPrompt: !!systemPrompt,
  });

  // Ensure API key is set
  ensureApiKey();
  console.log("API key ensured");

  // Messages should already be formatted by the API route
  // Just ensure they have the correct structure
  const formattedMessages = messages
    .filter((msg) => msg.content && msg.content.trim())
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

  console.log("Formatted messages for AI SDK:", formattedMessages.length, "messages");

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages to process");
  }

  try {
    // Ensure API key is set in environment
    const apiKey = getApiKey();
    if (typeof process !== "undefined" && process.env) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }
    
    // Stream the response
    console.log("Calling streamText with model:", model);
    const result = await streamText({
      model: google(model),
      system: systemPrompt,
      messages: formattedMessages,
      temperature,
      ...(maxTokens && { maxTokens }), // Conditionally include maxTokens if provided
      onFinish,
    });
    console.log("streamText completed successfully");
    return result;
  } catch (error) {
    console.error("Error in streamText:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
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

  console.log("generateTextResponse called with:", {
    messageCount: messages.length,
    model,
    hasSystemPrompt: !!systemPrompt,
  });

  // Ensure API key is set
  const apiKey = getApiKey();
  if (typeof process !== "undefined" && process.env) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
  }
  console.log("API key ensured");

  // Messages should already be formatted by the API route
  // Just ensure they have the correct structure
  const formattedMessages = messages
    .filter((msg) => msg.content && msg.content.trim())
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

  console.log("Formatted messages for AI SDK:", formattedMessages.length, "messages");

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages to process");
  }

  try {
    // Generate the text
    console.log("Calling generateText with model:", model);
    const result = await generateText({
      model: google(model),
      system: systemPrompt,
      messages: formattedMessages,
      temperature,
      ...(maxTokens && { maxTokens }), // Conditionally include maxTokens if provided
    });
    console.log("generateText completed successfully");
    return result;
  } catch (error) {
    console.error("Error in generateText:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

