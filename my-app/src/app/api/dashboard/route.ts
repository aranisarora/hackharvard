import { NextResponse } from "next/server";
import { normalizeCompanyName } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

// Default dashboard data (fallback)
const defaultCategories = [
  {
    id: "skills",
    title: "Skills",
    icon: "Briefcase",
    color: "text-primary",
    bgColor: "bg-primary/10",
    tasks: [
      { title: "Learn Python for Data Analysis", completed: true },
      { title: "Complete AWS Cloud Certification", completed: false },
      { title: "Master SQL Fundamentals", completed: true },
    ],
    progress: 66,
  },
  {
    id: "experience",
    title: "Work Experience",
    icon: "FileText",
    color: "text-green-600",
    bgColor: "bg-green-600/10",
    tasks: [
      { title: "Lead a cross-functional project", completed: false },
      { title: "Mentor junior team members", completed: true },
    ],
    progress: 50,
  },
  {
    id: "certifications",
    title: "Certifications",
    icon: "GraduationCap",
    color: "text-yellow-600",
    bgColor: "bg-yellow-600/10",
    tasks: [
      { title: "Google Project Management", completed: false },
      { title: "Agile Scrum Master", completed: false },
    ],
    progress: 0,
  },
  {
    id: "awards",
    title: "Awards & Recognition",
    icon: "Award",
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    tasks: [
      { title: "Contribute to open source", completed: false },
      { title: "Publish technical article", completed: false },
    ],
    progress: 0,
  },
];

// In Supabase, we store dashboard data per user as a JSON blob:
// Table: dashboards (user_id uuid PRIMARY KEY, user_target_job text, user_target_company text,
//                    overall_progress int, categories_json jsonb, updated_at timestamptz)

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // For unauthenticated users, just return defaults
      return NextResponse.json({
        user: {
          email: "",
          targetJob: "Software Engineer",
          targetCompany: "Google",
        },
        overallProgress: 45,
        categories: defaultCategories,
      });
    }

    const { data, error } = await supabase
      .from("dashboards")
      .select(
        "user_target_job, user_target_company, overall_progress, categories_json"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[Dashboard GET] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load dashboard" },
        { status: 500 }
      );
    }

    if (data) {
      return NextResponse.json({
        user: {
          email: user.email ?? "",
          targetJob: data.user_target_job,
          targetCompany: data.user_target_company,
        },
        overallProgress: data.overall_progress,
        categories: data.categories_json ?? defaultCategories,
      });
    }

    // No stored dashboard yet – use defaults
    return NextResponse.json({
      user: {
        email: user.email ?? "",
        targetJob: "Software Engineer",
        targetCompany: "Google",
      },
      overallProgress: 45,
      categories: defaultCategories,
    });
  } catch (error) {
    console.error("[Dashboard GET] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
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
    const { user: dashboardUser, overallProgress, categories } = body as {
      user?: { email?: string; targetJob?: string; targetCompany?: string };
      overallProgress?: number;
      categories?: any[];
    };

    if (!dashboardUser || overallProgress === undefined || !categories) {
      return NextResponse.json(
        { error: "user, overallProgress, and categories are required" },
        { status: 400 }
      );
    }

    const rawCompany = dashboardUser.targetCompany || "Google";
    const jobTitle = dashboardUser.targetJob || "Software Engineer";
    const normalizedCompany = normalizeCompanyName(rawCompany, jobTitle);

    const { error } = await supabase
      .from("dashboards")
      .upsert(
        {
          user_id: user.id,
          user_target_job: jobTitle,
          user_target_company: normalizedCompany,
          overall_progress: overallProgress,
          categories_json: categories,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[Dashboard POST] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save dashboard data" },
        { status: 500 }
      );
    }

    console.log(`[Dashboard Save] Saved dashboard data:`, {
      targetJob: jobTitle,
      targetCompany: normalizedCompany,
      overallProgress,
      categoryCount: categories.length,
    });

    return NextResponse.json({
      success: true,
      user: {
        email: user.email ?? "",
        targetJob: jobTitle,
        targetCompany: normalizedCompany,
      },
      overallProgress,
      categories,
    });
  } catch (error) {
    console.error("[Dashboard POST] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to save dashboard data" },
      { status: 500 }
    );
  }
}

