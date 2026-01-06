"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Send, Upload, FileText, Loader2, Route } from "lucide-react";
import { generateRoadmap, saveCV, saveRoadmap, saveDashboardData } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
  suggestedReplies?: string[];
  isHidden?: boolean;
}

type OnboardingPhase = 'hardcoded' | 'cv-prompt' | 'cv-upload' | 'personalized' | 'complete';

// Hardcoded questions configuration
const HARDCODED_QUESTIONS = [
  {
    key: 'age',
    question: 'What is your age?',
    suggestedReplies: ['18-24', '25-34', '35-44', '45+']
  },
  {
    key: 'location',
    question: 'Where are you currently located?',
    suggestedReplies: ['United States', 'Europe', 'Asia', 'Other']
  },
  {
    key: 'targetPosition',
    question: 'What is your target job position?',
    suggestedReplies: ['Software Engineer', 'Product Manager', 'Data Scientist', 'Other']
  },
  {
    key: 'targetCompany',
    question: 'Do you have a specific target company in mind?',
    suggestedReplies: ['Yes (specify)', 'Any top tech company', 'Startups', 'No preference']
  },
  {
    key: 'salaryRange',
    question: 'What is your acceptable salary range?',
    suggestedReplies: ['$50k-$80k', '$80k-$120k', '$120k-$180k', '$180k+']
  },
  {
    key: 'timePerWeek',
    question: 'How many hours per week can you dedicate to improving your CV and skills?',
    suggestedReplies: ['1-5 hours', '5-10 hours', '10-20 hours', '20+ hours']
  },
  {
    key: 'targetDate',
    question: 'When do you want to have a fully ready CV?',
    suggestedReplies: ['1 month', '3 months', '6 months', '1 year']
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [readyForRoadmap, setReadyForRoadmap] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userName, setUserName] = useState<string>("");

  // Local state for input
  const [localInput, setLocalInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingCV, setIsUploadingCV] = useState(false);

  // New state for hardcoded questions flow
  const [currentPhase, setCurrentPhase] = useState<OnboardingPhase>('hardcoded');
  const [hardcodedQuestionIndex, setHardcodedQuestionIndex] = useState(0);
  const [hardcodedAnswers, setHardcodedAnswers] = useState<Record<string, string>>({});
  const [personalizedQuestions, setPersonalizedQuestions] = useState<string[]>([]);
  const [personalizedAnswers, setPersonalizedAnswers] = useState<string[]>([]);
  const [currentPersonalizedIndex, setCurrentPersonalizedIndex] = useState(0);

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            "there";
          setUserName(name);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }
    fetchUserData();
  }, [supabase]);

  // Initialize with first hardcoded question
  useEffect(() => {
    if (messages.length === 0) {
      const name = userName || "there";
      const greeting = `Hi ${name}! 👋 Welcome to PathForge. I'll help you create a personalized career roadmap. Let's start with a few quick questions.`;
      const firstQuestion = HARDCODED_QUESTIONS[0].question;

      setMessages([
        {
          role: "assistant",
          content: greeting,
          id: "greeting",
        },
        {
          role: "assistant",
          content: firstQuestion,
          id: "q-0",
          suggestedReplies: HARDCODED_QUESTIONS[0].suggestedReplies,
        }
      ]);
    }
  }, [userName, messages.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInput(e.target.value);
  };

  const handleSuggestedReply = (reply: string) => {
    setLocalInput(reply);
    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      }
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim() || isLoading) return;

    const userMessage = localInput.trim();
    setLocalInput("");

    // Add user message to chat
    const userMsg: Message = {
      role: "user",
      content: userMessage,
      id: `user-${Date.now()}`,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (currentPhase === 'hardcoded') {
        // Handle hardcoded questions locally
        const currentQuestion = HARDCODED_QUESTIONS[hardcodedQuestionIndex];
        const newAnswers = { ...hardcodedAnswers, [currentQuestion.key]: userMessage };
        setHardcodedAnswers(newAnswers);

        // Move to next question or transition to CV upload
        const nextIndex = hardcodedQuestionIndex + 1;

        if (nextIndex < HARDCODED_QUESTIONS.length) {
          // Show next hardcoded question
          setHardcodedQuestionIndex(nextIndex);
          const nextQuestion = HARDCODED_QUESTIONS[nextIndex];

          const assistantMsg: Message = {
            role: "assistant",
            content: nextQuestion.question,
            id: `q-${nextIndex}`,
            suggestedReplies: nextQuestion.suggestedReplies,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          // All hardcoded questions done, prompt for CV upload
          setCurrentPhase('cv-prompt');
          const cvPromptMsg: Message = {
            role: "assistant",
            content: "Great! Now, please upload your CV so I can better understand your background and create personalized questions for you.",
            id: "cv-prompt",
          };
          setMessages((prev) => [...prev, cvPromptMsg]);
        }
      } else if (currentPhase === 'personalized') {
        // Handle personalized questions
        const newAnswers = [...personalizedAnswers];
        newAnswers[currentPersonalizedIndex] = userMessage;
        setPersonalizedAnswers(newAnswers);

        const nextIndex = currentPersonalizedIndex + 1;

        if (nextIndex < personalizedQuestions.length) {
          // Show next personalized question
          setCurrentPersonalizedIndex(nextIndex);
          const nextQuestion = personalizedQuestions[nextIndex];

          const assistantMsg: Message = {
            role: "assistant",
            content: nextQuestion,
            id: `pq-${nextIndex}`,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          // All questions answered, ready for roadmap
          setCurrentPhase('complete');
          setReadyForRoadmap(true);
          const completeMsg: Message = {
            role: "assistant",
            content: "Perfect! I have all the information I need to create your personalized career roadmap. Ready to generate it?",
            id: "complete",
          };
          setMessages((prev) => [...prev, completeMsg]);
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, there was an error. Please try again.",
        id: `error-${Date.now()}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleCvUploadClick = () => {
    if (!isUploadingCV && currentPhase !== 'hardcoded') {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF, DOC, DOCX)
      const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PDF, DOC, or DOCX file");
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert("File size exceeds 10MB limit. Please upload a smaller file.");
        return;
      }

      setIsUploadingCV(true);
      setCvFile(file);
      setCurrentPhase('cv-upload');

      try {
        // Upload CV to server
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/cv/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload CV");
        }

        const uploadResult = await response.json();
        const extractedText = uploadResult.extractedText;

        // Add hidden message with CV content
        if (extractedText) {
          console.log("Adding extracted CV text to context");
          const cvContextMsg: Message = {
            role: "user",
            content: `Here is the content of my uploaded CV/Resume:\n\n${extractedText}`,
            id: "cv-content-hidden",
            isHidden: true,
          };
          setMessages((prev) => [...prev, cvContextMsg]);
        }

        // Add confirmation message
        const uploadMsg: Message = {
          role: "assistant",
          content: `Thanks for uploading your CV (${file.name})! Let me generate some personalized questions based on your profile...`,
          id: "cv-uploaded",
        };
        setMessages((prev) => [...prev, uploadMsg]);

        // Generate personalized questions based on hardcoded answers
        const questionsResponse = await fetch("/api/onboarding/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hardcodedAnswers }),
        });

        if (!questionsResponse.ok) {
          throw new Error("Failed to generate personalized questions");
        }

        const { questions } = await questionsResponse.json();
        setPersonalizedQuestions(questions);
        setCurrentPhase('personalized');
        setCurrentPersonalizedIndex(0);

        // Show first personalized question
        if (questions.length > 0) {
          const firstPersonalizedMsg: Message = {
            role: "assistant",
            content: questions[0],
            id: "pq-0",
          };
          setMessages((prev) => [...prev, firstPersonalizedMsg]);
        }
      } catch (error) {
        console.error("Error uploading CV:", error);
        alert("Failed to upload CV or generate questions. Please try again.");
        setCvFile(null);
        setCurrentPhase('cv-prompt');
      } finally {
        setIsUploadingCV(false);
      }
    }
  };

  const handleGenerateRoadmap = async () => {
    console.log("Generate roadmap button clicked");
    console.log("Current messages:", messages);
    
    if (!messages || messages.length === 0) {
      alert("Please have a conversation first before generating a roadmap.");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep("Analyzing conversation...");

    try {
      // Step 1: Analyze conversation (20%)
      setGenerationProgress(20);
      setGenerationStep("Analyzing your conversation and goals...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Generate initial CV (40%)
      setGenerationProgress(40);
      setGenerationStep("Extracting your current CV...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Generate target CV (60%)
      setGenerationProgress(60);
      setGenerationStep("Creating your target CV...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 4: Generate roadmap (80%)
      setGenerationProgress(80);
      setGenerationStep("Generating your personalized roadmap...");
      
      // Call the API with all messages - transform to expected format
      const formattedMessages = messages
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .filter((msg) => msg.content && msg.content.trim()) // Filter out empty messages
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      
      console.log("Formatted messages for API:", formattedMessages);
      
      if (formattedMessages.length === 0) {
        throw new Error("No valid messages to generate roadmap from");
      }
      
      console.log("Calling generateRoadmap API...");

      // Add timeout to prevent hanging - increased to 5 minutes as generation can take time
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out after 5 minutes")), 300000)
      );

      const result = await Promise.race([
        generateRoadmap(formattedMessages),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof generateRoadmap>>;

      console.log("Roadmap generation result:", result);
      
      if (!result.success || !result.data) {
        throw new Error("Failed to generate roadmap - no data returned");
      }

      // Step 5: Save data (90%)
      setGenerationProgress(90);
      setGenerationStep("Saving your roadmap...");
      
      // Save the generated data to the API
      await Promise.all([
        saveCV(result.data.initialCV, result.data.targetCV),
        saveRoadmap(result.data.roadmap.tasks),
        saveDashboardData(result.data.dashboard),
      ]);

      // Step 6: Complete (100%)
      setGenerationProgress(100);
      setGenerationStep("Complete! Redirecting...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error generating roadmap:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to generate roadmap: ${errorMessage}`);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStep("");
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e);
  };

  // Determine if CV upload should be shown
  const showCvUpload = currentPhase === 'cv-prompt' || currentPhase === 'cv-upload';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 border-b border-border">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">PathForge</h1>
          <span className="text-sm text-muted-foreground">Onboarding</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-6">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6">
          {messages.map((msg) => {
            if (!msg.content || msg.isHidden) return null;

            return (
              <div key={msg.id} className="space-y-2">
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                {/* Show suggested replies for assistant messages */}
                {msg.role === "assistant" && msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                  <div className="flex justify-start gap-2 flex-wrap">
                    {msg.suggestedReplies.map((reply, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestedReply(reply)}
                        className="text-xs"
                        disabled={isLoading || currentPhase !== 'hardcoded'}
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area or Generate Roadmap Button */}
        <Card className="border-t border-border">
          <CardContent className="p-4">
            {readyForRoadmap ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                {isGenerating ? (
                  <>
                    <div className="w-full max-w-md space-y-4">
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          Generating Your Roadmap
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {generationStep || "Processing..."}
                        </p>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                      <div className="text-center text-xs text-muted-foreground">
                        {generationProgress}%
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        Ready to Generate Your Roadmap?
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        I have all the information I need. Click below to create your personalized career roadmap.
                      </p>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Button clicked, calling handleGenerateRoadmap");
                        handleGenerateRoadmap();
                      }}
                      disabled={isGenerating || messages.length === 0}
                      size="lg"
                      className="w-full sm:w-auto min-w-[200px]"
                      type="button"
                    >
                      <Route className="h-4 w-4 mr-2" />
                      Generate Roadmap
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* CV Upload - Only visible after hardcoded questions */}
                {showCvUpload && (
                  <div className="mb-4">
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCvUploadClick}
                        className="flex items-center gap-2"
                        disabled={isUploadingCV || isLoading || currentPhase === 'cv-upload'}
                      >
                        {isUploadingCV ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {cvFile ? cvFile.name : "Upload CV"}
                      </Button>
                      {cvFile && (
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {cvFile.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Accepted formats: PDF, DOC, DOCX (max 10MB)
                    </p>
                  </div>
                )}

                {/* Text input - disabled during CV upload phase */}
                <form onSubmit={onSubmit} className="flex gap-2">
                  <Textarea
                    value={localInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="min-h-[60px] max-h-[120px] resize-none"
                    disabled={isLoading || isUploadingCV || currentPhase === 'cv-upload' || currentPhase === 'cv-prompt'}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !localInput.trim() || isUploadingCV || currentPhase === 'cv-upload' || currentPhase === 'cv-prompt'}
                    size="lg"
                    className="shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
