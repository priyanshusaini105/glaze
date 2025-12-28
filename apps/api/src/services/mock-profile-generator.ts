import { ResolvedProfile } from '../types/icp';
import { parseProfileUrl } from '../utils/profile-url';

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const ROLES = ['Software Engineer', 'Product Manager', 'Designer', 'Founder', 'CTO', 'VP of Sales', 'Marketing Director'];
const COMPANIES = ['TechCorp', 'InnovateInc', 'DataSystems', 'CloudNet', 'FutureWorks', 'SoftSolutions'];
const LOCATIONS = ['San Francisco, CA', 'New York, NY', 'London, UK', 'Berlin, DE', 'Remote', 'Austin, TX'];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateMockProfile = (url: string): ResolvedProfile => {
  const profile = parseProfileUrl(url);
  
  const firstName = getRandomElement(FIRST_NAMES);
  const lastName = getRandomElement(LAST_NAMES);
  const role = getRandomElement(ROLES);
  const company = getRandomElement(COMPANIES);
  
  return {
    ...profile,
    name: `${firstName} ${lastName}`,
    headline: `${role} at ${company}`,
    location: getRandomElement(LOCATIONS),
    scrapeNote: 'mock data generated',
  };
};
