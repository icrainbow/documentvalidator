/**
 * Phase 4: Graph Validation Helpers
 */

import { ZodError } from 'zod';
import { GraphDefinitionSchema } from './schemas';
import type { GraphDefinition } from './types';

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors?: ValidationError[];
  parsed?: GraphDefinition;
}

/**
 * Normalize Zod errors to simple {path, message} format
 */
export function normalizeZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message
  }));
}

/**
 * Validate a graph definition using Zod schema
 * Always returns a result (never throws)
 */
export function validateGraphDefinition(draft: unknown): ValidationResult {
  try {
    const parsed = GraphDefinitionSchema.parse(draft);
    return {
      ok: true,
      parsed
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        errors: normalizeZodErrors(error)
      };
    }
    // Unexpected error
    return {
      ok: false,
      errors: [{
        path: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown validation error'
      }]
    };
  }
}

