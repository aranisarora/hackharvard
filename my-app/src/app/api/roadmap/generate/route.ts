import { generateStructuredResponse } from "@/services/gemini-service";
import { NextResponse } from "next/server";
import { z } from "zod";

// Use Node.js runtime for longer timeouts (Edge has strict limits)
export const runtime = "nodejs";
// Extend timeout for AI generation (600s = 10 minutes)
export const maxDuration = 600;

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

    // Avoid capturing short responses unless they clearly contain resume information
    if (!hasIndicator && normalized.length < 200) {
      continue;
    }

    resumeSegments.push(normalized);
  }

  if (resumeSegments.length === 0) return null;
  return resumeSegments.join("\n\n");
}

// ============================================================================
// SCHEMAS FOR EACH MICRO-SEGMENT (smaller = faster, less chance of length limit)
// ============================================================================

// Segment 1: Target CV only
const TargetCVSchema = z.object({
  targetCV: z.string().describe("The complete upgraded target CV text"),
});

// Segment 2 & 3: Individual roadmap tasks (split into batches)
const SingleTaskSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCompleted: z.boolean().default(false),
  })),
  deadline: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  isCompleted: z.boolean().default(false),
});

const TaskBatchSchema = z.object({
  tasks: z.array(SingleTaskSchema),
});

// Segment 4: Dashboard user info + progress
const DashboardUserInfoSchema = z.object({
  user: z.object({
    email: z.string().default(""),
    targetJob: z.string(),
    targetCompany: z.string(),
  }),
  overallProgress: z.number().min(0).max(100),
});

// Segment 5: Dashboard categories
const DashboardCategoriesSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    title: z.string(),
    icon: z.string(),
    color: z.string(),
    bgColor: z.string(),
    tasks: z.array(z.object({
      title: z.string(),
      completed: z.boolean().default(false),
    })),
    progress: z.number().min(0).max(100).default(0),
  })),
});

// ============================================================================
// FOCUSED PROMPTS FOR EACH MICRO-SEGMENT
// ============================================================================

const BASE_CONTEXT = `You are an elite career strategist. Today's date is {{TODAY}}.
CRITICAL: Return ONLY the requested JSON fields. Be concise but substantive.`;

const TARGET_CV_PROMPT = `${BASE_CONTEXT}

**TASK**: Generate the user's target CV based on their current resume and career goals.

**RULES**:
1. Start with their existing resume and integrate new skills, projects, and certifications
2. Output only the CV text - no commentary or labels
3. Make it read like a professional document

Return JSON with field: "targetCV" (string)`;

