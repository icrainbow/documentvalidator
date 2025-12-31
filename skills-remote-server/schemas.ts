/**
 * Remote Skills Server - API Schemas
 * 
 * Zod schemas for request/response validation.
 */

import { z } from 'zod';

/**
 * Remote Skill Request Schema
 */
export const RemoteSkillRequestSchema = z.object({
  skill_name: z.string().min(1),
  input_summary: z.record(z.any()),
  context_hint: z.string().optional(),
  correlation_id: z.string().uuid(),
  test_mode: z.enum(['summary', 'full_content']).default('summary')
});

export type RemoteSkillRequest = z.infer<typeof RemoteSkillRequestSchema>;

/**
 * Remote Skill Response Schema
 */
export const RemoteSkillResponseSchema = z.object({
  ok: z.boolean(),
  skill_name: z.string(),
  output_summary: z.record(z.any()),
  duration_ms: z.number().int().nonnegative(),
  error: z.string().optional(),
  metadata: z.object({
    server_version: z.string(),
    executed_at: z.string()
  }).optional()
});

export type RemoteSkillResponse = z.infer<typeof RemoteSkillResponseSchema>;

