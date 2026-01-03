import { Elysia, t } from 'elysia';
import { Effect } from 'effect';
import {
  LinkedInAPIServiceLive,
  getLinkedInProfile,
  getLinkedInCompany,
  searchLinkedInPeople,
  searchLinkedInJobs,
} from '../services/effect-linkedin';

/**
 * LinkedIn API Routes
 * 
 * Provides endpoints for LinkedIn data enrichment via RapidAPI
 */
export const linkedinRoutes = new Elysia({ prefix: '/linkedin' })
  /**
   * GET /linkedin/profile - Get LinkedIn profile data
   * 
   * Query Parameters:
   * - url: LinkedIn profile URL (required)
   * 
   * Example: /linkedin/profile?url=https://www.linkedin.com/in/williamhgates
   */
  .get(
    '/profile',
    async ({ query, set }) => {
      try {
        if (!query.url) {
          set.status = 400;
          return {
            error: 'Missing required parameter: url',
            message: 'Please provide a LinkedIn profile URL',
          };
        }

        const program = getLinkedInProfile(query.url);
        const result = await Effect.runPromise(
          Effect.provide(program, LinkedInAPIServiceLive)
        );

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      query: t.Object({
        url: t.String({
          description: 'LinkedIn profile URL',
          examples: ['https://www.linkedin.com/in/williamhgates'],
        }),
      }),
      detail: {
        summary: 'Get LinkedIn Profile',
        description: 'Retrieve comprehensive LinkedIn profile data including experience, education, and skills',
        tags: ['LinkedIn'],
      },
    }
  )

  /**
   * GET /linkedin/company - Get LinkedIn company data
   * 
   * Query Parameters:
   * - url: LinkedIn company URL (required)
   * 
   * Example: /linkedin/company?url=https://www.linkedin.com/company/microsoft
   */
  .get(
    '/company',
    async ({ query, set }) => {
      try {
        if (!query.url) {
          set.status = 400;
          return {
            error: 'Missing required parameter: url',
            message: 'Please provide a LinkedIn company URL',
          };
        }

        const program = getLinkedInCompany(query.url);
        const result = await Effect.runPromise(
          Effect.provide(program, LinkedInAPIServiceLive)
        );

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      query: t.Object({
        url: t.String({
          description: 'LinkedIn company URL',
          examples: ['https://www.linkedin.com/company/microsoft'],
        }),
      }),
      detail: {
        summary: 'Get LinkedIn Company',
        description: 'Retrieve LinkedIn company information including about, employee count, and industry',
        tags: ['LinkedIn'],
      },
    }
  )

  /**
   * GET /linkedin/search/people - Search LinkedIn profiles
   * 
   * Query Parameters:
   * - keywords: Search keywords (required)
   * - location: Location filter (optional)
   * - company: Company filter (optional)
   * - limit: Result limit (optional, default: 10)
   * 
   * Example: /linkedin/search/people?keywords=Software+Engineer&location=San+Francisco&limit=10
   */
  .get(
    '/search/people',
    async ({ query, set }) => {
      try {
        if (!query.keywords) {
          set.status = 400;
          return {
            error: 'Missing required parameter: keywords',
            message: 'Please provide search keywords',
          };
        }

        const program = searchLinkedInPeople(query.keywords, {
          location: query.location,
          company: query.company,
          limit: query.limit,
        });

        const result = await Effect.runPromise(
          Effect.provide(program, LinkedInAPIServiceLive)
        );

        return {
          success: true,
          data: result,
          count: result.length,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      query: t.Object({
        keywords: t.String({
          description: 'Search keywords',
          examples: ['Software Engineer', 'Product Manager'],
        }),
        location: t.Optional(
          t.String({
            description: 'Location filter',
            examples: ['San Francisco', 'New York'],
          })
        ),
        company: t.Optional(
          t.String({
            description: 'Company filter',
            examples: ['Google', 'Microsoft'],
          })
        ),
        limit: t.Optional(
          t.Number({
            description: 'Result limit',
            default: 10,
            minimum: 1,
            maximum: 100,
          })
        ),
      }),
      detail: {
        summary: 'Search LinkedIn Profiles',
        description: 'Search for LinkedIn profiles by keywords, location, and company',
        tags: ['LinkedIn'],
      },
    }
  )

  /**
   * GET /linkedin/search/jobs - Search LinkedIn jobs
   * 
   * Query Parameters:
   * - keywords: Search keywords (required)
   * - location: Location filter (optional)
   * - company: Company filter (optional)
   * - limit: Result limit (optional, default: 10)
   * 
   * Example: /linkedin/search/jobs?keywords=TypeScript+Developer&location=Remote&limit=10
   */
  .get(
    '/search/jobs',
    async ({ query, set }) => {
      try {
        if (!query.keywords) {
          set.status = 400;
          return {
            error: 'Missing required parameter: keywords',
            message: 'Please provide search keywords',
          };
        }

        const program = searchLinkedInJobs(query.keywords, {
          location: query.location,
          company: query.company,
          limit: query.limit,
        });

        const result = await Effect.runPromise(
          Effect.provide(program, LinkedInAPIServiceLive)
        );

        return {
          success: true,
          data: result,
          count: result.length,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      query: t.Object({
        keywords: t.String({
          description: 'Search keywords',
          examples: ['TypeScript Developer', 'Data Scientist'],
        }),
        location: t.Optional(
          t.String({
            description: 'Location filter',
            examples: ['Remote', 'San Francisco'],
          })
        ),
        company: t.Optional(
          t.String({
            description: 'Company filter',
            examples: ['Google', 'Microsoft'],
          })
        ),
        limit: t.Optional(
          t.Number({
            description: 'Result limit',
            default: 10,
            minimum: 1,
            maximum: 100,
          })
        ),
      }),
      detail: {
        summary: 'Search LinkedIn Jobs',
        description: 'Search for LinkedIn job postings by keywords, location, and company',
        tags: ['LinkedIn'],
      },
    }
  )

  /**
   * POST /linkedin/enrich - Enrich data using LinkedIn API
   * 
   * Body:
   * {
   *   "type": "profile" | "company",
   *   "urls": ["https://www.linkedin.com/in/...", ...],
   *   "fields": ["full_name", "headline", "experience", ...]
   * }
   */
  .post(
    '/enrich',
    async ({ body, set }) => {
      try {
        const { type, urls, fields } = body as {
          type: 'profile' | 'company';
          urls: string[];
          fields?: string[];
        };

        if (!type || !urls || !Array.isArray(urls) || urls.length === 0) {
          set.status = 400;
          return {
            error: 'Invalid request',
            message: 'Please provide type and urls array',
          };
        }

        const results = [];

        // Process each URL sequentially to respect rate limits
        for (const url of urls) {
          try {
            let result: any;
            
            if (type === 'profile') {
              const program = getLinkedInProfile(url);
              result = await Effect.runPromise(
                Effect.provide(program, LinkedInAPIServiceLive)
              );
            } else {
              const program = getLinkedInCompany(url);
              result = await Effect.runPromise(
                Effect.provide(program, LinkedInAPIServiceLive)
              );
            }

            // Filter fields if specified
            const filteredResult = fields
              ? Object.fromEntries(
                  Object.entries(result).filter(([key]) => fields.includes(key))
                )
              : result;

            results.push({
              url,
              success: true,
              data: filteredResult,
            });
          } catch (error) {
            results.push({
              url,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Add delay between requests to respect rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return {
          success: true,
          processed: urls.length,
          results,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      body: t.Object({
        type: t.Union([t.Literal('profile'), t.Literal('company')], {
          description: 'Type of LinkedIn data to enrich',
        }),
        urls: t.Array(t.String(), {
          description: 'Array of LinkedIn URLs to enrich',
        }),
        fields: t.Optional(
          t.Array(t.String(), {
            description: 'Specific fields to return (optional)',
          })
        ),
      }),
      detail: {
        summary: 'Batch Enrich LinkedIn Data',
        description: 'Enrich multiple LinkedIn profiles or companies in a single request',
        tags: ['LinkedIn'],
      },
    }
  );

export const registerLinkedInRoutes = (app: Elysia) => app.use(linkedinRoutes);
