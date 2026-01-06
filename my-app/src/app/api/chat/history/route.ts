import { NextResponse } from "next/server";
import { summarizeOnboardingChat } from "@/services/gemini-service";
import fs from "fs";
import path from "path";

// File path for storing chat summary
const DATA_DIR = path.join(process.cwd(), "server_data");
const SUMMARY_FILE = path.join(DATA_DIR, "chat_summary.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error("Failed to create data directory:", err);
    }
}

export async function GET() {
    try {
        if (fs.existsSync(SUMMARY_FILE)) {
            const fileContent = fs.readFileSync(SUMMARY_FILE, "utf-8");
            const data = JSON.parse(fileContent);
            return NextResponse.json({ history: data });
        }
        return NextResponse.json({ history: { summary: {}, timestamp: null } });
    } catch (error) {
        console.error("Error reading chat history:", error);
        return NextResponse.json({ history: { summary: {}, timestamp: null } });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: "messages array is required" },
                { status: 400 }
            );
        }

        console.log("[Chat History] Summarizing chat...");
        // Use Gemini to summarize the chat into structured data
        const summary = await summarizeOnboardingChat(messages);
        console.log("[Chat History] Summary generated:", summary);

        // Store the structured summary to file
        const dataToSave = {
            summary,
            timestamp: new Date().toISOString()
        };

        // Ensure directory exists again (in case it was deleted)
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        fs.writeFileSync(SUMMARY_FILE, JSON.stringify(dataToSave, null, 2));
        console.log(`[Chat History] Saved summary to ${SUMMARY_FILE}`);

        return NextResponse.json({
            success: true,
            summaryKeys: Object.keys(summary),
            timestamp: dataToSave.timestamp
        });
    } catch (error) {
        console.error("Error saving chat history:", error);
        return NextResponse.json(
            { error: "Failed to save chat history" },
            { status: 500 }
        );
    }
}
