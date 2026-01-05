const CORESIGNAL_API_KEY = '0EHmBEG8lKmjv8yZKQ6RDREzHdTWnoBK';
const BASE_URL = 'https://api.coresignal.com/cdapi/v2/employee_base';

interface SearchResponse {
  data: number[];
}

interface EmployeeProfile {
  id: number;
  name: string;
  title: string;
  headline: string;
  summary: string;
  location: string;
  member_experience_collection: ExperienceItem[];
  member_education_collection: EducationItem[];
  member_skills_collection: SkillItem[];
}

interface ExperienceItem {
  title: string;
  company_name: string;
  date_from: string;
  date_to: string;
  description: string;
  location: string;
}

interface EducationItem {
  title: string;
  subtitle: string;
  date_from: string;
  date_to: string;
  description: string;
}

interface SkillItem {
  member_skill: string;
}

export const searchEmployees = async (
  title: string,
  company: string,
  itemsPerPage: number = 20
): Promise<number[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/search/filter?items_per_page=${itemsPerPage}`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': CORESIGNAL_API_KEY
        },
        body: JSON.stringify({
          experience_title: title,
          experience_company_name: company
        })
      }
    );

    if (!response.ok) {
      console.error('Coresignal search error:', response.status);
      return [];
    }

    const data: SearchResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching employees:', error);
    return [];
  }
};

export const getEmployeeProfile = async (id: number): Promise<EmployeeProfile | null> => {
  try {
    const response = await fetch(
      `${BASE_URL}/collect/${id}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': CORESIGNAL_API_KEY
        }
      }
    );

    if (!response.ok) {
      console.error('Coresignal profile error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    return null;
  }
};

export const getTopEmployeeProfiles = async (
  title: string,
  company: string,
  limit: number = 20
): Promise<EmployeeProfile[]> => {
  const ids = await searchEmployees(title, company, limit);
  
  if (ids.length === 0) {
    console.log('No employee IDs found, using mock data');
    return getMockProfiles(title, company);
  }

  const profiles: EmployeeProfile[] = [];
  
  // Fetch profiles in parallel (batch of 5 at a time to avoid rate limits)
  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5);
    const batchProfiles = await Promise.all(
      batch.map(id => getEmployeeProfile(id))
    );
    profiles.push(...batchProfiles.filter((p): p is EmployeeProfile => p !== null));
  }

  return profiles;
};

// Mock data for development/demo purposes
const getMockProfiles = (title: string, company: string): EmployeeProfile[] => {
  return [
    {
      id: 1,
      name: "Alex Johnson",
      title: title,
      headline: `${title} at ${company}`,
      summary: "Passionate about building scalable solutions and leading high-performing teams.",
      location: "San Francisco, CA",
      member_experience_collection: [
        {
          title: title,
          company_name: company,
          date_from: "2022-01-01",
          date_to: "Present",
          description: "Leading cross-functional teams to deliver innovative solutions.",
          location: "San Francisco, CA"
        }
      ],
      member_education_collection: [
        {
          title: "Computer Science",
          subtitle: "Stanford University",
          date_from: "2014",
          date_to: "2018",
          description: "Bachelor's degree with focus on distributed systems"
        }
      ],
      member_skills_collection: [
        { member_skill: "Python" },
        { member_skill: "Machine Learning" },
        { member_skill: "Leadership" },
        { member_skill: "System Design" }
      ]
    },
    {
      id: 2,
      name: "Sarah Chen",
      title: title,
      headline: `Senior ${title} at ${company}`,
      summary: "10+ years of experience in tech, passionate about mentoring and innovation.",
      location: "New York, NY",
      member_experience_collection: [
        {
          title: `Senior ${title}`,
          company_name: company,
          date_from: "2020-06-01",
          date_to: "Present",
          description: "Architecting next-generation platforms and mentoring junior engineers.",
          location: "New York, NY"
        }
      ],
      member_education_collection: [
        {
          title: "MBA",
          subtitle: "Harvard Business School",
          date_from: "2018",
          date_to: "2020",
          description: "Focused on technology management"
        }
      ],
      member_skills_collection: [
        { member_skill: "Strategic Planning" },
        { member_skill: "Data Analysis" },
        { member_skill: "Product Management" },
        { member_skill: "AWS" }
      ]
    }
  ];
};

export const formatProfilesForAnalysis = (profiles: EmployeeProfile[]): string => {
  return profiles.map((profile, index) => `
Profile ${index + 1}: ${profile.name}
Title: ${profile.title}
Location: ${profile.location}
Summary: ${profile.summary}

Experience:
${profile.member_experience_collection.map(exp => 
  `- ${exp.title} at ${exp.company_name} (${exp.date_from} - ${exp.date_to})
   ${exp.description}`
).join('\n')}

Education:
${profile.member_education_collection.map(edu => 
  `- ${edu.title} from ${edu.subtitle} (${edu.date_from} - ${edu.date_to})`
).join('\n')}

Skills: ${profile.member_skills_collection.map(s => s.member_skill).join(', ')}
`).join('\n---\n');
};
