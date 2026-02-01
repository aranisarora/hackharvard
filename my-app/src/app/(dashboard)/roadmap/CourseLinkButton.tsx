"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { linkCourseAccount, updateCourseProgress } from "@/lib/api";

interface CourseLinkButtonProps {
    taskId: string;
    checklist: Array<{ id: string; text: string; isCompleted: boolean; link?: string }>;
    onUpdate: (taskId: string, newChecklist: Array<{ id: string; text: string; isCompleted: boolean; link?: string }>) => void;
    initiallyLinked?: boolean;
    onLinked?: (taskId: string) => void;
}

export function CourseLinkButton({ taskId, checklist, onUpdate, initiallyLinked = false, onLinked }: CourseLinkButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isLinked, setIsLinked] = useState(initiallyLinked);
    const [showNotification, setShowNotification] = useState(false);

    const handleLink = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsLoading(true);
        try {
            const { percentage } = await linkCourseAccount();

            // Show notification
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 3000);

            setIsLinked(true);
            onLinked?.(taskId);
            applyProgress(percentage);
        } catch (e) {
            console.error(e);
            alert("Failed to link account");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsLoading(true);
        try {
            // Calculate current percentage
            const completed = checklist.filter(c => c.isCompleted).length;
            const currentPct = checklist.length > 0 ? Math.round((completed / checklist.length) * 100) : 0;

            const { percentage } = await updateCourseProgress(currentPct);
            applyProgress(percentage);
        } catch (e) {
            console.error(e);
            alert("Failed to update progress");
        } finally {
            setIsLoading(false);
        }
    };

    const applyProgress = (percentage: number) => {
        const total = checklist.length;
        // Ensure we don't exceed total
        const targetCompleted = Math.min(total, Math.round((percentage / 100) * total));

        // Create new checklist with first 'targetCompleted' items marked as true
        const newChecklist = checklist.map((item, index) => ({
            ...item,
            isCompleted: index < targetCompleted
        }));

        onUpdate(taskId, newChecklist);
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={isLinked ? handleUpdate : handleLink}
                disabled={isLoading}
                className="ml-auto"
            >
                {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                {isLinked ? "Update" : "Link Account"}
                {isLinked && !isLoading && <RefreshCw className="ml-2 h-3 w-3" />}
            </Button>

            {showNotification && (
                <div className="fixed bottom-10 right-10 bg-black text-white px-4 py-2 rounded-md shadow-lg z-50 animate-in fade-in slide-in-from-bottom-5">
                    Account linked
                </div>
            )}
        </>
    );
}
