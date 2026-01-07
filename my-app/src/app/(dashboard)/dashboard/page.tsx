"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FileText, Route, Briefcase, GraduationCap, Award, CheckCircle2, Circle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getDashboardData, getRoadmapTasks } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase: Briefcase,
  FileText: FileText,
  GraduationCap: GraduationCap,
  Award: Award,
};

type CategoryColorConfig = {
  dayBg: string;
  dayBorder: string;
  dayDot: string;
  progressBar: string;
  breakdownBg: string;
  breakdownText: string;
};

const CATEGORY_COLOR_PALETTE: Record<string, CategoryColorConfig> = {
  skills: {
    dayBg: "bg-blue-500/20",
    dayBorder: "border-blue-500",
    dayDot: "bg-blue-500",
    progressBar: "bg-blue-500",
    breakdownBg: "bg-blue-500/20",
    breakdownText: "text-blue-700 dark:text-blue-300",
  },
  projects: {
    dayBg: "bg-emerald-500/20",
    dayBorder: "border-emerald-500",
    dayDot: "bg-emerald-500",
    progressBar: "bg-emerald-500",
    breakdownBg: "bg-emerald-500/20",
    breakdownText: "text-emerald-700 dark:text-emerald-300",
  },
  certifications: {
    dayBg: "bg-amber-500/20",
    dayBorder: "border-amber-500",
    dayDot: "bg-amber-500",
    progressBar: "bg-amber-500",
    breakdownBg: "bg-amber-500/20",
    breakdownText: "text-amber-700 dark:text-amber-300",
  },
  experience: {
    dayBg: "bg-purple-500/20",
    dayBorder: "border-purple-500",
    dayDot: "bg-purple-500",
    progressBar: "bg-purple-500",
    breakdownBg: "bg-purple-500/20",
    breakdownText: "text-purple-700 dark:text-purple-300",
  },
  "cv-feedback": {
    dayBg: "bg-pink-500/20",
    dayBorder: "border-pink-500",
    dayDot: "bg-pink-500",
    progressBar: "bg-pink-500",
    breakdownBg: "bg-pink-500/20",
    breakdownText: "text-pink-700 dark:text-pink-300",
  },
  awards: {
    dayBg: "bg-indigo-500/20",
    dayBorder: "border-indigo-500",
    dayDot: "bg-indigo-500",
    progressBar: "bg-indigo-500",
    breakdownBg: "bg-indigo-500/20",
    breakdownText: "text-indigo-700 dark:text-indigo-300",
  },
  course: {
    dayBg: "bg-teal-500/20",
    dayBorder: "border-teal-500",
    dayDot: "bg-teal-500",
    progressBar: "bg-teal-500",
    breakdownBg: "bg-teal-500/20",
    breakdownText: "text-teal-700 dark:text-teal-300",
  },
};

const DEFAULT_CATEGORY_COLORS: CategoryColorConfig = {
  dayBg: "bg-slate-500/20",
  dayBorder: "border-slate-500",
  dayDot: "bg-slate-500",
  progressBar: "bg-slate-500",
  breakdownBg: "bg-slate-500/20",
  breakdownText: "text-muted-foreground",
};

