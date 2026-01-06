"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Send, Upload, FileText, Loader2, Route } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
  suggestedReplies?: string[];
}

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [userName, setUserName] = useState<string>("");

  // Local state for input
  const [localInput, setLocalInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingCV, setIsUploadingCV] = useState(false);

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
    const userMsg = {
      role: "user" as const,
      content: userMessage,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    
    // Create assistant message placeholder for streaming
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg = {
      role: "assistant" as const,
      content: "",
      id: assistantMsgId,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    
    try {
      // Call the API with streaming
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to get response");
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      
      if (!reader) {
        throw new Error("No response body");
      }
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        console.log("Streaming chunk:", chunk);
        console.log("Accumulated so far:", accumulatedText);
        
        // Try to parse JSON as it streams in
        try {
          // Try to find valid JSON in the accumulated text
          let jsonMatch = accumulatedText.match(/\{[^{}]*"readyForRoadmap"[^{}]*"reply"[^{}]*\}/);
          if (!jsonMatch) {
            // Try more lenient pattern for nested objects
            jsonMatch = accumulatedText.match(/\{[\s\S]*?"readyForRoadmap"[\s\S]*?"reply"[\s\S]*?\}/);
          }
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("Successfully parsed JSON:", parsed);
            // Update the message with the reply text as it streams
            if (parsed.reply) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { 
                        ...msg, 
                        content: parsed.reply,
                        suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : []
                      }
                    : msg
                )
              );
            }
          }
        } catch (e) {
          // JSON not complete yet, continue streaming
          console.log("JSON parsing failed (expected during streaming):", (e as Error).message);
        }
      }
      
      // Final parse after stream completes
      console.log("Stream complete. Final accumulated text:", accumulatedText);
      try {
        let jsonMatch = accumulatedText.match(/\{[^{}]*"readyForRoadmap"[^{}]*"reply"[^{}]*\}/);
        if (!jsonMatch) {
          jsonMatch = accumulatedText.match(/\{[\s\S]*?"readyForRoadmap"[\s\S]*?"reply"[\s\S]*?\}/);
        }
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log("Final parse successful:", parsed);
          
          // Update final message content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { 
                    ...msg, 
                    content: parsed.reply || accumulatedText,
                    suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : []
                  }
                : msg
            )
          );
          
          // Update readyForRoadmap status
          if (parsed.readyForRoadmap === true) {
            setReadyForRoadmap(true);
          }
        } else {
          console.warn("No valid JSON found in response. Accumulated text:", accumulatedText);
          // Fallback: use accumulated text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedText }
                : msg
            )
          );
        }
      } catch (e) {
        // If parsing fails, use accumulated text
        console.error("Final parse failed:", e);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: accumulatedText }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: "Sorry, there was an error. Please try again." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const append = async (message: { role: "user" | "assistant"; content: string }) => {
    if (message.role === "user") {
      const userMsg = {
        role: "user" as const,
        content: message.content,
        id: Date.now().toString(),
      };
      
      // Capture current messages before updating
      let currentMessages: Message[] = [];
      setMessages((prev) => {
        currentMessages = prev;
        return [...prev, userMsg];
      });
      setIsLoading(true);
      
      // Create assistant message placeholder for streaming
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg = {
        role: "assistant" as const,
        content: "",
        id: assistantMsgId,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      
      try {
        // Use captured messages plus the new user message
        const messagesForAPI = [...currentMessages, userMsg];
        
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesForAPI.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
          }),
        })
        
        if (!response.ok) {
          throw new Error("Failed to get response");
        }
        
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        
        if (!reader) {
          throw new Error("No response body");
        }
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          console.log("Append streaming chunk:", chunk);
          
          // Try to parse JSON as it streams in
          try {
            let jsonMatch = accumulatedText.match(/\{[^{}]*"readyForRoadmap"[^{}]*"reply"[^{}]*\}/);
            if (!jsonMatch) {
              jsonMatch = accumulatedText.match(/\{[\s\S]*?"readyForRoadmap"[\s\S]*?"reply"[\s\S]*?\}/);
            }
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              console.log("Append parsed JSON:", parsed);
              // Update the message with the reply text as it streams
              if (parsed.reply) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { 
                          ...msg, 
                          content: parsed.reply,
                          suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : []
                        }
                      : msg
                  )
                );
              }
            }
          } catch (e) {
            // JSON not complete yet, continue streaming
            console.log("Append JSON parsing failed (expected during streaming):", (e as Error).message);
          }
        }
        
        // Final parse after stream completes
        console.log("Append stream complete. Final accumulated text:", accumulatedText);
        try {
          let jsonMatch = accumulatedText.match(/\{[^{}]*"readyForRoadmap"[^{}]*"reply"[^{}]*\}/);
          if (!jsonMatch) {
            jsonMatch = accumulatedText.match(/\{[\s\S]*?"readyForRoadmap"[\s\S]*?"reply"[\s\S]*?\}/);
          }
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("Append final parse successful:", parsed);
            
            // Update final message content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { 
                      ...msg, 
                      content: parsed.reply || accumulatedText,
                      suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : []
                    }
                  : msg
              )
            );
            
            // Update readyForRoadmap status
            if (parsed.readyForRoadmap === true) {
              setReadyForRoadmap(true);
            }
          } else {
            console.warn("Append: No valid JSON found. Accumulated text:", accumulatedText);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: accumulatedText }
                  : msg
              )
            );
          }
        } catch (e) {
          // If parsing fails, use accumulated text
          console.error("Append final parse failed:", e);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedText }
                : msg
            )
          );
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: "Sorry, there was an error. Please try again." }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Send initial message on mount
  useEffect(() => {
    if (!isInitialized && messages.length === 0) {
      setIsInitialized(true);
      // Trigger the first bot message
      const initialMessage = { role: "user" as const, content: "Start" };
      const userMsg = {
        role: "user" as const,
        content: initialMessage.content,
        id: Date.now().toString(),
      };
      
      setMessages([userMsg]);
      setIsLoading(true);
      
      // Create assistant message placeholder for streaming
      const assistantMsgId = (Date.now() + 1).toString();
      const assistantMsg = {
        role: "assistant" as const,
        content: "",
        id: assistantMsgId,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      
      // Call the API
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [userMsg].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Failed to get response");
          }
          
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let accumulatedText = "";
          
          if (!reader) {
            throw new Error("No response body");
          }
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            accumulatedText += chunk;
            console.log("Initial message streaming chunk:", chunk);
            
            try {
              let jsonMatch = accumulatedText.match(/\{[^{}]*"readyForRoadmap"[^{}]*"reply"[^{}]*\}/);
              if (!jsonMatch) {
                jsonMatch = accumulatedText.match(/\{[\s\S]*?"readyForRoadmap"[\s\S]*?"reply"[\s\S]*?\}/);
              }
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.reply) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { 
                            ...msg, 
                            content: parsed.reply,
                            suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : []
                          }
                        : msg
                    )
                  );
                }
              }
            } catch (e) {
              // JSON not complete yet
              console.log("Initial message JSON parsing failed (expected during streaming)");
            }
          }
          
          // Final parse
          console.log("Initial message stream complete. Final accumulated text:", accumulatedText);
          try {
            let jsonMatch = accumulatedText.match(/\{[^{}]*"readyForRoadmap"[^{}]*"reply"[^{}]*\}/);
            if (!jsonMatch) {
              jsonMatch = accumulatedText.match(/\{[\s\S]*?"readyForRoadmap"[\s\S]*?"reply"[\s\S]*?\}/);
            }
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              console.log("Initial message final parse successful:", parsed);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { 
                        ...msg, 
                        content: parsed.reply || accumulatedText,
                        suggestedReplies: Array.isArray(parsed.suggestedReplies) ? parsed.suggestedReplies : []
                      }
                    : msg
                )
              );
              if (parsed.readyForRoadmap === true) {
                setReadyForRoadmap(true);
              }
            } else {
              console.warn("Initial message: No valid JSON found. Accumulated text:", accumulatedText);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedText }
                    : msg
                )
              );
            }
          } catch (e) {
            console.error("Initial message final parse failed:", e);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: accumulatedText }
                  : msg
              )
            );
          }
        })
        .catch((error) => {
          console.error("Error sending initial message:", error);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: "Sorry, there was an error. Please try again." }
                : msg
            )
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isInitialized, messages.length]);


  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleCvUploadClick = () => {
    if (!isUploadingCV && !readyForRoadmap) {
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

        // Send message about CV upload
        append({ 
          role: "user", 
          content: `I've uploaded my CV: ${file.name}` 
        });
      } catch (error) {
        console.error("Error uploading CV:", error);
        alert("Failed to upload CV. Please try again.");
        setCvFile(null);
      } finally {
        setIsUploadingCV(false);
      }
    }
  };

  const extractTargetDetails = () => {
    const combined = messages.map((m) => m.content).join(" ");
    const jobRegexes = [
      /(target|dream)\s+(?:job|role|position)\s*(?:is|:)?\s*([A-Za-z0-9 ,\-\/]{3,80})/i,
      /as\s+(?:a|an)\s+([A-Za-z0-9 ,\-\/]{3,80})/i,
    ];
    const companyRegex =
      /(?:at|@)\s+([A-Za-z0-9&.'\-]{2,80})(?:\b|$)/i;

    let jobTitle = "Product Designer";
    let company = "Pathforge";

    for (const regex of jobRegexes) {
      const match = combined.match(regex);
      if (match && match[2]) {
        jobTitle = match[2].trim();
        break;
      } else if (match && match[1]) {
        jobTitle = match[1].trim();
        break;
      }
    }

    const companyMatch = combined.match(companyRegex);
    if (companyMatch && companyMatch[1]) {
      company = companyMatch[1].trim();
    }

    return { jobTitle, company };
  };

  const handleGenerateRoadmap = () => {
    if (!messages || messages.length === 0) {
      alert("Please have a conversation first before generating a roadmap.");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(30);
    setGenerationStep("Fetching relevant CVs...");

    const { jobTitle, company } = extractTargetDetails();
    const params = new URLSearchParams({
      jobTitle,
      company,
    });

    // Navigate to the new CV preview flow
    router.push(`/generate-roadmap?${params.toString()}`);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e);
  };

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
            if (!msg.content) return null;
            
            return (
              <div key={msg.id} className="space-y-2">
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === "user"
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
                {/* CV Upload - Always visible */}
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
                      disabled={isUploadingCV || isLoading || readyForRoadmap}
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
                <form onSubmit={onSubmit} className="flex gap-2">
                  <Textarea
                    value={localInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="min-h-[60px] max-h-[120px] resize-none"
                    disabled={isLoading || readyForRoadmap || isUploadingCV}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !localInput.trim() || readyForRoadmap || isUploadingCV}
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
