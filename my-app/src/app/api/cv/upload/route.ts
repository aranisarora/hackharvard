import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Dynamically import pdf2json only if available (not in Edge Runtime)
let PDFParser: any = null;
try {
  if (typeof require !== 'undefined') {
    PDFParser = require("pdf2json");
  }
} catch (e) {
  console.warn("pdf2json not available:", e);
}

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

    // Extract text from PDF if applicable (try to extract, but don't fail if it doesn't work)
    let extractedText = "";
    if (file.type === "application/pdf") {
      try {
        // Check if pdf2json is available (may not work in Edge Runtime or some serverless environments)
        if (PDFParser) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          extractedText = await new Promise<string>((resolve) => {
            try {
              const pdfParser = new PDFParser(null, 1); // 1 = text content
              let timeoutId: NodeJS.Timeout;

              // Set a timeout to prevent hanging
              timeoutId = setTimeout(() => {
                console.warn("PDF parsing timeout");
                resolve("");
              }, 10000); // 10 second timeout

              pdfParser.on("pdfParser_dataError", (errData: any) => {
                clearTimeout(timeoutId);
                console.error("PDF Parser Error:", errData.parserError);
                resolve(""); // Resolve with empty string instead of rejecting
              });

              pdfParser.on("pdfParser_dataReady", () => {
                clearTimeout(timeoutId);
                try {
                  // In text mode (1), getRawTextContent() returns the text
                  const text = pdfParser.getRawTextContent();
                  resolve(text || "");
                } catch (e) {
                  console.error("Error getting PDF text:", e);
                  resolve(""); // Resolve with empty string on error
                }
              });

              pdfParser.parseBuffer(buffer);
            } catch (e) {
              console.error("Error initializing PDF parser:", e);
              resolve(""); // Resolve with empty string on error
            }
          });
        } else {
          console.warn("PDF parsing not available in this environment");
          // PDF parsing not available, continue without extracted text
          extractedText = "";
        }
      } catch (e) {
        console.error("Error parsing PDF:", e);
        // Continue without extracted text - not critical for upload to succeed
        extractedText = "";
      }
    }

    // Convert file to base64 for storage (or you could upload to Supabase Storage)
    // This is done after PDF parsing to avoid unnecessary work if parsing fails
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

