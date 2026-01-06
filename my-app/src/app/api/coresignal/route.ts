import { NextResponse } from "next/server";

const CORESIGNAL_API_BASE = "https://api.coresignal.com/cdapi/v2";

type Experience = {
  title: string;
  company_name: string;
  company_id: number | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

type Education = {
  school_name: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
};

type Certification = {
  name: string;
  issuer: string | null;
  issue_date: string | null;
};

type CoreSignalProfile = {
  id: number;
  source: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  location: string | null;
  country: string | null;
  industry: string | null;
  experience: Experience[];
  education: Education[];
  skills: Array<{ name: string }> | string[];
  languages: string[] | null;
  certifications: Certification[] | null;
  created_at: string;
  updated_at: string;
  linkedin_url?: string | null;
};

function normalizeInput(input?: string | null, fallback = "") {
  return typeof input === "string" && input.trim().length > 0
    ? input.trim()
    : fallback;
}

/**
 * Transform CoreSignal employee data to our profile format
 */
function transformEmployeeData(employeeData: any): CoreSignalProfile {
  // Extract name
  const firstName = employeeData.first_name || "";
  const lastName = employeeData.last_name || "";
  const fullName = employeeData.full_name || 
    (firstName && lastName ? `${firstName} ${lastName}` : null) ||
    employeeData.name || null;

  // Transform experience
  const experience: Experience[] = (employeeData.experience || []).map((exp: any) => ({
    title: exp.position_title || exp.title || "",
    company_name: exp.company_name || "",
    company_id: exp.company_id || null,
    location: exp.location || null,
    start_date: exp.date_from ? formatDate(exp.date_from) : null,
    end_date: exp.date_to ? formatDate(exp.date_to) : null,
    is_current: exp.active_experience === 1 || exp.is_current === true || !exp.date_to,
    description: exp.description || null,
  }));

  // Transform education
  const education: Education[] = (employeeData.education || []).map((edu: any) => ({
    school_name: edu.institution_name || edu.school_name || "",
    degree: edu.degree || null,
    field_of_study: edu.field_of_study || null,
    start_date: edu.date_from_year ? String(edu.date_from_year) : null,
    end_date: edu.date_to_year ? String(edu.date_to_year) : null,
  }));

  // Transform skills
  let skills: Array<{ name: string }> | string[] = [];
  if (employeeData.skills && Array.isArray(employeeData.skills)) {
    skills = employeeData.skills.map((skill: any) => 
      typeof skill === "string" ? { name: skill } : { name: skill.name || skill }
    );
  } else if (employeeData.inferred_skills) {
    const skillArray = Array.isArray(employeeData.inferred_skills) 
      ? employeeData.inferred_skills 
      : employeeData.inferred_skills.split(",").map((s: string) => s.trim());
    skills = skillArray.map((skill: string) => ({ name: skill }));
  }

  // Transform certifications
  const certifications: Certification[] | null = (employeeData.certifications || []).map((cert: any) => ({
    name: cert.title || cert.name || "",
    issuer: cert.issuer || null,
    issue_date: cert.date_from ? formatDate(cert.date_from) : null,
  }));

  // Transform languages
  const languages: string[] | null = (employeeData.languages || []).map((lang: any) => 
    typeof lang === "string" ? lang : lang.language || ""
  ).filter(Boolean);

  return {
    id: employeeData.id || 0,
    source: "linkedin",
    name: fullName,
    first_name: firstName || null,
    last_name: lastName || null,
    headline: employeeData.headline || null,
    location: employeeData.location_full || employeeData.location || null,
    country: employeeData.location_country || null,
    industry: employeeData.industry || null,
    experience,
    education,
    skills,
    languages: languages && languages.length > 0 ? languages : null,
    certifications: certifications && certifications.length > 0 ? certifications : null,
    created_at: employeeData.created_at || new Date().toISOString(),
    updated_at: employeeData.updated_at || employeeData.changed_at || new Date().toISOString(),
    linkedin_url: employeeData.linkedin_url || null,
  };
}

/**
 * Format date from various CoreSignal formats to YYYY-MM
 */
function formatDate(date: any): string | null {
  if (!date) return null;
  
  if (typeof date === "string") {
    // Try to parse various date formats
    const dateStr = date.trim();
    // If already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // If in YYYY-MM-DD format, extract YYYY-MM
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr.substring(0, 7);
    }
    // Try to parse as Date
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return null;
}

export async function POST(request: Request) {
  try {
    const CORESIGNAL_API_KEY = process.env.CORE_SIGNAL_API_KEY;
    
    if (!CORESIGNAL_API_KEY) {
      console.error("[CoreSignal] API key not configured");
      return NextResponse.json(
        { error: "CoreSignal API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const experience_title = normalizeInput(body?.experience_title, "");
    const experience_company_name = normalizeInput(body?.experience_company_name, "");

    if (!experience_title) {
      return NextResponse.json(
        { error: "experience_title is required" },
        { status: 400 }
      );
    }

    console.log("[CoreSignal] Searching for employees:", {
      experience_title,
      experience_company_name,
    });

    // Step 1: Search for employee IDs
    // CoreSignal expects a flat structure with experience_title and experience_company_name
    const searchBody: any = {
      experience_title: experience_title,
    };

    // Add company filter if provided
    if (experience_company_name) {
      searchBody.experience_company_name = experience_company_name;
    }

    // Note: CoreSignal API doesn't accept 'limit' in the request body
    // We'll limit results client-side after receiving the response

    console.log("[CoreSignal] Search request body:", searchBody);

    const searchResponse = await fetch(
      `${CORESIGNAL_API_BASE}/employee_base/search/filter`,
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
      console.error("[CoreSignal] Search error:", errorText);
      return NextResponse.json(
        {
          error: "Failed to search employees",
          details: errorText,
        },
        { status: searchResponse.status }
      );
    }

    const employeeIds = await searchResponse.json();
    
    // Validate response is an array
    if (!Array.isArray(employeeIds)) {
      console.error("[CoreSignal] Invalid search response format:", employeeIds);
      return NextResponse.json(
        { error: "Invalid response format from CoreSignal search" },
        { status: 500 }
      );
    }

    console.log(`[CoreSignal] Found ${employeeIds.length} employee IDs`);

    if (employeeIds.length === 0) {
      return NextResponse.json({
        experience_title,
        experience_company_name,
        filter: {
          ids: [],
          total: 0,
        },
        profiles: [],
      });
    }

    // Step 2: Collect employee profiles (limit to 5 to save credits)
    const idsToCollect = employeeIds.slice(0, 5);
    console.log(`[CoreSignal] Collecting ${idsToCollect.length} profiles`);

    const collectPromises = idsToCollect.map(async (employeeId: number) => {
      try {
        const collectResponse = await fetch(
          `${CORESIGNAL_API_BASE}/employee_base/collect/${employeeId}`,
          {
            method: "GET",
            headers: {
              apikey: CORESIGNAL_API_KEY,
              Accept: "application/json",
            },
          }
        );

        if (!collectResponse.ok) {
          const errorText = await collectResponse.text();
          console.error(`[CoreSignal] Collect error for ID ${employeeId}:`, errorText);
          return null;
        }

        const employeeData = await collectResponse.json();
        return transformEmployeeData(employeeData);
      } catch (error) {
        console.error(`[CoreSignal] Error collecting employee ${employeeId}:`, error);
        return null;
      }
    });

    const profileResults = await Promise.all(collectPromises);
    const profiles = profileResults.filter((p): p is CoreSignalProfile => p !== null);

    console.log(`[CoreSignal] Successfully collected ${profiles.length} profiles`);

    return NextResponse.json({
      experience_title,
      experience_company_name,
      filter: {
        ids: idsToCollect,
        total: employeeIds.length,
      },
      profiles,
    });
  } catch (error) {
    console.error("[CoreSignal] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch CoreSignal data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST with experience_title and experience_company_name",
    samplePayload: {
      experience_title: "Product Designer",
      experience_company_name: "Pathforge",
    },
  });
}
