
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

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

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          title: { type: Type.STRING },
          profileInfo: { type: Type.STRING },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                yearRange: { type: Type.STRING },
                degree: { type: Type.STRING },
                institution: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["yearRange", "degree", "institution"]
            }
          },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          languages: { type: Type.ARRAY, items: { type: Type.STRING } },
          contact: {
            type: Type.OBJECT,
            properties: {
              phone: { type: Type.STRING },
              email: { type: Type.STRING },
              address: { type: Type.STRING },
              website: { type: Type.STRING },
            }
          },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                yearRange: { type: Type.STRING },
                role: { type: Type.STRING },
                company: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["yearRange", "role", "company"]
            }
          },
          achievements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                yearRange: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["yearRange", "title"]
            }
          }
        },
        required: ["name", "title", "profileInfo", "education", "experience"]
      }
    }
  });

  const parsed = JSON.parse(response.text);
  
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