const TASKS_BATCH_1_PROMPT = `${BASE_CONTEXT}

**TASK**: Generate exactly 2 SPECIFIC, GRANULAR career tasks focused on MANDATORY PREREQUISITES and FOUNDATIONAL REQUIREMENTS.

**⚠️ CRITICAL - PREREQUISITE PATHWAY ANALYSIS (READ FIRST)**:
Before generating tasks, you MUST analyze the gap between the user's CURRENT education/experience and their TARGET career:

1. **MANDATORY EDUCATION REQUIREMENTS**: Does the target career require specific degrees?
   - Law: Bachelor's degree → Law School (JD) → Bar Exam
   - Medicine: Bachelor's degree → Medical School (MD/DO) → Residency → Medical License
   - Engineering: Often requires BS/MS in specific engineering field
   - Academia: Bachelor's → Master's → PhD
   - Finance/Consulting: Often requires MBA for senior roles
   - Psychology: Bachelor's → Master's/PhD → Licensing

2. **STANDARDIZED TESTS**: What exams are REQUIRED for admission or licensure?
   - Law: LSAT (for law school admission)
   - Medicine: MCAT (for medical school admission)
   - Graduate School: GRE/GMAT
   - Nursing: NCLEX
   - Accounting: CPA Exam
   - Architecture: ARE (Architect Registration Examination)

3. **PROFESSIONAL LICENSING**: What certifications are LEGALLY REQUIRED to practice?
   - Law: Bar Exam in relevant state
   - Medicine: USMLE, state medical license
   - Nursing: State nursing license
   - CPA: State CPA license
   - Engineering: PE (Professional Engineer) license

**IF THE USER'S CURRENT RESUME SHOWS HIGH SCHOOL OR EARLY COLLEGE, AND THEIR TARGET REQUIRES ADVANCED DEGREES:**
→ The FIRST tasks MUST be about obtaining required degrees and passing required standardized tests
→ Do NOT skip to skill-building tasks if foundational education is missing

**CRITICAL RULES**:
1. **Task title MUST be a SPECIFIC ACTIONABLE ITEM** - NOT a category or vague goal
   - ❌ BAD: "Improve coding skills", "Obtain certifications", "Build experience"
   - ✅ GOOD: "Complete Bachelor's Degree in Pre-Law/Political Science", "Prepare for and Pass the LSAT (Target: 170+)", "Apply to Top 20 Law Schools"

2. **Category = HIGH-LEVEL TAG** shown in top-right corner of task card
   - You may create ANY category name that fits the task (up to 12 unique categories across all tasks)
   - Examples: "Education", "Standardized Tests", "Professional Licensing", "Technical Skills", "Certifications", "Portfolio", "Networking", "Interview Prep", etc.
   - **CRITICAL - COURSE CATEGORY RULE**: Any task involving skill acquisition through:
     * Online courses (Coursera, Udemy, LinkedIn Learning, Pluralsight, etc.)
     * Learning platforms or educational websites
     * Structured tutorials or boot camps
     * Video-based learning series
     * Certification prep courses
     * MOOCs or self-paced learning programs
   - **MUST use category: "course"** (lowercase, exactly as shown)
   - NOTE: Not every roadmap needs a "course" category - only use it when tasks involve learning from courses
   - Use "Certifications" ONLY for the actual exam/certification itself, NOT the prep course

3. **Checklist = MILESTONES + RESOURCES** (3-5 items)
   - Include progress milestones: "Complete first 50 problems", "Finish Module 3"
   - Include reading/study resources: "Read: Cracking the Coding Interview Ch.1-5"
   - For education: "Complete prerequisite courses", "Maintain 3.5+ GPA", "Research program requirements"
   - ❌ BAD: Listing separate tasks as checklist items

4. **Description** = Brief explanation of WHY this task matters for their career goal

5. **Dates**: YYYY-MM-DD format, starting from {{TODAY}}

**OUTPUT**: JSON with field "tasks" (array of 2 task objects with id, category, title, description, checklist, startDate, endDate)`;

