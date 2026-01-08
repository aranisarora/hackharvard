"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getOnboardingData, getCoreSignalResumes, generateRoadmap, saveCV, saveRoadmap, saveDashboardData } from "@/lib/api";
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
  ArrowRight
} from "lucide-react";

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
}

type ProcessStep = "loading" | "extract" | "find" | "analyze" | "target" | "roadmap" | "complete";

function GenerateRoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobTitle = searchParams.get("jobTitle") || "Your Dream Role";
  const company = searchParams.get("company") || "Target Company";
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentProcessStep, setCurrentProcessStep] = useState<ProcessStep>("loading");
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loadingResumeIds, setLoadingResumeIds] = useState<Set<number>>(new Set());
  const [actualJobTitle, setActualJobTitle] = useState<string>("");
  const [actualCompany, setActualCompany] = useState<string>("");
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const steps: GenerationStep[] = [
    {
      id: "extract",
      title: "Extracting Target Role",
      description: "Analyzing your preferences to identify your target job title and company",
      status: currentProcessStep === "extract" ? "active" : currentProcessStep === "loading" ? "pending" : "completed",
    },
    {
      id: "find",
      title: "Finding Relevant CVs",
      description: "Searching our database for professionals who've worked in similar roles",
      status: currentProcessStep === "find" ? "active" : ["extract", "loading"].includes(currentProcessStep) ? "pending" : "completed",
    },
    {
      id: "analyze",
      title: "Analyzing Qualifications",
      description: "Identifying key skills, experiences, and qualifications from successful candidates",
      status: currentProcessStep === "analyze" ? "active" : ["extract", "find", "loading"].includes(currentProcessStep) ? "pending" : "completed",
    },
    {
      id: "target",
      title: "Generating Target Resume",
      description: "Creating an optimized resume tailored to maximize your hiring potential",
      status: currentProcessStep === "target" ? "active" : ["extract", "find", "analyze", "loading"].includes(currentProcessStep) ? "pending" : "completed",
    },
    {
      id: "roadmap",
      title: "Building Your Roadmap",
      description: "Crafting a personalized step-by-step plan to achieve your target resume",
      status: currentProcessStep === "roadmap" ? "active" : currentProcessStep === "complete" ? "completed" : ["extract", "find", "analyze", "target", "loading"].includes(currentProcessStep) ? "pending" : "completed",
    },
  ];

  // Main orchestration function
  useEffect(() => {
    async function orchestrateProcess() {
      try {
        setCurrentProcessStep("loading");

        // Step 1: Extract target role
        setCurrentProcessStep("extract");
        setIsLoadingData(true);

        const response = await getOnboardingData();
        
        if (!response.data) {
          throw new Error("No onboarding data found");
        }

        setOnboardingData(response.data);
        
        const jobTitle = response.data.hardcodedAnswers?.targetPosition || "Product Designer";
        const company = response.data.hardcodedAnswers?.targetCompany || "Pathforge";
        
        setActualJobTitle(jobTitle);
        setActualCompany(company);
        setIsLoadingData(false);

        // Step 2: Find relevant CVs
        setCurrentProcessStep("find");

        const coresignalResponse = await getCoreSignalResumes(jobTitle, company);
        
        // Debug: Log profile data to see what we're getting
        console.log("[Frontend] CoreSignal response:", coresignalResponse);
        if (coresignalResponse.profiles && coresignalResponse.profiles.length > 0) {
          console.log("[Frontend] First profile data:", {
            id: coresignalResponse.profiles[0].id,
            name: coresignalResponse.profiles[0].name,
            linkedin_url: coresignalResponse.profiles[0].linkedin_url,
            profile_picture: coresignalResponse.profiles[0].profile_picture,
          });
        }
        
        if (coresignalResponse.profiles && coresignalResponse.profiles.length > 0) {
          // Display CVs immediately with lazy loading simulation
          const profiles = coresignalResponse.profiles;
          
          // Simulate lazy loading - add resumes one by one
          for (let i = 0; i < profiles.length; i++) {
            setLoadingResumeIds((prev) => new Set([...prev, profiles[i].id]));
            await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay for visual effect
            setResumes((prev) => [...prev, profiles[i]]);
            setLoadingResumeIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(profiles[i].id);
              return newSet;
            });
          }
        } else {
          setResumes([]);
        }

        // Step 3: Analyze qualifications (prepare data for LLM)
        setCurrentProcessStep("analyze");
        await new Promise((resolve) => setTimeout(resolve, 500)); // Brief pause

        // Step 4 & 5: Generate target CV and roadmap
        setCurrentProcessStep("target");
        setIsGeneratingRoadmap(true);
        setGenerationError(null);

        // Format messages for LLM
        const formattedMessages = response.data.messages
          .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
          .filter((msg: any) => msg.content && msg.content.trim())
          .map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          }));

        // Update step to roadmap generation
        setCurrentProcessStep("roadmap");

        const roadmapResult = await generateRoadmap(
          formattedMessages,
          response.data,
          coresignalResponse.profiles || []
        );

        if (!roadmapResult.success || !roadmapResult.data) {
          throw new Error("Failed to generate roadmap - no data returned");
        }

        setRoadmapData(roadmapResult.data);

        // Save all data
        await Promise.all([
          saveCV(roadmapResult.data.initialCV, roadmapResult.data.targetCV),
          saveRoadmap(roadmapResult.data.roadmap.tasks),
          saveDashboardData(roadmapResult.data.dashboard),
        ]);

        setCurrentProcessStep("complete");
        setIsGeneratingRoadmap(false);

      } catch (error) {
        console.error("Error in orchestration:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        setGenerationError(errorMessage);
        setIsGeneratingRoadmap(false);
        setIsLoadingData(false);
      }
    }

    orchestrateProcess();
  }, []);

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

  const getStepStatus = (stepIndex: number): "pending" | "active" | "completed" => {
    const stepId = steps[stepIndex].id;
    return steps[stepIndex].status;
  };

  const getProgressPercentage = (): number => {
    const stepMap: Record<ProcessStep, number> = {
      loading: 0,
      extract: 10,
      find: 30,
      analyze: 50,
      target: 70,
      roadmap: 90,
      complete: 100,
    };
    return stepMap[currentProcessStep] || 0;
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
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
        {currentProcessStep === "complete" && roadmapData && (
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
                <h3 className="font-semibold">Error Generating Roadmap</h3>
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
                  const status = getStepStatus(index);
                  return (
                    <div
                      key={step.id}
                      className={`relative pl-8 pb-6 ${
                        index < steps.length - 1 ? "border-l-2 border-border" : ""
                      }`}
                    >
                      {/* Status Icon */}
                      <div
                        className={`absolute left-0 top-0 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${
                          status === "completed"
                            ? "bg-primary text-primary-foreground"
                            : status === "active"
                            ? "bg-primary/20 text-primary border-2 border-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : status === "active" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>

                      {/* Step Content */}
                      <div
                        className={`transition-all ${
                          status === "active"
                            ? "opacity-100 scale-100"
                            : status === "completed"
                            ? "opacity-75"
                            : "opacity-50"
                        }`}
                      >
                        <h3
                          className={`font-medium mb-1 ${
                            status === "active" ? "text-foreground" : "text-muted-foreground"
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
                  {currentProcessStep === "complete" 
                    ? "Complete!" 
                    : currentProcessStep === "loading"
                    ? "Initializing..."
                    : `Step ${steps.findIndex(s => s.id === currentProcessStep) + 1} of ${steps.length}`
                  }
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column - CV Carousel */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Search className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Relevant CVs Found
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {resumes.length > 0 
                      ? `${resumes.length} resume${resumes.length !== 1 ? "s" : ""} found`
                      : isGeneratingRoadmap || currentProcessStep === "find"
                      ? "Searching for relevant resumes..."
                      : "No resumes found"
                    }
                  </p>
                </div>
              </div>

              {/* CV Carousel */}
              <div className="relative">
                {/* Left fade gradient */}
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
                {/* Right fade gradient */}
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
                
                {currentProcessStep === "loading" || (currentProcessStep === "find" && resumes.length === 0) ? (
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
                        
                        // Debug: Log profile data for each resume
                        if (index === 0) {
                          console.log("[Frontend] Rendering profile:", {
                            id: profile.id,
                            name: profile.name,
                            linkedin_url: profile.linkedin_url,
                            profile_picture: profile.profile_picture,
                            hasLinkedIn: !!profile.linkedin_url,
                            hasPicture: !!profile.profile_picture,
                          });
                        }
                        
                        return (
                          <div
                            key={`resume-${profile.id}-${index}`}
                            className="snap-start flex-shrink-0"
                            style={{ width: "400px" }}
                          >
                            {isLoading ? (
                              <Card className="p-6 h-[600px] flex flex-col shadow-lg">
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
                              <Card className="p-6 h-[600px] flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                                {/* CV Header */}
                                <div className="space-y-4 mb-6">
                                  <div className="flex items-start gap-4">
                                    <div className="relative w-16 h-16 flex-shrink-0">
                                      {profile.profile_picture ? (
                                        <>
                                          <img
                                            src={profile.profile_picture}
                                            alt={profile.name || "Profile"}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                                            onError={(e) => {
                                              // Hide image and show fallback
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = "none";
                                              const fallback = target.nextElementSibling as HTMLElement;
                                              if (fallback) {
                                                fallback.style.display = "flex";
                                              }
                                            }}
                                          />
                                          <div className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center text-primary font-semibold text-lg hidden absolute inset-0">
                                            {profile.name
                                              ? profile.name
                                                  .split(" ")
                                                  .map((n: string) => n[0])
                                                  .join("")
                                                  .toUpperCase()
                                              : "?"}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                                          {profile.name
                                            ? profile.name
                                                .split(" ")
                                                .map((n: string) => n[0])
                                                .join("")
                                                .toUpperCase()
                                            : "?"}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <h3 className="font-semibold text-lg text-foreground mb-1">
                                            {profile.name || "Unknown"}
                                          </h3>
                                          <p className="text-sm text-muted-foreground mb-1">
                                            {profile.headline || "No headline"}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {profile.location && (
                                              <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                <span>{profile.location}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {profile.linkedin_url && (
                                          <a
                                            href={profile.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                                            title="View LinkedIn Profile"
                                          >
                                            <svg
                                              className="w-5 h-5 text-primary"
                                              fill="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                            </svg>
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* CV Content */}
                                <div className="space-y-6 flex-1 overflow-y-auto">
                                  {/* Experience Section */}
                                  {profile.experience && profile.experience.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Briefcase className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm text-foreground">Experience</h4>
                                      </div>
                                      <div className="space-y-3">
                                        {profile.experience.slice(0, 3).map((exp: any, expIndex: number) => (
                                          <div key={expIndex} className="pl-6">
                                            <p className="font-medium text-sm text-foreground">
                                              {exp.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {exp.company_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {exp.start_date || "?"} - {exp.end_date || (exp.is_current ? "Present" : "?")}
                                            </p>
                                            {exp.description && (
                                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {exp.description}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Education Section */}
                                  {profile.education && profile.education.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <GraduationCap className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm text-foreground">Education</h4>
                                      </div>
                                      <div className="space-y-2 pl-6">
                                        {profile.education.slice(0, 2).map((edu: any, eduIndex: number) => (
                                          <div key={eduIndex}>
                                            <p className="text-sm text-foreground font-medium">
                                              {edu.school_name}
                                            </p>
                                            {edu.degree && (
                                              <p className="text-xs text-muted-foreground">
                                                {edu.degree}
                                                {edu.field_of_study && ` - ${edu.field_of_study}`}
                                              </p>
                                            )}
                                            {(edu.start_date || edu.end_date) && (
                                              <p className="text-xs text-muted-foreground">
                                                {edu.start_date || "?"} - {edu.end_date || "?"}
                                              </p>
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

                                  {/* Languages Section */}
                                  {profile.languages && profile.languages.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Globe className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm text-foreground">Languages</h4>
                                      </div>
                                      <div className="pl-6">
                                        <p className="text-xs text-muted-foreground">
                                          {profile.languages.join(", ")}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Certifications Section */}
                                  {profile.certifications && profile.certifications.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Award className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm text-foreground">Certifications</h4>
                                      </div>
                                      <div className="space-y-2 pl-6">
                                        {profile.certifications.slice(0, 2).map((cert: any, certIndex: number) => (
                                          <div key={certIndex}>
                                            <p className="text-sm text-foreground font-medium">
                                              {cert.name}
                                            </p>
                                            {cert.issuer && (
                                              <p className="text-xs text-muted-foreground">
                                                {cert.issuer}
                                                {cert.issue_date && ` • ${cert.issue_date}`}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* CV Footer */}
                                <div className="mt-4 pt-4 border-t border-border">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        Profile #{index + 1}
                                      </span>
                                    </div>
                                    {profile.linkedin_url && (
                                      <a
                                        href={profile.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                                      >
                                        <svg
                                          className="w-3.5 h-3.5"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                        View LinkedIn
                                      </a>
                                    )}
                                  </div>
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

              {/* Carousel Indicator */}
              {resumes.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="flex gap-1.5">
                    {Array.from({ length: Math.min(resumes.length, 8) }).map((_, index) => (
                      <div
                        key={index}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground ml-2">
                    {resumes.length} resume{resumes.length !== 1 ? "s" : ""} found • Scroll to see more
                  </p>
                </div>
              )}
            </Card>
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
                {currentProcessStep === "complete" 
                  ? "Roadmap Generation Complete!"
                  : isGeneratingRoadmap
                  ? "Generating Your Personalized Roadmap"
                  : "Creating Your Personalized Roadmap"
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentProcessStep === "complete"
                  ? "Your roadmap has been generated and saved. Click the button above to view it in your dashboard."
                  : `We're analyzing ${actualJobTitle || jobTitle} positions at ${actualCompany || company} and comparing them with your current profile. Our AI is identifying the key qualifications, skills, and experiences needed to maximize your chances of getting hired.`
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
