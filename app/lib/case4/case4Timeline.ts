/**
 * Case 4: Unified Timeline
 * 
 * Single source of truth for all animation timing.
 * All values in absolute milliseconds from t=0 (component mount).
 */

export interface ReasoningStep {
  atMs: number;
  icon: string;
  message: string;
}

export interface HeatmapUpdate {
  atMs: number;
  nodeId: string;
  riskLevel: 'green' | 'yellow' | 'orange' | 'red';
}

/**
 * Absolute timeline milestones (ms from component mount)
 */
export const CASE4_TIMELINE = {
  // Bulletin completion times
  BULLETIN_A_COMPLETE: 800,
  BULLETIN_B_COMPLETE: 1600,
  BULLETIN_C_COMPLETE: 2400,
  
  // State transitions
  STATE_ANALYZING: 2500,
  STATE_RISK_IDENTIFIED: 6000,
  STATE_BRIEFING_READY: 6500,
  
  // Reasoning steps
  STEP_1_ALL_LOADED: 2500,
  STEP_2_LATENCY_STACK: 3000,
  STEP_3_TIME_OVERLAP: 3800,
  STEP_4_RETRY_AMPLIFY: 4600,
  STEP_5_SLA_BREACH: 5400,
  
  // Heatmap updates
  HEATMAP_GATEWAY_YELLOW: 3000,
  HEATMAP_DB_ORANGE: 3800,
  HEATMAP_MAIL_RED: 5400
};

/**
 * Reasoning steps (ordered by time)
 */
export const REASONING_STEPS: ReasoningStep[] = [
  {
    atMs: 2500,
    icon: '✓',
    message: 'All bulletins ingested successfully'
  },
  {
    atMs: 3000,
    icon: '🔗',
    message: 'Detected latency stacking: +365ms cumulative (DB: 50ms, TLS: 15ms, Azure: 300ms)'
  },
  {
    atMs: 3800,
    icon: '⚠️',
    message: 'Time window collision detected: Jan 15 02:00-06:00 UTC overlap across 3 bulletins'
  },
  {
    atMs: 4600,
    icon: '🔄',
    message: 'Legacy client retry amplification: TLS failures causing 3x request multiplication'
  },
  {
    atMs: 5400,
    icon: '📊',
    message: 'SLA breach probability: 85% — Mail_Sync_Service timeout threshold (500ms) exceeded'
  }
];

/**
 * Heatmap node color updates (ordered by time)
 */
export const HEATMAP_UPDATES: HeatmapUpdate[] = [
  {
    atMs: 3000,
    nodeId: 'api_gateway',
    riskLevel: 'yellow'
  },
  {
    atMs: 3800,
    nodeId: 'database',
    riskLevel: 'orange'
  },
  {
    atMs: 5400,
    nodeId: 'mail_sync',
    riskLevel: 'red'
  }
];


