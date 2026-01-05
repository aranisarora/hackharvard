// Types for user data and onboarding
export interface UserProfile {
  id: string;
  email: string;
  password: string;
  age: number;
  location: string;
  gender?: string;
  targetJob: string;
  targetCompany: string;
  targetSalary: string;
  weeklyHours: number;
  timeframe: string;
  passions: string;
  geographicRestrictions: string;
  additionalGoals: string;
  cvFile?: File;
  createdAt: string;
}

export interface CVSection {
  id: string;
  type: 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards';
  title: string;
  content: string;
  isCompleted: boolean;
  isGreyedOut: boolean;
  feedback?: string;
}

export interface TargetCV {
  sections: CVSection[];
  generalFeedback: string[];
  progressPercentage: number;
}

export interface RoadmapTask {
  id: string;
  category: 'skills' | 'projects' | 'certifications' | 'experience' | 'cv-feedback';
  title: string;
  description: string;
  checklist: ChecklistItem[];
  deadline: string;
  isCompleted: boolean;
  courseLink?: string;
  mentor?: MentorInfo;
  certificateUploaded?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface MentorInfo {
  name: string;
  title: string;
  company: string;
  email: string;
}

export interface OnboardingStep {
  id: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'file' | 'textarea';
  question: string;
  field: keyof UserProfile;
  required: boolean;
  placeholder?: string;
  options?: string[];
  suggestions?: string[];
  validation?: (value: string) => string | null;
}

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

// Coresignal API types
export interface EmployeeSearchResult {
  id: number;
}

export interface EmployeeProfile {
  id: number;
  name: string;
  title: string;
  company: string;
  location: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
}

export interface ExperienceItem {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
}
