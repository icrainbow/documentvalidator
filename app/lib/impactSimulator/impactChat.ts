/**
 * Impact Simulator: Chat Command Parser
 * 
 * Deterministic parsing of user chat input to simulator actions.
 */

import { SimulatorState, SimulatorAction } from './impactSimulatorReducer';
import { SCENARIOS } from './demoImpactData';

export interface ParseResult {
  action: SimulatorAction | null;
  message: string | null; // Error/help message if action is null
}

export function parseImpactChat(input: string, state: SimulatorState): ParseResult {
  const trimmed = input.trim().toUpperCase();
  
  // EXIT command (works in any phase)
  if (trimmed === 'EXIT' || trimmed === 'QUIT' || trimmed === 'STOP') {
    return {
      action: { type: 'EXIT' },
      message: null
    };
  }
  
  // RESET command (works in any phase)
  if (trimmed === 'RESET' || trimmed === 'RESTART') {
    return {
      action: { type: 'RESET' },
      message: null
    };
  }
  
  // Phase-specific commands
  switch (state.phase) {
    case 'idle': {
      return {
        action: null,
        message: '⚠️ Simulator is not active. This should not happen. Please report this issue.'
      };
    }
    
    case 'await_confirm': {
      // Support multiple confirmation keywords
      if (trimmed === 'YES' || trimmed === 'Y' || trimmed === 'NEXT' || trimmed === 'CONTINUE' || trimmed === 'START') {
        return {
          action: { type: 'CONFIRM_YES' },
          message: null
        };
      }
      
      return {
        action: null,
        message: '❌ Invalid input. Please type "NEXT" to continue, or "EXIT" to cancel.'
      };
    }
    
    case 'await_choice': {
      // Check for scenario number (1-4)
      if (trimmed === '1' || trimmed === '2' || trimmed === '3' || trimmed === '4') {
        const index = parseInt(trimmed) - 1;
        const scenario = SCENARIOS[index];
        
        if (!scenario) {
          return {
            action: null,
            message: '❌ Invalid scenario number. Please choose 1, 2, 3, or 4.'
          };
        }
        
        return {
          action: {
            type: 'CHOOSE_SCENARIO',
            payload: { scenarioId: scenario.id }
          },
          message: null
        };
      }
      
      return {
        action: null,
        message: '❌ Invalid input. Please type a scenario number: 1, 2, 3, or 4. Or type "EXIT" to cancel.'
      };
    }
    
    case 'running': {
      return {
        action: null,
        message: '⏳ Simulation is running. Please wait for it to complete, or type "EXIT" to cancel.'
      };
    }
    
    case 'done': {
      return {
        action: null,
        message: '✅ Simulation complete. Type "RESET" to run another simulation, or "EXIT" to close the simulator.'
      };
    }
    
    default: {
      return {
        action: null,
        message: '❌ Unknown simulator state. Please type "EXIT" to close.'
      };
    }
  }
}

