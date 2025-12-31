/**
 * Phase 3: Graph Definition Types
 * 
 * Defines the schema for Flow2 graph artifacts, including nodes, edges,
 * conditions, and diff structures.
 */

/**
 * Node type classification
 */
export type NodeType = 'agent' | 'skill' | 'router' | 'gate' | 'system';

/**
 * Condition type for edge firing rules
 */
export type ConditionType = 'always' | 'state_check' | 'output_check' | 'reflection_decision';

/**
 * Change type for graph diff
 */
export type ChangeType = 
  | 'node_added' 
  | 'node_removed' 
  | 'node_modified' 
  | 'edge_added' 
  | 'edge_removed' 
  | 'edge_modified' 
  | 'metadata_changed';

/**
 * Graph node representing an execution unit
 */
export interface GraphNode {
  /** Unique node ID (matches trace event 'node' field) */
  id: string;
  
  /** Node classification */
  type: NodeType;
  
  /** Human-readable display name */
  label: string;
  
  /** Purpose and behavior description */
  description: string;
  
  /** Execution binding (what actually runs) */
  binding?: {
    /** For type='skill': skill name from catalog */
    skillName?: string;
    /** For type='agent': agent name */
    agentName?: string;
    /** For type='system': function reference */
    functionRef?: string;
  };
  
  /** Node-specific configuration */
  config?: Record<string, any>;
}

/**
 * Condition specifying when an edge should fire
 */
export interface GraphCondition {
  /** Condition type */
  type: ConditionType;
  
  /** JS-like expression (documentation only, not executed) */
  expression?: string;
  
  /** Human-readable explanation */
  description: string;
}

/**
 * Directed edge between two nodes
 */
export interface GraphEdge {
  /** Unique edge ID */
  id: string;
  
  /** Source node ID */
  fromNodeId: string;
  
  /** Target node ID */
  toNodeId: string;
  
  /** Optional condition (if absent, edge is unconditional) */
  condition?: GraphCondition;
  
  /** Optional display label */
  label?: string;
}

/**
 * Complete graph definition artifact
 */
export interface GraphDefinition {
  /** Unique graph identifier */
  graphId: string;
  
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  
  /** Computed SHA-256 checksum (first 12 chars) */
  checksum: string;
  
  /** Human-readable purpose */
  description: string;
  
  /** Array of graph nodes */
  nodes: GraphNode[];
  
  /** Array of directed edges */
  edges: GraphEdge[];
  
  /** ID of the starting node */
  entryNodeId: string;
  
  /** Optional metadata (not included in checksum) */
  metadata?: {
    /** ISO 8601 timestamp */
    createdAt: string;
    /** Creator name or team */
    author: string;
    /** List of changes from previous version */
    changelog?: string[];
  };
}

/**
 * Single change in a graph diff
 */
export interface GraphChange {
  /** Type of change */
  type: ChangeType;
  
  /** JSON path to changed element (e.g., "nodes[2].config.parallelism") */
  path: string;
  
  /** Old value (present for 'modified' and 'removed') */
  oldValue?: any;
  
  /** New value (present for 'modified' and 'added') */
  newValue?: any;
  
  /** Human-readable summary */
  description: string;
}

/**
 * Diff between two graph versions
 */
export interface GraphDiff {
  /** Source version */
  fromVersion: string;
  
  /** Target version */
  toVersion: string;
  
  /** List of detected changes */
  changes: GraphChange[];
}

