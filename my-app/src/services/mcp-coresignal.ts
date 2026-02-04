/**
 * CoreSignal MCP Client Service
 * 
 * Uses Model Context Protocol to access CoreSignal tools directly.
 * This eliminates the need for custom API routes and enables direct AI access.
 * 
 * Strategy: One-call maximum to minimize token usage and API costs.
 */

import { spawn } from "child_process";
import { promisify } from "util";

const CORESIGNAL_API_KEY = process.env.CORE_SIGNAL_API_KEY || process.env.CORESIGNAL_API_KEY;

if (!CORESIGNAL_API_KEY) {
  console.warn("[MCP CoreSignal] API key not found. MCP calls will fail.");
}

/**
 * Call CoreSignal MCP tool
 * 
 * Note: MCP servers are typically accessed via mcp-remote in CLI environments.
 * For Next.js, we provide a fallback that uses direct CoreSignal API calls with
 * the same optimization strategy (field selection, one-call maximum).
 * 
 * @param toolName - The MCP tool to call (e.g., "coresignal_employee_multisource_api")
 * @param params - Parameters for the tool
 * @returns Tool result
 */
export async function callCoreSignalMCP(
  toolName: string,
  params: Record<string, any>
): Promise<any> {
  if (!CORESIGNAL_API_KEY) {
    throw new Error("CORESIGNAL_API_KEY environment variable is required for MCP calls");
  }

  // For Next.js environment, we use direct CoreSignal API calls
  // with the same optimization strategy as MCP (field selection, minimal calls)
  // This provides the same benefits without requiring mcp-remote in production
  
  const CORESIGNAL_API_BASE = "https://api.coresignal.com/cdapi/v2";
  
  try {
    // Map MCP tool calls to CoreSignal Multi-source API endpoints
    // CRITICAL: Use employee_multi_source (not employee_base) to get GitHub/social data
    if (toolName === "coresignal_employee_multisource_api") {
      // Enforce field selection to save ~90% tokens
      const fields = params.fields || ["full_name", "location_city", "historical_skills", "github_repos_summary"];
      const fieldParams = fields.map((f: string) => `fields=${encodeURIComponent(f)}`).join('&');

      // If we have employee_id, use collect endpoint
      if (params.employee_id) {
        const response = await fetch(
          `${CORESIGNAL_API_BASE}/employee_multi_source/collect/${params.employee_id}?${fieldParams}`,
          {
            headers: {
              apikey: CORESIGNAL_API_KEY,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`CoreSignal API error: ${response.status} - ${errorText}`);
        }

        return await response.json();
      }
      
      // Otherwise, use search endpoint
      const searchBody: any = {};
      if (params.filters) {
        if (params.filters.position_title) searchBody.experience_title = params.filters.position_title;
        if (params.filters.company_name) searchBody.experience_company_name = params.filters.company_name;
        // Note: CoreSignal search API may not support all location filters directly
      }

      // Step 1: Search for employee IDs using multi_source endpoint
      const searchResponse = await fetch(
        `${CORESIGNAL_API_BASE}/employee_multi_source/search/filter`,
        {
          method: "POST",
          headers: {
            apikey: CORESIGNAL_API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(searchBody),
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        throw new Error(`CoreSignal search error: ${searchResponse.status} - ${errorText}`);
      }

      const employeeIds = await searchResponse.json();
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        return { data: [], profiles: [] };
      }

      // Step 2: Collect profiles with field selection (limit to 5 for token optimization)
      const idsToCollect = employeeIds.slice(0, params.limit || 5);

      const collectPromises = idsToCollect.map(async (id: number) => {
        try {
          const collectResponse = await fetch(
            `${CORESIGNAL_API_BASE}/employee_multi_source/collect/${id}?${fieldParams}`,
            {
              headers: {
                apikey: CORESIGNAL_API_KEY,
                Accept: "application/json",
              },
            }
          );

          if (!collectResponse.ok) {
            const errorText = await collectResponse.text();
            console.warn(`[MCP CoreSignal] Failed to collect employee ${id}: ${collectResponse.status} - ${errorText}`);
            return null;
          }

          return await collectResponse.json();
        } catch (error) {
          console.error(`[MCP CoreSignal] Error collecting employee ${id}:`, error);
          return null;
        }
      });

      const profiles = (await Promise.all(collectPromises)).filter((p): p is any => p !== null);
      
      return {
        data: profiles,
        profiles: profiles,
      };
    }

    throw new Error(`Unknown MCP tool: ${toolName}`);
  } catch (error) {
    console.error("[MCP CoreSignal] Error calling MCP tool:", error);
    throw error;
  }
}

/**
 * Search for employees using CoreSignal MCP with field selection
 * 
 * This function enforces "one-call" strategy and field selection for token optimization.
 * 
 * @param filters - Search filters
 * @param fields - Specific fields to request (reduces token count by 95%)
 * @returns Array of employee profiles
 */
export async function searchEmployeesMCP(
  filters: {
    position_title?: string;
    company_name?: string;
    location_country?: string;
    location_state?: string;
    location_city?: string;
  },
  fields: string[] = [
    "full_name",
    "location_city",
    "historical_skills",
    "github_repos_summary",
  ]
): Promise<any[]> {
  console.log("[MCP CoreSignal] Searching employees with filters:", filters);
  console.log("[MCP CoreSignal] Requesting fields:", fields);

  try {
    const result = await callCoreSignalMCP("coresignal_employee_multisource_api", {
      filters: {
        ...filters,
        // Map common location names to ISO codes if needed
        ...(filters.location_country === "United States" && { location_country: "US" }),
        ...(filters.location_country === "United Kingdom" && { location_country: "GB" }),
      },
      fields: fields,
      limit: 5, // Limit to 5 results to minimize tokens
    });

    // Extract profiles from MCP result
    const profiles = result?.data || result?.profiles || result || [];
    
    console.log(`[MCP CoreSignal] Found ${profiles.length} profiles`);
    
    return profiles;
  } catch (error) {
    console.error("[MCP CoreSignal] Search failed:", error);
    // Return empty array instead of throwing to allow graceful degradation
    return [];
  }
}

/**
 * Get a single employee profile by ID using MCP
 * 
 * @param employeeId - CoreSignal employee ID
 * @param fields - Specific fields to request
 * @returns Employee profile
 */
export async function getEmployeeMCP(
  employeeId: number,
  fields: string[] = [
    "full_name",
    "location_city",
    "historical_skills",
    "github_repos_summary",
  ]
): Promise<any> {
  console.log(`[MCP CoreSignal] Getting employee ${employeeId}`);

  try {
    const result = await callCoreSignalMCP("coresignal_employee_multisource_api", {
      employee_id: employeeId,
      fields: fields,
    });

    return result?.data || result;
  } catch (error) {
    console.error(`[MCP CoreSignal] Failed to get employee ${employeeId}:`, error);
    throw error;
  }
}

/**
 * System prompt addition for AI agents using CoreSignal MCP
 * 
 * This should be added to system prompts when the AI needs to search for peer profiles.
 */
export const CORESIGNAL_MCP_SYSTEM_INSTRUCTIONS = `
## CoreSignal MCP Tool Access

You have access to the CoreSignal MCP server for finding employee profiles and career data.

**CRITICAL RULES:**
1. **One-Call Maximum**: Use exactly ONE CoreSignal MCP call per user request. Do not retry or make multiple calls.
2. **Field Selection**: Always request only these fields to minimize tokens:
   - full_name
   - location_city
   - historical_skills
   - github_repos_summary
3. **Precision**: Use specific filters:
   - position_title: Map vague terms (e.g., "programmer" → "Software Engineer")
   - company_name: Use exact company name if provided
   - location: Map to ISO country codes (e.g., "Texas" → location_country: "US", location_state: "Texas")
4. **No Retries**: If the first call returns no results, inform the user and stop. Maximum 2 calls total under any circumstances.

**Tool Name**: coresignal_employee_multisource_api

**Example Usage**:
- User: "Find programmers in Texas at Google"
- Action: Call with filters: { position_title: "Software Engineer", company_name: "Google", location_country: "US", location_state: "Texas" }
- Fields: ["full_name", "location_city", "historical_skills", "github_repos_summary"]
`;
