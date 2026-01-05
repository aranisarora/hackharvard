import { generateTextResponse } from "@/services/gemini-service";
import { NextResponse } from "next/server";

// Use Edge Runtime for lower latency
export const runtime = "edge";

// System prompt for roadmap generation
const ROADMAP_GENERATION_SYSTEM_PROMPT = `You are an expert career advisor. Analyze the conversation and generate a roadmap and target CV.

Return ONLY valid JSON in this exact format:
{
  "initialCV": "User's current CV extracted from conversation",
  "targetCV": "Ideal CV for their target job/company",
  "roadmap": {
    "tasks": [
      {
        "id": "task-1",
        "category": "skills",
        "title": "Task title",
        "description": "Why this matters",
        "checklist": [
          {"id": "check-1", "text": "Action step", "isCompleted": false}
        ],
        "deadline": "2025-12-31",
        "startDate": "2025-01-01",
        "endDate": "2025-12-31",
        "isCompleted": false,
        "mentor": {
          "name": "Mentor Name",
          "title": "Job Title",
          "company": "Company Name",
          "email": "mentor@example.com",
          "profileImage": "https://example.com/image.jpg",
          "description": "Mentor description"
        }
      }
    ]
  },
  "dashboard": {
    "user": {
      "email": "user@example.com",
      "targetJob": "Job title",
      "targetCompany": "Company name"
    },
    "overallProgress": 0,
    "categories": [
      {
        "id": "cat-1",
        "title": "Category name",
        "icon": "Briefcase",
        "color": "#3b82f6",
        "bgColor": "#dbeafe",
        "tasks": [{"title": "Task title", "completed": false}],
        "progress": 0
      }
    ]
  }
}

IMPORTANT: Return ONLY valid JSON. No text outside the JSON object.`;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Use the generic text generation service
    const result = await generateTextResponse(messages, {
      systemPrompt: ROADMAP_GENERATION_SYSTEM_PROMPT,
    });

    // Parse the response
    let generatedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", result.text);
      return NextResponse.json(
        { error: "Failed to parse AI response", details: result.text },
        { status: 500 }
      );
    }

    // Validate the structure (basic validation)
    if (!generatedData.initialCV || !generatedData.targetCV || !generatedData.roadmap) {
      return NextResponse.json(
        { error: "Invalid response structure from AI" },
        { status: 500 }
      );
    }

    // TODO: Save to database when Prisma is set up
    // For now, we'll return the data and the frontend can store it in session/localStorage
    // or we can implement a simple in-memory store

    return NextResponse.json({
      success: true,
      data: generatedData,
    });
  } catch (error) {
    console.error("Error in roadmap generation:", error);
    return NextResponse.json(
      {
        error: "Failed to generate roadmap",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

