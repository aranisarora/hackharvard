import { generateStructuredResponse } from "@/services/gemini-service";
import { RoadmapGenerationSchema } from "@/features/roadmap/schemas";
import { NextResponse } from "next/server";
import type { ZodTypeAny } from "zod";

// Use Edge Runtime for lower latency
export const runtime = "edge";

type ConversationMessage = {
  role: string;
  content?: string;
};

function extractUploadedResumeText(messages?: ConversationMessage[]): string | null {
  if (!messages || messages.length === 0) return null;

  const resumeSegments: string[] = [];

  const indicatorRegex = /(uploaded[^:]*cv|uploaded[^:]*resume|resume file|cv file|curriculum vitae|resume content)/i;
  const markerRegex = /(Here is the content[^:]*:)/i;

  for (const message of messages) {
    if (message.role !== "user") continue;
    const rawContent = message.content?.trim();
    if (!rawContent) continue;

    const markerMatch = rawContent.match(markerRegex);
    const cleaned =
      markerMatch && markerMatch.index !== undefined
        ? rawContent.slice(markerMatch.index + markerMatch[0].length).trim()
        : rawContent;

    const normalized = cleaned.replace(/\r/g, "").trim();
    if (!normalized) continue;

    const hasIndicator = indicatorRegex.test(rawContent);

    // Avoid capturing short responses unless they clearly contain resume information
    if (!hasIndicator && normalized.length < 200) {
      continue;
    }

    resumeSegments.push(normalized);
  }

  if (resumeSegments.length === 0) return null;
  return resumeSegments.join("\n\n");
}

// System prompt for roadmap generation
const ROADMAP_GENERATION_SYSTEM_PROMPT = `You are an expert career advisor. Analyze the conversation and generate a detailed roadmap and target CV.

IMPORTANT: You MUST provide substantive content. Do not return empty strings or empty arrays.

Generate a comprehensive roadmap with realistic tasks and timelines. Today is 2026-01-06.

**For initialCV and targetCV:**
- initialCV: We'll supply the verbatim resume text we extracted from the conversation and should not be rewritten.
- targetCV: Output the COMPLETE, FINAL CV document the user should have. This must be the actual CV text (not feedback or descriptions). Start from the user's existing CV and ADD the missing skills, experiences, certifications, and accomplishments inline where they belong. Output ONLY the CV content itself—no explanations, no commentary, no bullet points describing what to add.

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

**Critical:** Provide real, meaningful data from the conversation. Never return empty strings for key fields like 'initialCV', 'targetCV', or 'targetJob'.
**Important:** We'll replace the 'initialCV' field with the raw resume text extracted earlier. The 'targetCV' must be the COMPLETE final CV document (not descriptions or feedback)—output it as actual resume text ready to be displayed.`;

const TARGET_CV_SECTION_PROMPT = `**TARGET CV ONLY**
Output the COMPLETE forecasted CV as plain text. This is NOT feedback—it is the actual final CV document the user should have after making all improvements.

RULES:
- Start from the user's uploaded CV and integrate the recommended additions directly into the text.
- Add new skills, certifications, experiences, and accomplishments where they naturally belong.
- Do NOT include any explanatory text, commentary, headers like "Recommended:", or meta-descriptions.
- The output must read exactly like a real CV/resume document.

Return a JSON object containing only "targetCV" with the full CV text.`;

const ROADMAP_TASKS_SECTION_PROMPT = `**ROADMAP TASKS ONLY**
Use the guidance from the main system prompt under "For Roadmap Tasks" and "For dates" to create concrete, measurable tasks that bridge the gap between this user's current resume and the target CV.
Return a JSON object containing only "roadmap" with a "tasks" array that includes the required deadlines and checklist details.`;

const DASHBOARD_SECTION_PROMPT = `**DASHBOARD ONLY**
Extract the targetJob, targetCompany, email, realistic overallProgress percentage, and logical categories as described in the system prompt under "For Dashboard".
Return a JSON object containing only "dashboard" with the expected schema fields. No roadmap or target CV details should be produced in this pass.`;

const TargetCVSegmentSchema = RoadmapGenerationSchema.pick({ targetCV: true });
const RoadmapSegmentSchema = RoadmapGenerationSchema.pick({ roadmap: true });
const DashboardSegmentSchema = RoadmapGenerationSchema.pick({ dashboard: true });



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

    const extractedResumeText = extractUploadedResumeText(messages);
    console.log(
      "[Roadmap Generate] Extracted resume text length:",
      extractedResumeText?.length ?? 0
    );

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

    const buildSegmentPrompt = (segmentTitle: string, instructions: string) =>
      `${enhancedPrompt}\n\n${segmentTitle}\n${instructions}`;

    async function runSegment(
      segmentLabel: string,
      schema: ZodTypeAny,
      instructions: string
    ) {
      console.log(`[Roadmap Generate] ${segmentLabel} segment starting...`);
      const prompt = buildSegmentPrompt(segmentLabel, instructions);
      const segmentResult = await generateStructuredResponse(messages, {
        systemPrompt: prompt,
        schema,
        maxOutputTokens: 65536,
      });
      console.log(`[Roadmap Generate] ${segmentLabel} segment completed`);
      return segmentResult;
    }

    const targetCVResult = await runSegment(
      "Target CV",
      TargetCVSegmentSchema,
      TARGET_CV_SECTION_PROMPT
    );
    const roadmapResult = await runSegment(
      "Roadmap tasks",
      RoadmapSegmentSchema,
      ROADMAP_TASKS_SECTION_PROMPT
    );
    const dashboardResult = await runSegment(
      "Dashboard",
      DashboardSegmentSchema,
      DASHBOARD_SECTION_PROMPT
    );

    const targetCV = targetCVResult.object.targetCV || "";
    const roadmap = roadmapResult.object.roadmap || { tasks: [] };
    const dashboard =
      dashboardResult.object.dashboard || {
        user: { email: "", targetJob: "", targetCompany: "" },
        overallProgress: 0,
        categories: [],
      };

    const finalData = {
      initialCV: extractedResumeText || "",
      targetCV,
      roadmap,
      dashboard,
    };

    console.log(
      "[Roadmap Generate] Final data assembled",
      {
        targetCVLength: targetCV.length,
        taskCount: roadmap.tasks?.length ?? 0,
        categoryCount: dashboard.categories?.length ?? 0,
      }
    );

    // Return the validated data
    return NextResponse.json({
      success: true,
      data: finalData,
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

