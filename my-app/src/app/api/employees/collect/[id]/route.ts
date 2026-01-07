import { NextRequest, NextResponse } from "next/server";

const CORESIGNAL_API_BASE = "https://api.coresignal.com/cdapi/v2";

/**
 * GET /api/employees/collect/[id]
 * 
 * Fetch full resume-style data for a single employee by ID.
 * This is the expensive request that returns complete profile data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const CORESIGNAL_API_KEY = process.env.CORE_SIGNAL_API_KEY;
    
    if (!CORESIGNAL_API_KEY) {
      return NextResponse.json(
        { error: "CoreSignal API key not configured" },
        { status: 500 }
      );
    }

    const { id: employeeId } = await params;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Validate employee ID is numeric
    if (!/^\d+$/.test(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID format" },
        { status: 400 }
      );
    }

    // Make request to CoreSignal collect endpoint
    // Note: This is GET only, no body allowed
    const response = await fetch(
      `${CORESIGNAL_API_BASE}/employee_base/collect/${employeeId}`,
      {
        method: "GET",
        headers: {
          apikey: CORESIGNAL_API_KEY,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoreSignal collect error for ID ${employeeId}:`, errorText);
      return NextResponse.json(
        {
          error: "Failed to collect employee profile",
          details: errorText,
        },
        { status: response.status }
      );
    }

    const employeeData = await response.json();

    return NextResponse.json(employeeData);
  } catch (error) {
    console.error("Error in employee collect route:", error);
    return NextResponse.json(
      {
        error: "Failed to collect employee profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

