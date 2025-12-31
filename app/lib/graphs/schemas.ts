/**
 * Phase 4: Zod Schemas for Graph Definition Validation
 */

import { z } from 'zod';

// Node type enum
export const NodeTypeSchema = z.enum(['agent', 'skill', 'router', 'gate', 'system']);

// Condition type enum
export const ConditionTypeSchema = z.enum(['always', 'state_check', 'output_check', 'reflection_decision']);

// Node binding schema
export const NodeBindingSchema = z.object({
  skillName: z.string().optional(),
  agentName: z.string().optional(),
  functionRef: z.string().optional()
}).optional();

// Graph node schema
export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  binding: NodeBindingSchema,
  config: z.record(z.any()).optional()
});

// Graph condition schema
export const GraphConditionSchema = z.object({
  type: ConditionTypeSchema,
  expression: z.string().optional(),
  description: z.string().min(1)
});

// Graph edge schema
export const GraphEdgeSchema = z.object({
  id: z.string().min(1),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  condition: GraphConditionSchema.optional(),
  label: z.string().optional()
});

// Metadata schema (optional)
export const GraphMetadataSchema = z.object({
  createdAt: z.string(),
  author: z.string(),
  changelog: z.array(z.string()).optional()
}).optional();

// Complete GraphDefinition schema
export const GraphDefinitionSchema = z.object({
  graphId: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semver
  checksum: z.string().length(12), // 12-char hex
  description: z.string().min(1),
  nodes: z.array(GraphNodeSchema).min(1),
  edges: z.array(GraphEdgeSchema),
  entryNodeId: z.string().min(1),
  metadata: GraphMetadataSchema
});

// API Request schemas
export const ValidateDraftRequestSchema = z.object({
  graphDraft: z.unknown()
});

export const SaveDraftRequestSchema = z.object({
  graphDraft: z.unknown(),
  base: z.object({
    version: z.string(),
    checksum: z.string()
  })
});

