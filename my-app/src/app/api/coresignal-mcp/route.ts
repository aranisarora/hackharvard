/**
 * CoreSignal MCP API Route
 * 
 * This route provides a bridge between the frontend and CoreSignal MCP server.
 * It uses the MCP client service to make optimized calls with field selection.
 * 
 * This replaces the direct API route with MCP-based calls for better token efficiency.
 */

import { NextResponse } from "next/server";
import { searchEmployeesMCP, getEmployeeMCP } from "@/services/mcp-coresignal";
import { cleanCoreSignalProfile, compressCoreSignalProfiles } from "@/utils/coresignal-optimizer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, filters, employeeId, fields } = body;

    // Default to optimized field selection (95% token reduction)
    const optimizedFields = fields || [
      "full_name",
      "location_city",
      "historical_skills",
      "github_repos_summary",
    ];

    let result;

    switch (action) {
      case "search":
        if (!filters) {
          return NextResponse.json(
            { error: "filters are required for search action" },
            { status: 400 }
          );
        }

        console.log("[CoreSignal MCP] Searching with filters:", filters);
        
        // Use MCP to search employees
        const profiles = await searchEmployeesMCP(filters, optimizedFields);
        
        // Clean and compress profiles for token optimization
        const cleanedProfiles = profiles.map(cleanCoreSignalProfile);
        const compressed = compressCoreSignalProfiles(cleanedProfiles);
        
        result = {
          action: "search",
          filters,
          profiles: cleanedProfiles,
          compressed_summary: compressed, // For direct prompt injection
          count: cleanedProfiles.length,
        };
        break;

      case "get":
        if (!employeeId) {
          return NextResponse.json(
            { error: "employeeId is required for get action" },
            { status: 400 }
          );
        }

        console.log("[CoreSignal MCP] Getting employee:", employeeId);
        
        const employee = await getEmployeeMCP(employeeId, optimizedFields);
        const cleaned = cleanCoreSignalProfile(employee);
        
        result = {
          action: "get",
          employeeId,
          profile: cleaned,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use 'search' or 'get'` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[CoreSignal MCP] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to process CoreSignal MCP request",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "CoreSignal MCP API",
    usage: {
      endpoint: "POST /api/coresignal-mcp",
      actions: ["search", "get"],
      example_search: {
        action: "search",
        filters: {
          position_title: "Software Engineer",
          company_name: "Google",
          location_country: "US",
        },
      },
      example_get: {
        action: "get",
        employeeId: 396191057,
      },
    },
  });
}
