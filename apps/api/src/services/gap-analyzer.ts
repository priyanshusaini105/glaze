import {
  EnrichmentData,
  EnrichmentField,
  EnrichedValue,
  SOURCE_CONFIDENCE,
  EnrichmentSource
} from '../types/enrichment';

export type GapAnalysis = {
  filled: EnrichmentField[];
  gaps: EnrichmentField[];
  lowConfidence: EnrichmentField[]; // fields with confidence < threshold
  averageConfidence: number;
  completionPercentage: number;
};

export type MergeResult = {
  merged: EnrichmentData;
  conflicts: {
    field: EnrichmentField;
    kept: EnrichedValue;
    discarded: EnrichedValue;
  }[];
};

const CONFIDENCE_THRESHOLD = 60; // Fields below this are considered low confidence

/**
 * Analyze which fields are filled vs gaps
 */
export const analyzeGaps = (
  data: EnrichmentData,
  requiredFields: EnrichmentField[]
): GapAnalysis => {
  const filled: EnrichmentField[] = [];
  const gaps: EnrichmentField[] = [];
  const lowConfidence: EnrichmentField[] = [];
  let totalConfidence = 0;

  for (const field of requiredFields) {
    const value = data[field];
    
    if (value && value.value !== null) {
      filled.push(field);
      totalConfidence += value.confidence;

      if (value.confidence < CONFIDENCE_THRESHOLD) {
        lowConfidence.push(field);
      }
    } else {
      gaps.push(field);
    }
  }

  return {
    filled,
    gaps,
    lowConfidence,
    averageConfidence: filled.length > 0 ? Math.round(totalConfidence / filled.length) : 0,
    completionPercentage: Math.round((filled.length / requiredFields.length) * 100)
  };
};

/**
 * Merge multiple EnrichmentData objects, preferring higher confidence values
 * Source ranking: website_scrape > linkedin_scrape > cache > search_result > ai_inference
 */
export const mergeEnrichmentData = (
  ...dataSets: Partial<EnrichmentData>[]
): MergeResult => {
  const merged: EnrichmentData = {};
  const conflicts: MergeResult['conflicts'] = [];

  for (const data of dataSets) {
    for (const [key, newValue] of Object.entries(data)) {
      const field = key as EnrichmentField;
      
      if (!newValue || newValue.value === null) continue;

      const existing = merged[field];

      if (!existing) {
        merged[field] = newValue;
        continue;
      }

      // Decide which to keep based on confidence and source
      const shouldReplace = shouldPreferNewValue(existing, newValue);

      if (shouldReplace) {
        conflicts.push({
          field,
          kept: newValue,
          discarded: existing
        });
        merged[field] = newValue;
      } else {
        conflicts.push({
          field,
          kept: existing,
          discarded: newValue
        });
      }
    }
  }

  return { merged, conflicts };
};

/**
 * Determine if new value should replace existing based on source ranking and confidence
 */
const shouldPreferNewValue = (existing: EnrichedValue, newValue: EnrichedValue): boolean => {
  const existingSourceRank = SOURCE_CONFIDENCE[existing.source] || 0;
  const newSourceRank = SOURCE_CONFIDENCE[newValue.source] || 0;

  // If new source is significantly more trusted (>10 points), prefer it
  if (newSourceRank > existingSourceRank + 10) {
    return true;
  }

  // If sources are similar trust level, compare confidence
  if (Math.abs(newSourceRank - existingSourceRank) <= 10) {
    return newValue.confidence > existing.confidence;
  }

  return false;
};

/**
 * Calculate overall confidence score for enrichment result
 */
export const calculateOverallConfidence = (
  data: EnrichmentData,
  requiredFields: EnrichmentField[]
): number => {
  let totalWeight = 0;
  let weightedConfidence = 0;

  // Weight fields differently (contact info is more valuable)
  const fieldWeights: Partial<Record<EnrichmentField, number>> = {
    person_email: 2,
    person_phone: 2,
    company_email: 1.5,
    company_phone: 1.5,
    company_name: 1.5,
    company_description: 1,
    company_employee_count: 1.2,
    company_revenue: 1.3
  };

  for (const field of requiredFields) {
    const value = data[field];
    const weight = fieldWeights[field] || 1;
    
    totalWeight += weight;

    if (value && value.value !== null) {
      weightedConfidence += value.confidence * weight;
    }
  }

  return totalWeight > 0 ? Math.round(weightedConfidence / totalWeight) : 0;
};

/**
 * Determine which paid services are needed for remaining gaps
 */
export const suggestPaidSources = (
  gaps: EnrichmentField[]
): { source: EnrichmentSource; fields: EnrichmentField[]; estimatedCostCents: number }[] => {
  const suggestions: { source: EnrichmentSource; fields: EnrichmentField[]; estimatedCostCents: number }[] = [];

  // Search for company data gaps
  const companyDataFields = gaps.filter((f) => 
    ['company_employee_count', 'company_revenue', 'company_funding', 'company_industry'].includes(f)
  );
  if (companyDataFields.length > 0) {
    suggestions.push({
      source: 'search_result',
      fields: companyDataFields,
      estimatedCostCents: 3 // 1-3 searches at ~$0.01 each
    });
  }

  return suggestions;
};

/**
 * Check if we should proceed to paid layer based on gaps and budget
 */
export const shouldUsePaidLayer = (
  gaps: EnrichmentField[],
  budgetCents: number,
  completionPercentage: number
): { proceed: boolean; reason: string } => {
  // If we have high completion, skip paid
  if (completionPercentage >= 90) {
    return { proceed: false, reason: 'High completion rate, paid layer not needed' };
  }

  // If no budget, skip paid
  if (budgetCents <= 0) {
    return { proceed: false, reason: 'No budget for paid lookups' };
  }

  // Check if any gaps are worth paying for
  const valuableGaps = gaps.filter((f) => 
    ['person_email', 'person_phone', 'company_revenue', 'company_employee_count'].includes(f)
  );

  if (valuableGaps.length === 0) {
    return { proceed: false, reason: 'No high-value gaps remaining' };
  }

  return { proceed: true, reason: `${valuableGaps.length} valuable gaps can be filled` };
};

/**
 * Build provenance trail for final result
 */
export const buildProvenance = (
  data: EnrichmentData
): { field: EnrichmentField; source: EnrichmentSource; confidence: number }[] => {
  return Object.entries(data)
    .filter(([_, value]) => value && value.value !== null)
    .map(([field, value]) => ({
      field: field as EnrichmentField,
      source: value!.source,
      confidence: value!.confidence
    }));
};
