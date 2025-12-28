export type ProfileSource = 'linkedin' | 'github';

export type ResolveProfileRequest = {
  url: string;
  mock?: boolean;
  mockDelay?: number;
};

export type ResolvedProfile = {
  source: ProfileSource;
  handle: string;
  profileUrl: string;
  name?: string | null;
  headline?: string | null;
  location?: string | null;
  scrapeNote?: string;
};

export type ResolveProfileResponse = {
  profile: ResolvedProfile;
};