import { NextResponse } from "next/server";

// Simple in-memory store (in production, use database)
let dashboardStore: {
  user: { email: string; targetJob: string; targetCompany: string };
  overallProgress: number;
  categories: Array<{
    id: string;
    title: string;
    icon: string;
    color: string;
    bgColor: string;
    tasks: Array<{ title: string; completed: boolean }>;
    progress: number;
  }>;
} | null = null;

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

export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Return stored dashboard data or defaults
  if (dashboardStore) {
    return NextResponse.json(dashboardStore);
  }

  return NextResponse.json({
    user: {
      email: "user@example.com",
      targetJob: "Software Engineer",
      targetCompany: "Google",
    },
    overallProgress: 45,
    categories: defaultCategories,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, overallProgress, categories } = body;

    if (!user || overallProgress === undefined || !categories) {
      return NextResponse.json(
        { error: "user, overallProgress, and categories are required" },
        { status: 400 }
      );
    }

    // Store the dashboard data
    dashboardStore = { user, overallProgress, categories };

    return NextResponse.json({
      success: true,
      user,
      overallProgress,
      categories,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save dashboard data" },
      { status: 500 }
    );
  }
}

