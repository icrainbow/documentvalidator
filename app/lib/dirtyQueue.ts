/**
 * Dirty Sections Queue Management
 * 
 * Tracks user edits cumulatively until batch re-review is triggered.
 * Persists queue in sessionStorage for page refresh resilience.
 * 
 * Stage 1: Core Infrastructure
 * Flow 1 Only - No Flow2, No LangGraph
 */

import type { DirtyQueue, DirtyQueueEntry, EditMagnitude } from './types/scopePlanning';

/**
 * Create simple hash for content comparison
 */
function simpleHash(content: string): string {
  // Simple deterministic hash based on content length and first/last chars
  const len = content.length;
  const first = content.substring(0, 50);
  const last = content.substring(Math.max(0, len - 50));
  return `${len}-${first}-${last}`;
}

/**
 * Calculate edit magnitude based on content change
 * 
 * Algorithm:
 * - Light: < 20% content change (typos, minor edits)
 * - Moderate: 20-50% change (paragraph rewrites)
 * - Heavy: > 50% change or structural changes
 */
export function calculateEditMagnitude(
  previousContent: string,
  currentContent: string
): EditMagnitude {
  const prevLen = previousContent.length;
  const currLen = currentContent.length;
  
  if (prevLen === 0 && currLen === 0) return 'light';
  
  // Calculate character-level difference ratio
  const maxLen = Math.max(prevLen, currLen);
  const minLen = Math.min(prevLen, currLen);
  const lengthDiff = maxLen - minLen;
  const lengthChangeRatio = lengthDiff / maxLen;
  
  // Simple Levenshtein-style comparison (character difference)
  let diffChars = 0;
  const compareLen = Math.min(prevLen, currLen);
  for (let i = 0; i < compareLen; i++) {
    if (previousContent[i] !== currentContent[i]) {
      diffChars++;
    }
  }
  diffChars += Math.abs(prevLen - currLen); // Add length difference
  
  const changeRatio = diffChars / maxLen;
  
  // Classification thresholds
  if (changeRatio < 0.20) return 'light';
  if (changeRatio < 0.50) return 'moderate';
  return 'heavy';
}

/**
 * Create empty dirty queue
 */
export function createEmptyQueue(): DirtyQueue {
  return {
    entries: [],
    totalDirtyCount: 0,
    oldestEdit: null,
    newestEdit: null,
  };
}

/**
 * Add section to dirty queue
 * If section already in queue, update it
 */
export function addToDirtyQueue(
  queue: DirtyQueue,
  sectionId: number,
  previousContent: string,
  currentContent: string
): DirtyQueue {
  const now = new Date().toISOString();
  const editMagnitude = calculateEditMagnitude(previousContent, currentContent);
  
  const newEntry: DirtyQueueEntry = {
    sectionId,
    editedAt: now,
    editMagnitude,
    previousContentHash: simpleHash(previousContent),
    currentContentHash: simpleHash(currentContent),
  };
  
  // Check if section already in queue
  const existingIndex = queue.entries.findIndex(e => e.sectionId === sectionId);
  
  let newEntries: DirtyQueueEntry[];
  if (existingIndex >= 0) {
    // Update existing entry
    newEntries = [...queue.entries];
    newEntries[existingIndex] = newEntry;
  } else {
    // Add new entry
    newEntries = [...queue.entries, newEntry];
  }
  
  // Update timestamps
  const allTimestamps = newEntries.map(e => e.editedAt);
  const sortedTimestamps = allTimestamps.sort();
  
  return {
    entries: newEntries,
    totalDirtyCount: newEntries.length,
    oldestEdit: sortedTimestamps[0] || null,
    newestEdit: sortedTimestamps[sortedTimestamps.length - 1] || null,
  };
}

/**
 * Remove section from dirty queue
 */
