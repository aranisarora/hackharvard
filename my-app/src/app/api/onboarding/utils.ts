export function extractRequestedField(response: string): string | null {
  const lowerResponse = response.toLowerCase();
  
  if (lowerResponse.includes("email")) {
    return "email";
  } else if (lowerResponse.includes("password")) {
    return "password";
  } else if (lowerResponse.includes("age") || lowerResponse.includes("old")) {
    return "age";
  } else if (lowerResponse.includes("based") || lowerResponse.includes("location") || lowerResponse.includes("where")) {
    return "location";
  } else if (lowerResponse.includes("job title") || lowerResponse.includes("dream job") || lowerResponse.includes("target role") || lowerResponse.includes("position")) {
    return "targetJob";
  } else if (lowerResponse.includes("company") || lowerResponse.includes("employer")) {
    return "targetCompany";
  } else if (lowerResponse.includes("upload") || lowerResponse.includes("cv") || lowerResponse.includes("resume")) {
    return "cv";
  }
  
  return null;
}

export function checkReadyForRoadmap(response: string): boolean {
  const lowerResponse = response.toLowerCase();
  return (
    lowerResponse.includes("ready to generate") ||
    lowerResponse.includes("enough information") ||
    lowerResponse.includes("create your personalized career roadmap") ||
    lowerResponse.includes("ready to create") ||
    lowerResponse.includes("generate your roadmap") ||
    lowerResponse.includes("all the information i need")
  );
}

