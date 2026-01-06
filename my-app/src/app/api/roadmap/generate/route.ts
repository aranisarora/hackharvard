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

CRITICAL DATE REQUIREMENTS:
1. ALL tasks MUST include both "startDate" and "endDate" fields (YYYY-MM-DD format)
2. Dates must be realistic and based on TODAY's date. Use the current date as a reference point.
3. startDate should be today or in the near future (within 1-2 weeks)
4. endDate should be after startDate and reflect realistic timeframes:
   - Simple tasks: 1-2 weeks
   - Medium tasks: 1-3 months
   - Complex tasks (certifications, major projects): 2-6 months
5. Tasks should be sequenced logically - earlier tasks should have earlier dates
6. The "deadline" field should match the "endDate" field
7. Ensure dates are sequential and don't overlap unreasonably unless tasks can be done in parallel

PROGRESS CALCULATION:
- Set "isCompleted": true for tasks the user has already completed based on the conversation
- Set "isCompleted": true for checklist items that are already done
- The system will automatically calculate progress percentages based on completed tasks
- Category progress = (completed tasks in category / total tasks in category) * 100
- Overall progress = average of all category progress values

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

    // Validate and ensure dates are present for all tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (generatedData.roadmap.tasks && Array.isArray(generatedData.roadmap.tasks)) {
      generatedData.roadmap.tasks.forEach((task: any, index: number) => {
        // Ensure startDate exists
        if (!task.startDate) {
          // Default: start today or in the next few days
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() + (index * 7)); // Stagger by weeks
          task.startDate = startDate.toISOString().split('T')[0];
        }
        
        // Ensure endDate exists
        if (!task.endDate) {
          // Default: end 1-3 months from start
          const startDate = new Date(task.startDate || today);
          const endDate = new Date(startDate);
          
          // Estimate duration based on task complexity
          const taskTitle = (task.title || '').toLowerCase();
          let daysToAdd = 30; // Default: 1 month
          
          if (taskTitle.includes('certification') || taskTitle.includes('cert')) {
            daysToAdd = 90; // 3 months for certifications
          } else if (taskTitle.includes('project') || taskTitle.includes('build')) {
            daysToAdd = 60; // 2 months for projects
          } else if (taskTitle.includes('learn') || taskTitle.includes('study')) {
            daysToAdd = 45; // 1.5 months for learning
          }
          
          endDate.setDate(endDate.getDate() + daysToAdd);
          task.endDate = endDate.toISOString().split('T')[0];
        }
        
        // Ensure deadline matches endDate if not provided
        if (!task.deadline) {
          task.deadline = task.endDate;
        }
        
        // Validate date order
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        if (endDate < startDate) {
          // If endDate is before startDate, swap them
          task.startDate = endDate.toISOString().split('T')[0];
          task.endDate = startDate.toISOString().split('T')[0];
        }
      });
    }

    // Calculate and set initial progress values
    if (generatedData.roadmap.tasks && Array.isArray(generatedData.roadmap.tasks)) {
      // Group tasks by category
      const tasksByCategory: { [key: string]: any[] } = {};
      generatedData.roadmap.tasks.forEach((task: any) => {
        const category = task.category || 'other';
        if (!tasksByCategory[category]) {
          tasksByCategory[category] = [];
        }
        tasksByCategory[category].push(task);
      });

      // Calculate progress for each category
      const categoryProgress: { [key: string]: number } = {};
      Object.keys(tasksByCategory).forEach((category) => {
        const categoryTasks = tasksByCategory[category];
        const totalTasks = categoryTasks.length;
        const completedTasks = categoryTasks.filter((t: any) => t.isCompleted === true).length;
        categoryProgress[category] = totalTasks > 0 
          ? Math.round((completedTasks / totalTasks) * 100) 
          : 0;
      });

      // Update dashboard categories with calculated progress
      if (generatedData.dashboard && generatedData.dashboard.categories) {
        generatedData.dashboard.categories.forEach((category: any) => {
          const categoryId = category.id;
          if (categoryProgress[categoryId] !== undefined) {
            category.progress = categoryProgress[categoryId];
          }
          
          // Ensure tasks in dashboard match roadmap tasks
          const categoryTasks = tasksByCategory[categoryId] || [];
          category.tasks = categoryTasks.map((task: any) => ({
            title: task.title,
            completed: task.isCompleted === true
          }));
        });

        // Calculate overall progress as average of category progress
        const categoryProgressValues = Object.values(categoryProgress);
        const overallProgress = categoryProgressValues.length > 0
          ? Math.round(categoryProgressValues.reduce((sum, val) => sum + val, 0) / categoryProgressValues.length)
          : 0;
        
        generatedData.dashboard.overallProgress = overallProgress;
      }
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

