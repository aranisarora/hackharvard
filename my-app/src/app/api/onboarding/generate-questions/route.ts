import { generateStructuredResponse } from "@/services/gemini-service";
import { z } from "zod";

// Use Edge Runtime for lower latency
export const runtime = "edge";

// Schema for iterative question generation
const questionResponseSchema = z.object({
    question: z.string().optional().describe("A single personalized question, if more information is needed"),
    stop: z.boolean().describe("Set to true if enough information has been gathered to create a CV forecast"),
});

// Maximum number of personalized questions
const MAX_PERSONALIZED_QUESTIONS = 8;

export async function POST(request: Request) {
    try {
        const { hardcodedAnswers, cvText, previousQA } = await request.json();

        if (!hardcodedAnswers) {
            return new Response(
                JSON.stringify({ error: "Hardcoded answers are required" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        // Check if we've reached the maximum number of questions
        const questionCount = previousQA?.length || 0;
        if (questionCount >= MAX_PERSONALIZED_QUESTIONS) {
            return new Response(
                JSON.stringify({ stop: true }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        // Format previous Q&A for context
        const previousQAContext = previousQA && previousQA.length > 0
            ? previousQA.map((qa: { question: string; answer: string }, i: number) =>
                `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
            ).join("\n\n")
            : "No personalized questions asked yet.";

        // Create system prompt for iterative question generation
        const systemPrompt = `## ROLE: CAREER ROADMAP PERSONALIZATION EXPERT

You are helping gather information to create a **personalized CV forecast and career roadmap**. Your goal is to understand the user's unique situation deeply enough to generate an actionable, custom roadmap.

### CURRENT USER PROFILE:
- **Age**: ${hardcodedAnswers.age || "Not provided"}
- **Location**: ${hardcodedAnswers.location || "Not provided"}
- **Target Position**: ${hardcodedAnswers.targetPosition || "Not provided"}
- **Target Company**: ${hardcodedAnswers.targetCompany || "Not provided"}
- **Salary Range**: ${hardcodedAnswers.salaryRange || "Not provided"}
- **Weekly Commitment**: ${hardcodedAnswers.timePerWeek || "Not provided"}
- **Target Timeline**: ${hardcodedAnswers.targetDate || "Not provided"}

### USER'S CV/RESUME:
${cvText || "No CV uploaded yet."}

### PREVIOUS PERSONALIZED Q&A:
${previousQAContext}

---

## YOUR TASK:

Analyze the user's profile and CV. Determine if you have ENOUGH INFORMATION to create a comprehensive CV forecast and career roadmap.

### QUESTION GUIDELINES:
1. **Focus on CV Generation Context**: Ask questions that help build their career roadmap:
   - For **students**: college preferences, internship experience, extracurricular activities, specific skills they want to develop
   - For **career changers**: transferable skills, reasons for change, specific industry preferences
   - For **professionals**: skill gaps for target role, networking status, certification plans
2. **Be Specific**: Ask about concrete things like specific technologies, companies, courses, or experiences
3. **No Redundancy**: NEVER ask for information already in the profile or CV above
4. **One Question at a Time**: Return exactly ONE question if you need more info
5. **Know When to Stop**: If you have enough context to create a meaningful roadmap, set stop to true

### DECISION CRITERIA FOR STOPPING:
- You understand their current career stage clearly
- You know their specific goals and timeline
- You have enough context about their skills and gaps
- You can create a personalized, actionable roadmap

**Questions asked so far: ${questionCount}/${MAX_PERSONALIZED_QUESTIONS}**

If you need more information, return a question. If you have enough, return stop: true.`;

        // Call Gemini to generate the next question or stop
        const result = await generateStructuredResponse(
            [{ role: "user", content: "Based on my profile and CV, do you need any additional information to create a personalized CV forecast and career roadmap? If yes, ask ONE specific question. If you have enough information, stop." }],
            {
                systemPrompt,
                schema: questionResponseSchema,
                temperature: 0.7,
            }
        );

        const response = result.object;

        // If stop is true or no question is provided, signal completion
        if (response.stop || !response.question) {
            return new Response(
                JSON.stringify({ stop: true }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                question: response.question,
                stop: false,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error generating personalized question:", error);
        return new Response(
            JSON.stringify({
                error: "Failed to generate question",
                details: error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
