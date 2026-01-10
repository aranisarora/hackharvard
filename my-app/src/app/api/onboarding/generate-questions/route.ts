import { generateStructuredResponse } from "@/services/gemini-service";
import { z } from "zod";

// Use Edge Runtime for lower latency
export const runtime = "edge";

// Schema for the response
const questionsSchema = z.object({
    questions: z.array(z.string()).max(3).describe("Up to 3 personalized questions"),
});

export async function POST(request: Request) {
    try {
        const { hardcodedAnswers } = await request.json();

        if (!hardcodedAnswers) {
            return new Response("Hardcoded answers are required", { status: 400 });
        }

        // Create system prompt based on hardcoded answers
        const systemPrompt = `## ROLE: PERSONALIZATION ARCHITECT
Your task is to analyze the user's base profile and generate **3 HYPER-PERSONALIZED** questions that uncover the deep motivations and specific hurdles they face.

### USER CONTEXT:
- **Target Position**: ${hardcodedAnswers.targetPosition || "Not provided"}
- **Target Company**: ${hardcodedAnswers.targetCompany || "Not provided"}
- **Location**: ${hardcodedAnswers.location || "Not provided"}
- **Commitment**: ${hardcodedAnswers.timePerWeek || "Not provided"} / Week
- **Target Date**: ${hardcodedAnswers.targetDate || "Not provided"}

### QUESTION DESIGN INSTRUCTIONS:
1. **NO REDUNDANCY**: Do NOT ask for information already provided in the context above.
2. **DEPTH-FIRST**: Ask about specific skill-gap anxieties, industry-specific interests (e.g., for AI roles, ask about specific frameworks), or lifestyle constraints.
3. **TONE**: Professional, curious, and supportive.
4. **OBJECTIVE**: Uncover data points that would make a career roadmap feel "custom-built" rather than generic.

**OUTPUT**: Return an array of 1-3 questions only.`;

        // Call Gemini to generate personalized questions
        const result = await generateStructuredResponse(
            [{ role: "user", content: "Generate personalized questions based on my profile." }],
            {
                systemPrompt,
                schema: questionsSchema,
                temperature: 0.8, // Higher temperature for more creative questions
            }
        );

        return new Response(
            JSON.stringify({
                questions: result.object.questions,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Error generating personalized questions:", error);
        return new Response(
            JSON.stringify({
                error: "Failed to generate questions",
                details: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
