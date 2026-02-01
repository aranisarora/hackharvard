/**
 * Mentor Generation Utility
 *
 * Generates contextually appropriate dummy mentors for roadmap tasks.
 * Mentors are only assigned to categories where human guidance makes sense.
 */

export interface Mentor {
    name: string;
    title: string;
    company: string;
    email: string;
    profileImage?: string;
    description?: string;
}

// Categories that SHOULD receive mentors (only these will get mentors)
const MENTOR_CATEGORIES = new Set([
    // Projects - need architectural guidance and code review
    "projects",
    "project",
    "portfolio projects",
    // Research - need methodology and direction
    "research",
    "applied research",
]);

/**
 * Check if a category should receive a mentor
 * Only Projects and Research categories get mentors
 */
export function shouldHaveMentor(category: string): boolean {
    const lowerCategory = category.toLowerCase();

    // Check for exact match first
    if (MENTOR_CATEGORIES.has(lowerCategory)) {
        return true;
    }

    // Check for partial matches (e.g., "personal projects" contains "project")
    for (const mentorCategory of MENTOR_CATEGORIES) {
        if (lowerCategory.includes(mentorCategory) || mentorCategory.includes(lowerCategory)) {
            return true;
        }
    }

    return false;
}

// First names pool for variety
const FIRST_NAMES = [
    "Sarah", "Michael", "Emily", "James", "Jessica", "David", "Amanda", "Christopher",
    "Ashley", "Matthew", "Jennifer", "Daniel", "Lauren", "Andrew", "Stephanie",
    "Joshua", "Nicole", "Ryan", "Elizabeth", "Brandon", "Rachel", "Justin", "Megan",
    "Kevin", "Samantha", "Eric", "Brittany", "Jason", "Katherine", "Timothy",
    "Priya", "Raj", "Aisha", "Omar", "Mei", "Wei", "Hiroshi", "Yuki", "Carlos", "Sofia",
    "Olga", "Ivan", "Fatima", "Ahmed", "Chen", "Li", "Akiko", "Ravi", "Sunita", "Marco"
];

// Last names pool for variety
const LAST_NAMES = [
    "Chen", "Williams", "Johnson", "Brown", "Davis", "Martinez", "Anderson", "Taylor",
    "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Robinson",
    "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "King",
    "Patel", "Kim", "Nguyen", "Singh", "Yamamoto", "Mueller", "Schmidt", "Johansson",
    "Nakamura", "Gonzalez", "Santos", "Fernandez", "Petrov", "Ivanov", "Abdullah",
    "Sharma", "Das", "Tanaka", "Wang", "Zhang", "Liu", "Sato", "Takahashi", "Romano"
];

