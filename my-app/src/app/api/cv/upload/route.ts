import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
const PDFParser = require("pdf2json");

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
      console.warn("User not authenticated during CV upload (continuing for parsing only)");
      // Don't block - allow parsing for onboarding without auth
      // return NextResponse.json(
      //   { error: "Unauthorized" },
      //   { status: 401 }
      // );
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

    // Extract text from PDF if applicable
    let extractedText = "";
    if (file.type === "application/pdf") {
      try {
        extractedText = await new Promise((resolve, reject) => {
          const pdfParser = new PDFParser(null, 1); // 1 = text content

          pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error("PDF Parser Error:", errData.parserError);
            reject(new Error(errData.parserError));
          });

          pdfParser.on("pdfParser_dataReady", () => {
            // In text mode (1), getRawTextContent() returns the text
            const text = pdfParser.getRawTextContent();
            resolve(text);
          });

          pdfParser.parseBuffer(buffer);
        });
      } catch (e) {
        console.error("Error parsing PDF with pdf2json:", e);
      }
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      extractedText, // Send back the text
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

