import { NextResponse } from "next/server";
import {
  DEFAULT_RESUMES_TO_COLLECT,
  MAX_RESUMES_TO_COLLECT,
} from "../constants";

const CORESIGNAL_API_BASE = "https://api.coresignal.com/cdapi/v2";

/**
 * POST /api/employees/collect/batch
 * 
 * Collect multiple employee profiles in batch.
 * Accepts an array of employee IDs and returns their full profile data.
 * 
 * Body: {
 *   employeeIds: number[],
 *   limit?: number (optional, defaults to DEFAULT_RESUMES_TO_COLLECT)
 * }
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
    const { employeeIds, limit } = body;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return NextResponse.json(
        { error: "employeeIds array is required" },
        { status: 400 }
      );
    }

    if (employeeIds.length === 0) {
      return NextResponse.json(
        { error: "employeeIds array cannot be empty" },
        { status: 400 }
      );
    }

    // Determine how many resumes to collect
    const resumesToCollect = Math.min(
      limit || DEFAULT_RESUMES_TO_COLLECT,
      MAX_RESUMES_TO_COLLECT,
      employeeIds.length
    );

    // Validate all IDs are numeric
    const validIds = employeeIds
      .slice(0, resumesToCollect)
      .filter((id: any) => /^\d+$/.test(String(id)));

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "No valid employee IDs provided" },
        { status: 400 }
      );
    }

    // Collect all employee profiles in parallel
    // Note: This will consume credits for each request
    const collectPromises = validIds.map(async (employeeId: string | number) => {
      try {
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
          console.error(
            `CoreSignal collect error for ID ${employeeId}:`,
            errorText
          );
          return {
            employeeId,
            error: `Failed to collect: ${errorText}`,
            data: null,
          };
        }

        const employeeData = await response.json();
        return {
          employeeId,
          error: null,
          data: employeeData,
        };
      } catch (error) {
        console.error(`Error collecting employee ${employeeId}:`, error);
        return {
          employeeId,
          error:
            error instanceof Error ? error.message : "Unknown error",
          data: null,
        };
      }
    });

    const results = await Promise.all(collectPromises);

    // Separate successful and failed collections
    const successful = results.filter((r) => r.error === null);
    const failed = results.filter((r) => r.error !== null);

    return NextResponse.json({
      success: true,
      totalRequested: employeeIds.length,
      totalCollected: successful.length,
      totalFailed: failed.length,
      limit: resumesToCollect,
      employees: successful.map((r) => r.data),
      errors: failed.map((r) => ({
        employeeId: r.employeeId,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error("Error in batch employee collect route:", error);
    return NextResponse.json(
      {
        error: "Failed to collect employee profiles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

