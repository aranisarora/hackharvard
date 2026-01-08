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
  maxOutputTokens?: number;
  onFinish?: (result: { text: string }) => void | Promise<void>;
}

export interface StructuredOptions<T> {
  systemPrompt: string;
  schema: z.ZodType<T>;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

// Default configuration
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

/**
 * Initialize API key from environment
 * @ai-sdk/google automatically reads from GOOGLE_GENERATIVE_AI_API_KEY
 * Note: In Edge Runtime, process.env is read-only, so we can't modify it
 */
function initializeApiKey(): void {
  // Check for API key in environment
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY environment variable"
    );
  }

  // In Edge Runtime, process.env is read-only, so we can't modify it
  // @ai-sdk/google will read from GOOGLE_GENERATIVE_AI_API_KEY automatically
  // If only GEMINI_API_KEY is set, we need to ensure GOOGLE_GENERATIVE_AI_API_KEY is also set
  // But in Edge Runtime, we can't do this, so we rely on the environment variable being set correctly
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    // Try to set it, but catch errors for Edge Runtime compatibility
    try {
      // @ts-ignore - process.env may be read-only in Edge Runtime
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    } catch (e) {
      // In Edge Runtime, this will fail - that's okay if GOOGLE_GENERATIVE_AI_API_KEY is already set in env
      // If it's not set, @ai-sdk/google might fail, but we've validated the key exists
      console.warn("Could not set GOOGLE_GENERATIVE_AI_API_KEY (Edge Runtime or read-only env). Ensure GOOGLE_GENERATIVE_AI_API_KEY is set in your environment variables.");
    }
  }
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
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    onFinish,
  } = options;

  initializeApiKey();

  const formattedMessages = formatMessages(messages);

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages provided");
  }

  // @ai-sdk/google reads from GOOGLE_GENERATIVE_AI_API_KEY automatically
  // In Edge Runtime, ensure the env var is set in your deployment platform
  return await streamText({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    temperature,
    maxOutputTokens,
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
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  } = options;

  initializeApiKey();

  const formattedMessages = formatMessages(messages);

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages provided");
  }

  // @ai-sdk/google reads from GOOGLE_GENERATIVE_AI_API_KEY automatically
  return await generateText({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    temperature,
    maxOutputTokens,
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
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  } = options;

  console.log("[Gemini Service] Initializing API key...");
  initializeApiKey();

  const formattedMessages = formatMessages(messages);

  if (formattedMessages.length === 0) {
    throw new Error("No valid messages provided");
  }

  console.log("[Gemini Service] Calling generateObject with model:", model);
  console.log("[Gemini Service] Message count:", formattedMessages.length);
  console.log("[Gemini Service] Max tokens:", maxOutputTokens);
  
  // Verify API key is available (for better error messages)
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API key not found. Please set GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY environment variable.");
  }
  console.log("[Gemini Service] API key found, length:", apiKey.length);

  // @ai-sdk/google reads from GOOGLE_GENERATIVE_AI_API_KEY automatically
  const result = await generateObject({
    model: google(model),
    system: systemPrompt,
    messages: formattedMessages,
    schema,
    temperature,
    maxOutputTokens,
  });

  console.log("[Gemini Service] generateObject completed successfully");
  return result;
}

/**
 * Summarize onboarding chat into structured key-value pairs
 * @param messages - Array of conversation messages
 * @returns Structured summary of user details
 */
export async function summarizeOnboardingChat(messages: ChatMessage[]) {
  const systemPrompt = `You are an expert data extractor. Your task is to analyze a conversation between a career advisor bot and a user.
  
  Extract key user information into a simple JSON object with short, one-word keys (camelCase).
  The values should be concise summaries of the user's answers.
  
  Examples of keys:
  - age
  - location
  - targetRole
  - targetCompany
  - experienceLevel
  - keySkills
  - commitmentHours
  - timeline
  
  Ignore system messages or irrelevant chit-chat. Focus on the user's facts and preferences.
  If a piece of information is not present, do not invent it.
  
  Return ONLY the JSON object.`;

  console.log("[Gemini Service] Summarizing chat...");

  // We use a specific schema with optional fields to satisfy the API requirements while allowing flexibility
  const result = await generateStructuredResponse(messages, {
    systemPrompt,
    schema: z.object({
      age: z.string().optional(),
      location: z.string().optional(),
      targetRole: z.string().optional(),
      targetCompany: z.string().optional(),
      experienceLevel: z.string().optional(),
      keySkills: z.string().optional(),
      commitmentHours: z.string().optional(),
      timeline: z.string().optional(),
      otherDetails: z.string().optional(), // Catch-all for other info
    }),
    model: "gemini-2.5-flash", // Fast model for summarization
    temperature: 0.2, // Low temperature for factual extraction
  });

  return result.object;
}

