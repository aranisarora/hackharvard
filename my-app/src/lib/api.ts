// API client utilities

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

// Dashboard API
export async function getDashboardData() {
  return fetchAPI<{
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
  }>("/dashboard");
}

export async function saveDashboardData(data: {
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
}) {
  return fetchAPI<{ success: boolean }>("/dashboard", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// CV API - Full CV document
export async function getCV() {
  return fetchAPI<{
    currentCV: string;
    targetCV: string;
  }>("/cv");
}

export async function updateCV(currentCV: string) {
  return fetchAPI<{ success: boolean; currentCV: string }>("/cv", {
    method: "PUT",
    body: JSON.stringify({ currentCV }),
  });
}

export async function saveCV(currentCV: string, targetCV: string) {
  return fetchAPI<{ success: boolean; currentCV: string; targetCV: string }>("/cv", {
    method: "POST",
    body: JSON.stringify({ currentCV, targetCV }),
  });
}

// CV Sections API (deprecated - keeping for backward compatibility)
export async function getCVSections() {
  return fetchAPI<{
    currentSections: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      isCompleted: boolean;
      feedback?: string;
    }>;
    targetSections: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      isCompleted: boolean;
      feedback?: string;
    }>;
  }>("/cv-sections");
}

export async function updateCVSection(
  id: string,
  data: { title?: string; content?: string; isCompleted?: boolean }
) {
  return fetchAPI<{ success: boolean; section: any }>("/cv-sections", {
    method: "PUT",
    body: JSON.stringify({ id, ...data }),
  });
}

// Roadmap API
export async function getRoadmapTasks() {
  return fetchAPI<{
    tasks: Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      checklist: Array<{ id: string; text: string; isCompleted: boolean }>;
      deadline: string;
      startDate?: string;
      endDate?: string;
      isCompleted: boolean;
      courseLink?: string;
      mentor?: {
        name: string;
        title: string;
        company: string;
        email: string;
        profileImage?: string;
        description?: string;
      };
    }>;
  }>("/roadmap");
}

export async function updateChecklistItem(
  taskId: string,
  checklistItemId: string,
  isCompleted: boolean
) {
  return fetchAPI<{ success: boolean; taskId: string; checklistItemId: string; isCompleted: boolean }>(
    "/roadmap",
    {
      method: "PATCH",
      body: JSON.stringify({ taskId, checklistItemId, isCompleted }),
    }
  );
}

export async function updateTaskDates(
  taskId: string,
  dates: { deadline?: string; startDate?: string; endDate?: string }
) {
  return fetchAPI<{ success: boolean; taskId: string; deadline?: string; startDate?: string; endDate?: string }>(
    "/roadmap",
    {
      method: "PATCH",
      body: JSON.stringify({ taskId, ...dates }),
    }
  );
}

export async function saveRoadmap(tasks: Array<{
  id: string;
  category: string;
  title: string;
  description: string;
  checklist: Array<{ id: string; text: string; isCompleted: boolean }>;
  deadline: string;
  startDate?: string;
  endDate?: string;
  isCompleted: boolean;
  courseLink?: string;
  mentor?: {
    name: string;
    title: string;
    company: string;
    email: string;
    profileImage?: string;
    description?: string;
  };
}>) {
  return fetchAPI<{ success: boolean; tasks: typeof tasks }>("/roadmap", {
    method: "POST",
    body: JSON.stringify({ tasks }),
  });
}

// CoreSignal (dummy) API
export type CoreSignalProfile = {
  id: number;
  source: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  location: string | null;
  country: string | null;
  industry: string | null;
  experience: Array<{
    title: string;
    company_name: string;
    company_id: number | null;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    description: string | null;
  }>;
  education: Array<{
    school_name: string;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
  }>;
  skills: Array<{ name: string }> | string[];
  languages: string[] | null;
  certifications: Array<{
    name: string;
    issuer: string | null;
    issue_date: string | null;
  }> | null;
  created_at: string;
  updated_at: string;
  linkedin_url?: string | null;
};

export async function fetchCoreSignalProfiles(params: {
  experience_title: string;
  experience_company_name: string;
}) {
  return fetchAPI<{
    experience_title: string;
    experience_company_name: string;
    filter: { ids: number[]; total: number };
    profiles: CoreSignalProfile[];
  }>("/coresignal", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Auth API
export async function login(email: string, password: string) {
  return fetchAPI<{
    success: boolean;
    user: { id: string; email: string; name: string };
    token: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string,
  confirmPassword: string
) {
  return fetchAPI<{
    success: boolean;
    user: { id: string; email: string; name: string };
    token: string;
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, confirmPassword }),
  });
}

// Onboarding Chat API
export async function sendOnboardingMessage(
  message: string,
  conversationHistory: Array<{
    role: "user" | "assistant";
    message: string;
    field?: string;
    timestamp: string;
  }>
) {
  return fetchAPI<{
    message: string;
    requestedField: string | null;
    readyForRoadmap: boolean;
    timestamp: string;
  }>("/onboarding", {
    method: "POST",
    body: JSON.stringify({ message, conversationHistory }),
  });
}

// Roadmap Generation API
export async function generateRoadmap(messages: Array<{
  role: "user" | "assistant";
  content?: string;
  parts?: Array<{ type: string; text: string }>;
}>) {
  return fetchAPI<{
    success: boolean;
    data: {
      initialCV: string;
      targetCV: string;
      roadmap: {
        tasks: Array<{
          id: string;
          category: string;
          title: string;
          description: string;
          checklist: Array<{ id: string; text: string; isCompleted: boolean }>;
          deadline: string;
          isCompleted: boolean;
          courseLink?: string;
          mentor?: {
            name: string;
            title: string;
            company: string;
            email: string;
          };
        }>;
      };
      dashboard: {
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
      };
    };
  }>("/roadmap/generate", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}

// Chat History API
export async function saveChatHistory(messages: Array<any>) {
  return fetchAPI<{ success: boolean; messageCount: number; timestamp: string }>("/chat/history", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}

export async function getChatHistory() {
  return fetchAPI<{ history: { messages: Array<any>; timestamp: string } }>("/chat/history");
}

// Course Linking API
export async function linkCourseAccount() {
  return fetchAPI<{ percentage: number }>("/roadmap/link-account", {
    method: "POST",
  });
}

export async function updateCourseProgress(currentPercentage: number) {
  return fetchAPI<{ percentage: number }>("/roadmap/update-progress", {
    method: "POST",
    body: JSON.stringify({ currentPercentage }),
  });
}

