import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, RoadmapTask, TargetCV } from '@/types';

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// This is replaced by Vite at build time via the define config.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Helper to clean JSON string if it comes wrapped in markdown code blocks
const cleanJsonString = (text: string): string => {
  if (!text) return "[]";
  return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
};

export const callGemini = async (
  prompt: string,
  model: string = 'gemini-3-flash-preview'
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    return response.text || '';
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw error;
  }
};

export const callGeminiWithContext = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: GeminiMessage[] = [],
  model: string = 'gemini-3-flash-preview'
): Promise<string> => {
  // Map internal message format to SDK format
  // Note: SDK expects { role, parts: [{ text }] }
  const historyContents = conversationHistory.map(msg => ({
    role: msg.role,
    parts: msg.parts
  }));

  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    },
    {
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }]
    },
    ...historyContents,
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    return response.text || '';
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw error;
  }
};

export const analyzeCV = async (
  cvText: string,
  targetJob: string,
  targetCompany: string,
  employeeProfiles: string
): Promise<string> => {
  const prompt = `
You are a career advisor and CV optimization expert. Analyze the following CV and compare it against successful profiles at the target company.

USER'S CURRENT CV:
${cvText}

TARGET POSITION: ${targetJob}
TARGET COMPANY: ${targetCompany}

SUCCESSFUL EMPLOYEE PROFILES AT TARGET COMPANY:
${employeeProfiles}

Please provide:
1. A detailed analysis of what the user already has that aligns with the target role
2. Key gaps and missing qualifications compared to successful employees
3. A "target CV" that includes both their current qualifications AND the missing elements (mark missing elements clearly)
4. Specific, actionable recommendations organized by category:
   - Skills to Learn (with specific course recommendations)
   - Projects to Complete
   - Certifications to Obtain
   - Experience to Gain
   - CV Wording Improvements
5. Estimated timeline for each improvement
`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      currentStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
      targetCVSections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['experience', 'education', 'skills', 'projects', 'certifications', 'awards'] },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            isCompleted: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING, nullable: true },
          },
          required: ['type', 'title', 'content', 'isCompleted']
        },
      },
      generalFeedback: { type: Type.ARRAY, items: { type: Type.STRING } },
      roadmapTasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ['skills', 'projects', 'certifications', 'experience', 'cv-feedback'] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedDays: { type: Type.NUMBER },
            courseLink: { type: Type.STRING, nullable: true },
          },
          required: ['category', 'title', 'description', 'checklist', 'estimatedDays']
        },
      },
    },
    required: ['currentStrengths', 'gaps', 'targetCVSections', 'generalFeedback', 'roadmapTasks']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'deep-research-pro-preview-12-2025',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });
    return response.text || '';
  } catch (error) {
    console.error('Error analyzing CV:', error);
    throw error;
  }
};

export const generateFollowUpQuestion = async (
  userContext: Record<string, string>,
  previousAnswers: string[]
): Promise<string> => {
  const prompt = `
You are helping a user prepare for their dream job. Based on their profile, generate a thoughtful follow-up question to better understand their goals.

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}

PREVIOUS QUESTIONS ASKED:
${previousAnswers.join('\n')}

Generate ONE insightful follow-up question that will help understand:
- Their passions and motivations
- Geographic or lifestyle constraints
- Specific career aspirations
- Timeline flexibility
- Learning preferences

Also provide 2-3 suggested responses they can choose from.
`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['question', 'suggestions']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });
    return response.text || '';
  } catch (error) {
    console.error('Error generating follow-up:', error);
    throw error;
  }
};

export const generateRoadmap = async (
  userProfile: UserProfile,
  targetCV: TargetCV | null
): Promise<RoadmapTask[]> => {
  const prompt = `
    Generate a highly detailed, personalized career roadmap for a user aiming to become a ${userProfile.targetJob} at ${userProfile.targetCompany}.
    
    User Context:
    - Current Location: ${userProfile.location}
    - Timeline: ${userProfile.timeframe}
    - Weekly Availability: ${userProfile.weeklyHours} hours
    - Passions: ${userProfile.passions}
    
    ${targetCV ? `Based on their CV Analysis, they specifically need to work on gaps identified in: ${targetCV.generalFeedback.join(', ')}` : ''}

    Create 5-7 actionable, high-impact tasks categorized into: 'skills', 'projects', 'certifications', 'experience', or 'cv-feedback'.
    
    For each task, provide:
    1. A clear title
    2. A convincing description of why this is crucial for ${userProfile.targetCompany}
    3. A realistic deadline based on the user's ${userProfile.timeframe} timeframe (from today: ${new Date().toISOString().split('T')[0]})
    4. A specific checklist of 3-5 sub-steps to complete the task
    5. A relevant course link (Coursera, Udemy, EdX, or official documentation)
    6. A fictional but realistic mentor persona from ${userProfile.targetCompany} who would recommend this.
  `;

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        category: { type: Type.STRING, enum: ['skills', 'projects', 'certifications', 'experience', 'cv-feedback'] },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        checklist: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              isCompleted: { type: Type.BOOLEAN },
            },
            required: ['id', 'text', 'isCompleted']
          },
        },
        deadline: { type: Type.STRING },
        isCompleted: { type: Type.BOOLEAN },
        courseLink: { type: Type.STRING, nullable: true },
        mentor: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            name: { type: Type.STRING },
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            email: { type: Type.STRING },
          },
          required: ['name', 'title', 'company', 'email']
        },
      },
      required: ['id', 'category', 'title', 'description', 'checklist', 'deadline', 'isCompleted']
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });
    
    const jsonString = response.text || "[]";
    return JSON.parse(cleanJsonString(jsonString));
  } catch (error) {
    console.error("Failed to generate roadmap:", error);
    return [];
  }
};
