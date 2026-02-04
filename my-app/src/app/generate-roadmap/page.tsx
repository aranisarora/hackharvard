"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getOnboardingData, getCoreSignalResumes, generateRoadmap, generateTargetCV, saveCV, saveRoadmap, saveDashboardData } from "@/lib/api";
import { normalizeCompanyName } from "@/lib/utils";
import {
  Search,
  FileText,
  Sparkles,
  Route,
  CheckCircle2,
  Loader2,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  ArrowRight,
  Edit3,
  Save
} from "lucide-react";

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
}

// User interaction phases
type UserPhase = "finding-resumes" | "resume-review" | "generating-target-cv" | "target-cv-review" | "generating-roadmap" | "complete";

function GenerateRoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobTitle = searchParams.get("jobTitle") || "Your Dream Role";
  const company = searchParams.get("company") || "Target Company";

  const carouselRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Main state
  const [userPhase, setUserPhase] = useState<UserPhase>("finding-resumes");
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loadingResumeIds, setLoadingResumeIds] = useState<Set<number>>(new Set());
  const [actualJobTitle, setActualJobTitle] = useState<string>("");
  const [actualCompany, setActualCompany] = useState<string>("");

  // Target CV state
  const [targetCV, setTargetCV] = useState<string>("");
  const [editedTargetCV, setEditedTargetCV] = useState<string>("");
  const [initialCV, setInitialCV] = useState<string>("");
  const [isEditingCV, setIsEditingCV] = useState(false);

  // Roadmap state
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Background generation state
  const [isTargetCVGenerating, setIsTargetCVGenerating] = useState(false);
  const [isTargetCVReady, setIsTargetCVReady] = useState(false);
  const [minimumWaitComplete, setMinimumWaitComplete] = useState(false);

  // Formatted messages for API calls
  const [formattedMessages, setFormattedMessages] = useState<any[]>([]);

  const steps: GenerationStep[] = [
    {
      id: "find",
      title: "Review Relevant CVs",
      description: "Review CVs from professionals who achieved similar roles",
      status: userPhase === "finding-resumes" ? "active" :
        userPhase === "resume-review" ? "active" : "completed",
    },
    {
      id: "target",
      title: "Target CV Generated",
      description: "Review and edit your optimized target CV",
      status: userPhase === "generating-target-cv" ? "active" :
        userPhase === "target-cv-review" ? "active" :
          ["generating-roadmap", "complete"].includes(userPhase) ? "completed" : "pending",
    },
    {
      id: "roadmap",
      title: "Building Your Roadmap",
      description: "Creating your personalized step-by-step plan",
      status: userPhase === "generating-roadmap" ? "active" :
        userPhase === "complete" ? "completed" : "pending",
    },
  ];

  // Step 1: Fetch onboarding data and resumes
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setUserPhase("finding-resumes");

        // Get onboarding data
        const response = await getOnboardingData();

        if (!response.data) {
          throw new Error("No onboarding data found");
        }

        setOnboardingData(response.data);

        const jobTitle = response.data.hardcodedAnswers?.targetPosition || "Product Designer";
        const rawCompany = response.data.hardcodedAnswers?.targetCompany || "Pathforge";
        
        // Normalize company name - ensure we have a real company (not vague responses like "not sure" or "any high tech company")
        const company = normalizeCompanyName(rawCompany, jobTitle);
        setActualJobTitle(jobTitle);
        setActualCompany(company);

        // Format messages for API calls
        const messages = response.data.messages
          .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
          .filter((msg: any) => msg.content && msg.content.trim())
          .map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }));
        setFormattedMessages(messages);

        // Fetch resumes
        const coresignalResponse = await getCoreSignalResumes(jobTitle, company);

        if (coresignalResponse.profiles && coresignalResponse.profiles.length > 0) {
          const profiles = coresignalResponse.profiles;

          // Lazy load resumes for visual effect
          for (let i = 0; i < profiles.length; i++) {
            setLoadingResumeIds((prev) => new Set([...prev, profiles[i].id]));
            await new Promise((resolve) => setTimeout(resolve, 300));
            setResumes((prev) => [...prev, profiles[i]]);
            setLoadingResumeIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(profiles[i].id);
              return newSet;
            });
          }
        }

        // Move to resume review phase
        setUserPhase("resume-review");

      } catch (error) {
        console.error("Error fetching initial data:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        setGenerationError(errorMessage);
      }
    }

    fetchInitialData();
  }, []);

  // Handle user clicking "Continue" after reviewing resumes
  const handleContinueAfterResumes = async () => {
    setUserPhase("generating-target-cv");
    setIsTargetCVGenerating(true);
    setMinimumWaitComplete(false);

    // Start 3-second minimum timer
    const minWaitTimer = setTimeout(() => {
      setMinimumWaitComplete(true);
    }, 3000);

    try {
      // Generate Target CV in background
      const result = await generateTargetCV(
        formattedMessages,
        onboardingData,
        resumes
      );

      if (result.success) {
        setTargetCV(result.targetCV);
        setEditedTargetCV(result.targetCV);
        setInitialCV(result.initialCV);
        setIsTargetCVReady(true);
      } else {
        throw new Error("Failed to generate target CV");
      }
    } catch (error) {
      console.error("Error generating target CV:", error);
      setGenerationError(error instanceof Error ? error.message : "Failed to generate target CV");
      setIsTargetCVGenerating(false);
      clearTimeout(minWaitTimer);
    }
  };

  // Transition to target CV review when both ready and minimum wait complete
  useEffect(() => {
    if (isTargetCVReady && minimumWaitComplete && userPhase === "generating-target-cv") {
      setUserPhase("target-cv-review");
      setIsTargetCVGenerating(false);
    }
  }, [isTargetCVReady, minimumWaitComplete, userPhase]);

  // Handle user clicking "Continue" after reviewing/editing Target CV
  const handleContinueAfterTargetCV = async () => {
    setUserPhase("generating-roadmap");

    try {
      // Use the (potentially edited) Target CV
      const finalTargetCV = editedTargetCV || targetCV;

      const roadmapResult = await generateRoadmap(
        formattedMessages,
        onboardingData,
        resumes,
        finalTargetCV // Pass pre-generated Target CV
      );

      if (!roadmapResult.success || !roadmapResult.data) {
        throw new Error("Failed to generate roadmap - no data returned");
      }

      setRoadmapData(roadmapResult.data);

      // Save all data
      await Promise.all([
        saveCV(roadmapResult.data.initialCV || initialCV, finalTargetCV),
        saveRoadmap(roadmapResult.data.roadmap.tasks),
        saveDashboardData(roadmapResult.data.dashboard),
      ]);

      setUserPhase("complete");

    } catch (error) {
      console.error("Error generating roadmap:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setGenerationError(errorMessage);
    }
  };

  // Auto-scroll carousel
  useEffect(() => {
    if (isHovered || !carouselRef.current || resumes.length === 0) return;

    const carousel = carouselRef.current;
    let scrollPosition = 0;
    const scrollSpeed = 0.3;
    let animationId: number;

    const scroll = () => {
      if (!isHovered && carousel) {
        scrollPosition += scrollSpeed;
        carousel.scrollLeft = scrollPosition;

        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        if (scrollPosition >= maxScroll) {
          scrollPosition = 0;
          carousel.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isHovered, resumes.length]);

  const getProgressPercentage = (): number => {
    const phaseMap: Record<UserPhase, number> = {
      "finding-resumes": 10,
      "resume-review": 30,
      "generating-target-cv": 50,
      "target-cv-review": 65,
      "generating-roadmap": 85,
      "complete": 100,
    };
    return phaseMap[userPhase] || 0;
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  const handleSaveCV = () => {
    setTargetCV(editedTargetCV);
    setIsEditingCV(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">PathForge</h1>
              <p className="text-sm text-muted-foreground">Generating Your Career Roadmap</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {actualJobTitle || jobTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                at {actualCompany || company}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Completion Button */}
        {userPhase === "complete" && roadmapData && (
          <Card className="mb-8 p-6 bg-primary/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  🎉 Your Roadmap is Ready!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your personalized career roadmap has been generated and saved. Click below to view it in your dashboard.
                </p>
              </div>
              <Button onClick={handleGoToDashboard} size="lg" className="gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Error Display */}
        {generationError && (
          <Card className="mb-8 p-6 bg-destructive/10 border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <FileText className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm">{generationError}</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Progress Steps */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6 text-foreground">
                What We're Doing
              </h2>
              <div className="space-y-4">
                {steps.map((step, index) => {
                  return (
                    <div
                      key={step.id}
                      className={`relative pl-8 pb-6 ${index < steps.length - 1 ? "border-l-2 border-border" : ""
                        }`}
                    >
                      {/* Status Icon */}
                      <div
                        className={`absolute left-0 top-0 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${step.status === "completed"
                          ? "bg-primary text-primary-foreground"
                          : step.status === "active"
                            ? "bg-primary/20 text-primary border-2 border-primary"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : step.status === "active" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>

                      {/* Step Content */}
                      <div
                        className={`transition-all ${step.status === "active"
                          ? "opacity-100 scale-100"
                          : step.status === "completed"
                            ? "opacity-75"
                            : "opacity-50"
                          }`}
                      >
                        <h3
                          className={`font-medium mb-1 ${step.status === "active" ? "text-foreground" : "text-muted-foreground"
                            }`}
                        >
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Overall Progress */}
            <Card className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {getProgressPercentage()}%
                  </span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {userPhase === "complete"
                    ? "Complete!"
                    : userPhase === "resume-review"
                      ? "Waiting for your review..."
                      : userPhase === "target-cv-review"
                        ? "Review and edit your Target CV"
                        : `Step ${steps.findIndex(s => s.status === "active") + 1} of ${steps.length}`
                  }
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column - Content Area */}
          <div className="lg:col-span-2">
            {/* Phase 1 & 2: Resume Review */}
            {(userPhase === "finding-resumes" || userPhase === "resume-review") && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Search className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Relevant CVs Found
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {resumes.length > 0
                        ? `${resumes.length} resume${resumes.length !== 1 ? "s" : ""} found - Review these before proceeding`
                        : userPhase === "finding-resumes"
                          ? "Searching for relevant resumes..."
                          : "No resumes found"
                      }
                    </p>
                  </div>
                </div>

                {/* CV Carousel */}
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />

                  {userPhase === "finding-resumes" && resumes.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading resumes...</p>
                      </div>
                    </div>
                  ) : resumes.length > 0 ? (
                    <div
                      ref={carouselRef}
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                      className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                      style={{
                        scrollBehavior: isHovered ? "smooth" : "auto",
                      }}
                    >
                      <div className="flex gap-6 pb-4" style={{ width: "max-content" }}>
                        {resumes.map((profile, index) => {
                          const isLoading = loadingResumeIds.has(profile.id);

                          return (
                            <div
                              key={`resume-${profile.id}-${index}`}
                              className="snap-start flex-shrink-0"
                              style={{ width: "400px" }}
                            >
                              {isLoading ? (
                                <Card className="p-6 h-[500px] flex flex-col shadow-lg">
                                  <div className="space-y-4 mb-6">
                                    <div className="flex items-start gap-4">
                                      <Skeleton className="w-16 h-16 rounded-full" />
                                      <div className="flex-1 space-y-2">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-2/3" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-6 flex-1">
                                    <Skeleton className="h-32 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                  </div>
                                </Card>
                              ) : (
                                <Card className="p-6 h-[500px] flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                                  {/* CV Header */}
                                  <div className="space-y-4 mb-6">
                                    <div className="flex items-start gap-4">
                                      <div className="relative w-16 h-16 flex-shrink-0">
                                        {profile.profile_picture ? (
                                          <img
                                            src={profile.profile_picture}
                                            alt={profile.name || "Profile"}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = "none";
                                              const fallback = target.nextElementSibling as HTMLElement;
                                              if (fallback) fallback.style.display = "flex";
                                            }}
                                          />
                                        ) : null}
                                        <div className={`w-16 h-16 rounded-full bg-primary/10 items-center justify-center text-primary font-semibold text-lg ${profile.profile_picture ? 'hidden absolute inset-0' : 'flex'}`}>
                                          {profile.name
                                            ? profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                                            : "?"}
                                        </div>
                                      </div>
                                      <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-foreground mb-1">
                                          {profile.name || "Unknown"}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-1">
                                          {profile.headline || "No headline"}
                                        </p>
                                        {profile.location && (
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span>{profile.location}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* CV Content */}
                                  <div className="space-y-4 flex-1 overflow-y-auto">
                                    {profile.experience && profile.experience.length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <Briefcase className="h-4 w-4 text-primary" />
                                          <h4 className="font-semibold text-sm text-foreground">Experience</h4>
                                        </div>
                                        <div className="space-y-2 pl-6">
                                          {profile.experience.slice(0, 2).map((exp: any, i: number) => (
                                            <div key={i}>
                                              <p className="font-medium text-sm text-foreground">{exp.title}</p>
                                              <p className="text-xs text-muted-foreground">{exp.company_name}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {profile.education && profile.education.length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <GraduationCap className="h-4 w-4 text-primary" />
                                          <h4 className="font-semibold text-sm text-foreground">Education</h4>
                                        </div>
                                        <div className="space-y-2 pl-6">
                                          {profile.education.slice(0, 2).map((edu: any, i: number) => (
                                            <div key={i}>
                                              <p className="text-sm text-foreground font-medium">{edu.school_name}</p>
                                              {edu.degree && (
                                                <p className="text-xs text-muted-foreground">{edu.degree}</p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                  {/* Skills Section */}
                                  {profile.skills && profile.skills.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-foreground mb-3">Skills</h4>
                                      <div className="flex flex-wrap gap-2 pl-6">
                                        {(Array.isArray(profile.skills) ? profile.skills : []).slice(0, 8).map((skill: any, skillIndex: number) => {
                                          const skillName = typeof skill === "string" ? skill : (skill.skill || skill.name);
                                          return (
                                            <span
                                              key={skillIndex}
                                              className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                                            >
                                              {skillName}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                </Card>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No resumes found for {actualJobTitle} at {actualCompany}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Continue Button - always show in resume-review phase */}
                {userPhase === "resume-review" && (
                  <div className="mt-6 flex justify-end">
                    <Button onClick={handleContinueAfterResumes} size="lg" className="gap-2">
                      Continue to Generate Target CV
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Phase 3: Generating Target CV */}
            {userPhase === "generating-target-cv" && (
              <Card className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Generating Your Target CV
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    We're analyzing the successful profiles and creating an optimized target CV tailored to your career goals...
                  </p>
                </div>
              </Card>
            )}

            {/* Phase 4: Target CV Review */}
            {userPhase === "target-cv-review" && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Your Target CV
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Review and edit your optimized CV before generating your roadmap
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isEditingCV ? "default" : "outline"}
                    size="sm"
                    onClick={() => isEditingCV ? handleSaveCV() : setIsEditingCV(true)}
                    className="gap-2"
                  >
                    {isEditingCV ? (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4" />
                        Edit CV
                      </>
                    )}
                  </Button>
                </div>

                {/* Target CV Display/Editor */}
                <div className="bg-muted/50 rounded-lg p-6 mb-6 max-h-[500px] overflow-y-auto">
                  {isEditingCV ? (
                    <Textarea
                      value={editedTargetCV}
                      onChange={(e) => setEditedTargetCV(e.target.value)}
                      className="min-h-[400px] font-mono text-sm resize-none bg-background"
                      placeholder="Your target CV content..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm text-foreground">
                      {editedTargetCV || targetCV || "No content generated"}
                    </div>
                  )}
                </div>

                {/* Continue Button */}
                <div className="flex justify-end">
                  <Button onClick={handleContinueAfterTargetCV} size="lg" className="gap-2">
                    Generate My Roadmap
                    <Route className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Phase 5: Generating Roadmap */}
            {userPhase === "generating-roadmap" && (
              <Card className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Building Your Roadmap
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Creating a step-by-step plan to transform your current resume into your target CV...
                  </p>
                </div>
              </Card>
            )}

            {/* Phase 6: Complete */}
            {userPhase === "complete" && roadmapData && (
              <Card className="p-6">
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Your Roadmap is Ready!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    We've created {roadmapData.roadmap?.tasks?.length || 0} tasks to help you achieve your target CV.
                  </p>
                  <Button onClick={handleGoToDashboard} size="lg" className="gap-2">
                    View Your Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Info Card */}
        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                {userPhase === "complete"
                  ? "Roadmap Generation Complete!"
                  : userPhase === "resume-review"
                    ? "Review These Professionals"
                    : userPhase === "target-cv-review"
                      ? "Customize Your Target"
                      : "Creating Your Personalized Roadmap"
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {userPhase === "complete"
                  ? "Your roadmap has been generated and saved. Click the button above to view it in your dashboard."
                  : userPhase === "resume-review"
                    ? `These are professionals who achieved ${actualJobTitle} roles at ${actualCompany}. Review their backgrounds before we generate your target CV.`
                    : userPhase === "target-cv-review"
                      ? "Review and customize your generated target CV. You can edit the text directly to better match your preferences."
                      : `We're analyzing ${actualJobTitle} positions at ${actualCompany} and creating your personalized career roadmap.`
                }
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function GenerateRoadmapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <GenerateRoadmapContent />
    </Suspense>
  );
}
