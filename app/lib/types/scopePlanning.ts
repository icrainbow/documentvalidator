/**
 * Type definitions for Agent-Driven Batch Re-Review with Scope Planning
 * 
 * Stage 1: Core Infrastructure
 * Flow 1 Only - No Flow2, No LangGraph
 */

/**
 * Edit magnitude classification
 */
export type EditMagnitude = 'light' | 'moderate' | 'heavy';

/**
 * Review mode determined by Scope Planner
 */
export type ReviewMode = 'section-only' | 'cross-section' | 'full-document';

/**
 * Entry in the dirty sections queue
 */
export interface DirtyQueueEntry {
  sectionId: number;
  editedAt: string; // ISO timestamp
  editMagnitude: EditMagnitude;
  previousContentHash: string; // For comparison
  currentContentHash: string;
}

/**
 * Dirty sections queue state
 */
export interface DirtyQueue {
  entries: DirtyQueueEntry[];
  totalDirtyCount: number;
  oldestEdit: string | null; // ISO timestamp
  newestEdit: string | null; // ISO timestamp
}

/**
 * Scope plan decision made by agent
 * 
 * NOTE: Internal representation uses numeric section IDs.
 * API clients must convert to/from "section-N" strings using sectionIdNormalizer.
 */
export interface ScopePlan {
  reviewMode: ReviewMode;
  reasoning: string;
  sectionsToReview: number[]; // Section IDs to review (numeric format)
  relatedSectionsToCheck: number[]; // Adjacent/related sections for cross-section mode (numeric format)
  agentsToInvoke: string[]; // e.g., ["compliance", "evaluation"]
  globalChecks: string[]; // e.g., ["disclaimer_presence", "cross_section_contradiction"]
  estimatedDuration: string; // e.g., "15-30 seconds"
  confidence: number; // 0-1 (always 1.0 for deterministic, <1.0 if using LLM)
}

/**
 * Input to scope planner
 */
export interface ScopePlannerInput {
  dirtyQueue: DirtyQueue;
  allSections: {
    id: number;
    title: string;
    content: string;
    status?: 'compliant' | 'non-compliant' | 'unreviewed';
  }[];
  documentMetadata?: {
    totalSections: number;
    hasDisclaimers: boolean;
    hasHighRiskSections: boolean;
  };
}

/**
 * Global check result (for future use)
 */
export interface GlobalCheckResult {
  checkName: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  affectedSections?: number[];
}

/**
 * Complete scope planning result with trace
 */
export interface ScopePlanningResult {
  scopePlan: ScopePlan;
  analysis: {
    dirtyCount: number;
    heavyEdits: number;
    highRiskSections: boolean;
    adjacentSections: number[];
  };
  timestamp: string;
}

/**
 * API representation of ScopePlan (string section IDs)
 * Used in batch review responses to clients
 */
export interface ScopePlanApi {
  reviewMode: ReviewMode;
  reasoning: string;
  sectionsToReview: string[]; // "section-N" format
  relatedSectionsToCheck: string[]; // "section-N" format
  agentsToInvoke: string[];
  globalChecks: string[];
  estimatedDuration: string;
  confidence: number;
}

