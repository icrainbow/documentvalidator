/**
 * In-Memory Resume Store for Flow2 Human Gates
 * 
 * Stores partial graph state to enable resume after human decision.
 * TTL: 15 minutes
 * Max entries: 100
 */

import type { TopicSection, GraphTraceEvent } from './types';

export interface StoredRunState {
  runId: string;
  topicSections: TopicSection[];
  triageResult: {
    routePath: string;
    riskScore: number;
    riskBreakdown?: Record<string, number>;
    triageReasons?: string[];
  };
  previousEvents: GraphTraceEvent[];
  createdAt: number;
  expiresAt: number;
}

class ResumeStore {
  private store = new Map<string, StoredRunState>();
  private readonly TTL = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_ENTRIES = 100;

  /**
   * Save run state for later resume
   */
  save(
    runId: string,
    state: Omit<StoredRunState, 'createdAt' | 'expiresAt' | 'runId'>
  ): void {
    const now = Date.now();
    this.store.set(runId, {
      ...state,
      runId,
      createdAt: now,
      expiresAt: now + this.TTL,
    });

    // Cleanup expired + enforce max entries
    this.cleanup();
  }

  /**
   * Retrieve run state by ID
   * Returns null if not found or expired
   */
  get(runId: string): StoredRunState | null {
    const state = this.store.get(runId);
    if (!state) {
      return null;
    }

    // Check expiration
    if (Date.now() > state.expiresAt) {
      this.store.delete(runId);
      return null;
    }

    return state;
  }

  /**
   * Delete run state (called after successful resume)
   */
  delete(runId: string): void {
    this.store.delete(runId);
  }

  /**
   * Clean up expired entries and enforce max size
   */
  private cleanup(): void {
    const now = Date.now();

    // Remove expired
    for (const [runId, state] of Array.from(this.store.entries())) {
      if (now > state.expiresAt) {
        this.store.delete(runId);
      }
    }

    // Enforce max entries (remove oldest by createdAt)
    if (this.store.size > this.MAX_ENTRIES) {
      const sorted = Array.from(this.store.entries()).sort(
        (a, b) => a[1].createdAt - b[1].createdAt
      );

      const toRemove = sorted.slice(0, this.store.size - this.MAX_ENTRIES);
      for (const [runId] of toRemove) {
        this.store.delete(runId);
      }
    }
  }

  /**
   * Get current store stats (for debugging)
   */
  getStats(): { count: number; oldestAge: number | null } {
    this.cleanup(); // Clean before reporting

    if (this.store.size === 0) {
      return { count: 0, oldestAge: null };
    }

    const now = Date.now();
    const states = Array.from(this.store.values());
    const oldestAge = Math.max(...states.map((s) => now - s.createdAt));

    return { count: this.store.size, oldestAge };
  }
}

// Singleton instance
export const graphResumeStore = new ResumeStore();


