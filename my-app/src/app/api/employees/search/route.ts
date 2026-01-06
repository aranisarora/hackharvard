import { NextResponse } from "next/server";

const CORESIGNAL_API_BASE = "https://api.coresignal.com/cdapi/v2";

/**
 * POST /api/employees/search
 * 
 * Search for employee IDs by job title, company, etc.
 * This is a cheap request that returns employee IDs for use with the collect endpoint.
 */
export async function POST(request: Request) {
  try {
    const CORESIGNAL_API_KEY = process.env.CORE_SIGNAL_API_KEY;
    
    if (!CORESIGNAL_API_KEY) {
      return NextResponse.json(
        { error: "CoreSignal API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate request body
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    // Make request to CoreSignal search endpoint
    const response = await fetch(
      `${CORESIGNAL_API_BASE}/employee_base/search/filter`,
      {
        method: "POST",
        headers: {
          apikey: CORESIGNAL_API_KEY,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CoreSignal search error:", errorText);
      return NextResponse.json(
        {
          error: "Failed to search employees",
          details: errorText,
        },
        { status: response.status }
      );
    }

    const employeeIds = await response.json();

    // Validate response is an array
    if (!Array.isArray(employeeIds)) {
      return NextResponse.json(
        { error: "Invalid response format from CoreSignal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      employeeIds,
      count: employeeIds.length,
    });
  } catch (error) {
    console.error("Error in employee search route:", error);
    return NextResponse.json(
      {
        error: "Failed to search employees",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

