import * as Schema from '@effect/schema/Schema';

// ========== LinkedIn Profile Types ==========

export const LinkedInLocation = Schema.Struct({
  country: Schema.String,
  city: Schema.String,
});

export const LinkedInExperience = Schema.Struct({
  title: Schema.String,
  company: Schema.String,
  duration: Schema.String,
  description: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
});

export const LinkedInEducation = Schema.Struct({
  school: Schema.String,
  degree: Schema.optional(Schema.String),
  field: Schema.optional(Schema.String),
  dates: Schema.optional(Schema.String),
});

export const LinkedInProfile = Schema.Struct({
  full_name: Schema.String,
  headline: Schema.String,
  location: LinkedInLocation,
  experience: Schema.Array(LinkedInExperience),
  skills: Schema.Array(Schema.String),
  education: Schema.Array(LinkedInEducation),
  about: Schema.optional(Schema.String),
  recommendations: Schema.optional(Schema.Number),
  last_activity_date: Schema.optional(Schema.String),
  profile_url: Schema.String,
});

export type LinkedInProfile = Schema.Schema.Type<typeof LinkedInProfile>;
export type LinkedInLocation = Schema.Schema.Type<typeof LinkedInLocation>;
export type LinkedInExperience = Schema.Schema.Type<typeof LinkedInExperience>;
export type LinkedInEducation = Schema.Schema.Type<typeof LinkedInEducation>;

// ========== LinkedIn Company Types ==========

export const LinkedInCompany = Schema.Struct({
  company_name: Schema.String,
  about: Schema.optional(Schema.String),
  employee_count: Schema.optional(Schema.String),
  industry: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
  website: Schema.optional(Schema.String),
  founded_year: Schema.optional(Schema.Number),
  specialties: Schema.optional(Schema.Array(Schema.String)),
  company_url: Schema.String,
});

export type LinkedInCompany = Schema.Schema.Type<typeof LinkedInCompany>;

// ========== Search Types ==========

export const LinkedInSearchResult = Schema.Struct({
  name: Schema.String,
  headline: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
  profile_url: Schema.String,
});

export const LinkedInJobResult = Schema.Struct({
  title: Schema.String,
  company: Schema.String,
  location: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  posted_date: Schema.optional(Schema.String),
  job_url: Schema.String,
});

export type LinkedInSearchResult = Schema.Schema.Type<typeof LinkedInSearchResult>;
export type LinkedInJobResult = Schema.Schema.Type<typeof LinkedInJobResult>;

// ========== API Configuration ==========

export const LinkedInAPIConfig = Schema.Struct({
  apiKey: Schema.String,
  apiHost: Schema.String,
  baseUrl: Schema.String,
});

export type LinkedInAPIConfig = Schema.Schema.Type<typeof LinkedInAPIConfig>;

// ========== API Request Types ==========

export const ProfileRequest = Schema.Struct({
  url: Schema.String,
});

export const CompanyRequest = Schema.Struct({
  url: Schema.String,
});

export const SearchPeopleRequest = Schema.Struct({
  keywords: Schema.String,
  location: Schema.optional(Schema.String),
  company: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number),
});

export const SearchJobsRequest = Schema.Struct({
  keywords: Schema.String,
  location: Schema.optional(Schema.String),
  company: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number),
});

export type ProfileRequest = Schema.Schema.Type<typeof ProfileRequest>;
export type CompanyRequest = Schema.Schema.Type<typeof CompanyRequest>;
export type SearchPeopleRequest = Schema.Schema.Type<typeof SearchPeopleRequest>;
export type SearchJobsRequest = Schema.Schema.Type<typeof SearchJobsRequest>;
