import { NextResponse } from "next/server";

// Simple in-memory store (in production, use database)
let roadmapStore: {
  tasks: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    checklist: Array<{ id: string; text: string; isCompleted: boolean; link?: string }>;
    deadline: string;
    startDate?: string;
    endDate?: string;
    isCompleted: boolean;
    courseLink?: string;
    isLinked?: boolean;
    mentor?: {
      name: string;
      title: string;
      company: string;
      email: string;
      profileImage?: string;
      description?: string;
    };
  }>;
} | null = null;

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


export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Return stored roadmap or defaults
  return NextResponse.json({
    tasks: roadmapStore?.tasks || defaultRoadmapTasks
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tasks } = body;

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "tasks array is required" },
        { status: 400 }
      );
    }

    // Store the roadmap
    roadmapStore = { tasks };

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save roadmap" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { taskId, checklistItemId, isCompleted, deadline, startDate, endDate } = body;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Update task dates if provided
  if (roadmapStore && taskId && (deadline !== undefined || startDate !== undefined || endDate !== undefined)) {
    const task = roadmapStore.tasks.find(t => t.id === taskId);
    if (task) {
      if (deadline !== undefined) task.deadline = deadline;
      if (startDate !== undefined) task.startDate = startDate;
      if (endDate !== undefined) task.endDate = endDate;
    }
  }

  // In a real app, this would update the database
  // For now, just return success
  return NextResponse.json({
    success: true,
    taskId,
    checklistItemId,
    isCompleted,
    deadline,
    startDate,
    endDate,
  });
}

