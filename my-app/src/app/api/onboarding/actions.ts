"use server";

import { extractRequestedField, checkReadyForRoadmap } from "./utils";

interface CompletionStatus {
  email: boolean;
  targetJob: boolean;
  targetCompany: boolean;
  location: boolean;
  cv: boolean;
  values: boolean;
  interests: boolean;
}

/**
 * Server Action to save extracted field from conversation
 * This runs on the server and can be called from the client
 */
export async function saveExtractedField(
  field: string | null,
  value: string,
  userId?: string
) {
  // TODO: When database is set up, save to user profile
  // Example:
  // if (userId && field) {
  //   await prisma.user.update({
  //     where: { id: userId },
  //     data: { [field]: value },
  //   });
  // }

  // For now, just log it
  console.log("Extracted field:", field, "Value:", value);
  
  return { success: true, field, value };
}

interface OnboardingProgress {
  messages: Array<{ role: "user" | "assistant"; content: string; id?: string }>;
  completionStatus: CompletionStatus;
  showCvUpload: boolean;
  readyForRoadmap: boolean;
}

/**
 * Fetch onboarding progress from database
 */
export async function fetchOnboardingProgress(userId?: string): Promise<OnboardingProgress | null> {
  // TODO: When database is set up, fetch from DB
  // Example:
  // if (userId) {
  //   const user = await prisma.user.findUnique({
  //     where: { id: userId },
  //     include: { onboardingMessages: true },
  //   });
  //   return {
  //     messages: user.onboardingMessages,
  //     completionStatus: user.completionStatus,
  //     showCvUpload: user.showCvUpload,
  //     readyForRoadmap: user.readyForRoadmap,
  //   };
  // }

  // For now, return null (no saved progress)
  return null;
}

/**
 * Update completion status
 */
export async function updateCompletionStatus(
  status: Partial<CompletionStatus>,
  userId?: string
) {
  // TODO: Save to database
  console.log("Updating completion status:", status);
  return { success: true, status };
}

/**
 * Server Action to save conversation message
 */
export async function saveConversationMessage(
  role: "user" | "assistant",
  content: string,
  userId?: string
) {
  // TODO: When database is set up, save to conversation table
  // Example:
  // if (userId) {
  //   await prisma.conversationMessage.create({
  //     data: {
  //       userId,
  //       role,
  //       content,
  //     },
  //   });
  // }

  return { success: true };
}

/**
 * Analyze response text and extract metadata
 */
export async function analyzeResponse(responseText: string) {
  const requestedField = extractRequestedField(responseText);
  const readyForRoadmap = checkReadyForRoadmap(responseText);

  return {
    requestedField,
    readyForRoadmap,
  };
}

