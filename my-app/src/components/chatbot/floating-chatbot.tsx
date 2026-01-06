"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, X, Send, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    onError: (error) => {
      console.error("Chatbot error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    },
    onResponse: (response) => {
      console.log("Chatbot response received:", response.status, response.statusText);
    },
    onFinish: (message) => {
      console.log("Chatbot message finished:", message);
    },
  });

  const isLoading = status === "streaming";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen && !isMinimized && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsMinimized(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || !input.trim() || isLoading) return;
    
    const message = input.trim();
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    
    await sendMessage({ text: message });
  };

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={handleToggle}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
          aria-label="Open chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <Card
          className={cn(
            "fixed bottom-6 right-6 w-96 shadow-2xl z-50 flex flex-col transition-all duration-300",
            isMinimized ? "h-16" : "h-[600px]"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">Career Assistant</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMinimize}
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggle}
                aria-label="Close chatbot"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {!isMinimized && (
            <>
              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-muted-foreground">
                    <MessageCircle className="h-8 w-8" />
                    <p className="text-sm">Ask me anything about your career roadmap!</p>
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap">
                        {message.parts
                          ?.filter((p: any) => p.type === "text")
                          .map((p: any) => p.text)
                          .join("") || ""}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex justify-start">
                    <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm max-w-[80%]">
                      <p className="font-medium">Error:</p>
                      <p>{error.message || "Failed to send message. Please try again."}</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input */}
              <div className="border-t p-4">
                <form onSubmit={onSubmit} className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input || ""}
                    onChange={handleTextareaChange}
                    placeholder="Ask a question..."
                    className="min-h-[60px] max-h-[120px] resize-none"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSubmit(e as any);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input || !input.trim()}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}

