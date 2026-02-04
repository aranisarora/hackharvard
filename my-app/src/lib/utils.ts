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



/**
 * Check if a company name is vague or not a real company
 * Returns true if the company name is vague/unspecific
 */
export function isVagueCompanyName(company: string | null | undefined): boolean {
  if (!company || typeof company !== 'string') return true;
  
  const normalized = company.toLowerCase().trim();
  
  const vaguePatterns = [
    'not sure', 'not sure yet', 'unsure', 'any', 'any company', 'any tech company',
    'any high tech company', 'any tech', 'any high tech', 'no preference', 'no specific',
    'none', 'n/a', 'na', 'tbd', 'to be determined', 'open', 'open to', 'flexible',
    'any startup', 'startups', 'any faang', 'faang', 'big tech', 'top tech', 'tech companies',
  ];
  
  return vaguePatterns.some(pattern => normalized.includes(pattern));
}

/**
 * Select a real company based on job title
 */
export function selectRealCompanyForJob(jobTitle: string | null | undefined): string {
  if (!jobTitle || typeof jobTitle !== 'string') return 'Google';
  
  const normalizedTitle = jobTitle.toLowerCase().trim();
  const companyMap: Record<string, string> = {
    'software engineer': 'Google', 'software developer': 'Google', 'full stack': 'Google',
    'fullstack': 'Google', 'frontend': 'Meta', 'front end': 'Meta', 'backend': 'Amazon',
    'back end': 'Amazon', 'devops': 'Amazon', 'sre': 'Google', 'site reliability': 'Google',
    'product manager': 'Meta', 'product designer': 'Meta', 'product owner': 'Meta', 'pm': 'Meta',
    'data scientist': 'Google', 'data engineer': 'Amazon', 'data analyst': 'Microsoft',
    'machine learning': 'Google', 'ml engineer': 'Google', 'ai engineer': 'Google',
    'ui designer': 'Meta', 'ux designer': 'Meta', 'designer': 'Meta', 'graphic designer': 'Adobe',
    'security': 'Microsoft', 'cybersecurity': 'Microsoft', 'cloud': 'Amazon',
    'salesforce': 'Salesforce', 'sales engineer': 'Salesforce',
    'business analyst': 'Microsoft', 'consultant': 'Accenture', 'project manager': 'Microsoft',
  };
  
  for (const [key, company] of Object.entries(companyMap)) {
    if (normalizedTitle.includes(key)) return company;
  }
  
  if (normalizedTitle.includes('engineer') || normalizedTitle.includes('developer')) return 'Google';
  if (normalizedTitle.includes('design')) return 'Meta';
  if (normalizedTitle.includes('data') || normalizedTitle.includes('analyst')) return 'Microsoft';
  if (normalizedTitle.includes('product')) return 'Meta';
  
  return 'Google';
}

/**
 * Normalize company name - ensures we have a real company name
 */
export function normalizeCompanyName(
  company: string | null | undefined,
  jobTitle: string | null | undefined
): string {
  if (!isVagueCompanyName(company)) return company!;
  return selectRealCompanyForJob(jobTitle);
}