// Title templates by category/skill area
const TITLE_TEMPLATES: Record<string, string[]> = {
    // Technical/Skills
    skills: [
        "Senior {skill} Engineer",
        "Staff {skill} Developer",
        "Principal {skill} Architect",
        "{skill} Tech Lead",
        "Senior Software Engineer ({skill})",
    ],
    technical: [
        "Senior Software Engineer",
        "Staff Engineer",
        "Principal Engineer",
        "Tech Lead",
        "Engineering Manager",
    ],
    // Projects
    projects: [
        "Senior Software Engineer",
        "Technical Program Manager",
        "Staff Engineer",
        "Principal Engineer",
        "Engineering Lead",
    ],
    portfolio: [
        "Senior Product Designer",
        "Design Lead",
        "UX Engineering Lead",
        "Creative Director",
        "Principal Designer",
    ],
    // Experience and Career
    experience: [
        "Engineering Manager",
        "Senior Technical Recruiter",
        "Career Coach",
        "VP of Engineering",
        "Director of Engineering",
    ],
    // Networking
    networking: [
        "Community Manager",
        "Developer Advocate",
        "Senior Recruiter",
        "Talent Partner",
        "Industry Relations Lead",
    ],
    // Interview Prep
    interview: [
        "Senior Technical Recruiter",
        "Engineering Manager",
        "Career Coach",
        "Technical Interview Lead",
        "Talent Acquisition Partner",
    ],
    "interview prep": [
        "Senior Technical Recruiter",
        "Engineering Manager",
        "Career Coach",
        "Technical Interview Lead",
        "Talent Acquisition Partner",
    ],
    // Open Source
    "open source": [
        "Open Source Program Manager",
        "Senior Developer Advocate",
        "Community Lead",
        "Staff Engineer (Open Source)",
        "Principal OSS Engineer",
    ],
    // Research
    research: [
        "Research Scientist",
        "Staff Research Engineer",
        "Principal Researcher",
        "Research Lead",
        "Applied Scientist",
    ],
    // Personal Branding
    "personal branding": [
        "Career Coach",
        "Personal Brand Strategist",
        "Developer Relations Lead",
        "Content Strategy Manager",
        "Professional Development Advisor",
    ],
    branding: [
        "Career Coach",
        "Personal Brand Strategist",
        "Developer Relations Lead",
        "Content Strategy Manager",
        "Professional Development Advisor",
    ],
    // Default/General
    default: [
        "Senior Professional",
        "Industry Expert",
        "Career Advisor",
        "Technical Lead",
        "Department Lead",
    ],
};

// Companies pool (mix of tech giants, startups, and consulting)
const COMPANIES = [
    "Google", "Meta", "Amazon", "Microsoft", "Apple", "Netflix", "Stripe", "LinkedIn",
    "Salesforce", "Adobe", "Uber", "Lyft", "Airbnb", "Spotify", "Twitter", "GitHub",
    "Atlassian", "Shopify", "Slack", "Zoom", "Figma", "Notion", "Datadog", "Snowflake",
    "MongoDB", "Elastic", "HashiCorp", "Cloudflare", "Twilio", "Square", "Coinbase",
    "Robinhood", "Plaid", "Instacart", "DoorDash", "Grammarly", "Canva", "Webflow",
];

// Description templates by category
const DESCRIPTION_TEMPLATES: Record<string, string[]> = {
    skills: [
        "Expert in {skill} with {years}+ years of hands-on experience. Passionate about helping others grow in their technical journey.",
        "Specializes in {skill} development and best practices. Has mentored numerous professionals in advancing their skills.",
        "Deep expertise in {skill} with a track record of building high-performance systems. Loves sharing knowledge.",
    ],
    projects: [
        "Has led projects at top tech companies, from concept to launch. Expert in navigating complex technical challenges.",
        "Experienced in building scalable systems and mentoring project teams. Passionate about turning ideas into reality.",
        "Technical program management expert with experience leading cross-functional teams on high-impact projects.",
    ],
    portfolio: [
        "Design leader with experience at top companies. Expert in crafting portfolios that stand out.",
        "Creative professional who has helped many designers land their dream roles through portfolio optimization.",
        "Passionate about helping others showcase their best work. Offers guidance on presentation and storytelling.",
    ],
    experience: [
        "Career development expert who has helped hundreds of professionals advance their careers.",
        "Engineering leader with experience building and growing teams. Offers insights on career progression.",
        "Dedicated to helping others navigate their career paths and achieve their professional goals.",
    ],
    networking: [
        "Expert in building professional networks and communities. Passionate about connecting talent with opportunities.",
        "Developer advocate who understands the tech community. Offers guidance on building meaningful connections.",
        "Talent partner with extensive network across the industry. Helps professionals expand their reach.",
    ],
    interview: [
        "Has conducted 500+ technical interviews and trained interviewers. Expert in interview preparation strategies.",
        "Engineering manager who helps candidates prepare for technical interviews at top companies.",
        "Career coach specializing in tech interview preparation. High success rate with mentees.",
    ],
    "open source": [
        "Open source enthusiast with major contributions to popular projects. Guides newcomers into the community.",
        "OSS program manager who helps developers make impactful contributions and build their reputation.",
        "Community builder passionate about growing open source projects and mentoring new contributors.",
    ],
    research: [
        "Research scientist with publications in top venues. Mentors aspiring researchers in methodology and impact.",
        "Applied researcher bridging academia and industry. Offers guidance on research career paths.",
        "Principal researcher who guides others in designing impactful research and publishing their work.",
    ],
    branding: [
        "Personal branding expert who helps professionals define and communicate their unique value.",
        "Content strategist helping tech professionals build their online presence and thought leadership.",
        "Career coach focused on personal brand development and professional visibility.",
    ],
    default: [
        "Experienced professional dedicated to helping others succeed in their career journey.",
        "Industry expert offering guidance and mentorship based on real-world experience.",
        "Passionate mentor with a track record of helping professionals achieve their goals.",
    ],
};

