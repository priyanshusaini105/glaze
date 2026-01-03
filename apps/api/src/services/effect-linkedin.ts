/**
 * LinkedIn Data API Service - Effect TS Implementation
 * 
 * Provides LinkedIn profile and company data enrichment via RapidAPI
 * Implements automatic retries, rate limiting, and error handling using Effect TS
 */

import { Effect, Context, Layer, Schedule, pipe } from 'effect';
import * as Schema from '@effect/schema/Schema';
import type {
  LinkedInProfile,
  LinkedInCompany,
  LinkedInSearchResult,
  LinkedInJobResult,
  LinkedInAPIConfig,
  ProfileRequest,
  CompanyRequest,
  SearchPeopleRequest,
  SearchJobsRequest,
} from '../types/linkedin';

// ========== Error Types ==========

export class LinkedInAPIError {
  readonly _tag = 'LinkedInAPIError';
  constructor(
    readonly statusCode: number,
    readonly message: string,
    readonly endpoint: string,
    readonly cause?: unknown
  ) {}
}

export class LinkedInConfigError {
  readonly _tag = 'LinkedInConfigError';
  constructor(readonly message: string) {}
}

export class LinkedInRateLimitError {
  readonly _tag = 'LinkedInRateLimitError';
  constructor(readonly retryAfter?: number) {}
}

export class LinkedInValidationError {
  readonly _tag = 'LinkedInValidationError';
  constructor(readonly message: string, readonly errors: unknown) {}
}

// ========== Service Interface ==========

export interface LinkedInAPIService {
  /**
   * Get LinkedIn profile data by URL
   */
  getProfile: (
    request: ProfileRequest
  ) => Effect.Effect<LinkedInProfile, LinkedInAPIError | LinkedInRateLimitError | LinkedInValidationError>;

  /**
   * Get LinkedIn company data by URL
   */
  getCompany: (
    request: CompanyRequest
  ) => Effect.Effect<LinkedInCompany, LinkedInAPIError | LinkedInRateLimitError | LinkedInValidationError>;

  /**
   * Search for LinkedIn profiles
   */
  searchPeople: (
    request: SearchPeopleRequest
  ) => Effect.Effect<LinkedInSearchResult[], LinkedInAPIError | LinkedInRateLimitError | LinkedInValidationError>;

  /**
   * Search for LinkedIn jobs
   */
  searchJobs: (
    request: SearchJobsRequest
  ) => Effect.Effect<LinkedInJobResult[], LinkedInAPIError | LinkedInRateLimitError | LinkedInValidationError>;
}

export const LinkedInAPIService = Context.GenericTag<LinkedInAPIService>(
  'LinkedInAPIService'
);

// ========== HTTP Client Interface ==========

interface HTTPResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

const makeHTTPRequest = (
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    params?: Record<string, string>;
  }
): Effect.Effect<HTTPResponse, LinkedInAPIError | LinkedInRateLimitError> =>
  Effect.gen(function* (_) {
    yield* _(Effect.log(`[LinkedIn API] ${options.method} ${url}`));

    // Build URL with query params
    const urlWithParams = new URL(url);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        urlWithParams.searchParams.append(key, value);
      });
    }

    const response = yield* _(
      Effect.tryPromise({
        try: async () => {
          const res = await fetch(urlWithParams.toString(), {
            method: options.method,
            headers: options.headers,
          });

          const data = await res.json();

          return {
            status: res.status,
            data,
            headers: Object.fromEntries(res.headers.entries()),
          };
        },
        catch: (error) =>
          new LinkedInAPIError(
            0,
            'Network request failed',
            url,
            error
          ),
      })
    );

    // Handle HTTP errors
    if (response.status >= 400) {
      const errorMessage =
        typeof response.data === 'object' && response.data !== null
          ? (response.data as any).message || 'API request failed'
          : 'API request failed';

      if (response.status === 429) {
        return yield* _(
          Effect.fail(
            new LinkedInRateLimitError(
              Number(response.headers['retry-after']) || undefined
            )
          )
        );
      }

      return yield* _(
        Effect.fail(
          new LinkedInAPIError(response.status, errorMessage, url)
        )
      );
    }

    return response;
  });

// ========== Service Implementation ==========

