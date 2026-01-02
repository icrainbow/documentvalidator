/**
 * Flow2: KYC Topics Summary - SINGLE SOURCE OF TRUTH
 * 
 * Fixed 8-topic schema for LLM-based multi-document content summarization.
 * Enforces deterministic UI contract and canonical severity normalization.
 * 
 * PATCHES APPLIED:
 * - PATCH 1: RiskInputSchema with optional risks in RequestSchema
 * - PATCH 2: Response schema as union (Success | Error)
 * - PATCH 3: Canonical severity only in output (high/medium/low)
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════
// SSOT: FIXED 8 KYC TOPIC BUCKETS
// ═══════════════════════════════════════════════════════════════════════

export const KYC_TOPIC_IDS = [
  'customer_identity_profile',
  'relationship_purpose',
  'source_of_wealth',
  'source_of_funds',
  'ownership_ubo_control',
  'geography_jurisdiction_risk',
  'sanctions_pep_adverse_media',
  'transaction_patterns_expected_behavior',
] as const;

export type KYCTopicId = typeof KYC_TOPIC_IDS[number];

export const KYC_TOPIC_TITLES: Record<KYCTopicId, string> = {
  customer_identity_profile: 'Customer Identity & Profile',
  relationship_purpose: 'Relationship Purpose',
  source_of_wealth: 'Source of Wealth',
  source_of_funds: 'Source of Funds',
  ownership_ubo_control: 'Ownership, UBO & Control',
  geography_jurisdiction_risk: 'Geography & Jurisdiction Risk',
  sanctions_pep_adverse_media: 'Sanctions, PEP & Adverse Media',
  transaction_patterns_expected_behavior: 'Transaction Patterns & Expected Behavior',
};

// ═══════════════════════════════════════════════════════════════════════
// PATCH 1: RISK INPUT SCHEMA (Optional in Request)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Risk input from caller (currentIssues mapped to this shape)
 * Severity may include 'critical' or uppercase variants (normalized server-side)
 */
export const RiskInputSchema = z.object({
  risk_id: z.string().optional(), // May be derived server-side if missing
  severity: z.enum(['FAIL', 'WARNING', 'INFO', 'HIGH', 'MEDIUM', 'LOW', 'critical', 'high', 'medium', 'low']).optional(),
  category: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type RiskInput = z.infer<typeof RiskInputSchema>;

// ═══════════════════════════════════════════════════════════════════════
// LLM OUTPUT SCHEMA (NO TITLE - Server Injects)
// ═══════════════════════════════════════════════════════════════════════

/**
 * What the LLM returns per topic (title injected server-side from SSOT)
 */
export const LLMTopicSummarySchema = z.object({
  topic_id: z.enum(KYC_TOPIC_IDS),
  coverage: z.enum(['PRESENT', 'WEAK', 'MISSING']),
  bullets: z.array(z.string()).min(1).max(8), // Server enforces 1-6, allows up to 8
  evidence: z.array(
    z.object({
      quote: z.string().max(200),
      doc_id: z.string().optional(),
    })
  ).optional(),
});

export type LLMTopicSummary = z.infer<typeof LLMTopicSummarySchema>;

// ═══════════════════════════════════════════════════════════════════════
// API OUTPUT SCHEMA (WITH TITLE + LINKED RISKS)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Final TopicSummary sent to UI (server-injected title + risk links)
 * PATCH 3: linked_risks.severity uses CANONICAL values only
 */
export const TopicSummarySchema = z.object({
  topic_id: z.enum(KYC_TOPIC_IDS),
  title: z.string(), // ✅ REQUIRED: Server-injected from KYC_TOPIC_TITLES
  coverage: z.enum(['PRESENT', 'WEAK', 'MISSING']),
  bullets: z.array(z.string()).min(1).max(8),
  evidence: z.array(
    z.object({
      quote: z.string().max(200),
      doc_id: z.string().optional(),
    })
  ).optional(),
  linked_risks: z.array(
    z.object({
      risk_id: z.string(),
      severity: z.enum(['high', 'medium', 'low']), // ✅ CANONICAL ONLY (lowercase)
      title: z.string(),
    })
  ).optional(),
});

export type TopicSummary = z.infer<typeof TopicSummarySchema>;

// ═══════════════════════════════════════════════════════════════════════
// PATCH 1: REQUEST SCHEMA (WITH OPTIONAL RISKS)
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/flow2/topic-summaries request body
 */
export const RequestSchema = z.object({
  run_id: z.string(),
  documents: z.array(
    z.object({
      doc_id: z.string(),
      filename: z.string(),
      text: z.string(),
    })
  ).min(1),
  topics: z.array(z.enum(KYC_TOPIC_IDS)).length(8), // ✅ EXPLICIT: Must be exactly 8
  risks: z.array(RiskInputSchema).optional(), // ✅ PATCH 1: Optional risks for linking
});

export type TopicSummariesRequest = z.infer<typeof RequestSchema>;

// ═══════════════════════════════════════════════════════════════════════
// PATCH 2: RESPONSE SCHEMA AS UNION (SUCCESS | ERROR)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Success response: Always returns exactly 8 topic summaries
 */
export const TopicSummariesSuccessSchema = z.object({
  ok: z.literal(true),
  run_id: z.string(),
  topic_summaries: z.array(TopicSummarySchema).length(8), // ✅ Always 8 on success
  model_used: z.string().optional(),
  duration_ms: z.number().optional(),
});

export type TopicSummariesSuccess = z.infer<typeof TopicSummariesSuccessSchema>;

/**
 * Error response: LLM failed or API key missing
 */
export const TopicSummariesErrorSchema = z.object({
  ok: z.literal(false),
  run_id: z.string().optional(),
  error: z.string(),
  fallback: z.literal(true).optional(), // Indicates graceful degradation
});

export type TopicSummariesError = z.infer<typeof TopicSummariesErrorSchema>;

/**
 * ✅ PATCH 2: Union type for all possible responses
 */
export const TopicSummariesResponseSchema = z.union([
  TopicSummariesSuccessSchema,
  TopicSummariesErrorSchema,
]);

export type TopicSummariesResponse = z.infer<typeof TopicSummariesResponseSchema>;

