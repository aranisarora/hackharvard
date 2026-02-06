import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Default roadmap tasks (fallback)
const defaultRoadmapTasks = [
  {
    id: "1",
    category: "skills",
    title: "Complete AWS Cloud Certification",
    description: "AWS Solutions Architect certification is essential for cloud infrastructure roles at Google.",
    checklist: [
      { id: "1", text: "Complete AWS Fundamentals course", isCompleted: true },
      { id: "2", text: "Study for Solutions Architect exam", isCompleted: false },
      { id: "3", text: "Take practice exams", isCompleted: false },
      { id: "4", text: "Schedule and pass certification exam", isCompleted: false },
    ],
    deadline: "2025-04-15",
    startDate: "2025-02-01",
    endDate: "2025-04-15",
    isCompleted: false,
    courseLink: "https://aws.amazon.com/training/",
    // No mentor - skills are self-learned
  },
  {
    id: "2",
    category: "projects",
    title: "Build Scalable Microservices Project",
    description: "Create a production-ready microservices application demonstrating system design skills.",
    checklist: [
      { id: "1", text: "Design system architecture", isCompleted: true },
      { id: "2", text: "Implement API gateway", isCompleted: true },
      { id: "3", text: "Add service discovery", isCompleted: false },
      { id: "4", text: "Deploy to cloud platform", isCompleted: false },
    ],
    deadline: "2025-03-20",
    startDate: "2025-01-15",
    endDate: "2025-03-20",
    isCompleted: false,
    courseLink: "https://www.coursera.org/learn/microservices",
    mentor: {
      name: "Michael Rodriguez",
      title: "Principal Engineer",
      company: "Netflix",
      email: "michael.rodriguez@netflix.com",
      profileImage: "https://i.pravatar.cc/150?img=33",
      description: "Has led projects at top tech companies, from concept to launch. Expert in microservices architecture and distributed systems.",
    },
  },
  {
    id: "3",
    category: "certifications",
    title: "Google Cloud Professional Certification",
    description: "GCP certification demonstrates expertise in Google's cloud platform.",
    checklist: [
      { id: "1", text: "Complete GCP fundamentals", isCompleted: false },
      { id: "2", text: "Study for Professional exam", isCompleted: false },
      { id: "3", text: "Pass certification exam", isCompleted: false },
    ],
    deadline: "2025-05-01",
    startDate: "2025-03-01",
    endDate: "2025-05-01",
    isCompleted: false,
    courseLink: "https://cloud.google.com/certification",
    // No mentor - certification is exam-focused
  },
  {
    id: "4",
    category: "experience",
    title: "Lead Open Source Contribution",
    description: "Contribute significantly to a major open source project to demonstrate leadership.",
    checklist: [
      { id: "1", text: "Identify suitable project", isCompleted: true },
      { id: "2", text: "Make initial contributions", isCompleted: true },
      { id: "3", text: "Become project maintainer", isCompleted: false },
    ],
    deadline: "2025-06-30",
    startDate: "2025-04-01",
    endDate: "2025-06-30",
    isCompleted: false,
    // No mentor - experience is gained through actually doing work
  },
  {
    id: "5",
    category: "cv-feedback",
    title: "Optimize CV for ATS Systems",
    description: "Update CV with keywords and formatting optimized for applicant tracking systems.",
    checklist: [
      { id: "1", text: "Research ATS-friendly formats", isCompleted: false },
      { id: "2", text: "Add relevant keywords", isCompleted: false },
      { id: "3", text: "Test CV through ATS scanner", isCompleted: false },
    ],
    deadline: "2025-02-28",
    startDate: "2025-01-01",
    endDate: "2025-02-28",
    isCompleted: false,
    // No mentor - cv-feedback is self-review focused
  },
  {
    id: "6",
    category: "course",
    title: "Advanced React Patterns",
    description: "Master advanced React concepts including hooks, context, and performance optimization.",
    checklist: [
      { id: "1", text: "Watch 'Advanced Hooks' module", isCompleted: false, link: "https://react.dev/learn/reusing-logic-with-custom-hooks" },
      { id: "2", text: "Complete 'Context API' project", isCompleted: false, link: "https://react.dev/learn/passing-data-deeply-with-context" },
      { id: "3", text: "Finish 'Performance' section", isCompleted: false, link: "https://react.dev/learn/render-and-commit" },
      { id: "4", text: "Pass final assessment", isCompleted: false, link: "https://react.dev/learn" },
    ],
    deadline: "2025-03-30",
    startDate: "2025-03-01",
    endDate: "2025-03-30",
    isCompleted: false,
    isLinked: false,
    courseLink: "https://react.dev",
    // No mentor - course is self-paced learning
  },
];

// In Supabase, we store roadmap tasks as a single JSONB column per user:
// Table: roadmaps (user_id uuid PRIMARY KEY, tasks_json jsonb, updated_at timestamptz)

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("roadmaps")
      .select("tasks_json")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[Roadmap GET] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load roadmap" },
        { status: 500 }
      );
    }

    const tasks = (data?.tasks_json as any[]) ?? defaultRoadmapTasks;

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[Roadmap GET] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to load roadmap" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tasks } = body as { tasks?: any[] };

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "tasks array is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("roadmaps")
      .upsert(
        {
          user_id: user.id,
          tasks_json: tasks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[Roadmap POST] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save roadmap" },
        { status: 500 }
      );
    }

    console.log(`[Roadmap Save] Saved roadmap data:`, {
      taskCount: tasks.length,
      taskTitles: tasks.map((t: any) => t.title).slice(0, 3),
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("[Roadmap POST] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to save roadmap" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      taskId,
      checklistItemId,
      isCompleted,
      deadline,
      startDate,
      endDate,
    } = body as {
      taskId?: string;
      checklistItemId?: string;
      isCompleted?: boolean;
      deadline?: string;
      startDate?: string;
      endDate?: string;
    };

    // Load current roadmap
    const { data, error } = await supabase
      .from("roadmaps")
      .select("tasks_json")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[Roadmap PATCH] Supabase fetch error:", error);
      return NextResponse.json(
        { error: "Failed to update roadmap" },
        { status: 500 }
      );
    }

    const tasks: any[] = (data?.tasks_json as any[]) ?? [];

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    const updatedTasks = tasks.map((task) => {
      if (task.id !== taskId) return task;

      const updatedTask = { ...task };

      // Update dates if provided
      if (deadline !== undefined) updatedTask.deadline = deadline;
      if (startDate !== undefined) updatedTask.startDate = startDate;
      if (endDate !== undefined) updatedTask.endDate = endDate;

      // Update checklist item completion if provided
      if (
        checklistItemId &&
        typeof isCompleted === "boolean" &&
        Array.isArray(updatedTask.checklist)
      ) {
        updatedTask.checklist = updatedTask.checklist.map((item: any) =>
          item.id === checklistItemId
            ? { ...item, isCompleted }
            : item
        );
        // Recompute task completion
        const checklist = updatedTask.checklist;
        if (checklist.length > 0) {
          updatedTask.isCompleted = checklist.every(
            (item: any) => item.isCompleted
          );
        }
      }

      return updatedTask;
    });

    const { error: updateError } = await supabase
      .from("roadmaps")
      .update({
        tasks_json: updatedTasks,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Roadmap PATCH] Supabase update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update roadmap" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      taskId,
      checklistItemId,
      isCompleted,
      deadline,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("[Roadmap PATCH] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update roadmap" },
      { status: 500 }
    );
  }
}
