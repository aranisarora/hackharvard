
export interface Education {
  yearRange: string;
  degree: string;
  institution: string;
  description: string;
}

export interface Experience {
  yearRange: string;
  role: string;
  company: string;
  description: string;
}

export interface Achievement {
  yearRange: string;
  title: string;
  description: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  website: string;
}

export interface ResumeData {
  name: string;
  title: string;
  profileInfo: string;
  education: Education[];
  skills: string[];
  languages: string[];
  contact: ContactInfo;
  experience: Experience[];
  achievements: Achievement[];
}

export interface ProcessingState {
  isProcessing: boolean;
  error: string | null;
}
