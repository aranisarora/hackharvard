import { UserProfile, RoadmapTask, TargetCV } from '@/types';

// Use process.env.API_KEY as strictly requested
const GEMINI_API_KEY = process.env.API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

export const callGemini = async (
  prompt: string,
  model: string = 'gemini-2.5-flash'
): Promise<string> => {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw error;
  }
};

export const callGeminiWithContext = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: GeminiMessage[] = [],
  model: string = 'gemini-2.5-flash'
): Promise<string> => {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const contents = [
    {
      role: 'user' as const,
      parts: [{ text: systemPrompt }]
    },
    {
      role: 'model' as const,
      parts: [{ text: 'Understood. I will follow these instructions.' }]
    },
    ...conversationHistory,
    {
      role: 'user' as const,
      parts: [{ text: userMessage }]
    }
  ];
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

Format your response as JSON with the following structure:
{
  "currentStrengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "targetCVSections": [
    {
      "type": "experience|education|skills|projects|certifications|awards",
      "title": "Section Title",
      "content": "Content text",
      "isCompleted": true/false,
      "feedback": "Optional feedback for this section"
    }
  ],
  "generalFeedback": ["feedback1", "feedback2"],
  "roadmapTasks": [
    {
      "category": "skills|projects|certifications|experience|cv-feedback",
      "title": "Task title",
      "description": "Detailed description",
      "checklist": ["Step 1", "Step 2"],
      "estimatedDays": 30,
      "courseLink": "URL if applicable"
    }
  ]
}
`;

  return callGemini(prompt, 'gemini-2.5-pro-deep-research');
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

Format as JSON:
{
  "question": "Your question here",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}
`;

  return callGemini(prompt);
};

export const generateRoadmap = async (
  userProfile: UserProfile,
  targetCV: TargetCV | null
): Promise<RoadmapTask[]> => {
  const model = 'deep-research-pro-preview-12-2025';
  
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

    IMPORTANT: Return ONLY valid JSON in the following format (no markdown):
    [
      {
        "id": "unique_string",
        "category": "skills", 
        "title": "Task Title",
        "description": "Task Description",
        "checklist": [
          { "id": "c1", "text": "Step 1", "isCompleted": false },
          { "id": "c2", "text": "Step 2", "isCompleted": false }
        ],
        "deadline": "YYYY-MM-DD",
        "isCompleted": false,
        "courseLink": "https://...",
        "mentor": {
          "name": "Mentor Name",
          "title": "Job Title",
          "company": "${userProfile.targetCompany}",
          "email": "email@example.com"
        }
      }
    ]
  `;

  try {
    const jsonString = await callGemini(prompt, model);
    // Clean up potential markdown formatting
    const cleanJson = jsonString.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Failed to generate roadmap:", error);
    // Fallback or rethrow
    throw error;
  }
};
