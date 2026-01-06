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
        const systemPrompt = `Based on the following user information, generate up to 3 personalized questions that will help understand their career goals and needs better:

Age: ${hardcodedAnswers.age || "Not provided"}
Location: ${hardcodedAnswers.location || "Not provided"}
Target Position: ${hardcodedAnswers.targetPosition || "Not provided"}
Target Company: ${hardcodedAnswers.targetCompany || "Not provided"}
Salary Range: ${hardcodedAnswers.salaryRange || "Not provided"}
Time Per Week: ${hardcodedAnswers.timePerWeek || "Not provided"}
Target Date: ${hardcodedAnswers.targetDate || "Not provided"}

Generate 1-3 insightful, personalized questions that explore:
- Their motivations and values in their career
- Specific skills, experiences, or areas they want to develop
- Their learning preferences and style
- Any challenges, concerns, or obstacles they face

Make the questions conversational, specific to their situation, and designed to uncover information that would help create a highly personalized career roadmap.

DO NOT ask about information that was already provided above.
Return ONLY the questions in an array format.`;

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
