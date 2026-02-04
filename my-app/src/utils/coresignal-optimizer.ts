/**
 * CoreSignal data optimizer
 * 
 * Reduces token count by:
 * 1. Filtering only relevant fields (removes metadata, timestamps, etc.)
 * 2. Stripping HTML tags from descriptions
 * 3. Capping description lengths
 * 4. Limiting experience entries to most recent/relevant
 * 5. Compressing skills arrays
 */

export interface CleanedCoreSignalProfile {
  full_name: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  skills: string[];
  github_repos?: Array<{
    name: string;
    summary: string | null;
    contributions_count: number;
  }>;
  experience: Array<{
    title: string;
    company: string;
    duration_months: number | null;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string | null;
    field: string | null;
  }>;
  certifications: Array<{
    name: string;
    issuer: string | null;
  }>;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  if (!html) return "";
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, "");
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Clean up whitespace
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Calculate duration in months from start/end dates
 */
function calculateDurationMonths(startDate: string | null, endDate: string | null, isCurrent: boolean): number | null {
  if (!startDate) return null;
  
  try {
    const start = new Date(startDate);
    const end = isCurrent ? new Date() : (endDate ? new Date(endDate) : new Date());
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  } catch {
    return null;
  }
}

/**
 * Clean and optimize a single CoreSignal profile (handles both employee_base and multi_source formats)
 */
export function cleanCoreSignalProfile(raw: any): CleanedCoreSignalProfile {
  // Extract basic info
  const full_name = raw.full_name || raw.name || `${raw.first_name || ""} ${raw.last_name || ""}`.trim() || "Unknown";
  const headline = raw.headline || null;
  const summary = raw.summary ? stripHtml(raw.summary).substring(0, 500) : null;

  // Clean skills - prioritize historical_skills (multi-source API) or member_skills (employee_base API)
  const skills: string[] = [];
  
  // Multi-source API: historical_skills is the key field
  if (raw.historical_skills && Array.isArray(raw.historical_skills)) {
    raw.historical_skills.slice(0, 15).forEach((skill: any) => {
      const skillName = typeof skill === "string" ? skill : skill.name || skill;
      if (skillName && typeof skillName === "string" && skillName.trim()) {
        skills.push(skillName.trim());
      }
    });
  }
  // Employee base API: member_skills or skills
  else if (raw.member_skills && Array.isArray(raw.member_skills)) {
    raw.member_skills.slice(0, 15).forEach((skill: any) => {
      const skillName = typeof skill === "string" ? skill : skill.name || skill;
      if (skillName && typeof skillName === "string" && skillName.trim()) {
        skills.push(skillName.trim());
      }
    });
  }
  else if (raw.skills && Array.isArray(raw.skills)) {
    raw.skills.slice(0, 15).forEach((skill: any) => {
      const skillName = typeof skill === "string" ? skill : skill.name || skill;
      if (skillName && typeof skillName === "string" && skillName.trim()) {
        skills.push(skillName.trim());
      }
    });
  }

  // Clean experience - only last 5 roles, cap descriptions at 500 chars
  // Filter out empty experience arrays (common in multi-source API)
  const experience = (raw.experience && Array.isArray(raw.experience) && raw.experience.length > 0)
    ? raw.experience
        .slice(0, 5) // Only last 5 roles
        .map((exp: any) => {
          const description = exp.description || exp.experience_description || "";
          const cleanedDescription = stripHtml(description).substring(0, 500);
          
          return {
            title: exp.position_title || exp.title || "Unknown",
            company: exp.company_name || "Unknown",
            duration_months: calculateDurationMonths(
              exp.start_date || exp.date_from,
              exp.end_date || exp.date_to,
              exp.is_current || exp.active_experience === 1
            ),
            description: cleanedDescription || null,
          };
        })
        .filter((exp: any) => exp.title !== "Unknown" && exp.company !== "Unknown")
    : [];

  // Clean education - only most recent 3
  const education = (raw.education || [])
    .slice(0, 3)
    .map((edu: any) => ({
      school: edu.institution_name || edu.school_name || "Unknown",
      degree: edu.degree || null,
      field: edu.field_of_study || null,
    }))
    .filter((edu: any) => edu.school !== "Unknown");

  // Clean certifications - only most recent 5, filter empty arrays
  const certifications = (raw.certifications && Array.isArray(raw.certifications) && raw.certifications.length > 0)
    ? raw.certifications
        .slice(0, 5)
        .map((cert: any) => ({
          name: cert.title || cert.name || "Unknown",
          issuer: cert.issuer || null,
        }))
        .filter((cert: any) => cert.name !== "Unknown")
    : [];

  // Extract GitHub repos (multi-source API) - filter out repos with 0 contributions
  const github_repos = (raw.github_repos_summary && Array.isArray(raw.github_repos_summary))
    ? raw.github_repos_summary
        .filter((repo: any) => repo.contributions_count > 0) // Filter out dead repos
        .slice(0, 10) // Top 10 repos only
        .map((repo: any) => ({
          name: repo.name || "Unknown",
          summary: repo.summary || null,
          contributions_count: repo.contributions_count || 0,
        }))
        .filter((repo: any) => repo.name !== "Unknown")
    : undefined;

  // Extract location
  const location = raw.location_full || raw.location || null;

  return {
    full_name,
    headline,
    summary,
    location,
    skills,
    github_repos,
    experience,
    education,
    certifications,
  };
}

