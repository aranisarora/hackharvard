"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { FloatingChatbot } from "@/components/chatbot/floating-chatbot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">{children}</main>
      <FloatingChatbot />
    </div>
  );
}