const TASKS_BATCH_2_PROMPT = `${BASE_CONTEXT}

**TASK**: Generate 2-3 ADDITIONAL SPECIFIC career tasks focusing on LATER-STAGE MILESTONES and CAREER ADVANCEMENT.

**⚠️ CRITICAL - BUILD ON PREREQUISITE PATHWAY**:
These tasks should FOLLOW the foundational requirements. Consider what comes AFTER basic education/prerequisites:

1. **PROFESSIONAL SCHOOL/GRADUATE APPLICATIONS**: If user needs advanced degrees
   - Example: "Apply to Law Schools with Personal Statement and Letters of Recommendation"
   - Example: "Complete Medical School Applications (AMCAS)"

2. **LICENSING AND CERTIFICATION EXAMS**: The final gates to practice
   - Law: Bar Exam preparation and passing
   - Medicine: USMLE Step 1, 2, 3 and residency match
   - Accounting: CPA Exam sections
   - Other: Industry-specific certifications

3. **PRACTICAL EXPERIENCE REQUIREMENTS**: Many careers require supervised practice
   - Law: Clerkships, internships at law firms
   - Medicine: Clinical rotations, residency
   - Teaching: Student teaching requirements
   - Psychology: Supervised clinical hours

4. **NETWORKING AND PROFESSIONAL DEVELOPMENT**: Building career capital
   - Professional association memberships
   - Industry conferences and events
   - Mentorship connections

**CRITICAL RULES**:
1. **Task title MUST be a SPECIFIC ACTIONABLE ITEM**
   - ❌ BAD: "Network with professionals", "Gain industry exposure"
   - ✅ GOOD: "Pass the Bar Exam in [State]", "Complete 500 Supervised Clinical Hours", "Secure Summer Associate Position at Law Firm"

2. **Category = HIGH-LEVEL TAG** - Create contextually relevant categories for each task
   - You may create ANY category name that fits (up to 12 unique categories across all tasks)
   - Examples: "Professional Licensing", "Graduate Programs", "Networking", "Experience", "Personal Branding", "Open Source", "Community", etc.
   - **CRITICAL - COURSE CATEGORY RULE**: Any task involving skill acquisition through:
     * Online courses (Coursera, Udemy, LinkedIn Learning, Pluralsight, etc.)
     * Learning platforms or educational websites
     * Structured tutorials or boot camps
     * Video-based learning series
     * Certification prep courses
     * MOOCs or self-paced learning programs
   - **MUST use category: "course"** (lowercase, exactly as shown)
   - NOTE: Not every roadmap needs a "course" category - only use it when tasks involve learning from courses

3. **Checklist = MILESTONES + RESOURCES** (3-5 items)
   - Progress markers: "Register for exam", "Complete practice tests", "Submit application"
   - Resources: "Study: Barbri/Kaplan prep materials", "Read: industry-specific guides"

4. **Focus areas**: Professional licensing, graduate program completion, practical experience, networking

5. **Dates**: YYYY-MM-DD format, after {{TODAY}} and AFTER the prerequisite tasks from Batch 1

**OUTPUT**: JSON with field "tasks" (array of 2-3 task objects with id, category, title, description, checklist, startDate, endDate)`;


const DASHBOARD_USER_PROMPT = `${BASE_CONTEXT}

**TASK**: Extract user profile info and calculate their current progress toward target role.

**RULES**:
1. Extract targetJob and targetCompany from context
2. Calculate overallProgress (0-100) based on skill gap analysis
3. Be realistic - don't default to 0% or 100%

Return JSON with fields: "user" (object with email, targetJob, targetCompany), "overallProgress" (number)`;

