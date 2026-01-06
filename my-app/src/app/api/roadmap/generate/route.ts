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
- overallProgress: Set to 0 (fresh start) unless stated otherwise
- categories: If no categories are mentioned, create 3-4 logical categories (e.g., Skills, Experience, Certifications, Projects)

**For mentor information (optional):**
- If you cannot generate valid data, use null/omit the field
- If included: use realistic email addresses or leave blank
- profileImage: use valid HTTPS URLs or omit

**Critical:** Provide real, meaningful data from the conversation. Never return empty strings for key fields like initialCV, targetCV, or targetJob.`;



export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Use structured output to ensure valid response format
    const result = await generateStructuredResponse(messages, {
      systemPrompt: ROADMAP_GENERATION_SYSTEM_PROMPT,
      schema: RoadmapGenerationSchema,
    });

    // The response is already validated against the schema
    const generatedData = result.object;

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

