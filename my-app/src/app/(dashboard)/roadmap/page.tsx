"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, Calendar, ExternalLink, User, Mail, Link } from "lucide-react";
import { getRoadmapTasks, updateChecklistItem, updateTaskDates, saveRoadmap } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseLinkButton } from "./CourseLinkButton";

interface RoadmapTask {
  id: string;
  categories: string[];
  title: string;
  description: string;
  checklist?: Array<{ id: string; text: string; isCompleted: boolean; link?: string }>;
  deadline?: string;
  startDate?: string;
  endDate?: string;
  isCompleted: boolean;
  courseLink?: string;
  isLinked?: boolean;
  mentor?: {
    name: string;
    title: string;
    company: string;
    email: string;
    profileImage?: string;
    description?: string;
  };
}

// Format category name for display (handles "course" -> "Course")
const formatCategoryDisplay = (category: string): string => {
  if (category.toLowerCase() === "course") {
    return "Course";
  }
  // Capitalize first letter of each word for other categories
  return category
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Check if any of the task's categories is "course"
const isCourseTask = (categories: string[]): boolean => {
  return categories.some(c => c.toLowerCase() === "course");
};

export default function RoadmapPage() {
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDates, setEditingDates] = useState<{ [taskId: string]: { deadline?: string; startDate?: string; endDate?: string } }>({});

  useEffect(() => {
    async function loadTasks() {
      try {
        setIsLoading(true);
        const data = await getRoadmapTasks();
        setTasks(data.tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roadmap tasks");
      } finally {
        setIsLoading(false);
      }
    }
    loadTasks();
  }, []);

  const toggleChecklistItem = async (taskId: string, itemId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const checklist = task.checklist ?? [];
    const item = checklist.find((c) => c.id === itemId);
    if (!item) return;

    const newIsCompleted = !item.isCompleted;

    try {
      await updateChecklistItem(taskId, itemId, newIsCompleted);

      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.id === taskId) {
            const updatedChecklist = (task.checklist ?? []).map((item) =>
              item.id === itemId
                ? { ...item, isCompleted: newIsCompleted }
                : item
            );
            const allCompleted = updatedChecklist.every((item) => item.isCompleted);
            return {
              ...task,
              checklist: updatedChecklist,
              isCompleted: allCompleted,
            };
          }
          return task;
        })
      );
    } catch (err) {
      alert("Failed to update checklist item. Please try again.");
    }
  };

  const handleChecklistUpdate = async (taskId: string, newChecklist: Array<{ id: string; text: string; isCompleted: boolean; link?: string }>) => {
    try {
      // Calculate new completed state
      const allCompleted = newChecklist.every((item) => item.isCompleted);

      const newTasks = tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            checklist: newChecklist,
            isCompleted: allCompleted,
          };
        }
        return task;
      });

      setTasks(newTasks);

      // Persist changes
      await saveRoadmap(newTasks);
    } catch (err) {
      console.error(err);
      alert("Failed to save progress update.");
    }
  };

  const handleCourseLinked = async (taskId: string) => {
    try {
      const newTasks = tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            isLinked: true,
          };
        }
        return task;
      });

      setTasks(newTasks);

      // Persist the linked state
      await saveRoadmap(newTasks);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = (taskId: string, field: 'deadline' | 'startDate' | 'endDate', value: string) => {
    setEditingDates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value,
      }
    }));
  };

  const saveTaskDates = async (taskId: string) => {
    const dates = editingDates[taskId];
    if (!dates || Object.keys(dates).length === 0) return;

    try {
      await updateTaskDates(taskId, dates);

      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.id === taskId) {
            return {
              ...task,
              ...dates,
            };
          }
          return task;
        })
      );

      setEditingDates(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    } catch (err) {
      alert("Failed to update dates. Please try again.");
    }
  };

  const isTaskInProgress = (task: RoadmapTask) => {
    if (task.isCompleted) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = task.startDate ? new Date(task.startDate) : null;
    const endDate = task.endDate ? new Date(task.endDate) : null;

    if (startDate && endDate) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      if (today >= startDate && today <= endDate) {
        return true;
      }
    }

    // If no dates or dates don't match, check if any checklist items are in progress
    const checklist = task.checklist || [];
    const hasInProgressItems = checklist.some(item => !item.isCompleted);
    const hasCompletedItems = checklist.some(item => item.isCompleted);
    return hasInProgressItems && hasCompletedItems;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
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
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Career Roadmap</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.isCompleted).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Career Roadmap
        </h1>
        <p className="text-muted-foreground">
          Track your progress toward your dream role
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Progress: {completedTasks}/{totalTasks} tasks completed ({progress}%)
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const checklist = task.checklist || [];
          const completedChecklist = checklist.filter((c) => c.isCompleted).length;
          const checklistProgress = checklist.length
            ? Math.round((completedChecklist / checklist.length) * 100)
            : 0;
          const inProgress = isTaskInProgress(task);

          return (
            <Card
              key={task.id}
              className={`${task.isCompleted ? "opacity-75" : ""} ${inProgress ? "ring-2 ring-primary ring-offset-2 scale-[1.02] transition-transform" : ""}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {task.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle>{task.title}</CardTitle>
                      <div className="flex gap-1 flex-wrap">
                        {task.categories.map(cat => (
                          <span key={cat} className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                            {formatCategoryDisplay(cat)}
                          </span>
                        ))}
                      </div>

                      {isCourseTask(task.categories) && (
                        <div className="ml-auto">
                          <CourseLinkButton
                            taskId={task.id}
                            checklist={task.checklist ?? []}
                            onUpdate={handleChecklistUpdate}
                            initiallyLinked={task.isLinked ?? false}
                            onLinked={handleCourseLinked}
                          />
                        </div>
                      )}
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Checklist Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {completedChecklist}/{checklist.length}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${checklistProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleChecklistItem(task.id, item.id)}
                        className="w-full flex items-center gap-2 text-sm text-left hover:bg-muted/50 p-2 rounded-md transition-colors"
                      >
                        {item.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span
                          className={
                            item.isCompleted
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }
                        >
                          {item.text}
                        </span>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto flex-shrink-0"
                          >
                            <Link className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                          </a>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Start:</span>
                          <Input
                            type="date"
                            value={editingDates[task.id]?.startDate ?? task.startDate ?? ""}
                            onChange={(e) => handleDateChange(task.id, 'startDate', e.target.value)}
                            onBlur={() => saveTaskDates(task.id)}
                            className="w-32 h-8 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">End:</span>
                          <Input
                            type="date"
                            value={editingDates[task.id]?.endDate ?? task.endDate ?? ""}
                            onChange={(e) => handleDateChange(task.id, 'endDate', e.target.value)}
                            onBlur={() => saveTaskDates(task.id)}
                            className="w-32 h-8 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Deadline:</span>
                          <Input
                            type="date"
                            value={editingDates[task.id]?.deadline ?? task.deadline}
                            onChange={(e) => handleDateChange(task.id, 'deadline', e.target.value)}
                            onBlur={() => saveTaskDates(task.id)}
                            className="w-32 h-8 text-xs"
                          />
                        </div>
                      </div>
                      {task.courseLink && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={task.courseLink} target="_blank" rel="noopener noreferrer">
                            View Course
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>

                    {task.mentor && (
                      <div className="p-4 bg-muted rounded-md border border-primary/20">
                        <div className="flex items-start gap-3 mb-3">
                          {task.mentor.profileImage && (
                            <img
                              src={task.mentor.profileImage}
                              alt={task.mentor.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">{task.mentor.name}</p>
                            <p className="text-xs text-muted-foreground mb-1">
                              {task.mentor.title} at {task.mentor.company}
                            </p>
                            {task.mentor.description && (
                              <p className="text-xs text-muted-foreground">
                                {task.mentor.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button variant="default" size="sm" className="w-full" asChild>
                          <a href={`mailto:${task.mentor.email}`}>
                            <Mail className="mr-2 h-4 w-4" />
                            Connect with Mentor
                          </a>
                        </Button>
                      </div>
                    )}

                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
