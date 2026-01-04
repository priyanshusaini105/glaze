/**
 * LinkedIn Types
 * 
 * Shared types for LinkedIn data structures
 */

export interface LinkedInProfile {
  id: string;
  full_name: string;
  headline: string;
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
  profile_url: string;
  image_url?: string;
  summary?: string;
  experience?: LinkedInExperience[];
  education?: LinkedInEducation[];
}

export interface LinkedInExperience {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface LinkedInEducation {
  school: string;
  field: string;
  degree: string;
  startDate?: string;
  endDate?: string;
}

export interface LinkedInCompany {
  id: string;
  name: string;
  url: string;
  industry: string;
  company_size: string;
  founded: number;
  headquarters?: {
    city?: string;
    state?: string;
    country?: string;
  };
  description?: string;
  website?: string;
  employee_count?: number;
}
