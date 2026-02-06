import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Default CVs (fallback when user has no saved data yet)
const defaultCurrentCV = `JOHN DOE
Senior Software Engineer
john.doe@email.com | +1 (555) 123-4567 | linkedin.com/in/johndoe

EXPERIENCE

Senior Software Engineer | Tech Corp | 2020 - Present
Led development of microservices architecture handling 1M+ requests/day. Mentored team of 5 junior developers.

Software Engineer | Startup Inc | 2018 - 2020
Developed RESTful APIs using Node.js and Express. Implemented CI/CD pipelines.

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes`;

const defaultTargetCV = `JOHN DOE
Senior Software Engineer
john.doe@email.com | +1 (555) 123-4567 | linkedin.com/in/johndoe

EXPERIENCE

Senior Software Engineer | Tech Corp | 2020 - Present
Led development of microservices architecture handling 1M+ requests/day. Mentored team of 5 junior developers. Implemented distributed systems using Go and gRPC. Reduced system latency by 30% through optimization.

Software Engineer | Startup Inc | 2018 - 2020
Developed RESTful APIs using Node.js and Express. Implemented CI/CD pipelines. Optimized database queries reducing response time by 40%. Led migration to microservices architecture.

SKILLS
JavaScript, TypeScript, React, Node.js, Python, Go, Rust, AWS, Docker, Kubernetes, gRPC, GraphQL

CERTIFICATIONS
AWS Certified Solutions Architect | 2023
Certification in cloud architecture and design. Expertise in designing scalable, fault-tolerant systems on AWS.

PROJECTS
Open Source Contributions
Contributor to popular open-source projects including Kubernetes and React. Maintained a library with 10k+ GitHub stars. Contributed to core features of major open-source frameworks.

EDUCATION
Master's in Computer Science | University Name | 2016 - 2018
Specialized in distributed systems and machine learning. Published research on scalable database architectures.`;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // First get the user's active_cv_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("active_cv_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError && userError.code !== "PGRST116") {
      console.error("[CV GET] User fetch error:", userError);
      return NextResponse.json(
        { error: "Failed to load CV" },
        { status: 500 }
      );
    }

    // If user has an active CV, fetch it
    if (userData?.active_cv_id) {
      const { data: cvData, error: cvError } = await supabase
        .from("cvs")
        .select("current_cv_text, target_cv_text")
        .eq("id", userData.active_cv_id)
        .maybeSingle();

      if (cvError && cvError.code !== "PGRST116") {
        console.error("[CV GET] CV fetch error:", cvError);
        return NextResponse.json(
          { error: "Failed to load CV" },
          { status: 500 }
        );
      }

      if (cvData) {
        return NextResponse.json({
          currentCV: cvData.current_cv_text || defaultCurrentCV,
          targetCV: cvData.target_cv_text || defaultTargetCV,
        });
      }
    }

    // Fallback: try to get any CV for this user
    const { data: anyCV, error: anyCVError } = await supabase
      .from("cvs")
      .select("current_cv_text, target_cv_text")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (anyCVError && anyCVError.code !== "PGRST116") {
      console.error("[CV GET] Fallback CV fetch error:", anyCVError);
    }

    return NextResponse.json({
      currentCV: anyCV?.current_cv_text || defaultCurrentCV,
      targetCV: anyCV?.target_cv_text || defaultTargetCV,
    });
  } catch (error) {
    console.error("[CV GET] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to load CV" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentCV, targetCV } = body as {
      currentCV?: string;
      targetCV?: string;
    };

    if (!currentCV || !targetCV) {
      return NextResponse.json(
        { error: "currentCV and targetCV are required" },
        { status: 400 }
      );
    }

    // Get user's active_cv_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("active_cv_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError && userError.code !== "PGRST116") {
      console.error("[CV POST] User fetch error:", userError);
      return NextResponse.json(
        { error: "Failed to save CV" },
        { status: 500 }
      );
    }

    let cvId = userData?.active_cv_id;

    if (cvId) {
      // Update existing CV
      const { error: updateError } = await supabase
        .from("cvs")
        .update({
          current_cv_text: currentCV,
          target_cv_text: targetCV,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cvId);

      if (updateError) {
        console.error("[CV POST] CV update error:", updateError);
        return NextResponse.json(
          { error: "Failed to save CV" },
          { status: 500 }
        );
      }
    } else {
      // Create new CV
      const { data: newCV, error: insertError } = await supabase
        .from("cvs")
        .insert({
          user_id: user.id,
          current_cv_text: currentCV,
          target_cv_text: targetCV,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[CV POST] CV insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to save CV" },
          { status: 500 }
        );
      }

      cvId = newCV.id;

      // Update user's active_cv_id
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ active_cv_id: cvId })
        .eq("id", user.id);

      if (userUpdateError) {
        console.error("[CV POST] User active_cv_id update error:", userUpdateError);
        // Not fatal, CV was saved
      }
    }

    return NextResponse.json({
      success: true,
      currentCV,
      targetCV,
    });
  } catch (error) {
    console.error("[CV POST] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to save CV" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentCV } = body as { currentCV?: string };

    if (!currentCV) {
      return NextResponse.json(
        { error: "currentCV is required" },
        { status: 400 }
      );
    }

    // Get user's active_cv_id
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("active_cv_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError && userError.code !== "PGRST116") {
      console.error("[CV PUT] User fetch error:", userError);
      return NextResponse.json(
        { error: "Failed to update CV" },
        { status: 500 }
      );
    }

    if (userData?.active_cv_id) {
      // Update the existing active CV
      const { error: updateError } = await supabase
        .from("cvs")
        .update({
          current_cv_text: currentCV,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.active_cv_id);

      if (updateError) {
        console.error("[CV PUT] CV update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update CV" },
          { status: 500 }
        );
      }
    } else {
      // Create new CV with default target
      const { data: newCV, error: insertError } = await supabase
        .from("cvs")
        .insert({
          user_id: user.id,
          current_cv_text: currentCV,
          target_cv_text: defaultTargetCV,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[CV PUT] CV insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to update CV" },
          { status: 500 }
        );
      }

      // Update user's active_cv_id
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ active_cv_id: newCV.id })
        .eq("id", user.id);

      if (userUpdateError) {
        console.error("[CV PUT] User active_cv_id update error:", userUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      currentCV,
    });
  } catch (error) {
    console.error("[CV PUT] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update CV" },
      { status: 500 }
    );
  }
}
