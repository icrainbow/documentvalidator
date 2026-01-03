/**
 * Impact Simulator: State Machine Reducer
 * 
 * Manages all simulation state transitions with strict determinism.
 */

import { ImpactScenario, ImpactStats } from './demoImpactData';

// ============================================================
// TYPES
// ============================================================

export type SimulatorPhase =
  | 'idle'
  | 'await_confirm'      // Waiting for user YES
  | 'await_choice'       // Waiting for scenario 1-4 selection
  | 'running'            // Timed reveal animation in progress
  | 'done';              // Complete, showing final results

export type TimelineStepStatus = 'pending' | 'running' | 'done';

export interface TimelineStep {
  id: string;
  label: string;
  status: TimelineStepStatus;
}

export interface SimulatorState {
  active: boolean;
  phase: SimulatorPhase;
  selectedScenarioId: string | null;
  timelineSteps: TimelineStep[];
  revealedSystems: string[];       // system IDs revealed so far
  revealedBusinessScenarios: string[]; // business scenario IDs revealed
  impactStats: ImpactStats | null;
  logs: string[];                   // Narrative log lines
}

// ============================================================
// ACTIONS
// ============================================================

export type SimulatorAction =
  | { type: 'START' }
  | { type: 'CONFIRM_YES' }
  | { type: 'CHOOSE_SCENARIO'; payload: { scenarioId: string } }
  | { type: 'TICK_REVEAL_SYSTEM'; payload: { systemId: string } }
  | { type: 'TICK_REVEAL_BUSINESS_SCENARIO'; payload: { scenarioId: string } }
  | { type: 'TICK_TIMELINE_STEP'; payload: { stepId: string; status: TimelineStepStatus } }
  | { type: 'SET_IMPACT_STATS'; payload: { stats: ImpactStats } }
  | { type: 'COMPLETE' }
  | { type: 'EXIT' }
  | { type: 'RESET' };

// ============================================================
// INITIAL STATE
// ============================================================

export function getInitialSimulatorState(): SimulatorState {
  return {
    active: false,
    phase: 'idle',
    selectedScenarioId: null,
    timelineSteps: [
      { id: 'step_init', label: 'Initialize simulation', status: 'pending' },
      { id: 'step_scenario', label: 'Scenario selection locked', status: 'pending' },
      { id: 'step_dependencies', label: 'Reveal consumer systems', status: 'pending' },
      { id: 'step_business', label: 'Reveal business scenarios', status: 'pending' },
      { id: 'step_compute', label: 'Compute impact statistics', status: 'pending' },
      { id: 'step_recommendations', label: 'Generate recommendations', status: 'pending' }
    ],
    revealedSystems: [],
    revealedBusinessScenarios: [],
    impactStats: null,
    logs: []
  };
}

// ============================================================
// REDUCER
// ============================================================

export function simulatorReducer(
  state: SimulatorState,
  action: SimulatorAction
): SimulatorState {
  switch (action.type) {
    case 'START': {
      return {
        ...getInitialSimulatorState(),
        active: true,
        phase: 'await_confirm',
        logs: [
          '📡 Impact Simulator initialized.',
          '⚠️  This is a deterministic what-if simulation.',
          '💬 Please confirm to proceed: Type "YES" or "Y"'
        ],
        timelineSteps: state.timelineSteps.map(step =>
          step.id === 'step_init'
            ? { ...step, status: 'done' }
            : step
        )
      };
    }
    
    case 'CONFIRM_YES': {
      if (state.phase !== 'await_confirm') return state;
      
      return {
        ...state,
        phase: 'await_choice',
        logs: [
          ...state.logs,
          '',
          '✅ Simulation confirmed.',
          '',
          '📋 Select a decommissioning scenario:',
          '  1️⃣  Full Decommission (CRITICAL impact)',
          '  2️⃣  Decom with 6-Month Migration (HIGH impact)',
          '  3️⃣  SOAP API Decom Only (MEDIUM impact)',
          '  4️⃣  Protocol Upgrade (LOW impact)',
          '',
          '💬 Type the scenario number (1, 2, 3, or 4):'
        ]
      };
    }
    
    case 'CHOOSE_SCENARIO': {
      if (state.phase !== 'await_choice') return state;
      
      const { scenarioId } = action.payload;
      
      return {
        ...state,
        phase: 'running',
        selectedScenarioId: scenarioId,
        logs: [
          ...state.logs,
          '',
          `🔒 Scenario locked: ${scenarioId}`,
          '🚀 Starting timed reveal animation...'
        ],
        timelineSteps: state.timelineSteps.map(step =>
          step.id === 'step_scenario'
            ? { ...step, status: 'done' }
            : step.id === 'step_dependencies'
            ? { ...step, status: 'running' }
            : step
        )
      };
    }
    
    case 'TICK_REVEAL_SYSTEM': {
      const { systemId } = action.payload;
      
      return {
        ...state,
        revealedSystems: [...state.revealedSystems, systemId]
      };
    }
    
    case 'TICK_REVEAL_BUSINESS_SCENARIO': {
      const { scenarioId } = action.payload;
      
      return {
        ...state,
        revealedBusinessScenarios: [...state.revealedBusinessScenarios, scenarioId]
      };
    }
    
    case 'TICK_TIMELINE_STEP': {
      const { stepId, status } = action.payload;
      
      return {
        ...state,
        timelineSteps: state.timelineSteps.map(step =>
          step.id === stepId
            ? { ...step, status }
            : step
        )
      };
    }
    
    case 'SET_IMPACT_STATS': {
      const { stats } = action.payload;
      
      return {
        ...state,
        impactStats: stats,
        logs: [
          ...state.logs,
          '',
          `📊 Impact analysis complete for: ${stats.scenario.label}`,
          `   Total messages affected: ${stats.totalMessagesAffected.toLocaleString()}/month`,
          `   Risk level: ${stats.scenario.riskLevel.toUpperCase()}`
        ]
      };
    }
    
    case 'COMPLETE': {
      return {
        ...state,
        phase: 'done',
        timelineSteps: state.timelineSteps.map(step => ({ ...step, status: 'done' })),
        logs: [
          ...state.logs,
          '',
          '✅ Simulation complete!',
          '📥 You can now review recommendations or exit the simulator.'
        ]
      };
    }
    
    case 'EXIT': {
      return {
        ...getInitialSimulatorState(),
        logs: ['👋 Impact Simulator exited.']
      };
    }
    
    case 'RESET': {
      return {
        ...getInitialSimulatorState(),
        active: true,
        phase: 'await_confirm',
        logs: [
          '🔄 Simulator reset.',
          '📡 Impact Simulator initialized.',
          '💬 Please confirm to proceed: Type "YES" or "Y"'
        ],
        timelineSteps: getInitialSimulatorState().timelineSteps.map(step =>
          step.id === 'step_init'
            ? { ...step, status: 'done' }
            : step
        )
      };
    }
    
    default:
      return state;
  }
}

