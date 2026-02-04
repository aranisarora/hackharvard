/**
 * Token tracking and cost analysis utilities for Gemini API
 * 
 * Gemini 3 Flash pricing (per 1M tokens):
 * - Input (Text/Image/Video): $0.50
 * - Output (Text): $3.00
 * - Context Caching: $0.05 (90% discount on cached content)
 * - Storage: $1.00 per 1M tokens per hour
 */

export interface TokenUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number; // Internal reasoning tokens
}

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  inputCost: number; // USD
  outputCost: number; // USD
  cachedCost: number; // USD
  totalCost: number; // USD
  storageCost?: number; // USD per hour (if using context caching)
}

// Gemini 3 Flash pricing (per 1M tokens)
const INPUT_COST_PER_MILLION = 0.50;
const OUTPUT_COST_PER_MILLION = 3.00;
const CACHED_COST_PER_MILLION = 0.05;
const STORAGE_COST_PER_MILLION_PER_HOUR = 1.00;

/**
 * Extract token usage from Gemini API response
 */
export function extractTokenUsage(result: any): TokenUsage {
  const usage = result.usage || result.response?.usage || {};
  
  return {
    promptTokenCount: usage.promptTokenCount || usage.prompt_tokens || 0,
    candidatesTokenCount: usage.candidatesTokenCount || usage.candidates_tokens || usage.completionTokens || 0,
    totalTokenCount: usage.totalTokenCount || usage.total_tokens || 0,
    cachedContentTokenCount: usage.cachedContentTokenCount || usage.cached_content_tokens || 0,
    thoughtsTokenCount: usage.thoughtsTokenCount || usage.thoughts_tokens || 0,
  };
}

/**
 * Calculate cost breakdown from token usage
 */
export function calculateCost(usage: TokenUsage, cacheStorageHours: number = 0): CostBreakdown {
  const cachedTokens = usage.cachedContentTokenCount || 0;
  const outputTokens = usage.candidatesTokenCount + (usage.thoughtsTokenCount || 0);
  const inputTokens = usage.promptTokenCount - cachedTokens; // Non-cached input tokens

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  const cachedCost = (cachedTokens / 1_000_000) * CACHED_COST_PER_MILLION;
  const storageCost = cacheStorageHours > 0 
    ? (cachedTokens / 1_000_000) * STORAGE_COST_PER_MILLION_PER_HOUR * cacheStorageHours 
    : 0;

  return {
    inputTokens,
    outputTokens,
    cachedTokens,
    inputCost,
    outputCost,
    cachedCost,
    totalCost: inputCost + outputCost + cachedCost + storageCost,
    storageCost: storageCost > 0 ? storageCost : undefined,
  };
}

/**
 * Format cost breakdown for logging
 */
export function formatCostBreakdown(cost: CostBreakdown): string {
  const parts = [
    `Input: ${cost.inputTokens.toLocaleString()} tokens ($${cost.inputCost.toFixed(4)})`,
    `Output: ${cost.outputTokens.toLocaleString()} tokens ($${cost.outputCost.toFixed(4)})`,
  ];

  if (cost.cachedTokens > 0) {
    parts.push(`Cached: ${cost.cachedTokens.toLocaleString()} tokens ($${cost.cachedCost.toFixed(4)})`);
  }

  if (cost.storageCost) {
    parts.push(`Storage: $${cost.storageCost.toFixed(4)}`);
  }

  parts.push(`Total: $${cost.totalCost.toFixed(4)}`);

  return parts.join(' | ');
}

/**
 * Aggregate token usage across multiple API calls
 */
export function aggregateUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (acc, usage) => ({
      promptTokenCount: acc.promptTokenCount + usage.promptTokenCount,
      candidatesTokenCount: acc.candidatesTokenCount + usage.candidatesTokenCount,
      totalTokenCount: acc.totalTokenCount + usage.totalTokenCount,
      cachedContentTokenCount: (acc.cachedContentTokenCount || 0) + (usage.cachedContentTokenCount || 0),
      thoughtsTokenCount: (acc.thoughtsTokenCount || 0) + (usage.thoughtsTokenCount || 0),
    }),
    {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
      cachedContentTokenCount: 0,
      thoughtsTokenCount: 0,
    }
  );
}

/**
 * Log token usage and cost analysis
 */
export function logTokenUsage(
  label: string,
  usage: TokenUsage,
  cacheStorageHours: number = 0
): CostBreakdown {
  const cost = calculateCost(usage, cacheStorageHours);
  console.log(`[Token Usage] ${label}:`);
  console.log(`  ${formatCostBreakdown(cost)}`);
  console.log(`  Total Tokens: ${usage.totalTokenCount.toLocaleString()}`);
  if (usage.thoughtsTokenCount) {
    console.log(`  Thinking Tokens: ${usage.thoughtsTokenCount.toLocaleString()}`);
  }
  return cost;
}
