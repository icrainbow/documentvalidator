/**
 * Case 4: Strict Timeline-Driven State Machine (V2)
 * 
 * Single source of truth for ALL Case4 animation state.
 * NO component-level timers. NO self-updating UI.
 * Everything driven by deterministic event timeline.
 */

// ============================================================
// TYPES
// ============================================================

export type Case4Phase = 
  | 'idle'
  | 'ingesting'      // Bulletins loading
  | 'analyzing'      // Reasoning trace appearing
  | 'risk_updates'   // Heatmap nodes changing color
  | 'briefing_ready'; // Final briefings available

export type BulletinStatus = 'queued' | 'loading' | 'done';

export type NodeSeverity = 'green' | 'yellow' | 'orange' | 'red';

export interface BulletinState {
  id: string;
  status: BulletinStatus;
  completedAt?: number; // timestamp when done
}

export interface ReasoningStep {
  index: number;
  icon: string;
  message: string;
  appearedAt: number; // ms
}

export interface HeatmapNodeState {
  nodeId: string;
  baseLatencyMs: number;
  deltaMs: number;
  deltaVisible: boolean; // only show delta after its reasoning step
  severity: NodeSeverity;
  pulseActive: boolean;
}

export interface Case4TimelineState {
  phase: Case4Phase;
  elapsedMs: number;
  bulletins: Record<string, BulletinState>;
  reasoningSteps: ReasoningStep[];
  heatmapNodes: Record<string, HeatmapNodeState>;
  briefingsReady: boolean;
}

// ============================================================
// TIMELINE EVENTS (ordered by time)
// ============================================================

export type TimelineEventType =
  | 'PHASE_SET'
  | 'BULLETIN_START'
  | 'BULLETIN_DONE'
  | 'REASONING_ADD'
  | 'HEATMAP_UPDATE'
  | 'BRIEFINGS_READY';

export interface TimelineEvent {
  atMs: number;
  type: TimelineEventType;
  payload?: any;
}

/**
 * ABSOLUTE TIMELINE (ms from t=0)
 * 
 * Design principles:
 * - Sequential bulletin ingestion (800ms each)
 * - Reasoning steps appear BEFORE their corresponding heatmap updates
 * - Each reasoning step triggers exactly one heatmap update
 * - Briefings appear only after all analysis complete
 */
export const CASE4_TIMELINE_EVENTS: TimelineEvent[] = [
  // Phase 0: Initialize (t=0)
  { atMs: 0, type: 'PHASE_SET', payload: { phase: 'ingesting' } },
  
  // Bulletin A: Oracle (t=0-800ms)
  { atMs: 0, type: 'BULLETIN_START', payload: { bulletinId: 'ITB-2026-001' } },
  { atMs: 800, type: 'BULLETIN_DONE', payload: { bulletinId: 'ITB-2026-001' } },
  
  // Bulletin B: TLS (t=900-1600ms)
  { atMs: 900, type: 'BULLETIN_START', payload: { bulletinId: 'ITB-2026-002' } },
  { atMs: 1600, type: 'BULLETIN_DONE', payload: { bulletinId: 'ITB-2026-002' } },
  
  // Bulletin C: Azure (t=1700-2400ms)
  { atMs: 1700, type: 'BULLETIN_START', payload: { bulletinId: 'ITB-2026-003' } },
  { atMs: 2400, type: 'BULLETIN_DONE', payload: { bulletinId: 'ITB-2026-003' } },
  
  // Phase 1: Analysis begins (t=2500ms)
  { atMs: 2500, type: 'PHASE_SET', payload: { phase: 'analyzing' } },
  { atMs: 2500, type: 'REASONING_ADD', payload: {
    index: 0,
    icon: '✓',
    message: 'All bulletins ingested successfully'
  }},
  
  // Reasoning Step 1 → Heatmap Update 1: TLS adds +15ms to API Gateway (t=3000ms)
  { atMs: 3000, type: 'REASONING_ADD', payload: {
    index: 1,
    icon: '🔗',
    message: 'Detected latency stacking: +365ms cumulative (DB: 50ms, TLS: 15ms, Azure: 300ms)'
  }},
  { atMs: 3050, type: 'PHASE_SET', payload: { phase: 'risk_updates' } },
  { atMs: 3100, type: 'HEATMAP_UPDATE', payload: {
    nodeId: 'api_gateway',
    deltaMs: 15,
    severity: 'yellow' as NodeSeverity
  }},
  
  // Reasoning Step 2 → Heatmap Update 2: Time window collision (t=3800ms)
  { atMs: 3800, type: 'REASONING_ADD', payload: {
    index: 2,
    icon: '⚠️',
    message: 'Time window collision detected: Jan 15 02:00-06:00 UTC overlap across 3 bulletins'
  }},
  
  // Reasoning Step 3 → Heatmap Update 3: Oracle adds +50ms to DB (t=3900ms)
  { atMs: 3900, type: 'HEATMAP_UPDATE', payload: {
    nodeId: 'database',
    deltaMs: 50,
    severity: 'orange' as NodeSeverity
  }},
  
  // Reasoning Step 4 → Retry amplification (t=4600ms)
  { atMs: 4600, type: 'REASONING_ADD', payload: {
    index: 3,
    icon: '🔄',
    message: 'Legacy client retry amplification: TLS failures causing 3x request multiplication'
  }},
  
  // Reasoning Step 5 → Heatmap Update 4: Azure adds +300ms to Mail Sync (CRITICAL) (t=5400ms)
  { atMs: 5400, type: 'REASONING_ADD', payload: {
    index: 4,
    icon: '📊',
    message: 'SLA breach probability: 85% — Mail_Sync_Service timeout threshold (500ms) exceeded'
  }},
  { atMs: 5450, type: 'HEATMAP_UPDATE', payload: {
    nodeId: 'mail_sync',
    deltaMs: 300,
    severity: 'red' as NodeSeverity,
    pulseActive: true
  }},
  
  // Phase 2: Briefings ready (t=6500ms)
  { atMs: 6500, type: 'PHASE_SET', payload: { phase: 'briefing_ready' } },
  { atMs: 6500, type: 'BRIEFINGS_READY', payload: {} }
];

