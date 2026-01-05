import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, RoadmapTask, TargetCV } from '@/types';

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Helper to clean JSON string if it comes wrapped in markdown
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
  // Map conversation history to SDK content format
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
): Promise<TargetCV> => {
  const prompt = `
You are a career advisor and CV optimization expert executing a "Deep Research" analysis. 
Analyze the following CV and compare it against successful profiles at the target company.

USER'S CURRENT CV:
${cvText}

TARGET POSITION: ${targetJob}
TARGET COMPANY: ${targetCompany}

SUCCESSFUL EMPLOYEE PROFILES (CONTEXT):
${employeeProfiles}

Your task:
1. Identify the user's current strengths aligned with the role.
2. Identify CRITICAL GAPS (missing skills, certifications, experience types) compared to the successful profiles.
3. Generate a structured JSON response representing the analysis.

RETURN JSON ONLY.
`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['experience', 'education', 'skills', 'projects', 'certifications', 'awards'] },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            isCompleted: { type: Type.BOOLEAN },
            isGreyedOut: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING, nullable: true },
          },
          required: ['id', 'type', 'title', 'content', 'isCompleted', 'isGreyedOut']
        },
      },
      generalFeedback: { type: Type.ARRAY, items: { type: Type.STRING } },
      progressPercentage: { type: Type.NUMBER },
    },
    required: ['sections', 'generalFeedback', 'progressPercentage']
  };

  try {
    // Using deep-research-pro-preview-12-2025 as requested
    const response = await ai.models.generateContent({
      model: 'deep-research-pro-preview-12-2025',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 2048 }, // Allow for reasoning on gaps
      }
    });
    
    const text = response.text || "{}";
    const cleaned = cleanJsonString(text);
    return JSON.parse(cleaned) as TargetCV;
  } catch (error) {
    console.error('Error analyzing CV:', error);
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
    
    ${targetCV ? `
    CRITICAL INPUT FROM CV ANALYSIS:
    The roadmap MUST address these specific gaps identified in their deep research analysis:
    ${targetCV.generalFeedback.join('\n')}
    
    Also, incorporate steps to achieve the items marked as 'not completed' (isGreyedOut=true) in their Target CV sections.
    ` : ''}

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
      model: 'deep-research-pro-preview-12-2025',
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