/**
 * Impact Simulator: Declarative Timeline Specification
 * 
 * Pure data structure defining the exact sequence of actions to dispatch
 * during the simulation animation. No side effects, no timers, no state.
 */

import { SimulatorAction } from './impactSimulatorReducer';
import { CONSUMER_SYSTEMS, BUSINESS_SCENARIOS, computeImpactStats } from './demoImpactData';

export interface TimelineAction {
  atTick: number;              // Which tick this action fires (1-based)
  action: SimulatorAction;     // The action to dispatch
  description?: string;        // Human-readable description (for debugging)
}

/**
 * Builds a deterministic timeline of actions for the Impact Simulator.
 * 
 * Timeline structure (38 ticks total, 250ms per tick = 9.5 seconds):
 * - Tick 1: Start dependencies step
 * - Ticks 2-17: Reveal 16 consumer systems (one per tick)
 * - Tick 18: Complete dependencies, start business scenarios
 * - Ticks 19-34: Reveal 16 business scenarios (one per tick)
 * - Tick 35: Complete business, start compute
 * - Tick 36: Compute impact stats, complete compute, start recommendations
 * - Tick 37: Complete recommendations
 * - Tick 38: Dispatch COMPLETE
 * 
 * @param scenarioId - Selected scenario ID (for impact stats computation)
 * @returns Array of timeline actions in deterministic order
 */
export function buildTimelineActions(scenarioId: string): TimelineAction[] {
  const actions: TimelineAction[] = [];
  
  // ========== TICK 1: Start Dependencies Step ==========
  actions.push({
    atTick: 1,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_dependencies', status: 'running' }
    },
    description: 'Start revealing consumer systems'
  });
  
  // ========== TICKS 2-17: Reveal 16 Consumer Systems ==========
  CONSUMER_SYSTEMS.forEach((system, idx) => {
    actions.push({
      atTick: 2 + idx,
      action: {
        type: 'TICK_REVEAL_SYSTEM',
        payload: { systemId: system.id }
      },
      description: `Reveal system ${idx + 1}/16: ${system.name}`
    });
  });
  
  // ========== TICK 18: Complete Dependencies, Start Business Scenarios ==========
  actions.push({
    atTick: 18,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_dependencies', status: 'done' }
    },
    description: 'Complete dependencies step'
  });
  
  actions.push({
    atTick: 18,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_business', status: 'running' }
    },
    description: 'Start revealing business scenarios'
  });
  
  // ========== TICKS 19-34: Reveal 16 Business Scenarios ==========
  BUSINESS_SCENARIOS.forEach((biz, idx) => {
    actions.push({
      atTick: 19 + idx,
      action: {
        type: 'TICK_REVEAL_BUSINESS_SCENARIO',
        payload: { scenarioId: biz.id }
      },
      description: `Reveal business scenario ${idx + 1}/16: ${biz.title}`
    });
  });
  
  // ========== TICK 35: Complete Business, Start Compute ==========
  actions.push({
    atTick: 35,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_business', status: 'done' }
    },
    description: 'Complete business scenarios step'
  });
  
  actions.push({
    atTick: 35,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_compute', status: 'running' }
    },
    description: 'Start computing impact statistics'
  });
  
  // ========== TICK 36: Compute Stats, Complete Compute, Start Recommendations ==========
  const stats = computeImpactStats(scenarioId);
  
  actions.push({
    atTick: 36,
    action: {
      type: 'SET_IMPACT_STATS',
      payload: { stats }
    },
    description: `Compute impact stats for scenario: ${scenarioId}`
  });
  
  actions.push({
    atTick: 36,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_compute', status: 'done' }
    },
    description: 'Complete compute step'
  });
  
  actions.push({
    atTick: 36,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_recommendations', status: 'running' }
    },
    description: 'Start generating recommendations'
  });
  
  // ========== TICK 37: Complete Recommendations ==========
  actions.push({
    atTick: 37,
    action: {
      type: 'TICK_TIMELINE_STEP',
      payload: { stepId: 'step_recommendations', status: 'done' }
    },
    description: 'Complete recommendations step'
  });
  
  // ========== TICK 38: Dispatch COMPLETE ==========
  actions.push({
    atTick: 38,
    action: { type: 'COMPLETE' },
    description: '🎉 Simulation complete'
  });
  
  return actions;
}

