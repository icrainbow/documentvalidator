/**
 * Generic Topic Summaries Engine - Zod Schemas
 * 
 * Reusable validation schemas for any topic summary mode.
 */

import { z } from 'zod';

/**
 * Factory: Create LLM output schema for a specific topic list
 * (LLM returns topic_id, coverage, bullets, evidence - NO title)
 */
export function createLLMTopicSummarySchema(topicIds: readonly string[]) {
  if (topicIds.length === 0) {
    throw new Error('topicIds must not be empty');
  }
  
  return z.object({
    topic_id: z.enum(topicIds as [string, ...string[]]),
    coverage: z.enum(['PRESENT', 'WEAK', 'MISSING']),
    bullets: z.array(z.string()).min(1).max(8),
    evidence: z.array(
      z.object({
        quote: z.string().max(200),
        doc_id: z.string().optional(),
        image_url: z.string().optional(), // NEW: Support evidence images
      })
    ).optional(),
  });
}

/**
 * Generic Topic Summary (with server-injected title + optional risk links)
 */
export const GenericTopicSummarySchema = z.object({
  topic_id: z.string(),
  title: z.string(),
  coverage: z.enum(['PRESENT', 'WEAK', 'MISSING']),
  bullets: z.array(z.string()).min(1).max(8),
  evidence: z.array(
    z.object({
      quote: z.string().max(200),
      doc_id: z.string().optional(),
      image_url: z.string().optional(), // NEW: Support evidence images
    })
  ).optional(),
  linked_risks: z.array(
    z.object({
      risk_id: z.string(),
      severity: z.enum(['high', 'medium', 'low']),
      title: z.string(),
    })
  ).optional(),
});

/**
 * Success Response (always returns ALL configured topics)
 */
export const TopicSummariesSuccessSchema = z.object({
  ok: z.literal(true),
  run_id: z.string(),
  topic_summaries: z.array(GenericTopicSummarySchema),
  model_used: z.string().optional(),
  duration_ms: z.number().optional(),
});

/**
 * Error Response (graceful degradation)
 */
export const TopicSummariesErrorSchema = z.object({
  ok: z.literal(false),
  run_id: z.string().optional(),
  error: z.string(),
  fallback: z.literal(true).optional(),
});

/**
 * Union Response Schema (for both success and error)
 */
export const TopicSummariesResponseSchema = z.union([
  TopicSummariesSuccessSchema,
  TopicSummariesErrorSchema,
]);

export type TopicSummariesSuccess = z.infer<typeof TopicSummariesSuccessSchema>;
export type TopicSummariesError = z.infer<typeof TopicSummariesErrorSchema>;
export type TopicSummariesResponse = z.infer<typeof TopicSummariesResponseSchema>;