const DASHBOARD_CATEGORIES_PROMPT = `${BASE_CONTEXT}

**TASK**: Organize career development into logical categories (up to 12 categories).

**RULES**:
1. Create contextually relevant categories based on the user's career goals
2. Examples: "Technical Skills", "Certifications", "Experience", "Networking", "Portfolio", "Research", "Interview Prep", etc.
3. Each category needs: id, title, icon (emoji), color, bgColor, tasks array, progress
4. Keep task titles short (max 50 chars)

Return JSON with field: "categories" (array of category objects)`;

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    console.log("[Roadmap Generate] Starting 5-segment parallel generation...");
    const { messages, onboardingData, resumes } = await request.json();
    console.log("[Roadmap Generate] Messages:", messages?.length || 0);
    console.log("[Roadmap Generate] Resumes:", resumes?.length || 0);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const extractedResumeText = extractUploadedResumeText(messages);
    const today = new Date().toISOString().split('T')[0];
    const actualJobTitle = onboardingData?.hardcodedAnswers?.targetPosition || "Target Role";

    // Build shared context that will be prepended to all prompts
    let sharedContext = "";

    // Add peer resume data (condensed)
    if (resumes && resumes.length > 0) {
      sharedContext += `\n### PEER PROFILES (${resumes.length} professionals in ${actualJobTitle}):\n`;
      resumes.slice(0, 3).forEach((resume: any, idx: number) => {
        const skills = Array.isArray(resume.skills)
          ? resume.skills.slice(0, 10).map((s: any) => typeof s === "string" ? s : s.name).join(", ")
          : "N/A";
        sharedContext += `${idx + 1}. ${resume.headline || "Professional"} | Skills: ${skills}\n`;
      });
    }

    // Add user onboarding data
    if (onboardingData?.hardcodedAnswers) {
      const a = onboardingData.hardcodedAnswers;
      sharedContext += `\n### USER GOALS:\n`;
      sharedContext += `Target: ${a.targetPosition || "N/A"} at ${a.targetCompany || "Any Company"}\n`;
      sharedContext += `Timeline: ${a.targetDate || "ASAP"} | Hours/week: ${a.timePerWeek || "Flexible"}\n`;
    }

    // Add user's current resume
    if (extractedResumeText) {
      sharedContext += `\n### USER'S CURRENT RESUME:\n${extractedResumeText.substring(0, 2000)}...\n`;
    }

    // Helper to create segment prompts with full context
    const buildPrompt = (segmentPrompt: string) => {
      return `${segmentPrompt.replace(/{{TODAY}}/g, today)}\n\n---\n${sharedContext}`;
    };

    // PHASE 1: Generate Target CV first (so roadmap can use it as context)
    console.log("[Roadmap Generate] Phase 1: Generating Target CV...");
    const startTime = Date.now();

    const targetCVResult = await withTimeout(
      generateStructuredResponse(messages, {
        systemPrompt: buildPrompt(TARGET_CV_PROMPT),
        schema: TargetCVSchema,
        maxOutputTokens: 16384,
      }),
      600000,
      "Target CV generation"
    ).catch(err => {
      console.error("[Phase 1 - Target CV] Error:", err);
      return { object: { targetCV: "" } };
    });

    const cvDuration = Date.now() - startTime;
    console.log(`[Roadmap Generate] Phase 1 completed in ${cvDuration}ms`);

    // Add the generated target CV to context for roadmap generation
    const generatedTargetCV = targetCVResult.object.targetCV || "";
    const initialCV = extractedResumeText || "";

    const buildPromptWithCV = (segmentPrompt: string) => {
      let prompt = buildPrompt(segmentPrompt);

      // Add CV gap analysis context
      prompt += `\n\n---\n## ⚠️ CRITICAL: ROADMAP MUST BRIDGE THE GAP BETWEEN INITIAL CV AND TARGET CV\n\n`;

      if (initialCV) {
        prompt += `### USER'S CURRENT/INITIAL CV:\n${initialCV.substring(0, 2000)}...\n\n`;
      }

      if (generatedTargetCV) {
        prompt += `### GENERATED TARGET CV (what the user needs to achieve):\n${generatedTargetCV.substring(0, 2500)}...\n\n`;
      }

      prompt += `### GAP ANALYSIS INSTRUCTIONS:
1. **IDENTIFY THE DIFFERENCES**: Compare the INITIAL CV to the TARGET CV carefully
2. **EACH ROADMAP TASK MUST address a specific gap** - a skill, certification, project, or experience that exists in the TARGET CV but NOT in the INITIAL CV
3. **DO NOT create tasks for things the user already has** - check the INITIAL CV first
4. **PRIORITIZE**: Start with foundational gaps (education, prerequisites) before advanced gaps (specialized skills, projects)
5. **BE SPECIFIC**: If the target CV mentions "AWS Solutions Architect certification", create a task specifically for that certification, not a generic "learn cloud computing" task

The roadmap should be a step-by-step path that transforms the INITIAL CV into the TARGET CV.\n`;

      return prompt;
    };

    // PHASE 2: Generate roadmap tasks and dashboard info in parallel (using target CV as context)
    console.log("[Roadmap Generate] Phase 2: Generating roadmap tasks with Target CV context...");
    const phase2Start = Date.now();

    const [
      tasksBatch1Result,
      tasksBatch2Result,
      dashboardUserResult,
    ] = await Promise.all([
      // Segment 2: Tasks Batch 1 (600s timeout) - now uses target CV context
      withTimeout(
        generateStructuredResponse(messages, {
          systemPrompt: buildPromptWithCV(TASKS_BATCH_1_PROMPT),
          schema: TaskBatchSchema,
          maxOutputTokens: 8192,
        }),
        600000,
        "Tasks Batch 1 generation"
      ).catch(err => {
        console.error("[Segment 2 - Tasks Batch 1] Error:", err);
        return { object: { tasks: [] } };
      }),

      // Segment 3: Tasks Batch 2 (600s timeout) - now uses target CV context
      withTimeout(
        generateStructuredResponse(messages, {
          systemPrompt: buildPromptWithCV(TASKS_BATCH_2_PROMPT),
          schema: TaskBatchSchema,
          maxOutputTokens: 8192,
        }),
        600000,
        "Tasks Batch 2 generation"
      ).catch(err => {
        console.error("[Segment 3 - Tasks Batch 2] Error:", err);
        return { object: { tasks: [] } };
      }),

      // Segment 4: Dashboard User Info (600s timeout)
      withTimeout(
        generateStructuredResponse(messages, {
          systemPrompt: buildPrompt(DASHBOARD_USER_PROMPT),
          schema: DashboardUserInfoSchema,
          maxOutputTokens: 4096,
        }),
        600000,
        "Dashboard User Info generation"
      ).catch(err => {
        console.error("[Segment 4 - Dashboard User] Error:", err);
        return { object: { user: { email: "", targetJob: "", targetCompany: "" }, overallProgress: 0, categoryProgress: [] } };
      }),
    ]);

    const phase2Duration = Date.now() - phase2Start;
    const totalDuration = Date.now() - startTime;
    console.log(`[Roadmap Generate] Phase 2 completed in ${phase2Duration}ms`);
    console.log(`[Roadmap Generate] Total generation time: ${totalDuration}ms`);

    // Merge all tasks from both batches and ensure unique IDs
    const batch1Tasks = tasksBatch1Result.object.tasks || [];
    const batch2Tasks = tasksBatch2Result.object.tasks || [];
    const allTasks = [
      ...batch1Tasks.map((task: any, idx: number) => ({
        ...task,
        id: `task_batch1_${idx + 1}_${Date.now()}`, // Unique ID for batch 1
      })),
      ...batch2Tasks.map((task: any, idx: number) => ({
        ...task,
        id: `task_batch2_${idx + 1}_${Date.now()}`, // Unique ID for batch 2
      })),
    ];

    // DERIVE categories from actual roadmap tasks (ensures sync with roadmap page)
    const buildCategoriesFromTasks = (tasks: any[]) => {
      const categoryMap = new Map<string, {
        tasks: { title: string; completed: boolean }[];
        totalChecklist: number;
        completedChecklist: number;
      }>();

      // Group tasks by category
      tasks.forEach(task => {
        const categoryKey = task.category || "General";
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            tasks: [],
            totalChecklist: 0,
            completedChecklist: 0,
          });
        }
        const cat = categoryMap.get(categoryKey)!;
        cat.tasks.push({
          title: task.title || "Untitled Task",
          completed: task.isCompleted || false,
        });
        // Count checklist items for progress
        const checklist = task.checklist || [];
        cat.totalChecklist += checklist.length;
        cat.completedChecklist += checklist.filter((c: any) => c.isCompleted).length;
      });

      // Category visual config - expanded to handle common AI-generated names
      const categoryConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
        // Education and Prerequisites
        "Education": { icon: "🎓", color: "text-sky-600", bgColor: "bg-sky-100" },
        "Standardized Tests": { icon: "📝", color: "text-red-600", bgColor: "bg-red-100" },
        "Professional Licensing": { icon: "⚖️", color: "text-amber-700", bgColor: "bg-amber-50" },
        "Licensing": { icon: "⚖️", color: "text-amber-700", bgColor: "bg-amber-50" },
        "Graduate Programs": { icon: "🏛️", color: "text-violet-600", bgColor: "bg-violet-100" },
        // Technical/Skills variations
        "Technical Skills": { icon: "💻", color: "text-blue-600", bgColor: "bg-blue-100" },
        "Technical": { icon: "💻", color: "text-blue-600", bgColor: "bg-blue-100" },
        "Skills": { icon: "💻", color: "text-blue-600", bgColor: "bg-blue-100" },
        "Coding": { icon: "💻", color: "text-blue-600", bgColor: "bg-blue-100" },
        // Certifications
        "Certifications": { icon: "🏆", color: "text-amber-600", bgColor: "bg-amber-100" },
        "Certification": { icon: "🏆", color: "text-amber-600", bgColor: "bg-amber-100" },
        // Portfolio/Projects
        "Portfolio": { icon: "📁", color: "text-emerald-600", bgColor: "bg-emerald-100" },
        "Projects": { icon: "📁", color: "text-emerald-600", bgColor: "bg-emerald-100" },
        // Networking
        "Networking": { icon: "🤝", color: "text-purple-600", bgColor: "bg-purple-100" },
        "Connections": { icon: "🤝", color: "text-purple-600", bgColor: "bg-purple-100" },
        // Experience
        "Experience": { icon: "💼", color: "text-indigo-600", bgColor: "bg-indigo-100" },
        "Work Experience": { icon: "💼", color: "text-indigo-600", bgColor: "bg-indigo-100" },
        // Personal Branding
        "Personal Branding": { icon: "✨", color: "text-pink-600", bgColor: "bg-pink-100" },
        "Branding": { icon: "✨", color: "text-pink-600", bgColor: "bg-pink-100" },
        // Courses/Learning
        "course": { icon: "📚", color: "text-teal-600", bgColor: "bg-teal-100" },
        "Courses": { icon: "📚", color: "text-teal-600", bgColor: "bg-teal-100" },
        "Learning": { icon: "📚", color: "text-teal-600", bgColor: "bg-teal-100" },
      };

      // Fallback configs for unknown categories (cycles based on hash)
      const fallbackConfigs = [
        { icon: "📋", color: "text-slate-600", bgColor: "bg-slate-100" },
        { icon: "🎯", color: "text-rose-600", bgColor: "bg-rose-100" },
        { icon: "⚡", color: "text-cyan-600", bgColor: "bg-cyan-100" },
        { icon: "🔧", color: "text-orange-600", bgColor: "bg-orange-100" },
        { icon: "📊", color: "text-violet-600", bgColor: "bg-violet-100" },
      ];

      const getConfig = (key: string) => {
        if (categoryConfig[key]) return categoryConfig[key];
        // Hash-based fallback for consistent colors
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
          hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }
        return fallbackConfigs[Math.abs(hash) % fallbackConfigs.length];
      };

      // Convert map to array
      const categories: any[] = [];
      categoryMap.forEach((data, key) => {
        const config = getConfig(key);
        const progress = data.totalChecklist > 0
          ? Math.round((data.completedChecklist / data.totalChecklist) * 100)
          : 0;

        categories.push({
          id: key.toLowerCase().replace(/\s+/g, "-"),
          title: key,
          icon: config.icon,
          color: config.color,
          bgColor: config.bgColor,
          tasks: data.tasks,
          progress,
        });
      });

      return categories;
    };

    const derivedCategories = buildCategoriesFromTasks(allTasks);

    // Assemble final response
    const finalData = {
      initialCV: extractedResumeText || "",
      targetCV: targetCVResult.object.targetCV || "",
      roadmap: {
        tasks: allTasks,
      },
      dashboard: {
        user: dashboardUserResult.object.user || { email: "", targetJob: "", targetCompany: "" },
        overallProgress: dashboardUserResult.object.overallProgress || 0,
        categories: derivedCategories,
      },
    };

    console.log("[Roadmap Generate] Final data:", {
      targetCVLength: finalData.targetCV.length,
      taskCount: allTasks.length,
      categoryCount: derivedCategories.length,
    });

    return NextResponse.json({
      success: true,
      data: finalData,
    });
  } catch (error) {
    console.error("[Roadmap Generate] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate roadmap", details: errorMessage },
      { status: 500 }
    );
  }
}
