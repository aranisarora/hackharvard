import { generateStructuredResponse } from "@/services/gemini-service";
import { RoadmapGenerationSchema } from "@/features/roadmap/schemas";
import { NextResponse } from "next/server";

// Use Edge Runtime for lower latency
export const runtime = "edge";

// System prompt for roadmap generation
const ROADMAP_GENERATION_SYSTEM_PROMPT = `You are an expert career advisor. Analyze the conversation and generate a detailed roadmap and target CV.

IMPORTANT: You MUST provide substantive content. Do not return empty strings or empty arrays.

Generate a comprehensive roadmap with realistic tasks and timelines. Today is 2026-01-06.

**For initialCV and targetCV:**
- initialCV: Extract and summarize the user's current experience, education, and skills from the conversation
- targetCV: Create a detailed description of the ideal CV needed to achieve their goal

**For Roadmap Tasks:**
- Generate at least 3-5 actionable tasks to bridge the gap between current and target state
- Each task should be concrete and measurable
- If no specific tasks are mentioned, infer reasonable career development tasks

**For dates (if generating tasks):**
- startDate: Today or up to 2 weeks from now (2026-01-06 format)
- endDate: Reflects realistic task duration (simple: 1-2 weeks, medium: 1-3 months, complex: 2-6 months)
- deadline: Must match endDate
- All dates must be in YYYY-MM-DD format and valid dates

**For Dashboard:**
- Extract targetJob, targetCompany, and email from the conversation
- If email is not provided, leave it as empty or use a placeholder
- overallProgress: CRITICAL - You MUST calculate a percentage (0-100) by comparing the initialCV to the targetCV. Analyze:
  * What percentage of required skills does the user currently have?
  * What percentage of required experience/qualifications does the user have?
  * What percentage of certifications/education requirements are met?
  * Consider the gap between current state (initialCV) and target state (targetCV)
  * Return a realistic percentage (typically 20-60% for someone starting their journey, higher if they're closer to the target)
  * DO NOT default to 0 - always calculate based on the actual comparison
- categories: If no categories are mentioned, create 3-4 logical categories (e.g., Skills, Experience, Certifications, Projects)

**For mentor information (optional):**
- If you cannot generate valid data, use null/omit the field
- If included: use realistic email addresses or leave blank
- profileImage: use valid HTTPS URLs or omit

**Critical:** Provide real, meaningful data from the conversation. Never return empty strings for key fields like initialCV, targetCV, or targetJob.`;



export async function POST(request: Request) {
  try {
    console.log("[Roadmap Generate] Starting roadmap generation...");
    const { messages, onboardingData, resumes } = await request.json();
    console.log("[Roadmap Generate] Received messages:", messages?.length || 0);
    console.log("[Roadmap Generate] Received onboarding data:", !!onboardingData);
    console.log("[Roadmap Generate] Received resumes:", resumes?.length || 0);
    
    // Debug resume data
    if (resumes && resumes.length > 0) {
      console.log("[Roadmap Generate] === RESUME DATA DEBUG ===");
      resumes.forEach((resume: any, idx: number) => {
        console.log(`Resume ${idx + 1}:`, {
          id: resume.id,
          name: resume.name,
          headline: resume.headline,
          experienceCount: resume.experience?.length || 0,
          educationCount: resume.education?.length || 0,
          skillsCount: Array.isArray(resume.skills) ? resume.skills.length : 0,
        });
      });
      console.log("[Roadmap Generate] === END RESUME DEBUG ===");
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[Roadmap Generate] Invalid messages:", messages);
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Build enhanced system prompt with resume context
    let enhancedPrompt = ROADMAP_GENERATION_SYSTEM_PROMPT;
    
    if (resumes && resumes.length > 0) {
      console.log("[Roadmap Generate] Building resume context for LLM prompt...");
      enhancedPrompt += `\n\n**RELEVANT RESUMES FROM SIMILAR PROFESSIONALS:**
You have access to ${resumes.length} resume(s) from professionals who have worked in similar roles. Use these as reference points for what successful candidates in this role typically have:

${resumes.slice(0, 5).map((resume: any, idx: number) => {
        const experiences = resume.experience?.map((exp: any) => 
          `${exp.title} at ${exp.company_name}${exp.description ? ` (${exp.description.substring(0, 100)}...)` : ""}`
        ).join("; ") || "N/A";
        
        const educations = resume.education?.map((edu: any) => 
          `${edu.degree || ""}${edu.field_of_study ? ` in ${edu.field_of_study}` : ""} from ${edu.school_name}`
        ).join("; ") || "N/A";
        
        const skills = Array.isArray(resume.skills) 
          ? resume.skills.map((s: any) => typeof s === "string" ? s : s.name).join(", ")
          : "N/A";
        
        return `
Resume ${idx + 1}:
- Name: ${resume.name || "Unknown"}
- Headline: ${resume.headline || "N/A"}
- Location: ${resume.location || "N/A"}
- Experience: ${experiences}
- Education: ${educations}
- Skills: ${skills}
- Languages: ${resume.languages?.join(", ") || "N/A"}
- Certifications: ${resume.certifications?.map((c: any) => c.name).join(", ") || "N/A"}
`;
      }).join("\n")}

Use these resumes to inform what skills, experiences, and qualifications are typically needed for this role. Analyze the patterns across these resumes to identify common requirements.`;
      console.log("[Roadmap Generate] Resume context added to prompt");
    }

    if (onboardingData?.hardcodedAnswers) {
      const answers = onboardingData.hardcodedAnswers;
      enhancedPrompt += `\n\n**USER ONBOARDING DATA:**
- Target Position: ${answers.targetPosition || "Not specified"}
- Target Company: ${answers.targetCompany || "Not specified"}
- Time Available: ${answers.timePerWeek || "Not specified"}
- Target Date: ${answers.targetDate || "Not specified"}
- Salary Range: ${answers.salaryRange || "Not specified"}
- Location: ${answers.location || "Not specified"}
- Age: ${answers.age || "Not specified"}
`;
    }

    console.log("[Roadmap Generate] Calling generateStructuredResponse with enhanced prompt...");
    // Use structured output to ensure valid response format
    const result = await generateStructuredResponse(messages, {
      systemPrompt: enhancedPrompt,
      schema: RoadmapGenerationSchema,
    });
    console.log("[Roadmap Generate] Structured response received");

    // The response is already validated against the schema
    const generatedData = result.object;
    console.log("[Roadmap Generate] Generated data keys:", Object.keys(generatedData));

    // Return the validated data
    return NextResponse.json({
      success: true,
      data: generatedData,
    });
  } catch (error) {
    console.error("Error in roadmap generation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : "";

    // Log full error for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorDetails,
      error: error,
    });

    return NextResponse.json(
      {
        error: "Failed to generate roadmap",
        details: errorMessage,
        fullError: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}

