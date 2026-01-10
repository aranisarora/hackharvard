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
const DEFAULT_MODEL = "gemini-2.5-pro";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_OUTPUT_TOKENS = 65536;

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
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
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
  - miscellaneous
  
  Ignore system messages or irrelevant chit-chat. Focus on the user's facts and preferences.
  If a piece of information is not present, do not invent it or create a key and leave it empty.
  
  IMPORTANT: Return ONLY the JSON object.`;

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

