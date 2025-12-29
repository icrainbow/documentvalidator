/**
 * Review Configuration Management
 * Handles storage and retrieval of review configuration
 */

import type { AgentCategory } from './agentVariants';
import type { ClientContext } from './reviewProfiles';

export interface ReviewConfig {
  profileId: string;
  selectedAgents: {
    compliance: string;
    evaluation?: string;
    rewrite?: string;
  };
  context?: ClientContext;
  // Validation fields (additive, backward compatible)
  validationStatus?: 'valid' | 'required' | 'failed';
  validationErrors?: string[];
  validationWarnings?: string[];
  lastValidatedAt?: string;
  // Locking policy (additive, backward compatible)
  locked?: {
    compliance?: boolean;
    evaluation?: boolean;
    rewrite?: boolean;
  };
}

/**
 * Get default review config (matches current behavior)
 */
export function getDefaultReviewConfig(): ReviewConfig {
  return {
    profileId: 'retail-standard',
    selectedAgents: {
      compliance: 'compliance-standard',
      evaluation: 'evaluation-standard',
      rewrite: 'rewrite-standard'
    }
  };
}

/**
 * Save review config to localStorage
 */
export function saveReviewConfig(docId: string, config: ReviewConfig): void {
  if (typeof window === 'undefined') return;
  
  const key = `doc:${docId}:reviewConfig`;
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch (error) {
    console.error('[reviewConfig] Failed to save:', error);
  }
}

/**
 * Load review config from localStorage
 */
export function loadReviewConfig(docId: string): ReviewConfig | null {
  if (typeof window === 'undefined') return null;
  
  const key = `doc:${docId}:reviewConfig`;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    return JSON.parse(stored) as ReviewConfig;
  } catch (error) {
    console.error('[reviewConfig] Failed to load:', error);
    return null;
  }
}

/**
 * Delete review config from localStorage
 */
export function deleteReviewConfig(docId: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `doc:${docId}:reviewConfig`;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[reviewConfig] Failed to delete:', error);
  }
}

