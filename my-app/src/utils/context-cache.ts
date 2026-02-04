/**
 * Context caching utilities for Gemini API
 * 
 * Context caching allows you to cache static content (like sample resumes
 * and system prompts) to reduce token costs by 90% on subsequent requests.
 * 
 * Minimum cache size: 2,048 tokens for Gemini 3 Flash
 * Storage cost: $1.00 per 1M tokens per hour
 */

import { compressCoreSignalProfiles } from "./coresignal-optimizer";

export interface CacheableContent {
  id: string;
  content: string;
  createdAt: Date;
  expiresAt: Date;
  tokenCount: number;
}

// In-memory cache store (in production, use Redis or similar)
const cacheStore = new Map<string, CacheableContent>();

/**
 * Estimate token count (rough: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create a cache ID from content hash
 */
function createCacheId(content: string): string {
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `cache_${Math.abs(hash).toString(36)}`;
}

/**
 * Prepare sample resumes for caching
 * Returns compressed content suitable for caching
 */
export function prepareResumeCache(resumes: any[]): string {
  if (!resumes || resumes.length === 0) return "";
  
  // Use the compressor to create a condensed summary
  return compressCoreSignalProfiles(resumes);
}

/**
 * Create or retrieve a context cache
 * 
 * @param content - The content to cache (system prompts, sample resumes, etc.)
 * @param ttlHours - Time to live in hours (default: 24)
 * @returns Cache ID that can be used in API calls
 */
export function createContextCache(
  content: string,
  ttlHours: number = 24
): string {
  if (!content || content.trim().length === 0) {
    throw new Error("Cannot cache empty content");
  }

  const tokenCount = estimateTokens(content);
  
  // Check minimum token requirement for Gemini 3 Flash
  if (tokenCount < 2048) {
    console.warn(
      `[Context Cache] Content has ${tokenCount} tokens, but minimum is 2048. ` +
      `Caching may not be cost-effective. Consider aggregating more content.`
    );
  }

  const cacheId = createCacheId(content);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const cacheEntry: CacheableContent = {
    id: cacheId,
    content,
    createdAt: now,
    expiresAt,
    tokenCount,
  };

  cacheStore.set(cacheId, cacheEntry);
  
  console.log(
    `[Context Cache] Created cache ${cacheId}: ${tokenCount.toLocaleString()} tokens, ` +
    `expires in ${ttlHours} hours`
  );

  return cacheId;
}

/**
 * Get cached content by ID
 */
export function getCachedContent(cacheId: string): CacheableContent | null {
  const entry = cacheStore.get(cacheId);
  
  if (!entry) {
    return null;
  }

  // Check if expired
  if (new Date() > entry.expiresAt) {
    cacheStore.delete(cacheId);
    console.log(`[Context Cache] Cache ${cacheId} expired and removed`);
    return null;
  }

  return entry;
}

/**
 * Check if cache is valid and not expired
 */
export function isCacheValid(cacheId: string): boolean {
  const entry = getCachedContent(cacheId);
  return entry !== null;
}

/**
 * Calculate storage cost for a cache entry
 */
export function calculateStorageCost(
  tokenCount: number,
  hours: number
): number {
  // $1.00 per 1M tokens per hour
  return (tokenCount / 1_000_000) * 1.00 * hours;
}

/**
 * Clear expired caches
 */
export function clearExpiredCaches(): number {
  const now = new Date();
  let cleared = 0;

  for (const [id, entry] of cacheStore.entries()) {
    if (now > entry.expiresAt) {
      cacheStore.delete(id);
      cleared++;
    }
  }

  if (cleared > 0) {
    console.log(`[Context Cache] Cleared ${cleared} expired cache entries`);
  }

  return cleared;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalCaches: number;
  totalTokens: number;
  estimatedStorageCost: number; // per hour
} {
  const now = new Date();
  let totalTokens = 0;
  let validCaches = 0;

  for (const entry of cacheStore.values()) {
    if (now <= entry.expiresAt) {
      totalTokens += entry.tokenCount;
      validCaches++;
    }
  }

  const estimatedStorageCost = calculateStorageCost(totalTokens, 1);

  return {
    totalCaches: validCaches,
    totalTokens,
    estimatedStorageCost,
  };
}
