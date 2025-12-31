/**
 * Skills Framework - Type Definitions
 * 
 * Generic skill types for cross-flow skill-based dispatch.
 */

/**
 * Skill Definition
 * 
 * Describes a reusable skill that can be invoked across flows.
 */
export interface SkillDef {
  name: string;                     // e.g., "kyc.topic_assemble"
  description: string;              // Human-readable purpose
  ownerAgent: string;               // Agent responsible for this skill
  version?: string;                 // Semantic version (optional)
  tags?: string[];                  // Categorization tags (optional)
  inputSchemaSummary?: string;      // Brief input description (optional)
  outputSchemaSummary?: string;     // Brief output description (optional)
}

/**
 * Skill Invocation Record
 * 
 * Captures metadata about a single skill invocation.
 */
export interface SkillInvocation {
  id: string;                       // Unique invocation ID (UUID)
  skillName: string;                // Name of invoked skill
  ownerAgent: string;               // Agent that owns the skill
  startedAt: string;                // ISO8601 timestamp
  endedAt: string;                  // ISO8601 timestamp
  durationMs: number;               // Duration in milliseconds
  ok: boolean;                      // true if succeeded, false if error
  error?: string;                   // Error message (truncated, if ok=false)
  inputSummary: string;             // Truncated input summary (max 300 chars)
  outputSummary: string;            // Truncated output summary (max 300 chars)
  correlationId: string;            // Run ID or document ID for tracing
  transport: 'local' | 'remote';    // Execution transport (local for Phase A)
  target: string;                   // Execution target (e.g., "in-process")
}