// ============================================================
// INITIAL STATE
// ============================================================

export function case4InitialState(): Case4TimelineState {
  return {
    phase: 'idle',
    elapsedMs: 0,
    bulletins: {
      'ITB-2026-001': { id: 'ITB-2026-001', status: 'queued' },
      'ITB-2026-002': { id: 'ITB-2026-002', status: 'queued' },
      'ITB-2026-003': { id: 'ITB-2026-003', status: 'queued' }
    },
    reasoningSteps: [],
    heatmapNodes: {
      'client_request': {
        nodeId: 'client_request',
        baseLatencyMs: 5,
        deltaMs: 0,
        deltaVisible: false,
        severity: 'green',
        pulseActive: false
      },
      'api_gateway': {
        nodeId: 'api_gateway',
        baseLatencyMs: 20,
        deltaMs: 0,
        deltaVisible: false,
        severity: 'green',
        pulseActive: false
      },
      'authentication': {
        nodeId: 'authentication',
        baseLatencyMs: 30,
        deltaMs: 0,
        deltaVisible: false,
        severity: 'green',
        pulseActive: false
      },
      'app_logic': {
        nodeId: 'app_logic',
        baseLatencyMs: 40,
        deltaMs: 0,
        deltaVisible: false,
        severity: 'green',
        pulseActive: false
      },
      'database': {
        nodeId: 'database',
        baseLatencyMs: 60,
        deltaMs: 0,
        deltaVisible: false,
        severity: 'green',
        pulseActive: false
      },
      'mail_sync': {
        nodeId: 'mail_sync',
        baseLatencyMs: 150,
        deltaMs: 0,
        deltaVisible: false,
        severity: 'green',
        pulseActive: false
      },
      'response': {
        nodeId: 'response',
        baseLatencyMs: 10,
        deltaMs: 0,
        deltaVisible: false,
        severity: 'green',
        pulseActive: false
      }
    },
    briefingsReady: false
  };
}

// ============================================================
// REDUCER (pure state transitions)
// ============================================================

export function applyCase4Event(
  state: Case4TimelineState,
  event: TimelineEvent
): Case4TimelineState {
  const { type, payload, atMs } = event;
  
  switch (type) {
    case 'PHASE_SET': {
      return {
        ...state,
        phase: payload.phase
      };
    }
    
    case 'BULLETIN_START': {
      const { bulletinId } = payload;
      return {
        ...state,
        bulletins: {
          ...state.bulletins,
          [bulletinId]: {
            ...state.bulletins[bulletinId],
            status: 'loading'
          }
        }
      };
    }
    
    case 'BULLETIN_DONE': {
      const { bulletinId } = payload;
      return {
        ...state,
        bulletins: {
          ...state.bulletins,
          [bulletinId]: {
            ...state.bulletins[bulletinId],
            status: 'done',
            completedAt: atMs
          }
        }
      };
    }
    
    case 'REASONING_ADD': {
      const { index, icon, message } = payload;
      
      // Idempotency: don't add duplicate steps
      if (state.reasoningSteps.some(s => s.index === index)) {
        return state;
      }
      
      return {
        ...state,
        reasoningSteps: [
          ...state.reasoningSteps,
          {
            index,
            icon,
            message,
            appearedAt: atMs
          }
        ]
      };
    }
    
    case 'HEATMAP_UPDATE': {
      const { nodeId, deltaMs, severity, pulseActive = false } = payload;
      
      const node = state.heatmapNodes[nodeId];
      if (!node) return state; // Guard: node not found
      
      return {
        ...state,
        heatmapNodes: {
          ...state.heatmapNodes,
          [nodeId]: {
            ...node,
            deltaMs: deltaMs ?? node.deltaMs,
            deltaVisible: true, // CRITICAL: only show delta after update
            severity: severity ?? node.severity,
            pulseActive: pulseActive ?? node.pulseActive
          }
        }
      };
    }
    
    case 'BRIEFINGS_READY': {
      return {
        ...state,
        briefingsReady: true
      };
    }
    
    default:
      return state;
  }
}

