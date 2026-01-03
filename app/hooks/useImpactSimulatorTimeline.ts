/**
 * Impact Simulator: Timeline Engine Hook
 * 
 * Manages the deterministic timed reveal animation by:
 * 1. Starting a 250ms interval when phase='running'
 * 2. Dispatching actions from the timeline spec at the correct tick
 * 3. Cleaning up the interval on unmount or phase change
 * 
 * This hook has no knowledge of what the actions mean - it only
 * knows WHEN to dispatch them. All business logic lives in the
 * reducer and timeline spec.
 */

import { useEffect } from 'react';
import { SimulatorAction, SimulatorPhase } from '../lib/impactSimulator/impactSimulatorReducer';
import { buildTimelineActions } from '../lib/impactSimulator/impactTimeline';

export interface UseImpactSimulatorTimelineOptions {
  active: boolean;                                    // Is simulator active?
  phase: SimulatorPhase;                              // Current phase
  selectedScenarioId: string | null;                  // Which scenario was chosen
  dispatch: (action: SimulatorAction) => void;        // Dispatch to reducer
  onComplete?: (message: string) => void;             // Callback for completion message
}

/**
 * Timeline engine hook - manages timed action dispatch
 * 
 * @param options - Configuration object
 */
export function useImpactSimulatorTimeline({
  active,
  phase,
  selectedScenarioId,
  dispatch,
  onComplete
}: UseImpactSimulatorTimelineOptions): void {
  
  useEffect(() => {
    // Only run when simulator is active and phase is 'running'
    if (!active || phase !== 'running' || !selectedScenarioId) {
      return;
    }
    
    console.log('[ImpactTimeline] Starting animation for scenario:', selectedScenarioId);
    
    // Build timeline actions (pure function, deterministic)
    const timelineActions = buildTimelineActions(selectedScenarioId);
    const maxTick = Math.max(...timelineActions.map(a => a.atTick));
    
    console.log(`[ImpactTimeline] Timeline built: ${timelineActions.length} actions over ${maxTick} ticks`);
    
    let currentTick = 0;
    const TICK_INTERVAL_MS = 250;
    
    const intervalId = setInterval(() => {
      currentTick++;
      
      // Find all actions that should fire on this tick
      const actionsForTick = timelineActions.filter(a => a.atTick === currentTick);
      
      if (actionsForTick.length > 0) {
        console.log(`[ImpactTimeline] Tick ${currentTick}: Dispatching ${actionsForTick.length} action(s)`);
      }
      
      // Dispatch them in order
      actionsForTick.forEach(({ action, description }) => {
        if (description) {
          console.log(`  → ${description}`);
        }
        dispatch(action);
      });
      
      // If this was the COMPLETE action, notify parent
      if (actionsForTick.some(a => a.action.type === 'COMPLETE')) {
        console.log('[ImpactTimeline] COMPLETE action dispatched, calling onComplete callback');
        onComplete?.(
          '✅ **Simulation Complete!**\n\n' +
          'Review the impact analysis results below.\n\n' +
          '💬 Type **RESET** to run another simulation or **EXIT** to close.'
        );
      }
      
      // Stop after max tick + 1 (safety buffer)
      if (currentTick > maxTick + 1) {
        console.log('[ImpactTimeline] Animation complete, stopping interval');
        clearInterval(intervalId);
      }
      
    }, TICK_INTERVAL_MS);
    
    // Cleanup on unmount or phase change
    return () => {
      console.log('[ImpactTimeline] Cleaning up interval (unmount or phase change)');
      clearInterval(intervalId);
    };
    
  }, [active, phase, selectedScenarioId, dispatch, onComplete]);
}

