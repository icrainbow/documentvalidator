/**
 * Flow2: Resume Validation Helpers
 * 
 * Validates resume requests for checkpoint-based human-in-the-loop.
 */

export interface ResumeRequest {
  execution_mode: 'resume';
  checkpoint_run_id: string;
  checkpoint_human_decision: {
    node_id: string;
    decision: 'approve' | 'reject';
    comment?: string;
  };
}

export interface ValidationResult {
  ok: boolean;
  errors?: string[];
  data?: any;
}

/**
 * Validate resume request structure
 */
export function validateResumeRequest(body: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: ['Request body must be an object'] };
  }
  
  const req = body as any;
  
  // Validate checkpoint_run_id
  if (!req.checkpoint_run_id || typeof req.checkpoint_run_id !== 'string') {
    errors.push('checkpoint_run_id is required and must be a string');
  } else {
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.checkpoint_run_id)) {
      errors.push('checkpoint_run_id must be a valid UUID v4');
    }
  }
  
  // Validate human decision
  if (!req.checkpoint_human_decision) {
    errors.push('checkpoint_human_decision is required');
  } else {
    const decisionErrors = validateHumanDecision(req.checkpoint_human_decision);
    if (!decisionErrors.ok) {
      errors.push(...(decisionErrors.errors || []));
    }
  }
  
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  
  return { ok: true, data: req as ResumeRequest };
}

/**
 * Validate human decision structure
 */
export function validateHumanDecision(decision: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!decision || typeof decision !== 'object') {
    return { ok: false, errors: ['Human decision must be an object'] };
  }
  
  const dec = decision as any;
  
  // Validate node_id
  if (!dec.node_id || typeof dec.node_id !== 'string') {
    errors.push('node_id is required and must be a string');
  }
  
  // Validate decision
  if (!dec.decision) {
    errors.push('decision is required');
  } else if (dec.decision !== 'approve' && dec.decision !== 'reject') {
    errors.push('decision must be "approve" or "reject"');
  }
  
  // Validate comment (optional)
  if (dec.comment !== undefined && typeof dec.comment !== 'string') {
    errors.push('comment must be a string if provided');
  }
  
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  
  return { ok: true, data: dec };
}

