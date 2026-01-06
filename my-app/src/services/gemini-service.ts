import { streamText, generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GeminiOptions {
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onFinish?: (result: { text: string }) => void | Promise<void>;
}

export interface StructuredOptions<T> {
  systemPrompt: string;
  schema: z.ZodType<T>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Default configuration
const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 8192;

/**
 * Initialize API key from environment
 * @ai-sdk/google automatically reads from GOOGLE_GENERATIVE_AI_API_KEY
 */
function initializeApiKey(): void {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY environment variable"
    );
  }

  // Ensure the standard env variable is set for @ai-sdk/google
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
}

/**
 * Format and validate messages
 */
function formatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((msg) => msg.content?.trim())
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));
}

/**
 * Stream a chatbot response
 * @param messages - Array of conversation messages
 * @param options - Configuration options
 * @returns Streaming response
 */
export async function streamChatbotResponse(
  messages: ChatMessage[],
  options: GeminiOptions
) {
  const {
    systemPrompt,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
    onFinish,
  } = options;

  initializeApiKey();

  const formattedMessages = formatMessages(messages);

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages provided");
  }

  return await streamText({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    temperature,
    maxTokens,
    onFinish,
  });
}

/**
 * Generate text response
 * @param messages - Array of conversation messages
 * @param options - Configuration options
 * @returns Generated text response
 */
export async function generateTextResponse(
  messages: ChatMessage[],
  options: GeminiOptions
) {
  const {
    systemPrompt,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  initializeApiKey();

  const formattedMessages = formatMessages(messages);

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages provided");
  }

  return await generateText({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    temperature,
    maxTokens,
  });
}

/**
 * Generate structured object response
 * @param messages - Array of conversation messages
 * @param options - Configuration options including Zod schema
 * @returns Generated object matching the schema
 */
export async function generateStructuredResponse<T>(
  messages: ChatMessage[],
  options: StructuredOptions<T>
) {
  const {
    systemPrompt,
    schema,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  initializeApiKey();

  const formattedMessages = formatMessages(messages);

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages provided");
  }

  return await generateObject({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    schema,
    temperature,
    maxTokens,
  });
}