export function removeFromDirtyQueue(
  queue: DirtyQueue,
  sectionId: number
): DirtyQueue {
  const newEntries = queue.entries.filter(e => e.sectionId !== sectionId);
  
  if (newEntries.length === 0) {
    return createEmptyQueue();
  }
  
  const allTimestamps = newEntries.map(e => e.editedAt);
  const sortedTimestamps = allTimestamps.sort();
  
  return {
    entries: newEntries,
    totalDirtyCount: newEntries.length,
    oldestEdit: sortedTimestamps[0] || null,
    newestEdit: sortedTimestamps[sortedTimestamps.length - 1] || null,
  };
}

/**
 * Clear entire dirty queue
 */
export function clearDirtyQueue(): DirtyQueue {
  return createEmptyQueue();
}

/**
 * Get queue statistics for display
 */
export function getQueueStats(queue: DirtyQueue): {
  totalCount: number;
  lightCount: number;
  moderateCount: number;
  heavyCount: number;
  oldestEditAge: string | null; // Human-readable
} {
  const lightCount = queue.entries.filter(e => e.editMagnitude === 'light').length;
  const moderateCount = queue.entries.filter(e => e.editMagnitude === 'moderate').length;
  const heavyCount = queue.entries.filter(e => e.editMagnitude === 'heavy').length;
  
  let oldestEditAge: string | null = null;
  if (queue.oldestEdit) {
    const ageMs = Date.now() - new Date(queue.oldestEdit).getTime();
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    
    if (ageHours > 0) {
      oldestEditAge = `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
    } else if (ageMinutes > 0) {
      oldestEditAge = `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''} ago`;
    } else {
      oldestEditAge = 'just now';
    }
  }
  
  return {
    totalCount: queue.totalDirtyCount,
    lightCount,
    moderateCount,
    heavyCount,
    oldestEditAge,
  };
}

/**
 * Check if section is in dirty queue
 */
export function isSectionDirty(queue: DirtyQueue, sectionId: number): boolean {
  return queue.entries.some(e => e.sectionId === sectionId);
}

/**
 * Get dirty section entry
 */
export function getDirtyEntry(queue: DirtyQueue, sectionId: number): DirtyQueueEntry | null {
  return queue.entries.find(e => e.sectionId === sectionId) || null;
}

// ============================================================
// SESSION STORAGE PERSISTENCE
// ============================================================

/**
 * Save dirty queue to sessionStorage
 */
export function saveDirtyQueue(docId: string, queue: DirtyQueue): void {
  try {
    if (typeof window === 'undefined') return; // SSR guard
    const key = `doc:${docId}:dirty_queue`;
    sessionStorage.setItem(key, JSON.stringify(queue));
    console.log('[DirtyQueue] Queue saved:', queue.totalDirtyCount, 'dirty sections');
  } catch (error) {
    console.error('[DirtyQueue] Failed to save queue:', error);
  }
}

/**
 * Load dirty queue from sessionStorage
 */
export function loadDirtyQueue(docId: string): DirtyQueue {
  try {
    if (typeof window === 'undefined') return createEmptyQueue(); // SSR guard
    const key = `doc:${docId}:dirty_queue`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) {
      console.log('[DirtyQueue] No saved queue found, creating empty');
      return createEmptyQueue();
    }
    
    const parsed: DirtyQueue = JSON.parse(stored);
    
    // Validate structure
    if (!parsed.entries || !Array.isArray(parsed.entries)) {
      console.warn('[DirtyQueue] Invalid queue structure, creating empty');
      return createEmptyQueue();
    }
    
    console.log('[DirtyQueue] Queue loaded:', parsed.totalDirtyCount, 'dirty sections');
    return parsed;
  } catch (error) {
    console.error('[DirtyQueue] Failed to load queue:', error);
    return createEmptyQueue();
  }
}

/**
 * Delete dirty queue from sessionStorage
 */
export function deleteDirtyQueue(docId: string): void {
  try {
    if (typeof window === 'undefined') return; // SSR guard
    const key = `doc:${docId}:dirty_queue`;
    sessionStorage.removeItem(key);
    console.log('[DirtyQueue] Queue deleted');
  } catch (error) {
    console.error('[DirtyQueue] Failed to delete queue:', error);
  }
}


