/**
 * AI-powered column analysis and categorization
 */
import Elysia, { t } from 'elysia';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const columnCategorySchema = z.object({
  suggestedType: z.enum(['text', 'number', 'boolean', 'date', 'url', 'email']).describe('The most appropriate data type for this column'),
  category: z.string().describe('A semantic category like "contact", "company", "financial", "location", "identifier", etc.'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  reasoning: z.string().describe('Brief explanation of the categorization'),
});

export const columnsAIRoutes = new Elysia({ prefix: '/ai/columns' })
  /**
   * Analyze column and suggest type and category using LLM
   */
  .post('/analyze', async ({ body, error }) => {
    const { label, description, context } = body;

    if (!label || label.trim().length === 0) {
      return error(400, 'Column label is required');
    }

    try {
      const prompt = `Analyze this column and suggest the most appropriate data type and semantic category.

Column Label: ${label}
${description ? `Description: ${description}` : ''}
${context ? `Additional Context: ${context}` : ''}

Consider:
- Data Type: text, number, boolean, date, url, email
- Category: semantic meaning like "contact", "company", "financial", "location", "identifier", "metadata", etc.

Be concise and specific. Use your best judgment based on common data patterns.`;

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: columnCategorySchema,
        prompt,
        temperature: 0.3, // Lower temperature for more consistent categorization
      });

      return {
        success: true,
        analysis: result.object,
      };
    } catch (err) {
      console.error('[AI Column Analysis] Error:', err);
      return error(500, 'Failed to analyze column. Please try again.');
    }
  }, {
    body: t.Object({
      label: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      context: t.Optional(t.String()), // e.g., table name or existing columns
    })
  });
