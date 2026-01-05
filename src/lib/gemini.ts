
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, RoadmapTask, TargetCV, CVSection } from '@/types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON string if it comes wrapped in markdown
const cleanJsonString = (text: string): string => {
  if (!text) return "[]";
  return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
};

export const callGeminiWithContext = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: {role: 'user'|'assistant'|'model', content?: string, parts?: {text: string}[]}[] = []
): Promise<string> => {
  const historyContents = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: msg.parts || [{ text: msg.content || '' }]
  }));

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will act as the career advisor.' }] },
    ...historyContents,
    { role: 'user', parts: [{ text: userMessage }] }
  ];
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents as any,
      config: { temperature: 0.7, maxOutputTokens: 8192 },
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
    You are a career advisor executing a "Deep Research" analysis. 
    Analyze the USER CV against the TARGET ROLE and SUCCESSFUL PROFILES.

    USER CV: ${cvText}
    TARGET: ${targetJob} at ${targetCompany}
    CONTEXT (Top Performers): ${employeeProfiles}

    Task:
    1. Reconstruct the user's CV into structured sections.
    2. Identify CRITICAL GAPS compared to the successful profiles.
    3. Create a 'Target CV' structure. 
       - Existing strong items should be marked isCompleted: true.
       - Missing critical items (skills, certs, projects) should be added as NEW sections with isCompleted: false and isGreyedOut: true.
    4. Provide specific feedback for each section.

    Output JSON matching the Schema.
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 2048 },
      }
    });
    
    const text = response.text || "{}";
    return JSON.parse(cleanJsonString(text)) as TargetCV;
  } catch (error) {
    console.error('Error analyzing CV:', error);
    throw error;
  }
};

export const parseResumetoSections = async (resumeText: string): Promise<CVSection[]> => {
  const prompt = `
    Parse this resume text into structured sections.
    RESUME TEXT: ${resumeText}
    
    Format contents with Markdown.
    Generate a unique ID for each section.
    isCompleted = true, isGreyedOut = false.
  `;

  const schema: Schema = {
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
      },
      required: ['id', 'type', 'title', 'content', 'isCompleted', 'isGreyedOut']
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (error) {
    console.error("Failed to parse resume:", error);
    return [];
  }
};

export const generateRoadmap = async (
  userProfile: UserProfile,
  targetCV: TargetCV | null
): Promise<RoadmapTask[]> => {
  const gaps = targetCV?.generalFeedback.join('\n') || "General career advancement";
  
  const prompt = `
    Create a career roadmap for a ${userProfile.targetJob} at ${userProfile.targetCompany}.
    User Location: ${userProfile.location}. 
    Timeline: ${userProfile.timeframe}.
    Weekly Hours: ${userProfile.weeklyHours}.
    
    Focus specifically on these gaps:
    ${gaps}

    Generate 5-7 distinct, actionable tasks (Skills, Projects, Certifications, Experience, or CV Polish).
    Include a fictional mentor from ${userProfile.targetCompany}.
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
      config: { responseMimeType: 'application/json', responseSchema: schema }
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (error) {
    console.error("Failed to generate roadmap:", error);
    return [];
  }
};
