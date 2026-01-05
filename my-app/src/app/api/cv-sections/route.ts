import { NextResponse } from "next/server";

// Current CV sections (what the user has)
const currentCVSections = [
  {
    id: "1",
    type: "experience",
    title: "Senior Software Engineer",
    content: "Led development of microservices architecture handling 1M+ requests/day. Mentored team of 5 junior developers.",
    isCompleted: true,
    feedback: "Strong leadership experience. Consider adding specific metrics.",
  },
  {
    id: "2",
    type: "experience",
    title: "Software Engineer",
    content: "Developed RESTful APIs using Node.js and Express. Implemented CI/CD pipelines.",
    isCompleted: true,
    feedback: "Good technical foundation. Add more details about scale and impact.",
  },
  {
    id: "3",
    type: "skills",
    title: "Technical Skills",
    content: "JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes",
    isCompleted: true,
    feedback: "Solid tech stack. Consider adding Go or Rust for backend systems.",
  },
];

// Target CV sections (what the user should have - ideal CV for their target job)
const targetCVSections = [
  {
    id: "1",
    type: "experience",
    title: "Senior Software Engineer",
    content: "Led development of microservices architecture handling 1M+ requests/day. Mentored team of 5 junior developers. Implemented distributed systems using Go and gRPC.",
    isCompleted: true,
    feedback: "Strong leadership experience. Consider adding specific metrics.",
  },
  {
    id: "2",
    type: "experience",
    title: "Software Engineer",
    content: "Developed RESTful APIs using Node.js and Express. Implemented CI/CD pipelines. Optimized database queries reducing response time by 40%.",
    isCompleted: true,
    feedback: "Good technical foundation. Add more details about scale and impact.",
  },
  {
    id: "3",
    type: "skills",
    title: "Technical Skills",
    content: "JavaScript, TypeScript, React, Node.js, Python, Go, Rust, AWS, Docker, Kubernetes, gRPC, GraphQL",
    isCompleted: true,
    feedback: "Solid tech stack. Consider adding Go or Rust for backend systems.",
  },
  {
    id: "4",
    type: "certifications",
    title: "AWS Certified Solutions Architect",
    content: "Certification in cloud architecture and design. Expertise in designing scalable, fault-tolerant systems on AWS.",
    isCompleted: false,
    feedback: "This certification is highly valued at Google. Complete within 3 months.",
  },
  {
    id: "5",
    type: "projects",
    title: "Open Source Contributions",
    content: "Contributor to popular open-source projects including Kubernetes and React. Maintained a library with 10k+ GitHub stars.",
    isCompleted: false,
    feedback: "Open source contributions demonstrate collaboration skills. Start contributing to Google's open source projects.",
  },
  {
    id: "6",
    type: "education",
    title: "Master's in Computer Science",
    content: "Specialized in distributed systems and machine learning. Published research on scalable database architectures.",
    isCompleted: false,
    feedback: "Advanced degree strengthens your profile for senior positions.",
  },
];

export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return NextResponse.json({ 
    currentSections: currentCVSections,
    targetSections: targetCVSections 
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, title, content, isCompleted } = body;

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // In a real app, this would update the database
  // For now, just return success
  return NextResponse.json({
    success: true,
    section: {
      id,
      title,
      content,
      isCompleted,
    },
  });
}

