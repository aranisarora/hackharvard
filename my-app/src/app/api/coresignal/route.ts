import { NextResponse } from "next/server";

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

const dummyProfiles: CoreSignalProfile[] = [
  {
    id: 719911355,
    source: "linkedin",
    name: "Jonathan Patterson",
    first_name: "Jonathan",
    last_name: "Patterson",
    headline: "Art Director at Rivington Creative",
    location: "New York, NY",
    country: "United States",
    industry: "Design",
    experience: [
      {
        title: "Senior Graphic Designer",
        company_name: "Lemon Studio",
        company_id: 10101,
        location: "New York, NY",
        start_date: "2020-03",
        end_date: null,
        is_current: true,
        description: "Leads web and brand design projects for lifestyle brands.",
      },
      {
        title: "Graphic Designer",
        company_name: "Loboco Company",
        company_id: 10102,
        location: "New York, NY",
        start_date: "2018-03",
        end_date: "2020-03",
        is_current: false,
        description: "Delivered packaging and motion assets for DTC launches.",
      },
    ],
    education: [
      {
        school_name: "Wabare University",
        degree: "Bachelor of Design",
        field_of_study: "Web Designing",
        start_date: "2014",
        end_date: "2017",
      },
    ],
    skills: [
      { name: "Management" },
      { name: "Digital Marketing" },
      { name: "Negotiation" },
      { name: "Creative Thinking" },
      { name: "Leadership" },
    ],
    languages: ["English", "German (basic)", "Spanish (basic)"],
    certifications: [
      { name: "Adobe Certified Expert", issuer: "Adobe", issue_date: "2021-02" },
    ],
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-11-02T11:00:00Z",
    linkedin_url: "https://www.linkedin.com/in/jonathan-patterson-design",
  },
  {
    id: 719911356,
    source: "linkedin",
    name: "Nelly Smith",
    first_name: "Nelly",
    last_name: "Smith",
    headline: "Graphic Designer at Stepping Stone Advertising",
    location: "New York, NY",
    country: "United States",
    industry: "Marketing",
    experience: [
      {
        title: "Senior Graphic Design Specialist",
        company_name: "Stepping Stone Advertising",
        company_id: 10103,
        location: "New York, NY",
        start_date: "2020-02",
        end_date: null,
        is_current: true,
        description: "Owns creative direction for multi-channel campaigns.",
      },
      {
        title: "Graphic Design Specialist",
        company_name: "Stepping Stone Advertising",
        company_id: 10103,
        location: "New York, NY",
        start_date: "2018-02",
        end_date: "2020-02",
        is_current: false,
        description: "Delivered pitch decks and social assets for B2C launches.",
      },
    ],
    education: [
      {
        school_name: "Rochester Institute of Technology",
        degree: "Bachelor of Fine Arts in Graphic Design",
        field_of_study: "Graphic Design",
        start_date: "2014",
        end_date: "2018",
      },
    ],
    skills: [
      { name: "Illustrator" },
      { name: "Photoshop" },
      { name: "Figma" },
      { name: "After Effects" },
      { name: "Brand Systems" },
    ],
    languages: ["English"],
    certifications: [
      { name: "Adobe Certified Expert", issuer: "Adobe", issue_date: "2022-05" },
    ],
    created_at: "2024-02-01T10:00:00Z",
    updated_at: "2024-11-05T10:30:00Z",
    linkedin_url: "https://www.linkedin.com/in/nelly-smith",
  },
  {
    id: 719911357,
    source: "linkedin",
    name: "Patricia Flores",
    first_name: "Patricia",
    last_name: "Flores",
    headline: "Product Designer",
    location: "Chicago, IL",
    country: "United States",
    industry: "Design",
    experience: [
      {
        title: "Product Designer",
        company_name: "Riverside Labs",
        company_id: 10104,
        location: "Chicago, IL",
        start_date: "2019-06",
        end_date: null,
        is_current: true,
        description: "Designs end-to-end experiences for B2B SaaS workflows.",
      },
      {
        title: "UX Designer",
        company_name: "Northloop",
        company_id: 10105,
        location: "Chicago, IL",
        start_date: "2016-03",
        end_date: "2019-05",
        is_current: false,
        description: "Led research and prototyping for mobile growth features.",
      },
    ],
    education: [
      {
        school_name: "University of Illinois",
        degree: "Bachelor of Arts",
        field_of_study: "Human-Computer Interaction",
        start_date: "2012",
        end_date: "2016",
      },
    ],
    skills: [
      { name: "Product Discovery" },
      { name: "Wireframing" },
      { name: "Prototyping" },
      { name: "Usability Testing" },
    ],
    languages: ["English", "Spanish"],
    certifications: null,
    created_at: "2024-03-15T09:00:00Z",
    updated_at: "2024-10-28T15:00:00Z",
    linkedin_url: "https://www.linkedin.com/in/patricia-flores",
  },
  {
    id: 719911358,
    source: "linkedin",
    name: "Sophia Isa",
    first_name: "Sophia",
    last_name: "Isa",
    headline: "Marketing Designer",
    location: "San Francisco, CA",
    country: "United States",
    industry: "Marketing",
    experience: [
      {
        title: "Marketing Designer",
        company_name: "Cascade Growth",
        company_id: 10106,
        location: "San Francisco, CA",
        start_date: "2021-01",
        end_date: null,
        is_current: true,
        description: "Creates conversion-focused landing pages and ads.",
      },
      {
        title: "Visual Designer",
        company_name: "Brightworks",
        company_id: 10107,
        location: "San Francisco, CA",
        start_date: "2018-06",
        end_date: "2020-12",
        is_current: false,
        description: "Shipped brand refreshes and web design systems.",
      },
    ],
    education: [
      {
        school_name: "ArtCenter College of Design",
        degree: "Bachelor of Design",
        field_of_study: "Communication Design",
        start_date: "2014",
        end_date: "2018",
      },
    ],
    skills: [
      { name: "Visual Design" },
      { name: "Brand Strategy" },
      { name: "Campaign Design" },
      { name: "Figma" },
      { name: "Illustrator" },
    ],
    languages: ["English", "French"],
    certifications: [
      { name: "Google UX Design", issuer: "Google", issue_date: "2023-04" },
    ],
    created_at: "2024-04-12T09:30:00Z",
    updated_at: "2024-10-20T14:00:00Z",
    linkedin_url: "https://www.linkedin.com/in/sophia-isa",
  },
  {
    id: 719911359,
    source: "linkedin",
    name: "Samuel Lee",
    first_name: "Samuel",
    last_name: "Lee",
    headline: "Senior Product Designer",
    location: "Austin, TX",
    country: "United States",
    industry: "Technology",
    experience: [
      {
        title: "Senior Product Designer",
        company_name: "Pathforge",
        company_id: 10108,
        location: "Austin, TX",
        start_date: "2022-04",
        end_date: null,
        is_current: true,
        description: "Owns design for onboarding and growth surfaces.",
      },
      {
        title: "Product Designer",
        company_name: "Loop Systems",
        company_id: 10109,
        location: "Austin, TX",
        start_date: "2019-02",
        end_date: "2022-03",
        is_current: false,
        description: "Led multi-platform design for logistics tooling.",
      },
    ],
    education: [
      {
        school_name: "University of Texas at Austin",
        degree: "BS",
        field_of_study: "Informatics",
        start_date: "2012",
        end_date: "2016",
      },
    ],
    skills: [
      { name: "Systems Thinking" },
      { name: "Interaction Design" },
      { name: "Design Systems" },
      { name: "Figma" },
    ],
    languages: ["English", "Korean"],
    certifications: null,
    created_at: "2024-05-01T12:00:00Z",
    updated_at: "2024-10-15T09:00:00Z",
    linkedin_url: "https://www.linkedin.com/in/samuel-lee-design",
  },
];

function normalizeInput(input?: string | null, fallback = "") {
  return typeof input === "string" && input.trim().length > 0
    ? input.trim()
    : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const experience_title = normalizeInput(body?.experience_title, "Product Designer");
    const experience_company_name = normalizeInput(
      body?.experience_company_name,
      "Pathforge"
    );

    const ids = dummyProfiles.slice(0, 5).map((profile) => profile.id);

    // Simulate CoreSignal search + collect pipeline with dummy data
    return NextResponse.json({
      experience_title,
      experience_company_name,
      filter: {
        ids,
        total: ids.length,
      },
      profiles: dummyProfiles.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch CoreSignal data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Helpful for quick manual tests
  return NextResponse.json({
    message: "Use POST with experience_title and experience_company_name",
    samplePayload: {
      experience_title: "Product Designer",
      experience_company_name: "Pathforge",
    },
    sampleProfiles: dummyProfiles.slice(0, 2),
  });
}