/**
 * Generate a random integer within a range
 */
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Extract a skill keyword from task title for personalized mentor titles
 */
function extractSkillFromTitle(title: string): string {
    // Common skill patterns to extract
    const skillPatterns = [
        /(?:learn|complete|master|build|develop|implement)\s+([A-Z][a-zA-Z0-9+#]+)/i,
        /([A-Z][a-zA-Z0-9+#]+)\s+(?:project|certification|course|skills?)/i,
        /(AWS|GCP|Azure|React|Node|Python|Java|Go|Rust|Kubernetes|Docker|TypeScript|JavaScript)/i,
    ];

    for (const pattern of skillPatterns) {
        const match = title.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    // Return a generic skill term if nothing specific found
    return "Software";
}

/**
 * Get category key for looking up templates
 */
function getCategoryKey(category: string): string {
    const lowerCategory = category.toLowerCase();

    // Check for exact matches first
    if (TITLE_TEMPLATES[lowerCategory]) {
        return lowerCategory;
    }

    // Check for partial matches
    for (const key of Object.keys(TITLE_TEMPLATES)) {
        if (lowerCategory.includes(key) || key.includes(lowerCategory)) {
            return key;
        }
    }

    return "default";
}

/**
 * Generate a mentor appropriate for the given task category and title
 */
export function generateMentor(category: string, taskTitle: string): Mentor {
    const firstName = randomPick(FIRST_NAMES);
    const lastName = randomPick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;

    const categoryKey = getCategoryKey(category);
    const skill = extractSkillFromTitle(taskTitle);
    const years = randomInt(5, 15);

    // Generate title with skill interpolation
    const titleTemplates = TITLE_TEMPLATES[categoryKey] || TITLE_TEMPLATES.default;
    let title = randomPick(titleTemplates);
    title = title.replace("{skill}", skill);

    // Pick company
    const company = randomPick(COMPANIES);

    // Generate email (simplified)
    const emailName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const email = `${emailName}@${company.toLowerCase().replace(/\s+/g, "")}.com`;

    // Generate profile image (using pravatar.cc for consistent dummy avatars)
    const avatarId = randomInt(1, 70);
    const profileImage = `https://i.pravatar.cc/150?img=${avatarId}`;

    // Generate description with skill/years interpolation
    const descTemplates = DESCRIPTION_TEMPLATES[categoryKey] || DESCRIPTION_TEMPLATES.default;
    let description = randomPick(descTemplates);
    description = description.replace("{skill}", skill).replace("{years}", years.toString());

    return {
        name,
        title,
        company,
        email,
        profileImage,
        description,
    };
}

/**
 * Conditionally generate a mentor for a task based on its category
 * Returns undefined if the category should not have a mentor
 */
export function generateMentorForTask(
    category: string,
    taskTitle: string
): Mentor | undefined {
    if (!shouldHaveMentor(category)) {
        return undefined;
    }
    return generateMentor(category, taskTitle);
}
