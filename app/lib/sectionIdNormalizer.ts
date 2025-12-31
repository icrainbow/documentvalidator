/**
 * Section ID Normalization Utilities
 * 
 * Ensures consistent conversion between:
 * - API format: "section-N" (string)
 * - Internal format: N (number)
 * 
 * Stage 3.5: Hardening Pass
 */

import type { DirtyQueue, ScopePlan, ReviewMode } from './types/scopePlanning';
import type { Section } from './types/review';

/**
 * API representation of ScopePlan (string section IDs)
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

/**
 * Convert "section-N" to number N
 * Tolerates bare numbers like "3"
 * 
 * @returns number ID or null if invalid
 */
export function parseApiSectionId(id: string): number | null {
  // Try parsing as bare number first
  const asNumber = parseInt(id, 10);
  if (!isNaN(asNumber) && asNumber > 0) {
    return asNumber;
  }
  
  // Try parsing as "section-N" format
  const match = id.match(/^section-(\d+)$/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }
  
  return null;
}

/**
 * Convert number N to "section-N"
 */
export function toApiSectionId(id: number): string {
  return `section-${id}`;
}

/**
 * Validate dirtyQueue.entries[].sectionId exists in sections
 * Sanitizes queue by removing invalid entries
 * 
 * @returns validation result with sanitized queue
 */
export function validateSectionIds(
  dirtyQueue: DirtyQueue,
  sections: Section[]
): { valid: boolean; errors: string[]; sanitizedQueue: DirtyQueue } {
  const errors: string[] = [];
  const validSectionIds = new Set(
    sections.map(s => parseApiSectionId(s.id)).filter(id => id !== null)
  );
  
  const validEntries = dirtyQueue.entries.filter(entry => {
    if (!validSectionIds.has(entry.sectionId)) {
      errors.push(`Section ID ${entry.sectionId} not found in document`);
      return false;
    }
    return true;
  });
  
  // Rebuild queue with valid entries only
  const sanitizedQueue: DirtyQueue = {
    entries: validEntries,
    totalDirtyCount: validEntries.length,
    oldestEdit: validEntries.length > 0 
      ? validEntries.map(e => e.editedAt).sort()[0] 
      : null,
    newestEdit: validEntries.length > 0
      ? validEntries.map(e => e.editedAt).sort().reverse()[0]
      : null,
  };
  
  return {
    valid: errors.length === 0,
    errors,
    sanitizedQueue,
  };
}

/**
 * Convert Section[] to ScopePlanner format (number IDs)
 */
export function sectionsToScopePlannerFormat(sections: Section[]): Array<{
  id: number;
  title: string;
  content: string;
}> {
  return sections.map(s => {
    const numId = parseApiSectionId(s.id);
    if (numId === null) {
      throw new Error(`Invalid section ID format: ${s.id}`);
    }
    return {
      id: numId,
      title: s.title,
      content: s.content,
    };
  });
}

/**
 * Convert ScopePlan (number IDs) to API format (string IDs)
 */
export function normalizeScopePlanForApi(plan: ScopePlan): ScopePlanApi {
  return {
    reviewMode: plan.reviewMode,
    reasoning: plan.reasoning,
    sectionsToReview: plan.sectionsToReview.map(id => toApiSectionId(id)),
    relatedSectionsToCheck: plan.relatedSectionsToCheck.map(id => toApiSectionId(id)),
    agentsToInvoke: plan.agentsToInvoke,
    globalChecks: plan.globalChecks,
    estimatedDuration: plan.estimatedDuration,
    confidence: plan.confidence,
  };
}