const makeLinkedInAPIService = (
  config: LinkedInAPIConfig
): LinkedInAPIService => {
  const headers = {
    'x-rapidapi-key': config.apiKey,
    'x-rapidapi-host': config.apiHost,
  };

  /**
   * Retry policy: 3 attempts with exponential backoff
   */
  const retryPolicy = pipe(
    Schedule.exponential('100 millis'),
    Schedule.compose(Schedule.recurs(3)),
    Schedule.intersect(Schedule.spaced('1 second'))
  );

  return {
    getProfile: (request: ProfileRequest) =>
      pipe(
        Effect.gen(function* (_) {
          yield* _(Effect.log(`[LinkedIn] Fetching profile: ${request.url}`));

          const response = yield* _(
            makeHTTPRequest(`${config.baseUrl}/get-profile-data-by-url`, {
              method: 'GET',
              headers,
              params: { url: request.url },
            }),
            Effect.catchTag('LinkedInRateLimitError', (error) =>
              Effect.gen(function* (_) {
                const delay = error.retryAfter || 60;
                yield* _(
                  Effect.log(
                    `[LinkedIn] Rate limited. Retrying after ${delay} seconds`
                  )
                );
                yield* _(Effect.sleep(`${delay} seconds`));
                // Retry the request
                return yield* _(
                  makeHTTPRequest(`${config.baseUrl}/get-profile-data-by-url`, {
                    method: 'GET',
                    headers,
                    params: { url: request.url },
                  })
                );
              })
            )
          );

          yield* _(Effect.log(`[LinkedIn] Profile data retrieved successfully`));

          // Return raw data - validation can be added later if needed
          return response.data as LinkedInProfile;
        }),
        Effect.retry(retryPolicy)
      ),

    getCompany: (request: CompanyRequest) =>
      pipe(
        Effect.gen(function* (_) {
          yield* _(Effect.log(`[LinkedIn] Fetching company: ${request.url}`));

          const response = yield* _(
            makeHTTPRequest(`${config.baseUrl}/get-company-data`, {
              method: 'GET',
              headers,
              params: { url: request.url },
            }),
            Effect.catchTag('LinkedInRateLimitError', (error) =>
              Effect.gen(function* (_) {
                const delay = error.retryAfter || 60;
                yield* _(
                  Effect.log(
                    `[LinkedIn] Rate limited. Retrying after ${delay} seconds`
                  )
                );
                yield* _(Effect.sleep(`${delay} seconds`));
                // Retry the request
                return yield* _(
                  makeHTTPRequest(`${config.baseUrl}/get-company-data`, {
                    method: 'GET',
                    headers,
                    params: { url: request.url },
                  })
                );
              })
            )
          );

          yield* _(Effect.log(`[LinkedIn] Company data retrieved successfully`));

          return response.data as LinkedInCompany;
        }),
        Effect.retry(retryPolicy)
      ),

    searchPeople: (request: SearchPeopleRequest) =>
      pipe(
        Effect.gen(function* (_) {
          yield* _(
            Effect.log(`[LinkedIn] Searching people: ${request.keywords}`)
          );

          const params: Record<string, string> = {
            keywords: request.keywords,
          };

          if (request.location) params.location = request.location;
          if (request.company) params.company = request.company;
          if (request.limit) params.limit = request.limit.toString();

          const response = yield* _(
            makeHTTPRequest(`${config.baseUrl}/search-people`, {
              method: 'GET',
              headers,
              params,
            })
          );

          yield* _(Effect.log(`[LinkedIn] Search completed successfully`));

          return response.data as LinkedInSearchResult[];
        }),
        Effect.retry(retryPolicy)
      ),

    searchJobs: (request: SearchJobsRequest) =>
      pipe(
        Effect.gen(function* (_) {
          yield* _(Effect.log(`[LinkedIn] Searching jobs: ${request.keywords}`));

          const params: Record<string, string> = {
            keywords: request.keywords,
          };

          if (request.location) params.location = request.location;
          if (request.company) params.company = request.company;
          if (request.limit) params.limit = request.limit.toString();

          const response = yield* _(
            makeHTTPRequest(`${config.baseUrl}/search-jobs`, {
              method: 'GET',
              headers,
              params,
            })
          );

          yield* _(Effect.log(`[LinkedIn] Job search completed successfully`));

          return response.data as LinkedInJobResult[];
        }),
        Effect.retry(retryPolicy)
      ),
  };
};

// ========== Service Layer ==========

/**
 * Creates LinkedIn API Service layer from configuration
 */
export const LinkedInAPIServiceLive = Layer.effect(
  LinkedInAPIService,
  Effect.gen(function* (_) {
    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPIDAPI_LINKEDIN_HOST || 'linkedin-data-api.p.rapidapi.com';

    if (!apiKey) {
      yield* _(
        Effect.fail(
          new LinkedInConfigError(
            'RAPIDAPI_KEY environment variable is not set'
          )
        )
      );
    }

    const config: LinkedInAPIConfig = {
      apiKey: apiKey!,
      apiHost,
      baseUrl: `https://${apiHost}`,
    };

    yield* _(Effect.log('[LinkedIn API] Service initialized'));

    return makeLinkedInAPIService(config);
  })
);

// ========== Convenience Functions ==========

/**
 * Get LinkedIn profile with automatic service resolution
 */
export const getLinkedInProfile = (profileUrl: string) =>
  pipe(
    LinkedInAPIService,
    Effect.flatMap((service) =>
      service.getProfile({ url: profileUrl })
    )
  );

/**
 * Get LinkedIn company with automatic service resolution
 */
export const getLinkedInCompany = (companyUrl: string) =>
  pipe(
    LinkedInAPIService,
    Effect.flatMap((service) =>
      service.getCompany({ url: companyUrl })
    )
  );

/**
 * Search LinkedIn profiles with automatic service resolution
 */
export const searchLinkedInPeople = (
  keywords: string,
  options?: {
    location?: string;
    company?: string;
    limit?: number;
  }
) =>
  pipe(
    LinkedInAPIService,
    Effect.flatMap((service) =>
      service.searchPeople({
        keywords,
        ...options,
      })
    )
  );

/**
 * Search LinkedIn jobs with automatic service resolution
 */
export const searchLinkedInJobs = (
  keywords: string,
  options?: {
    location?: string;
    company?: string;
    limit?: number;
  }
) =>
  pipe(
    LinkedInAPIService,
    Effect.flatMap((service) =>
      service.searchJobs({
        keywords,
        ...options,
      })
    )
  );
