import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF, DOC, or DOCX file." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Convert file to base64 for storage (or you could upload to Supabase Storage)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const fileData = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64,
      uploadedAt: new Date().toISOString(),
    };

    // TODO: Store in database or Supabase Storage
    // For now, we'll return success and the file will be processed during roadmap generation

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      message: "CV uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading CV:", error);
    return NextResponse.json(
      {
        error: "Failed to upload CV",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

