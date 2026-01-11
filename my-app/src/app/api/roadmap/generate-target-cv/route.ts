import { generateStructuredResponse } from "@/services/gemini-service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

// Helper to wrap AI calls with timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, name: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

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

        if (!hasIndicator && normalized.length < 200) {
            continue;
        }

        resumeSegments.push(normalized);
    }

    if (resumeSegments.length === 0) return null;
    return resumeSegments.join("\n\n");
}

const TargetCVSchema = z.object({
    targetCV: z.string().describe("The complete upgraded target CV text"),
});

const TARGET_CV_PROMPT = `You are an elite career strategist. Today's date is {{TODAY}}.
CRITICAL: Return ONLY the requested JSON fields. Be concise but substantive.

**TASK**: Generate the user's target CV based on their current resume and career goals.

**RULES**:
1. Start with their existing resume and integrate new skills, projects, and certifications
2. Output only the CV text - no commentary or labels
3. Make it read like a professional document

Return JSON with field: "targetCV" (string)`;

export async function POST(request: Request) {
    try {
        console.log("[Generate Target CV] Starting...");
        const { messages, onboardingData, resumes } = await request.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: "Messages are required" }, { status: 400 });
        }

        const extractedResumeText = extractUploadedResumeText(messages);
        const today = new Date().toISOString().split('T')[0];
        const actualJobTitle = onboardingData?.hardcodedAnswers?.targetPosition || "Target Role";

        // Build context
        let sharedContext = "";

        if (resumes && resumes.length > 0) {
            sharedContext += `\n### PEER PROFILES (${resumes.length} professionals in ${actualJobTitle}):\n`;
            resumes.slice(0, 3).forEach((resume: any, idx: number) => {
                const skills = Array.isArray(resume.skills)
                    ? resume.skills.slice(0, 10).map((s: any) => typeof s === "string" ? s : s.name).join(", ")
                    : "N/A";
                sharedContext += `${idx + 1}. ${resume.headline || "Professional"} | Skills: ${skills}\n`;
            });
        }

        if (onboardingData?.hardcodedAnswers) {
            const a = onboardingData.hardcodedAnswers;
            sharedContext += `\n### USER GOALS:\n`;
            sharedContext += `Target: ${a.targetPosition || "N/A"} at ${a.targetCompany || "Any Company"}\n`;
            sharedContext += `Timeline: ${a.targetDate || "ASAP"} | Hours/week: ${a.timePerWeek || "Flexible"}\n`;
        }

        if (extractedResumeText) {
            sharedContext += `\n### USER'S CURRENT RESUME:\n${extractedResumeText.substring(0, 2000)}...\n`;
        }

        const buildPrompt = (segmentPrompt: string) => {
            return `${segmentPrompt.replace(/{{TODAY}}/g, today)}\n\n---\n${sharedContext}`;
        };

        console.log("[Generate Target CV] Calling AI...");
        const startTime = Date.now();

        const targetCVResult = await withTimeout(
            generateStructuredResponse(messages, {
                systemPrompt: buildPrompt(TARGET_CV_PROMPT),
                schema: TargetCVSchema,
                maxOutputTokens: 16384,
            }),
            300000,
            "Target CV generation"
        );

        const duration = Date.now() - startTime;
        console.log(`[Generate Target CV] Completed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            targetCV: targetCVResult.object.targetCV || "",
            initialCV: extractedResumeText || "",
        });
    } catch (error) {
        console.error("[Generate Target CV] Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to generate target CV", details: errorMessage },
            { status: 500 }
        );
    }
}
