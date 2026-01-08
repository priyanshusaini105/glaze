/**
 * AI-powered column analysis and categorization
 */
import Elysia, { t } from 'elysia';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const columnCategorySchema = z.object({
  suggestedLabel: z.string().describe('A good column name based on the description'),
  suggestedType: z.enum(['text', 'number', 'boolean', 'date', 'url', 'email']).describe('The most appropriate data type for this column'),
  category: z.string().describe('A semantic category like "contact", "company", "financial", "location", "identifier", etc.'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  reasoning: z.string().describe('Brief explanation of the categorization'),
});

export const columnsAIRoutes = new Elysia({ prefix: '/ai/columns' })
  /**
   * Analyze column and suggest type and category using LLM
   */
  .post('/analyze', async ({ body, set }) => {
    const { label, description, context } = body;

    // Either label or description is required
    if ((!label || label.trim().length === 0) && (!description || description.trim().length === 0)) {
      set.status = 400;
      return { error: 'Either column label or description is required' };
    }

    try {
      const prompt = `Analyze this column and suggest the most appropriate data type, semantic category, and a good column name.

Column Description: ${description || 'Not provided'}
${label ? `Current Label: ${label}` : 'No label yet - please suggest one'}
${context ? `Additional Context: ${context}` : ''}

Generate:
1. A concise, descriptive column name (2-4 words max)
2. Data Type: text, number, boolean, date, url, email
3. Category: semantic meaning like "contact", "company", "financial", "location", "identifier", "metadata", etc.
4. Confidence score (0-1)
5. Brief reasoning

Respond with ONLY valid JSON in this exact format:
{
  "suggestedLabel": "HR Phone Number",
  "suggestedType": "text",
  "category": "contact",
  "confidence": 0.95,
  "reasoning": "Phone number indicates contact type, should use text for flexibility"
}

Use clear, professional naming. Examples: "HR Phone", "Employee Count", "LinkedIn URL", "Company Website"`;

      const result = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt,
        temperature: 0.3,
      });

      // Parse the JSON response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = columnCategorySchema.parse(parsed);

      return {
        success: true,
        analysis: validated,
      };
    } catch (err) {
      console.error('[AI Column Analysis] Error:', err);
      set.status = 500;
      return { error: 'Failed to analyze column. Please try again.' };
    }
  }, {
    body: t.Object({
      label: t.Optional(t.String()),
      description: t.Optional(t.String()),
      context: t.Optional(t.String()),
    })
  });
