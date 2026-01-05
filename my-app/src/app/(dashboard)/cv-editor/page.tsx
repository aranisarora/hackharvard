"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, Info, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCV, updateCV } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { diffWords } from "diff";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function CVEditorPage() {
  const [currentCV, setCurrentCV] = useState<string>("");
  const [targetCV, setTargetCV] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const cvContentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadCV() {
      try {
        setIsLoading(true);
        const data = await getCV();
        setCurrentCV(data.currentCV);
        setTargetCV(data.targetCV);
        setEditValue(data.currentCV);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load CV");
      } finally {
        setIsLoading(false);
      }
    }
    loadCV();
  }, []);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(currentCV);
    setHasUnsavedChanges(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSave = async () => {
    try {
      await updateCV(editValue);
      setCurrentCV(editValue);
      setIsEditing(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      alert("Failed to save CV. Please try again.");
    }
  };

  const handleCancel = () => {
    setEditValue(currentCV);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleExportPDF = async () => {
    try {
      // Create a clean version for PDF export (without diff highlighting)
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.padding = '20mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '11pt';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.color = '#000000';
      tempDiv.textContent = currentCV;
      document.body.appendChild(tempDiv);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('cv.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  // Render diff view - show current CV with target additions highlighted
  const renderDiffView = () => {
    const diffs = diffWords(currentCV, targetCV);
    
    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
        {diffs.map((part, index) => {
          if (part.added) {
            // Target-only content - show in blue/grey to indicate missing
            return (
              <span 
                key={index} 
                className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-b-2 border-blue-300 dark:border-blue-600"
                title="This content is in the target CV but not in your current CV"
              >
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            // Current content that's not in target - show normally
            return <span key={index}>{part.value}</span>;
          }
          // Common content
          return <span key={index}>{part.value}</span>;
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <Skeleton className="h-[800px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">CV Editor</h1>
        </div>
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">CV Editor</h1>
          <p className="text-muted-foreground">
            View and edit your CV. Highlighted sections show content from the target CV that isn't in your current CV yet.
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartEdit}
              >
                Edit CV
              </Button>
              <Button
                size="sm"
                onClick={handleExportPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Legend</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-card border border-border"></div>
              <span className="text-muted-foreground">Current CV - Your existing content</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-600"></div>
              <span className="text-muted-foreground">Target CV - Content to add (highlighted)</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            💡 Tip: Click "Edit CV" to modify your current CV. Highlighted sections show what should be added from the target CV.
          </div>
        </CardContent>
      </Card>

      {/* CV Document View */}
      <Card className="bg-white dark:bg-gray-900 shadow-lg" ref={cvContentRef}>
        <CardContent className="p-12">
          <div className="max-w-4xl mx-auto">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full h-[800px] px-4 py-3 rounded border border-orange-500/50 bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-sans text-sm leading-relaxed resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCancel();
                  }
                  if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            ) : (
              <div className="editing-controls min-h-[600px]">
                {renderDiffView()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
