/**
 * ICP (Ideal Customer Profile) Types
 * 
 * Shared types for ICP data and matching
 */

export interface ICPProfile {
  id: string;
  name: string;
  targetIndustries: string[];
  targetCompanySize: string[];
  targetRevenue?: string;
  targetRole?: string[];
  targetLocation?: string[];
  description?: string;
}

export interface ICPMatch {
  profileId: string;
  matchScore: number; // 0-100
  matchedFields: string[];
  timestamp: string;
}
