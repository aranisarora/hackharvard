import { streamText, generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { extractTokenUsage, logTokenUsage, TokenUsage, CostBreakdown } from "@/utils/token-tracking";

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
  trackUsage?: boolean; // Whether to track and log token usage
}

export interface StructuredOptions<T> {
  systemPrompt: string;
  schema: z.ZodType<T>;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  trackUsage?: boolean; // Whether to track and log token usage
  cacheId?: string; // Context cache ID for reusable content
}

// Note: The return type maintains backward compatibility with existing code
// Usage and cost are attached to the result object if trackUsage is enabled

// Default configuration
const DEFAULT_MODEL = "gemini-2.5-pro";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_OUTPUT_TOKENS = 65536;

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
 * @returns Generated object matching the schema with usage metadata
 */
export async function generateStructuredResponse<T>(
  messages: ChatMessage[],
  options: StructuredOptions<T>
): Promise<GeminiResponse<T>> {
  const {
    systemPrompt,
    schema,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
    trackUsage = true, // Default to tracking usage
    cacheId,
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
  if (cacheId) {
    console.log("[Gemini Service] Using context cache:", cacheId);
  }
  
  // Verify API key is available (for better error messages)
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API key not found. Please set GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY environment variable.");
  }
  console.log("[Gemini Service] API key found, length:", apiKey.length);

  // Try to generate with the requested model, fallback to flash if pro model is unavailable
  try {
    const generateOptions: any = {
      model: google(model),
      system: systemPrompt,
      messages: formattedMessages,
      schema,
      temperature,
      maxOutputTokens,
    };

    // TODO: Context caching support
    // Note: The AI SDK (@ai-sdk/google) may not directly support Gemini's context caching API.
    // Context caching requires using the native @google/generative-ai SDK.
    // For now, we optimize data before sending (see coresignal-optimizer.ts) which provides ~80% token reduction.
    // To implement context caching, consider using the native SDK for cached content.
    if (cacheId) {
      console.warn("[Gemini Service] Context caching requested but not yet implemented with AI SDK");
      // Future implementation: Use @google/generative-ai SDK for cached content
    }

    const result = await generateObject(generateOptions);

    console.log("[Gemini Service] generateObject completed successfully");

    // Extract and log token usage
    let usage: TokenUsage | undefined;
    let cost: CostBreakdown | undefined;

    if (trackUsage) {
      // The AI SDK may expose usage in different ways
      const usageData = (result as any).usage || (result as any).response?.usage;
      if (usageData) {
        usage = extractTokenUsage({ usage: usageData });
        cost = logTokenUsage(`[Gemini Service] ${model}`, usage);
      } else {
        console.warn("[Gemini Service] Usage metadata not available in response");
      }
    }

    // Maintain backward compatibility - return the same structure as before
    const response = result as any;
    response.usage = usage;
    response.cost = cost;
    return response;
  } catch (error) {
    // If model is unavailable or quota exceeded, fallback to flash model
    const errorMessage = error instanceof Error ? error.message : String(error);
    if ((errorMessage.includes("model") && errorMessage.includes("not available")) || 
        errorMessage.includes("quota") || 
        errorMessage.includes("rate limit") ||
        (model === "gemini-2.5-pro" && errorMessage.includes("permission"))) {
      console.warn(`[Gemini Service] Model ${model} unavailable, falling back to gemini-2.5-flash`);
      // Fallback to flash model with reduced token limit
      const fallbackMaxTokens = Math.min(maxOutputTokens, 8192);
      const fallbackOptions: any = {
        model: google("gemini-2.5-flash"),
        system: systemPrompt,
        messages: formattedMessages,
        schema,
        temperature,
        maxOutputTokens: fallbackMaxTokens,
      };

      // Context caching not yet implemented (see note above)
      if (cacheId) {
        console.warn("[Gemini Service] Context caching requested but not yet implemented with AI SDK");
      }

      const result = await generateObject(fallbackOptions);
      console.log("[Gemini Service] generateObject completed successfully with fallback model");

      // Extract and log token usage
      let usage: TokenUsage | undefined;
      let cost: CostBreakdown | undefined;

      if (trackUsage) {
        const usageData = (result as any).usage || (result as any).response?.usage;
        if (usageData) {
          usage = extractTokenUsage({ usage: usageData });
          cost = logTokenUsage(`[Gemini Service] gemini-2.5-flash (fallback)`, usage);
        } else {
          console.warn("[Gemini Service] Usage metadata not available in fallback response");
        }
      }

      // Maintain backward compatibility
      const response = result as any;
      response.usage = usage;
      response.cost = cost;
      return response;
    }
    // Re-throw if it's a different error
    throw error;
  }
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

