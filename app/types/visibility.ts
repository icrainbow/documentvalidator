/**
 * Visibility Layer Types (3-Layer Model)
 * Defines view modes for the Review Configuration drawer
 */

export type VisibilityMode = 'reviewer' | 'why' | 'explainability';

export interface VisibilityConfig {
  showContractInput: boolean;
  showContextDetails: boolean;
  showAgentSelection: boolean;
  showAgentSkills: boolean;
  showCompatibility: boolean;
  showValidation: boolean;
}

/**
 * Visibility presets for 3-layer model
 */
export const VISIBILITY_PRESETS: Record<VisibilityMode, VisibilityConfig> = {
  // Layer 1: Reviewer (minimal, action-focused)
  reviewer: {
    showContractInput: false,
    showContextDetails: false,
    showAgentSelection: false,
    showAgentSkills: false,
    showCompatibility: false,
    showValidation: false
  },

  // Layer 2: Why (context + reasoning, no manual selection)
  why: {
    showContractInput: false,
    showContextDetails: true,   // Show context that drives selection
    showAgentSelection: false,  // No manual selection
    showAgentSkills: true,      // Show what each agent does
    showCompatibility: false,   // No advanced details
    showValidation: true        // Show validation status
  },

  // Layer 3: Explainability (full control + diagnostics)
  explainability: {
    showContractInput: true,    // Pull contracts
    showContextDetails: true,   // Edit context manually
    showAgentSelection: true,   // Manual agent selection
    showAgentSkills: true,      // Show agent details
    showCompatibility: true,    // Show compatibility rules
    showValidation: true        // Show validation details
  }
};

/**
 * Get visibility config for a mode
 */
export function getVisibilityConfig(mode: VisibilityMode): VisibilityConfig {
  return VISIBILITY_PRESETS[mode];
}

