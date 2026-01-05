import { NextResponse } from "next/server";

// Simple in-memory store (in production, use database)
let cvStore: {
  currentCV: string;
  targetCV: string;
} | null = null;

// Default CVs (fallback)
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
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Return stored CVs or defaults
  return NextResponse.json({ 
    currentCV: cvStore?.currentCV || defaultCurrentCV,
    targetCV: cvStore?.targetCV || defaultTargetCV,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentCV, targetCV } = body;

    if (!currentCV || !targetCV) {
      return NextResponse.json(
        { error: "currentCV and targetCV are required" },
        { status: 400 }
      );
    }

    // Store the CVs
    cvStore = { currentCV, targetCV };

    return NextResponse.json({
      success: true,
      currentCV,
      targetCV,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save CV" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { currentCV } = body;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // In a real app, this would update the database
  return NextResponse.json({
    success: true,
    currentCV,
  });
}