const getCategoryColors = (category: string) => CATEGORY_COLOR_PALETTE[category] || DEFAULT_CATEGORY_COLORS;

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [roadmapTasks, setRoadmapTasks] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [dashboardData, roadmapData] = await Promise.all([
          getDashboardData(),
          getRoadmapTasks(),
        ]);
        setData(dashboardData);
        setRoadmapTasks(roadmapData.tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Get calendar data from roadmap tasks
  const getCalendarData = () => {
    // Use viewDate instead of current date
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Create calendar grid
    const calendarDays: Array<{ date: number; categories: string[] }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ date: 0, categories: [] });
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const categories: string[] = [];

      roadmapTasks.forEach(task => {
        if (task.startDate && task.endDate && !task.isCompleted) {
          const startDate = new Date(task.startDate);
          const endDate = new Date(task.endDate);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          date.setHours(0, 0, 0, 0);

          if (date >= startDate && date <= endDate) {
            categories.push(task.category);
          }
        }
      });

      calendarDays.push({ date: day, categories: [...new Set(categories)] });
    }

    return { calendarDays, currentMonth, currentYear };
  };

  const getCategoryProgressSegments = () => {
    if (!data?.categories || !data?.overallProgress || data.overallProgress === 0) return [];

    // Calculate how much of the overall progress each category contributes
    // The overall progress is a weighted average of category progress
    // We need to calculate each category's contribution to the overall 45%

    // First, get the total "weight" (sum of all category progress)
    const totalCategoryProgress = data.categories.reduce((sum: number, cat: any) => sum + cat.progress, 0);
    if (totalCategoryProgress === 0) return [];

    // Calculate each category's contribution to overall progress
    // If overall is 45% and total category progress is 116% (66% + 50%), then:
    // Skills contributes: (66 / 116) * 45 = 25.6% of overall
    // Experience contributes: (50 / 116) * 45 = 19.4% of overall
    const segments = data.categories
      .filter((cat: any) => cat.progress > 0)
      .map((cat: any) => {
        // Contribution to overall progress
        const contributionToOverall = (cat.progress / totalCategoryProgress) * data.overallProgress;
        // Percentage of the progress bar this category should occupy
        const barPercentage = (contributionToOverall / data.overallProgress) * 100;

        return {
          ...cat,
          barPercentage,
          contributionToOverall: Math.round(contributionToOverall * 10) / 10, // Round to 1 decimal
          categoryProgress: cat.progress,
        };
      });

    return segments;
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const previousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, overallProgress, categories } = data;
  const { calendarDays, currentMonth, currentYear } = getCalendarData();
  const progressSegments = getCategoryProgressSegments();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back!
        </h1>
        <p className="text-muted-foreground">
          Your journey to <span className="font-medium">{user.targetJob}</span>{" "}
          at <span className="font-medium">{user.targetCompany}</span>
        </p>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overall CV Progress</CardTitle>
              <CardDescription>
                {overallProgress}% match to your target CV
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cv-editor">View CV</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="relative h-4 bg-muted rounded-full overflow-hidden">
              {progressSegments.length > 0 ? (
                <div className="flex h-full">
                  <div
                    className="flex h-full"
                    style={{ width: `${Math.max(0, Math.min(overallProgress, 100))}%` }}
                  >
                    {progressSegments.map((segment: any) => {
                      const colors = getCategoryColors(segment.id);
                      return (
                        <div
                          key={`${segment.id}-${segment.title}`}
                          className={`${colors.progressBar} h-full`}
                          style={{ width: `${Math.min(segment.barPercentage, 100)}%` }}
                          title={`${segment.title}: ${segment.categoryProgress}% of ${overallProgress}%`}
                        />
                      );
                    })}
                  </div>
                  <div
                    className="bg-slate-200 h-full"
                    style={{ width: `${Math.max(0, 100 - overallProgress)}%` }}
                  />
                </div>
              ) : (
                <Progress value={overallProgress} className="h-4" />
              )}
            </div>
            {progressSegments.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Breakdown:</span>
                {progressSegments.map((segment: any) => {
                  const colors = getCategoryColors(segment.id);
                  return (
                    <span key={`${segment.id}-${segment.title}`} className={`px-2 py-1 rounded ${colors.breakdownBg} ${colors.breakdownText}`}>
                      {segment.title}: {segment.contributionToOverall}% of {overallProgress}%
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid with Calendar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Categories */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {categories.map((category: any) => {
            const Icon = iconMap[category.icon] || Briefcase;
            const tasks = category.tasks || [];
            const completedCount = tasks.filter((t: any) => t.completed).length;

            return (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${category.bgColor}`}>
                        <Icon className={`h-5 w-5 ${category.color}`} />
                      </div>
                      <div>
                        <CardTitle>{category.title}</CardTitle>
                        <CardDescription>
                          {completedCount}/{tasks.length} completed
                        </CardDescription>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {category.progress}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={category.progress} className="h-2 mb-4" />
                  <div className="space-y-2">
                    {tasks.map((task: any, idx: number) => {
                      // Find matching roadmap task to get dates
                      const roadmapTask = roadmapTasks.find(
                        (rt: any) => rt.title === task.title && rt.category === category.id
                      );
                      const deadline = roadmapTask?.endDate || roadmapTask?.deadline;

                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {task.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span
                              className={
                                task.completed
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }
                            >
                              {task.title}
                            </span>
                          </div>
                          {deadline && !task.completed && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
                    <Link href="/roadmap">View all tasks</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Calendar Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Activity Calendar</CardTitle>
              </div>
              <div className="flex items-center justify-between xl:justify-end gap-1 w-full xl:w-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium min-w-[120px] text-center">
                  {monthNames[currentMonth]} {currentYear}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="font-medium text-muted-foreground p-1">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                const getDayBackgroundColor = () => {
                  if (day.categories.length === 0) return "bg-background border-muted border";
                  const primaryCategory = day.categories[0];
                  const colors = getCategoryColors(primaryCategory);
                  const borderWidthClass = day.categories.length > 1 ? "border-2" : "border";

                  return `${colors.dayBg} ${colors.dayBorder} ${borderWidthClass}`;
                };

                return (
                  <div
                    key={index}
                    className={`aspect-square p-1 rounded transition-colors ${day.date === 0
                      ? "border-transparent"
                      : getDayBackgroundColor()
                      }`}
                  >
                    {day.date > 0 && (
                      <>
                        <div className="font-medium text-sm mb-0.5">{day.date}</div>
                        <div className="flex flex-wrap gap-0.5 justify-center items-center min-h-[12px]">
                          {day.categories.slice(0, 4).map((cat) => {
                            const colors = getCategoryColors(cat);
                            return (
                              <div
                                key={cat}
                                className={`w-2 h-2 rounded-full ${colors.dayDot} border border-white/50`}
                                title={cat}
                              />
                            );
                          })}
                          {day.categories.length > 4 && (
                            <div className="text-[8px] text-muted-foreground font-medium">+{day.categories.length - 4}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {roadmapTasks.length > 0 && (
              <div className="mt-4 space-y-1 text-xs">
                <span className="text-muted-foreground font-medium">Legend:</span>
                <div className="flex flex-col gap-1">
                  {Array.from(new Set(roadmapTasks.map(t => t.category).filter(Boolean))).map((cat) => {
                    const colors = getCategoryColors(cat);
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${colors.dayDot}`} />
                        <span className="capitalize">{cat.replace(/-/g, " ")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

