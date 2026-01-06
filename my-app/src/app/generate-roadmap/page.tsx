"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  FileText, 
  Sparkles, 
  Route, 
  CheckCircle2,
  Loader2 
} from "lucide-react";

interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
}

export default function GenerateRoadmapPage() {
  const searchParams = useSearchParams();
  const jobTitle = searchParams.get("jobTitle") || "Your Dream Role";
  const company = searchParams.get("company") || "Target Company";
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps: GenerationStep[] = [
    {
      id: "extract",
      title: "Extracting Target Role",
      description: "Analyzing your preferences to identify your target job title and company",
      status: "completed",
    },
    {
      id: "find",
      title: "Finding Relevant CVs",
      description: "Searching our database for professionals who've worked in similar roles",
      status: "active",
    },
    {
      id: "analyze",
      title: "Analyzing Qualifications",
      description: "Identifying key skills, experiences, and qualifications from successful candidates",
      status: "pending",
    },
    {
      id: "target",
      title: "Generating Target Resume",
      description: "Creating an optimized resume tailored to maximize your hiring potential",
      status: "pending",
    },
    {
      id: "roadmap",
      title: "Building Your Roadmap",
      description: "Crafting a personalized step-by-step plan to achieve your target resume",
      status: "pending",
    },
  ];

  // Simulate step progression
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (isHovered || !carouselRef.current) return;

    const carousel = carouselRef.current;
    let scrollPosition = 0;
    const scrollSpeed = 0.3; // pixels per frame
    let animationId: number;

    const scroll = () => {
      if (!isHovered && carousel) {
        scrollPosition += scrollSpeed;
        carousel.scrollLeft = scrollPosition;

        // Reset scroll position when reaching the end (with some buffer)
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
  }, [isHovered]);

  const getStepStatus = (stepIndex: number): "pending" | "active" | "completed" => {
    if (stepIndex < currentStep) return "completed";
    if (stepIndex === currentStep) return "active";
    return "pending";
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
              <p className="text-sm font-medium text-foreground">{jobTitle}</p>
              <p className="text-xs text-muted-foreground">at {company}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
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
                    {Math.round(((currentStep + 1) / steps.length) * 100)}%
                  </span>
                </div>
                <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
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
                    Analyzing successful candidates in similar roles
                  </p>
                </div>
              </div>

              {/* CV Carousel */}
              <div className="relative">
                {/* Left fade gradient */}
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
                {/* Right fade gradient */}
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
                
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
                  {/* Generate multiple CV skeletons for the carousel */}
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="snap-start flex-shrink-0"
                      style={{ width: "400px" }}
                    >
                      <Card className="p-6 h-[600px] flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                        {/* CV Header Skeleton */}
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

                        {/* CV Section Skeletons */}
                        <div className="space-y-6 flex-1 overflow-y-auto">
                          {/* Experience Section */}
                          <div>
                            <Skeleton className="h-5 w-32 mb-3" />
                            <div className="space-y-3">
                              <div>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-5/6 mb-1" />
                                <Skeleton className="h-3 w-1/3" />
                              </div>
                              <div>
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-4/5 mb-1" />
                                <Skeleton className="h-3 w-1/4" />
                              </div>
                            </div>
                          </div>

                          {/* Education Section */}
                          <div>
                            <Skeleton className="h-5 w-28 mb-3" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/3" />
                            </div>
                          </div>

                          {/* Skills Section */}
                          <div>
                            <Skeleton className="h-5 w-24 mb-3" />
                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-6 w-20 rounded-full" />
                              ))}
                            </div>
                          </div>

                          {/* Additional Sections */}
                          <div>
                            <Skeleton className="h-5 w-36 mb-3" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                              <Skeleton className="h-4 w-4/5" />
                            </div>
                          </div>
                        </div>

                        {/* CV Footer Badge */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
                </div>
              </div>

              {/* Carousel Indicator */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="flex gap-1.5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground ml-2">
                  Scroll to see more CVs
                </p>
              </div>
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
                Creating Your Personalized Roadmap
              </h3>
              <p className="text-sm text-muted-foreground">
                We're analyzing {jobTitle} positions at {company} and comparing them with your
                current profile. Our AI is identifying the key qualifications, skills, and
                experiences needed to maximize your chances of getting hired. This process
                typically takes 2-3 minutes.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

