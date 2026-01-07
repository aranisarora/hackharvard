
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ResumeData } from "../types";

const genAI = new GoogleGenerativeAI(process.env.API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const parseResumeText = async (
  rawText: string
): Promise<ResumeData> => {
  const prompt = `
    Transform the following raw resume text into a structured JSON object for a premium executive CV.
    
    CRITICAL INSTRUCTIONS:
    1. REWRITE EXPERIENCE BULLETS: Use strong action verbs. Be concise but comprehensive.
    2. LAYOUT TARGET: Aim for a high-impact professional design.
    3. QUANTIFY RESULTS: Add metrics, percentages, or dollar amounts.
    4. ATS OPTIMIZATION: Ensure section titles are standard.
    5. TONE: Senior-level, professional, and impact-driven.
    6. PROHIBITED TEXT: Absolutely DO NOT include phrases like "Available upon request", "References available upon request", or any mention of references. 
    
    Raw Text:
    ${rawText}
  `;

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const response = await model.generateContent(prompt);
  const responseText = response.response.text();
  const parsed = JSON.parse(responseText);
  
  // Strict post-processing filter for forbidden phrases
  const cleanDescription = (desc: string) => {
    if (!desc) return "";
    return desc
      .replace(/references\s+available\s+upon\s+request\.?/gi, "")
      .replace(/available\s+upon\s+request\.?/gi, "")
      .trim();
  };

  return {
    ...parsed,
    profileInfo: cleanDescription(parsed.profileInfo || ""),
    skills: parsed.skills || [],
    languages: parsed.languages || [],
    achievements: (parsed.achievements || []).map((a: any) => ({ ...a, description: cleanDescription(a.description || "") })),
    experience: (parsed.experience || []).map((e: any) => ({ ...e, description: cleanDescription(e.description || "") })),
    contact: {
      phone: parsed.contact?.phone || "",
      email: parsed.contact?.email || "",
      address: parsed.contact?.address || "",
      website: parsed.contact?.website || "",
    }
  };
};
