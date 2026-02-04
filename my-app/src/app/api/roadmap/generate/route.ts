import { generateStructuredResponse } from "@/services/gemini-service";
import { NextResponse } from "next/server";
import { z, ZodTypeAny } from "zod";
import { compressCoreSignalProfiles } from "@/utils/coresignal-optimizer";
import { aggregateUsage, logTokenUsage, TokenUsage, CostBreakdown } from "@/utils/token-tracking";
import { prepareResumeCache, createContextCache, isCacheValid } from "@/utils/context-cache";

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
  category: z.string().describe("Single broad category for this task - must be one of: Education, Certifications, Course, Skills, Experience, Portfolio, Networking, Interview Prep"),
  title: z.string(),
  description: z.string(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCompleted: z.boolean().default(false),
    link: z.string().optional().describe("URL link for this checklist item (required for Course category tasks)"),
  })),
  deadline: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  isCompleted: z.boolean().default(false),
  courseLink: z.string().optional().describe("Main course URL (required for Course category tasks)"),
  isLinked: z.boolean().default(false).describe("Whether external account is linked (for Course tasks)"),
}).refine((data) => {
  // If task has "Course" category, all checklist items must have links and courseLink must be provided
  const isCourseCategory = data.category.toLowerCase() === "course";
  if (isCourseCategory) {
    // All checklist items must have links
    const allHaveLinks = data.checklist.every(item => item.link && item.link.trim().length > 0);
    if (!allHaveLinks) {
      return false;
    }
    // courseLink must also be provided
    if (!data.courseLink || data.courseLink.trim().length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Tasks with 'Course' category must have links on all checklist items and a courseLink field",
}).transform((data) => {
  // Post-processing: Fill in missing URLs with fallback search URLs to prevent validation errors
  const isCourseCategory = data.category.toLowerCase() === "course";
  if (isCourseCategory) {
    // Extract topic from task title for fallback URL
    const topic = encodeURIComponent(data.title.split(' ').slice(0, 3).join(' '));
    
    // Fill missing courseLink with search URL
    if (!data.courseLink || data.courseLink.trim().length === 0) {
      data.courseLink = `https://www.coursera.org/search?query=${topic}`;
    }
    
    // Fill missing checklist item links with search URL
    data.checklist = data.checklist.map(item => {
      if (!item.link || item.link.trim().length === 0) {
        return {
          ...item,
          link: `https://www.coursera.org/search?query=${topic}`,
        };
      }
      return item;
    });
  }
  return data;
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

// Note: Categories are now derived from tasks via buildCategoriesFromTasks()
// No separate schema or API call needed - saves tokens and ensures sync

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

**TASK**: Generate COMPREHENSIVE, SPECIFIC, GRANULAR career tasks focused on MANDATORY PREREQUISITES and FOUNDATIONAL REQUIREMENTS. Generate as many tasks as needed to fully cover this stage (typically 5-10 tasks).

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

2. **category = SINGLE BROAD CATEGORY** - Each task has EXACTLY ONE category from this list:
   - **Education** - Formal degrees, academic programs, university enrollment
   - **Certifications** - Professional certifications and licensing exams (AWS, PMP, Bar Exam, etc.)
   - **Course** - Online courses, MOOCs, structured learning (Coursera, Udemy, LinkedIn Learning)
   - **Skills** - Hands-on practice, coding challenges, skill development exercises
   - **Experience** - Work experience, internships, jobs, practical application
   - **Portfolio** - Projects, demonstrations, building portfolio pieces
   - **Networking** - Professional connections, community, mentorship
   - **Interview Prep** - Interview preparation, mock interviews, resume optimization
   
   **⚠️ CATEGORY RULES:**
   - Each task has EXACTLY ONE category - no multiple categories
   - Categories are MUTUALLY EXCLUSIVE - if a task involves an online course, use "Course" NOT "Skills"
   - Use "Certifications" for the exam itself, use "Course" for certification prep courses
   - Use "Education" for formal degrees, use "Course" for online learning
   - ❌ BAD: Using specific categories like "Cloud Computing", "Machine Learning", "Product Management"
   - ✅ GOOD: Using broad categories like "Course", "Certifications", "Skills"

3. **Checklist = MILESTONES + RESOURCES** (3-5 items)
   - Include progress milestones: "Complete first 50 problems", "Finish Module 3"
   - Include reading/study resources: "Read: Cracking the Coding Interview Ch.1-5"
   - For education: "Complete prerequisite courses", "Maintain 3.5+ GPA", "Research program requirements"
   - **FOR COURSE CATEGORY ONLY**: Each checklist item MUST have a "link" field with a URL to the specific module/lesson
   - ❌ BAD: Listing separate tasks as checklist items

4. **Description** = Brief explanation of WHY this task matters for their career goal

5. **COURSE CATEGORY REQUIREMENTS** (when category is "Course"):
   - MUST include "courseLink" field with a REAL, ACTUAL course URL from a known platform
   - MUST include "isLinked" field set to false
   - Each checklist item MUST have a "link" field pointing to a REAL course module/lesson URL
   
   **⚠️ CRITICAL: USE REAL COURSE URLs FROM THESE PLATFORMS:**
   - Coursera: https://www.coursera.org/learn/[course-name]
   - Udemy: https://www.udemy.com/course/[course-name]
   - LinkedIn Learning: https://www.linkedin.com/learning/[course-name]
   - edX: https://www.edx.org/learn/[topic]/[course]
   - Pluralsight: https://www.pluralsight.com/courses/[course-name]
   - freeCodeCamp: https://www.freecodecamp.org/learn/[certification]
   - Khan Academy: https://www.khanacademy.org/[subject]
   
   **EXAMPLES OF REAL COURSES:**
   - Machine Learning: "https://www.coursera.org/learn/machine-learning-course"
   - Python: "https://www.udemy.com/course/100-days-of-code"
   - AWS: "https://www.coursera.org/professional-certificates/aws-cloud-solutions-architect"
   - React: "https://www.udemy.com/course/react-the-complete-guide-incl-redux"
   - Data Science: "https://www.coursera.org/professional-certificates/ibm-data-science"
   - SQL: "https://www.linkedin.com/learning/sql-essential-training"
   
   **Checklist items should link to REAL module/section URLs:**
   - Example: { id: "1", text: "Complete Week 1: Introduction", isCompleted: false, link: "https://www.coursera.org/learn/machine-learning-course/home/week/1" }
   
   **⚠️ CRITICAL FALLBACK FOR MISSING URLs:**
   - If you cannot find a specific course URL, DO NOT leave it blank (this will cause validation errors)
   - Instead, use a search query URL: https://www.coursera.org/search?query=[Topic] or https://www.udemy.com/courses/search/?q=[Topic]
   - Example: If you can't find exact "Machine Learning" course URL, use: "https://www.coursera.org/search?query=machine%20learning"
   - For checklist items without specific module URLs, use the main course search URL
   - This ensures the schema validation passes and users can still find relevant courses

6. **Dates**: YYYY-MM-DD format, starting from {{TODAY}}

**OUTPUT**: JSON with field "tasks" (array of task objects with id, category (single string), title, description, checklist, startDate, endDate, and for Course tasks: courseLink, isLinked)`;

const TASKS_BATCH_2_PROMPT = `${BASE_CONTEXT}

**TASK**: Generate COMPREHENSIVE, ADDITIONAL SPECIFIC career tasks focusing on LATER-STAGE MILESTONES and CAREER ADVANCEMENT. Generate as many tasks as needed to fully cover this stage (typically 5-10 tasks).

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

2. **category = SINGLE BROAD CATEGORY** - Each task has EXACTLY ONE category from this list:
   - **Education** - Formal degrees, academic programs
   - **Certifications** - Professional certifications and licensing exams
   - **Course** - Online courses, MOOCs, structured learning platforms
   - **Skills** - Hands-on practice, coding challenges, skill exercises
   - **Experience** - Work experience, internships, practical application
   - **Portfolio** - Projects, demonstrations, portfolio building
   - **Networking** - Professional connections, community involvement
   - **Interview Prep** - Interview preparation, mock interviews
   
   **⚠️ MUST USE THE SAME CATEGORIES AS BATCH 1** - no new categories
   - Each task has EXACTLY ONE category - no multiple categories
   - ❌ BAD: Creating topic-specific categories like "Cloud Computing", "Data Science"
   - ✅ GOOD: Using broad categories like "Course", "Certifications", "Experience"

3. **Checklist = MILESTONES + RESOURCES** (3-5 items)
   - Progress markers: "Register for exam", "Complete practice tests", "Submit application"
   - Resources: "Study: Barbri/Kaplan prep materials", "Read: industry-specific guides"
   - **FOR COURSE CATEGORY ONLY**: Each checklist item MUST have a "link" field with a URL to the specific module/lesson

4. **Focus areas**: Professional licensing, graduate program completion, practical experience, networking

5. **COURSE CATEGORY REQUIREMENTS** (when category is "Course"):
   - MUST include "courseLink" field with a REAL, ACTUAL course URL from a known platform
   - MUST include "isLinked" field set to false
   - Each checklist item MUST have a "link" field pointing to a REAL course module/lesson URL
   
   **⚠️ USE REAL COURSE URLs FROM THESE PLATFORMS:**
   - Coursera, Udemy, LinkedIn Learning, edX, Pluralsight, freeCodeCamp, Khan Academy
   
   **EXAMPLES:**
   - Leadership: "https://www.coursera.org/specializations/strategic-leadership"
   - Project Management: "https://www.coursera.org/professional-certificates/google-project-management"
   - Business Analytics: "https://www.linkedin.com/learning/paths/become-a-business-analyst"
   - Finance: "https://www.coursera.org/specializations/finance"
   
   **⚠️ CRITICAL FALLBACK FOR MISSING URLs:**
   - If you cannot find a specific course URL, DO NOT leave it blank (this will cause validation errors)
   - Instead, use a search query URL: https://www.coursera.org/search?query=[Topic] or https://www.udemy.com/courses/search/?q=[Topic]
   - Example: If you can't find exact "Machine Learning" course URL, use: "https://www.coursera.org/search?query=machine%20learning"
   - For checklist items without specific module URLs, use the main course search URL
   - This ensures the schema validation passes and users can still find relevant courses

6. **Dates**: YYYY-MM-DD format, after {{TODAY}} and AFTER the prerequisite tasks from Batch 1

**OUTPUT**: JSON with field "tasks" (array of task objects with id, category (single string), title, description, checklist, startDate, endDate, and for Course tasks: courseLink, isLinked)`;


const DASHBOARD_USER_PROMPT = `${BASE_CONTEXT}

**TASK**: Extract user profile info and calculate their current progress toward target role.

**RULES**:
1. Extract targetJob and targetCompany from context
2. Calculate overallProgress (0-100) based on skill gap analysis
3. Be realistic - don't default to 0% or 100%

Return JSON with fields: "user" (object with email, targetJob, targetCompany), "overallProgress" (number)`;

// Removed: DASHBOARD_CATEGORIES_PROMPT
// Categories are now automatically derived from task categories via buildCategoriesFromTasks()
// This ensures perfect sync between Roadmap and Dashboard while saving tokens

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  try {
    console.log("[Roadmap Generate] Starting roadmap generation...");
    const { messages, onboardingData, resumes, targetCV: preGeneratedTargetCV } = await request.json();
    console.log("[Roadmap Generate] Messages:", messages?.length || 0);
    console.log("[Roadmap Generate] Resumes:", resumes?.length || 0);
    console.log("[Roadmap Generate] Pre-generated Target CV provided:", !!preGeneratedTargetCV);

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

    // ============================================================================
    // OPTIMIZATION: Compress CoreSignal resume data before sending to Gemini
    // ============================================================================
    let optimizedResumeContext = "";
    let resumeCacheId: string | undefined;

    if (resumes && resumes.length > 0) {
      console.log(`[Roadmap Generate] Optimizing ${resumes.length} CoreSignal profiles...`);
      
      // Compress resumes to reduce token count by ~80%
      const compressedResumes = compressCoreSignalProfiles(resumes);
      optimizedResumeContext = compressedResumes;
      
      // Create context cache for sample resumes (if large enough)
      try {
        if (compressedResumes.length > 0) {
          resumeCacheId = createContextCache(compressedResumes, 24); // 24 hour TTL
          console.log(`[Roadmap Generate] Created resume context cache: ${resumeCacheId}`);
        }
      } catch (error) {
        console.warn("[Roadmap Generate] Failed to create context cache:", error);
      }
    }

    // Update shared context with optimized resume data
    if (optimizedResumeContext) {
      sharedContext = optimizedResumeContext + "\n" + sharedContext;
    }

    // Track token usage across all API calls
    const allUsages: TokenUsage[] = [];

    // Helper to create segment prompts with full context
    const buildPrompt = (segmentPrompt: string) => {
      return `${segmentPrompt.replace(/{{TODAY}}/g, today)}\n\n---\n${sharedContext}`;
    };

    const startTime = Date.now();
    let generatedTargetCV: string;

    // PHASE 1: Generate Target CV first (so roadmap can use it as context)
    // Skip if targetCV is already provided (pre-generated via separate API)
    if (preGeneratedTargetCV) {
      console.log("[Roadmap Generate] Using pre-generated Target CV (skipping Phase 1)");
      generatedTargetCV = preGeneratedTargetCV;
    } else {
      console.log("[Roadmap Generate] Phase 1: Generating Target CV...");

      const targetCVResult = await withTimeout(
        generateStructuredResponse(messages, {
          systemPrompt: buildPrompt(TARGET_CV_PROMPT),
          schema: TargetCVSchema,
          maxOutputTokens: 16384,
          trackUsage: true,
          cacheId: resumeCacheId, // Use cached resumes if available
        }),
        600000,
        "Target CV generation"
      ).catch(err => {
        console.error("[Phase 1 - Target CV] Error:", err);
        return { object: { targetCV: "" } };
      });

      // Track token usage
      if (targetCVResult.usage) {
        allUsages.push(targetCVResult.usage);
      }

      const cvDuration = Date.now() - startTime;
      console.log(`[Roadmap Generate] Phase 1 completed in ${cvDuration}ms`);
      generatedTargetCV = targetCVResult.object.targetCV || "";
    }

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
          trackUsage: true,
          cacheId: resumeCacheId,
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
          trackUsage: true,
          cacheId: resumeCacheId,
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
          trackUsage: true,
          cacheId: resumeCacheId,
        }),
        600000,
        "Dashboard User Info generation"
      ).catch(err => {
        console.error("[Segment 4 - Dashboard User] Error:", err);
        return { object: { user: { email: "", targetJob: "", targetCompany: "" }, overallProgress: 0, categoryProgress: [] } };
      }),
    ]);

    // Track token usage from all parallel calls
    [tasksBatch1Result, tasksBatch2Result, dashboardUserResult].forEach((result: any) => {
      if (result.usage) {
        allUsages.push(result.usage);
      }
    });

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

      // Group tasks by category (each task has exactly one category now)
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
      targetCV: generatedTargetCV || "",
      roadmap: {
        tasks: allTasks,
      },
      dashboard: {
        user: dashboardUserResult.object.user || { email: "", targetJob: "", targetCompany: "" },
        overallProgress: dashboardUserResult.object.overallProgress || 0,
        categories: derivedCategories,
      },
    };

    // ============================================================================
    // TOKEN USAGE & COST ANALYSIS
    // ============================================================================
    let totalCost: CostBreakdown | undefined;
    if (allUsages.length > 0) {
      const aggregatedUsage = aggregateUsage(allUsages);
      totalCost = logTokenUsage("[Roadmap Generate] TOTAL", aggregatedUsage);
      console.log(`[Roadmap Generate] Total API calls: ${allUsages.length}`);
      console.log(`[Roadmap Generate] Total cost: $${totalCost.totalCost.toFixed(4)}`);
    }

    console.log("[Roadmap Generate] Final data:", {
      targetCVLength: finalData.targetCV.length,
      taskCount: allTasks.length,
      categoryCount: derivedCategories.length,
    });

    return NextResponse.json({
      success: true,
      data: finalData,
      // Include token usage and cost in response (for monitoring/debugging)
      ...(totalCost && {
        usage: {
          totalTokens: allUsages.reduce((sum, u) => sum + u.totalTokenCount, 0),
          inputTokens: totalCost.inputTokens,
          outputTokens: totalCost.outputTokens,
          cachedTokens: totalCost.cachedTokens,
          cost: totalCost.totalCost,
        },
      }),
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
