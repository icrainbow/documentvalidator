/**
 * Phase 3: Flow2 Graph Definition - Demo Variant v1.0.1
 * 
 * Demonstrates graph evolution with 3 modifications (NO node add/remove):
 * 1. parallel_checks.config.parallelism: "unlimited" → "3"
 * 2. reflect_and_replan.description: refined wording
 * 3. edge_3.label: "if reflection enabled" → "reflection_path"
 */

import type { GraphDefinition } from './types';
import { computeChecksum } from './graphUtils';

/**
 * Flow2 KYC Graph - Version 1.0.1 (Demo Variant)
 * 
 * Changes from v1.0.0:
 * - Limited parallelism to 3 concurrent checks
 * - Refined reflection node description
 * - Updated edge_3 label for clarity
 */
export const flow2GraphV1_0_1: GraphDefinition = {
  graphId: 'flow2_kyc_v1',
  version: '1.0.1',
  checksum: '', // Will be computed below
  description: 'Flow2 KYC review graph with risk triage and parallel checks',
  entryNodeId: 'topic_assembler',
  
  nodes: [
    {
      id: 'topic_assembler',
      type: 'skill',
      label: 'Topic Assembler',
      description: 'Extracts and organizes KYC topics from documents',
      binding: {
        skillName: 'kyc.topic_assemble'
      }
    },
    {
      id: 'risk_triage',
      type: 'skill',
      label: 'Risk Triage',
      description: 'Evaluates risk score and determines routing path',
      binding: {
        skillName: 'risk.triage'
      }
    },
    {
      id: 'parallel_checks',
      type: 'system',
      label: 'Parallel Checks Executor',
      description: 'Runs conflict sweep, gap collector, policy flags in parallel',
      binding: {
        functionRef: 'executeParallelChecks'
      },
      config: {
        parallelism: '3' // CHANGED: from "unlimited" to "3"
      }
    },
    {
      id: 'reflect_and_replan',
      type: 'system',
      label: 'Reflection Node',
      description: 'Self-reflection node: analyzes execution trace and determines optimal next action', // CHANGED: refined wording
      binding: {
        functionRef: 'reflectAndReplan'
      },
      config: {
        maxReplans: 1,
        provider: 'mock'
      }
    },
    {
      id: 'routing_decision',
      type: 'router',
      label: 'Routing Decision',
      description: 'Routes based on reflection output (rerun/human/continue)',
      binding: {
        functionRef: 'routeAfterReflection'
      }
    },
    {
      id: 'human_gate',
      type: 'gate',
      label: 'Human Gate',
      description: 'Pauses execution for human decision (EDD scope)',
      config: {
        maxGates: 1
      }
    },
    {
      id: 'finalize',
      type: 'system',
      label: 'Finalize',
      description: 'Aggregates results and prepares final response',
      binding: {
        functionRef: 'finalizeResults'
      }
    },
    {
      id: 'error_handler',
      type: 'system',
      label: 'Error Handler',
      description: 'Handles execution errors and returns degraded response',
      binding: {
        functionRef: 'handleError'
      }
    }
  ],
  
  edges: [
    {
      id: 'edge_1',
      fromNodeId: 'topic_assembler',
      toNodeId: 'risk_triage',
      condition: {
        type: 'always',
        description: 'Always proceed to risk triage'
      }
    },
    {
      id: 'edge_2',
      fromNodeId: 'risk_triage',
      toNodeId: 'parallel_checks',
      condition: {
        type: 'always',
        description: 'Always proceed to parallel checks'
      }
    },
    {
      id: 'edge_3',
      fromNodeId: 'parallel_checks',
      toNodeId: 'reflect_and_replan',
      condition: {
        type: 'state_check',
        expression: 'features.reflection === true',
        description: 'Proceed to reflection if enabled'
      },
      label: 'reflection_path' // CHANGED: from "if reflection enabled" to "reflection_path"
    },
    {
      id: 'edge_4',
      fromNodeId: 'parallel_checks',
      toNodeId: 'finalize',
      condition: {
        type: 'state_check',
        expression: 'features.reflection === false',
        description: 'Skip to finalize if reflection disabled'
      },
      label: 'if reflection disabled'
    },
    {
      id: 'edge_5',
      fromNodeId: 'reflect_and_replan',
      toNodeId: 'routing_decision',
      condition: {
        type: 'always',
        description: 'Always route based on reflection output'
      }
    },
    {
      id: 'edge_6',
      fromNodeId: 'routing_decision',
      toNodeId: 'parallel_checks',
      condition: {
        type: 'reflection_decision',
        expression: "state.nextAction === 'rerun_batch_review'",
        description: 'Rerun parallel checks if reflection decides to replan'
      },
      label: 'rerun'
    },
    {
      id: 'edge_7',
      fromNodeId: 'routing_decision',
      toNodeId: 'human_gate',
      condition: {
        type: 'reflection_decision',
        expression: "state.nextAction === 'ask_human_for_scope'",
        description: 'Pause for human input if reflection requests it'
      },
      label: 'human gate'
    },
    {
      id: 'edge_8',
      fromNodeId: 'routing_decision',
      toNodeId: 'finalize',
      condition: {
        type: 'reflection_decision',
        expression: "state.nextAction === 'skip' || state.nextAction === 'switch_to_section_review'",
        description: 'Finalize if reflection decides to continue'
      },
      label: 'continue'
    },
    {
      id: 'edge_9',
      fromNodeId: 'human_gate',
      toNodeId: 'finalize',
      condition: {
        type: 'always',
        description: 'Finalize after human gate (resume handled separately)'
      }
    },
    {
      id: 'edge_10',
      fromNodeId: 'topic_assembler',
      toNodeId: 'error_handler',
      condition: {
        type: 'output_check',
        expression: 'error thrown',
        description: 'Handle errors from topic assembly'
      },
      label: 'on error'
    },
    {
      id: 'edge_11',
      fromNodeId: 'risk_triage',
      toNodeId: 'error_handler',
      condition: {
        type: 'output_check',
        expression: 'error thrown',
        description: 'Handle errors from risk triage'
      },
      label: 'on error'
    },
    {
      id: 'edge_12',
      fromNodeId: 'parallel_checks',
      toNodeId: 'error_handler',
      condition: {
        type: 'output_check',
        expression: 'error thrown',
        description: 'Handle errors from parallel checks'
      },
      label: 'on error'
    }
  ],
  
  metadata: {
    createdAt: '2025-12-31T00:00:00Z',
    author: 'VibeCoding Team',
    changelog: [
      'Initial baseline',
      'Limited parallelism to 3, refined reflection node description'
    ]
  }
};

// Compute checksum AFTER definition (avoid self-reference)
flow2GraphV1_0_1.checksum = computeChecksum(flow2GraphV1_0_1);

export default flow2GraphV1_0_1;