/**
 * Clean and optimize multiple CoreSignal profiles
 * Returns a condensed summary suitable for prompt injection
 */
export function compressCoreSignalProfiles(profiles: any[]): string {
  if (!profiles || profiles.length === 0) return "";

  const cleaned = profiles.map(cleanCoreSignalProfile);

  // Create a condensed summary instead of full profiles
  const summaries = cleaned.map((profile, idx) => {
    const skills = profile.skills.slice(0, 10).join(", ");
    const topExperience = profile.experience && profile.experience.length > 0
      ? profile.experience.slice(0, 2)
          .map(exp => `${exp.title} at ${exp.company} (${exp.duration_months || "?"} months)`)
          .join("; ")
      : "N/A";
    const education = profile.education && profile.education.length > 0
      ? profile.education.map(edu => 
          `${edu.degree || ""} ${edu.field || ""} from ${edu.school}`.trim()
        ).join("; ")
      : "N/A";
    const github = profile.github_repos && profile.github_repos.length > 0
      ? profile.github_repos.slice(0, 3)
          .map(repo => `${repo.name} (${repo.contributions_count} contributions)`)
          .join(", ")
      : null;

    let summary = `${idx + 1}. ${profile.full_name}${profile.headline ? ` - ${profile.headline}` : ""}`;
    if (profile.location) {
      summary += `\n   Location: ${profile.location}`;
    }
    summary += `\n   Skills: ${skills || "N/A"}`;
    if (topExperience !== "N/A") {
      summary += `\n   Experience: ${topExperience}`;
    }
    if (education !== "N/A") {
      summary += `\n   Education: ${education}`;
    }
    if (github) {
      summary += `\n   GitHub: ${github}`;
    }
    return summary;
  }).join("\n\n");

  return `### PEER PROFILES (${cleaned.length} professionals):
${summaries}

Use these profiles to identify common skills, experiences, and qualifications needed for this role.`;
}

/**
 * Estimate token count for cleaned profile (rough approximation)
 */
export function estimateTokenCount(profile: CleanedCoreSignalProfile): number {
  // Rough estimate: 1 token ≈ 4 characters
  const text = JSON.stringify(profile);
  return Math.ceil(text.length / 4);
}

/**
 * Distill multi-source employee API data to only high-value fields
 * This is the most aggressive optimization - removes 95%+ of noise
 */
export function distillMultiSourceData(raw: any): {
  name: string;
  location: string | null;
  skills: string[];
  github: Array<{
    repo: string;
    desc: string | null;
    contributions: number;
  }>;
} {
  return {
    name: raw.full_name || `${raw.first_name || ""} ${raw.last_name || ""}`.trim() || "Unknown",
    location: raw.location_full || raw.location_city || null,
    skills: (raw.historical_skills || []).slice(0, 15),
    github: (raw.github_repos_summary || [])
      .filter((r: any) => r.contributions_count > 0) // Filter out dead repos
      .slice(0, 10) // Top 10 repos only
      .map((r: any) => ({
        repo: r.name || "Unknown",
        desc: r.summary || null,
        contributions: r.contributions_count || 0,
      }))
      .filter((r: any) => r.repo !== "Unknown"),
  };
}

/**
 * Estimate token savings from cleaning
 */
export function estimateSavings(rawProfile: any, cleanedProfile: CleanedCoreSignalProfile): {
  rawTokens: number;
  cleanedTokens: number;
  savings: number;
  savingsPercent: number;
} {
  const rawText = JSON.stringify(rawProfile);
  const rawTokens = Math.ceil(rawText.length / 4);
  const cleanedTokens = estimateTokenCount(cleanedProfile);
  const savings = rawTokens - cleanedTokens;
  const savingsPercent = rawTokens > 0 ? (savings / rawTokens) * 100 : 0;

  return {
    rawTokens,
    cleanedTokens,
    savings,
    savingsPercent,
  };
}
