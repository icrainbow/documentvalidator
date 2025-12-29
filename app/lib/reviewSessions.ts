/**
 * Review Session Management
 * Lightweight persistence for continuing existing reviews
 */

export interface ReviewSession {
  id: string;
  title: string;
  lastUpdated: string; // ISO string
  sections?: any[];
  issues?: any[];
  signOff?: any;
  orchestrationResult?: any;
  flowId?: string;
}

export interface ReviewSessionMetadata {
  id: string;
  title: string;
  lastUpdated: string;
  sectionCount?: number;
  issueCount?: number;
  status?: string;
}

const SESSIONS_KEY = 'review_sessions';
const MAX_RECENT_SESSIONS = 10;

/**
 * Generate a new review session ID
 */
export function generateSessionId(): string {
  return `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Save or update a review session
 */
export function saveReviewSession(session: ReviewSession): void {
  try {
    if (typeof window === 'undefined') return;
    // Load existing sessions
    const existing = loadAllSessions();
    
    // Update or add this session
    const index = existing.findIndex(s => s.id === session.id);
    if (index >= 0) {
      existing[index] = session;
    } else {
      existing.unshift(session); // Add to beginning
    }
    
    // Keep only MAX_RECENT_SESSIONS
    const trimmed = existing.slice(0, MAX_RECENT_SESSIONS);
    
    // Save back
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save review session:', error);
  }
}

/**
 * Load a specific review session
 */
export function loadReviewSession(sessionId: string): ReviewSession | null {
  try {
    const sessions = loadAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    console.error('Failed to load review session:', error);
    return null;
  }
}

/**
 * Load all review sessions
 */
export function loadAllSessions(): ReviewSession[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }
}

/**
 * Get metadata for recent sessions (for listing)
 */
export function getRecentSessionsMetadata(): ReviewSessionMetadata[] {
  const sessions = loadAllSessions();
  return sessions.map(s => ({
    id: s.id,
    title: s.title,
    lastUpdated: s.lastUpdated,
    sectionCount: s.sections?.length || 0,
    issueCount: s.issues?.length || 0,
    status: s.signOff ? 'Signed' : s.issues && s.issues.length > 0 ? 'In Progress' : 'New'
  }));
}

/**
 * Delete a review session
 */
export function deleteReviewSession(sessionId: string): void {
  try {
    if (typeof window === 'undefined') return;
    const sessions = loadAllSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete review session:', error);
  }
}

/**
 * Create a new session from uploaded document
 */
export function createNewSession(title: string): ReviewSession {
  return {
    id: generateSessionId(),
    title,
    lastUpdated: new Date().toISOString(),
    sections: [],
    issues: [],
    signOff: null
  };
}


