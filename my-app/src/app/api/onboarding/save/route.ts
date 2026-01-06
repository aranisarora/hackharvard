import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// File path for storing onboarding data
const DATA_DIR = path.join(process.cwd(), "server_data");
const ONBOARDING_FILE = path.join(DATA_DIR, "onboarding_data.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error("Failed to create data directory:", err);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, hardcodedAnswers, personalizedAnswers, personalizedQuestions, cvFile } = body;

        // Prepare data to save
        const dataToSave = {
            messages: messages || [],
            hardcodedAnswers: hardcodedAnswers || {},
            personalizedAnswers: personalizedAnswers || [],
            personalizedQuestions: personalizedQuestions || [],
            cvFile: cvFile ? {
                name: cvFile.name,
                size: cvFile.size,
                type: cvFile.type
            } : null,
            timestamp: new Date().toISOString()
        };

        // Ensure directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        // Save to file
        fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(dataToSave, null, 2));
        console.log(`[Onboarding Save] Saved data to ${ONBOARDING_FILE}`);

        return NextResponse.json({
            success: true,
            message: "Onboarding data saved successfully",
            timestamp: dataToSave.timestamp
        });
    } catch (error) {
        console.error("Error saving onboarding data:", error);
        return NextResponse.json(
            { error: "Failed to save onboarding data" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        if (fs.existsSync(ONBOARDING_FILE)) {
            const fileContent = fs.readFileSync(ONBOARDING_FILE, "utf-8");
            const data = JSON.parse(fileContent);
            return NextResponse.json({ data });
        }
        return NextResponse.json({ data: null, message: "No onboarding data found" });
    } catch (error) {
        console.error("Error reading onboarding data:", error);
        return NextResponse.json(
            { error: "Failed to read onboarding data" },
            { status: 500 }
        );
    }
}

