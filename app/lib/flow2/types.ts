/**
 * Flow2 Type Definitions
 * Single source of truth for Flow2 (KYC Graph Review) data structures.
 */

export type Flow2DocTypeHint =
  | "Client Identity"
  | "Source of Wealth"
  | "Beneficial Ownership"
  | "Sanctions Screening"
  | "General Document";

export interface Flow2Document {
  doc_id: string;
  filename: string;
  doc_type_hint: Flow2DocTypeHint;
  text: string;
}

export interface HumanGateState {
  gateId: string;
  prompt: string;
  options: string[];
  context?: string;
  resumeToken: string; // JSON stringified token (NOT base64)
}

/**
 * Safe UUID generator for client-side use only.
 * MUST be called at runtime in client components, NOT at module scope.
 */
export function safeUuid(): string {
  // Check if crypto.randomUUID is available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Decode resume token from API response.
 * Token format: JSON string { runId, gateId, createdAt }
 */
export function decodeResumeToken(token: string): {
  runId: string;
  gateId: string;
  createdAt: number;
} {
  try {
    const parsed = JSON.parse(token);
    
    if (!parsed.runId || !parsed.gateId || typeof parsed.createdAt !== 'number') {
      throw new Error('Invalid token structure');
    }
    
    return {
      runId: parsed.runId,
      gateId: parsed.gateId,
      createdAt: parsed.createdAt,
    };
  } catch (error: any) {
    throw new Error(`Invalid resume token: ${error.message}`);
  }
}


