import { person, strongPassword, uniqueEmail, uniqueToken } from '../utils/faker.utils';

export interface Activity {
  name: string;
  role: string;
  organisation: string;
  description: string;
  hoursPerWeek: string;
  weeksPerYear: string;
  years: string;
}

export interface Applicant {
  runId: string;
  account: { firstName: string; lastName: string; email: string; password: string };
  profile: {
    phone: string;
    dateOfBirth: string; // MM/DD/YYYY
    dateOfBirthIso: string; // YYYY-MM-DD
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    school: string;
    graduationYear: string;
    gpa: string;
    website: string;
    paragraph: string;
  };
  activities: Activity[];
  essays: { cars: string; animals: string; school: string; other: string };
}

const ACTIVITY_SEEDS = [
  { name: 'Robotics Club', role: 'Team Captain', organisation: 'Lincoln High Robotics' },
  { name: 'Debate Society', role: 'Treasurer', organisation: 'Lincoln High Debate' },
  { name: 'Community Food Bank', role: 'Volunteer Lead', organisation: 'City Food Bank' },
  { name: 'Varsity Soccer', role: 'Midfielder', organisation: 'Lincoln High Athletics' },
];

function essay(topic: string, runId: string): string {
  return (
    `My essay about ${topic} (run ${runId}) begins with a simple observation: the subjects we choose to study ` +
    `shape the way we see everything else. Over the past few years I have spent countless hours learning about ` +
    `${topic}, and each hour taught me something new about patience, curiosity and teamwork. ` +
    `I believe that sustained effort, honest reflection and a willingness to ask questions are the foundations ` +
    `of any meaningful achievement, and I intend to carry those habits into my studies and my community.`
  );
}

/** Builds a brand-new, unique applicant for every test run. */
export function buildApplicant(): Applicant {
  const runId = uniqueToken();
  const { firstName, lastName } = person();

  return {
    runId,
    account: {
      firstName,
      lastName,
      email: uniqueEmail(runId),
      password: strongPassword(runId),
    },
    profile: {
      phone: '2025550143',
      dateOfBirth: '04/15/2006',
      dateOfBirthIso: '2006-04-15',
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'Illinois',
      zip: '62704',
      country: 'United States',
      school: 'Lincoln High School',
      graduationYear: '2025',
      gpa: '3.8',
      website: 'https://example.com',
      paragraph:
        'Automated test submission created for quality-assurance purposes. Please disregard this entry.',
    },
    activities: ACTIVITY_SEEDS.map((seed, i) => ({
      ...seed,
      name: `${seed.name} ${runId.slice(-3)}`,
      description: `Participated in ${seed.name.toLowerCase()} activities, contributing to planning and delivery. (${i + 1})`,
      hoursPerWeek: '5',
      weeksPerYear: '30',
      years: '2',
    })),
    essays: {
      cars: essay('cars', runId),
      animals: essay('animals', runId),
      school: essay('school', runId),
      other: essay('astronomy', runId),
    },
  };
}
