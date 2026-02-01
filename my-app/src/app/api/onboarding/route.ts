import { streamChatbotResponse } from "@/services/gemini-service";
import { createClient } from "@/lib/supabase/server";

// Use Edge Runtime for lower latency
export const runtime = "edge";

// System prompt to guide the AI's behavior for onboarding
function getOnboardingSystemPrompt(userName?: string, userEmail?: string) {
  const userInfo = userName || userEmail ? `\n\n**User Information (already available, DO NOT ask for these):**
- Name: ${userName || "Not provided"}
- Email: ${userEmail || "Not provided"}

DO NOT ask for name or email - these are already known from Google sign-in.` : "";

  return `## ROLE: PATHFORGE STRATEGIC ONBOARDER
You are a high-energy, professional career strategist for PathForge. Your mission is to gather the "Golden Data" required to architect a life-changing career roadmap for the user. ${userInfo}

### CORE OBJECTIVES:
You must gather information across these 4 pillars, starting with Pillar 1:

#### PILLAR 1: THE NORTH STAR (Dream Job)
- Precise Target Role & Company.
- Motivation: The "Why" behind their ambition.
- Compensation expectations.

#### PILLAR 2: BIOMETRICS & CONTEXT (Demographics)
- Current Location, Age, and Employment Status.

#### PILLAR 3: CAPACITY & COMMITMENT
- Weekly time availability (Hours).
- Learning style & preferred schedule.
- Desired achievement deadline.

#### PILLAR 4: CURRENT FOOTPRINT (Experience)
- Modern skillset & years in industry.
- Specific skill gaps they are aware of.

### CONVERSATIONAL RULES:
1. **ONE-SHOT QUESTIONS**: Ask only ONE question at a time to avoid overwhelming the user.
2. **ACTIVE LISTENING**: If a user uploads a CV, acknowledge specific strengths found and move to the next logical question.
3. **ENGAGEMENT**: Use "Suggested Replies" to minimize user friction. Format: "Suggested replies: [Option 1] | [Option 2]".
4. **EXIT PROTOCOL**: If the user says "QUIT", immediately set 'readyForRoadmap' to true.

### OUTPUT SPECIFICATIONS:
You **MUST** output valid JSON only. **DO NOT** include any commentary outside the JSON block.

\`\`\`json
{
  "readyForRoadmap": boolean,
  "reply": "Your conversational message here",
  "suggestedReplies": ["short_option_1", "short_option_2"]
}
\`\`\`

**THRESHOLD FOR READINESS**: Set 'readyForRoadmap' to true ONLY once you have a firm grasp of Pillar 1, 2, and 3. When complete, your final reply must be: "Excellent work. I have the foundations I need to architect your PathForge Roadmap. Shall we begin?"`;
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages are required", { status: 400 });
    }

    // Get user data from Supabase session
    let userName: string | undefined;
    let userEmail: string | undefined;

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        userEmail = user.email;
        // Try to get name from user metadata or email
        userName = user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0];
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Continue without user data - not critical
    }

    // Generate system prompt with user info
    const systemPrompt = getOnboardingSystemPrompt(userName, userEmail);

    // Use the generic chatbot service
    const result = await streamChatbotResponse(messages, {
      systemPrompt,
      onFinish: async (result) => {
        // Parse the final response to extract JSON and metadata
        const fullText = result.text;
        console.log("[Onboarding] Full response from Gemini:", fullText);
        try {
          // Try multiple regex patterns to find valid JSON
          let jsonMatch = fullText.match(/\{[^{}]*"readyForRoadmap"[^{}]*"reply"[^{}]*\}/);
          if (!jsonMatch) {
            jsonMatch = fullText.match(/\{[\s\S]*?"readyForRoadmap"[\s\S]*?"reply"[\s\S]*?\}/);
          }
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("[Onboarding] Parsed response:", parsed);
          } else {
            console.warn("[Onboarding] No valid JSON found in response");
          }
        } catch (e) {
          console.error("[Onboarding] Failed to parse JSON response:", e);
        }
      },
    });

    // Return the streaming response with proper content type
    const response = result.toTextStreamResponse();
    response.headers.set('Content-Type', 'text/event-stream');
    response.headers.set('Cache-Control', 'no-cache');
    return response;
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

