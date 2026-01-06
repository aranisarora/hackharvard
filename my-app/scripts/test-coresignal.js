/**
 * Test script for CoreSignal API route
 * 
 * Usage:
 *   1. Start the Next.js dev server: npm run dev
 *   2. Run this script: node scripts/test-coresignal.js
 * 
 * Or with custom values:
 *   node scripts/test-coresignal.js "Senior Software Engineer" "Google"
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api/coresignal';

// Default test values
const DEFAULT_JOB_TITLE = 'Product Designer';
const DEFAULT_COMPANY_NAME = 'Pathforge';

// Get command line arguments or use defaults
const jobTitle = process.argv[2] || DEFAULT_JOB_TITLE;
const companyName = process.argv[3] || DEFAULT_COMPANY_NAME;

async function testCoreSignalRoute() {
  console.log('🧪 Testing CoreSignal API Route\n');
  console.log('='.repeat(60));
  console.log(`Job Title: ${jobTitle}`);
  console.log(`Company Name: ${companyName}`);
  console.log(`API URL: ${API_URL}`);
  console.log('='.repeat(60));
  console.log('\n');

  try {
    // Make POST request
    console.log('📤 Sending POST request...\n');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experience_title: jobTitle,
        experience_company_name: companyName,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Display results
    console.log('✅ Response received successfully!\n');
    console.log('='.repeat(60));
    console.log('RESPONSE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Experience Title: ${data.experience_title}`);
    console.log(`Experience Company: ${data.experience_company_name}`);
    console.log(`Total Profiles Found: ${data.filter?.total || 0}`);
    console.log(`Profile IDs: ${data.filter?.ids?.join(', ') || 'None'}`);
    console.log('='.repeat(60));
    console.log('\n');

    // Display each profile/resume
    if (data.profiles && data.profiles.length > 0) {
      console.log(`📄 PROFILES/RESUMES (${data.profiles.length}):\n`);
      
      data.profiles.forEach((profile, index) => {
        console.log('─'.repeat(60));
        console.log(`\n📋 Profile #${index + 1}`);
        console.log('─'.repeat(60));
        console.log(`ID: ${profile.id}`);
        console.log(`Name: ${profile.name || 'N/A'}`);
        console.log(`Headline: ${profile.headline || 'N/A'}`);
        console.log(`Location: ${profile.location || 'N/A'}`);
        console.log(`Country: ${profile.country || 'N/A'}`);
        console.log(`Industry: ${profile.industry || 'N/A'}`);
        console.log(`LinkedIn: ${profile.linkedin_url || 'N/A'}`);
        
        // Experience
        if (profile.experience && profile.experience.length > 0) {
          console.log(`\n💼 Experience (${profile.experience.length}):`);
          profile.experience.forEach((exp, expIndex) => {
            console.log(`  ${expIndex + 1}. ${exp.title} at ${exp.company_name}`);
            console.log(`     Location: ${exp.location || 'N/A'}`);
            console.log(`     Period: ${exp.start_date || 'N/A'} - ${exp.end_date || 'Present'}`);
            console.log(`     Current: ${exp.is_current ? 'Yes' : 'No'}`);
            if (exp.description) {
              console.log(`     Description: ${exp.description}`);
            }
          });
        }

        // Education
        if (profile.education && profile.education.length > 0) {
          console.log(`\n🎓 Education (${profile.education.length}):`);
          profile.education.forEach((edu, eduIndex) => {
            console.log(`  ${eduIndex + 1}. ${edu.school_name}`);
            console.log(`     Degree: ${edu.degree || 'N/A'}`);
            console.log(`     Field: ${edu.field_of_study || 'N/A'}`);
            console.log(`     Period: ${edu.start_date || 'N/A'} - ${edu.end_date || 'N/A'}`);
          });
        }

        // Skills
        if (profile.skills && profile.skills.length > 0) {
          const skillsList = profile.skills.map(skill => 
            typeof skill === 'string' ? skill : skill.name
          ).join(', ');
          console.log(`\n🛠️  Skills: ${skillsList}`);
        }

        // Languages
        if (profile.languages && profile.languages.length > 0) {
          console.log(`\n🌐 Languages: ${profile.languages.join(', ')}`);
        }

        // Certifications
        if (profile.certifications && profile.certifications.length > 0) {
          console.log(`\n🏆 Certifications (${profile.certifications.length}):`);
          profile.certifications.forEach((cert, certIndex) => {
            console.log(`  ${certIndex + 1}. ${cert.name}`);
            if (cert.issuer) console.log(`     Issuer: ${cert.issuer}`);
            if (cert.issue_date) console.log(`     Date: ${cert.issue_date}`);
          });
        }

        console.log(`\n📅 Created: ${profile.created_at || 'N/A'}`);
        console.log(`📅 Updated: ${profile.updated_at || 'N/A'}`);
        console.log('\n');
      });
    } else {
      console.log('⚠️  No profiles found in response.\n');
    }

    // Display full JSON for debugging
    console.log('='.repeat(60));
    console.log('FULL JSON RESPONSE');
    console.log('='.repeat(60));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error testing CoreSignal route:');
    console.error(error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tip: Make sure the Next.js dev server is running:');
      console.error('   npm run dev');
    }
    
    process.exit(1);
  }
}

// Run the test
testCoreSignalRoute();

