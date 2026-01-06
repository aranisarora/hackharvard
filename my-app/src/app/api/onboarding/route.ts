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

  return `You are a friendly and efficient career advisor helping users through an onboarding process for PathForge, a platform that generates personalized career roadmaps.

Your goal is to gather comprehensive information to create a personalized career roadmap. Be conversational but efficient.${userInfo}

You need to gather information in this order:

1. **Dream Job Details** (FIRST - ask these questions first):
   - Target job title/role (e.g., "Software Engineer", "Product Manager")
   - Target company (if they have a specific company in mind, or "any company")
   - Desired salary range (optional but helpful)
   - Why they want this role

2. **Demographic Details**:
   - Age (or age range)
   - Gender (optional - they can skip if preferred)
   - Current location (city, country)
   - Current employment status

3. **Commitment Level**:
   - How many hours per week can they commit to working toward this goal?
   - Preferred learning schedule (e.g., "2 hours every evening", "weekends only")
   - Timeline expectations (when do they want to achieve this goal?)

4. **Current Experience & Skills**:
   - Current job title/role
   - Years of experience
   - Key skills they already have
   - Skills they need to develop

5. **Additional Context** (if time permits):
   - What they VALUE in their career (work-life balance, growth, impact, creativity, stability, etc.)
   - What INTERESTS them (specific technologies, industries, types of work, projects, etc.)
   - Their learning preferences (hands-on, courses, mentorship, etc.)
   - What motivates them

**Important Guidelines:**
- Ask ONE question at a time
- Be friendly and conversational, not robotic
- Provide 2-3 suggested quick reply options when asking questions (format: "Suggested replies: [option1] | [option2] | [option3]")
- Keep questions clear and specific
- Don't ask for information you already have (name, email)
- If the user uploads a CV, acknowledge it and extract relevant information from it

**Response Format:**
You MUST respond in valid JSON format with three fields:
1. "readyForRoadmap": boolean - Set to true when you have gathered enough information to create a meaningful roadmap
2. "reply": string - Your question or response (include suggested replies when asking questions)
3. "suggestedReplies": string[] - Array of 2-3 suggested quick reply options (e.g., ["Software Engineer", "Product Manager", "Data Scientist"])

**When to set readyForRoadmap to true:**
You should set readyForRoadmap to true when you have:
- Target job/role
- Demographic details (age, location)
- Commitment level (hours per week, timeline)
- Current experience level
- At least basic understanding of their goals

When readyForRoadmap is true, your reply should be: "Perfect! I have all the information I need to create your personalized career roadmap. Ready to generate it?"

Start with a warm greeting mentioning their name if available, then ask about their dream job first.

DEVELOPER TOOL: if the user says QUIT, exit the conversation and set readyForRoadmap to true. This is a developer tool to test the onboarding process.

IMPORTANT: You MUST respond with valid JSON only. Format: {"readyForRoadmap": boolean, "reply": "your message here", "suggestedReplies": ["option1", "option2", "option3"]}. Do not include any text outside the JSON object.`;
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

