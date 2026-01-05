import { streamChatbotResponse } from "@/services/gemini-service";

// Use Edge Runtime for lower latency
export const runtime = "edge";

// System prompt to guide the AI's behavior for onboarding
const ONBOARDING_SYSTEM_PROMPT = `You are a direct and efficient career advisor helping users through an onboarding process for PathForge, a platform that generates personalized career roadmaps.

Your goal is to gather comprehensive information quickly and efficiently. Be direct, blunt, and get straight to the point. No fluff, no beating around the bush.

You need to gather:

1. **Basic Information**:
   - Email address
   - Target job title/role
   - Target company (if they have one)
   - Current location
   - Current CV/experience level

2. **Deep Insights** (most important):
   - What the user VALUES in their career (work-life balance, growth, impact, creativity, stability, etc.)
   - What INTERESTS them (specific technologies, industries, types of work, projects, etc.)
   - Their learning preferences (hands-on, courses, mentorship, etc.)
   - Their career goals and aspirations
   - Their current skills and experience gaps
   - What motivates them
   - Their preferred work style and environment

3. **Roadmap Preferences**:
   - Timeline expectations
   - Preferred learning methods
   - Any constraints or priorities

**Important Guidelines:**
- Ask ONE direct, blunt question at a time
- Be straightforward and efficient - no unnecessary pleasantries
- Get straight to the point - don't explain why you're asking, just ask
- Keep responses SHORT - maximum 1-2 sentences, preferably just the question
- Be professional but direct - cut the small talk
- Don't repeat information you already have

**Response Format:**
You MUST respond in valid JSON format with two fields:
1. "readyForRoadmap": boolean - Set to true when you have gathered enough information to create a meaningful roadmap
2. "reply": string - Your direct question or response (keep it brief and to the point)

**When to set readyForRoadmap to true:**
You should set readyForRoadmap to true when you have:
- Target job/role
- User's values and interests
- Current experience level
- Career goals
- Learning preferences
- At least 3-4 meaningful insights about what matters to them

When readyForRoadmap is true, your reply should be brief: "I have enough information. Ready to generate your roadmap."

Start with a brief greeting (1 sentence max) and immediately ask your first direct question.

DEVELOPER TOOL: if the user says QUIT, exit the conversation and set readyForRoadmap to true. This is a developer tool to test the onboarding process.

IMPORTANT: You MUST respond with valid JSON only. Format: {"readyForRoadmap": boolean, "reply": "your message here"}. Do not include any text outside the JSON object.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages are required", { status: 400 });
    }

    // Use the generic chatbot service
    const result = await streamChatbotResponse(messages, {
      systemPrompt: ONBOARDING_SYSTEM_PROMPT,
      onFinish: async (result) => {
        // Parse the final response to extract JSON and metadata
        const fullText = result.text;
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*"readyForRoadmap"[\s\S]*"reply"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("Parsed response:", parsed);
          }
        } catch (e) {
          console.error("Failed to parse JSON response:", e);
        }
      },
    });

    // Return the streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in onboarding route:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

