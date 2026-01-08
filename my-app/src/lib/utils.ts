import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the base URL for the application
 * Checks environment variables in order of priority:
 * 1. NEXT_PUBLIC_SITE_URL (explicitly set)
 * 2. NEXT_PUBLIC_VERCEL_URL (automatically set by Vercel)
 * 3. localhost:3000 (fallback for local development)
 */
export function getURL(): string {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this in Vercel Env Vars
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
    'http://localhost:3000';
  
  // Make sure to include https
  url = url.startsWith('http') ? url : `https://${url}`;
  // Remove trailing slash
  url = url.endsWith('/') ? url.slice(0, -1) : url;
  return url;
}

