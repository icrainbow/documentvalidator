# Phase 3: Graph Definition Schema Reference

## Overview

This document specifies the schema for Flow2 graph definitions, including data types, checksum computation, and trace-to-definition mapping.

---

## 1. Core Types

### 1.1 GraphDefinition

The root type representing a complete graph artifact.

```typescript
export interface GraphDefinition {
  // Identifier
  graphId: string;           // Unique ID, e.g., "flow2_kyc_v1"
  version: string;           // Semantic version: "1.0.0"
  checksum: string;          // Computed SHA-256 hash (first 12 chars)
  
  // Description
  description: string;       // Human-readable purpose
  
  // Graph structure
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryNodeId: string;       // ID of the starting node (e.g., "topic_assembler")
  
  // Metadata (optional)
  metadata?: {
    createdAt: string;       // ISO 8601 timestamp
    author: string;          // Creator name or team
    changelog?: string[];    // List of changes from previous version
  };
}
```

**Example:**
```json
{
  "graphId": "flow2_kyc_v1",
  "version": "1.0.0",
  "checksum": "a3f2b9c4e1d8",
  "description": "Flow2 KYC review graph with risk triage and parallel checks",
  "nodes": [ ... ],
  "edges": [ ... ],
  "entryNodeId": "topic_assembler",
  "metadata": {
    "createdAt": "2025-12-31T00:00:00Z",
    "author": "VibeCoding Team",
    "changelog": ["Initial baseline"]
  }
}
```

---

### 1.2 GraphNode

Represents a single node in the graph.

```typescript
export interface GraphNode {
  // Identifier
  id: string;                // Unique node ID (matches trace event 'node' field)
  
  // Classification
  type: 'agent' | 'skill' | 'router' | 'gate' | 'system';
  
  // Display
  label: string;             // Human-readable display name
  description: string;       // Purpose of this node
  
  // Execution binding (what actually runs)
  binding?: {
    skillName?: string;      // For type='skill': e.g., "kyc.topic_assemble"
    agentName?: string;      // For type='agent': e.g., "compliance_check_fast"
    functionRef?: string;    // For type='system': e.g., "executeParallelChecks"
  };
  
  // Node-specific configuration
  config?: Record<string, any>;
}
```

**Node Types:**
- **agent:** LLM-based agent (future - not currently used in Flow2)
- **skill:** Invokes a registered skill from skill catalog
- **router:** Decision/routing node (no execution, just flow control)
- **gate:** Human-in-the-loop gate (pauses for human input)
- **system:** Built-in system function (e.g., executor, finalizer)

**Example Nodes:**
```json
[
  {
    "id": "topic_assembler",
    "type": "skill",
    "label": "Topic Assembler",
    "description": "Extracts and organizes KYC topics from documents",
    "binding": {
      "skillName": "kyc.topic_assemble"
    }
  },
  {
    "id": "risk_triage",
    "type": "skill",
    "label": "Risk Triage",
    "description": "Evaluates risk score and determines routing path",
    "binding": {
      "skillName": "risk.triage"
    }
  },
  {
    "id": "parallel_checks",
    "type": "system",
    "label": "Parallel Checks Executor",
    "description": "Runs conflict sweep, gap collector, policy flags in parallel",
    "binding": {
      "functionRef": "executeParallelChecks"
    },
    "config": {
      "parallelism": "unlimited"
    }
  },
  {
    "id": "reflect_and_replan",
    "type": "system",
    "label": "Reflection Node",
    "description": "Self-reflection: analyzes trace and decides next action",
    "binding": {
      "functionRef": "reflectAndReplan"
    },
    "config": {
      "maxReplans": 1,
      "provider": "mock"
    }
  },
  {
    "id": "routing_decision",
    "type": "router",
    "label": "Routing Decision",
    "description": "Routes based on reflection output (rerun/human/continue)",
    "binding": {
      "functionRef": "routeAfterReflection"
    }
  },
  {
    "id": "human_gate",
    "type": "gate",
    "label": "Human Gate",
    "description": "Pauses execution for human decision (EDD scope)",
    "config": {
      "maxGates": 1
    }
  },
  {
    "id": "finalize",
    "type": "system",
    "label": "Finalize",
    "description": "Aggregates results and prepares final response",
    "binding": {
      "functionRef": "finalizeResults"
    }
  },
  {
    "id": "error_handler",
    "type": "system",
    "label": "Error Handler",
    "description": "Handles execution errors and returns degraded response",
    "binding": {
      "functionRef": "handleError"
    }
  }
]
```

---

### 1.3 GraphEdge

Represents a directed edge between two nodes.

```typescript
export interface GraphEdge {
  // Identifier
  id: string;                // Unique edge ID, e.g., "edge_1", "edge_2"
  
  // Connection
  fromNodeId: string;        // Source node ID
  toNodeId: string;          // Target node ID
  
  // Condition (optional - unconditional if absent)
  condition?: GraphCondition;
  
  // Display
  label?: string;            // Optional display label (e.g., "if replan")
}
```

**Example Edges:**
```json
[
  {
    "id": "edge_1",
    "fromNodeId": "topic_assembler",
    "toNodeId": "risk_triage",
    "condition": {
      "type": "always",
      "description": "Always proceed to risk triage"
    }
  },
  {
    "id": "edge_2",
    "fromNodeId": "risk_triage",
    "toNodeId": "parallel_checks",
    "condition": {
      "type": "always",
      "description": "Always proceed to parallel checks"
    }
  },
  {
    "id": "edge_3",
    "fromNodeId": "parallel_checks",
    "toNodeId": "reflect_and_replan",
    "condition": {
      "type": "state_check",
      "expression": "features.reflection === true",
      "description": "Proceed to reflection if enabled"
    },
    "label": "if reflection enabled"
  },
  {
    "id": "edge_4",
    "fromNodeId": "parallel_checks",
    "toNodeId": "finalize",
    "condition": {
      "type": "state_check",
      "expression": "features.reflection === false",
      "description": "Skip to finalize if reflection disabled"
    },
    "label": "if reflection disabled"
  },
  {
    "id": "edge_5",
    "fromNodeId": "reflect_and_replan",
    "toNodeId": "routing_decision",
    "condition": {
      "type": "always",
      "description": "Always route based on reflection output"
    }
  },
  {
    "id": "edge_6",
    "fromNodeId": "routing_decision",
    "toNodeId": "parallel_checks",
    "condition": {
      "type": "reflection_decision",
      "expression": "state.nextAction === 'rerun_batch_review'",
      "description": "Rerun parallel checks if reflection decides to replan"
    },
    "label": "rerun"
  },
  {
    "id": "edge_7",
    "fromNodeId": "routing_decision",
    "toNodeId": "human_gate",
    "condition": {
      "type": "reflection_decision",
      "expression": "state.nextAction === 'ask_human_for_scope'",
      "description": "Pause for human input if reflection requests it"
    },
    "label": "human gate"
  },
  {
    "id": "edge_8",
    "fromNodeId": "routing_decision",
    "toNodeId": "finalize",
    "condition": {
      "type": "reflection_decision",
      "expression": "state.nextAction === 'skip' || state.nextAction === 'switch_to_section_review'",
      "description": "Finalize if reflection decides to continue"
    },
    "label": "continue"
  },
  {
    "id": "edge_9",
    "fromNodeId": "human_gate",
    "toNodeId": "finalize",
    "condition": {
      "type": "always",
      "description": "Finalize after human gate (resume handled separately)"
    }
  }
]
```

---

### 1.4 GraphCondition

Specifies when an edge should fire.

```typescript
export interface GraphCondition {
  // Condition type
  type: 'always' | 'state_check' | 'output_check' | 'reflection_decision';
  
  // Condition logic (optional for 'always')
  expression?: string;       // JS-like expression (not executed, for docs only)
  
  // Human-readable explanation
  description: string;
}
```

**Condition Types:**
- **always:** Unconditional edge (default path)
- **state_check:** Checks state flags (e.g., `features.reflection === true`)
- **output_check:** Checks node output (e.g., `output.riskScore > 50`)
- **reflection_decision:** Routes based on `state.nextAction` from reflection node

**Note:** `expression` is **documentation only** in Phase 3. Not executed at runtime. Actual routing logic is still in `orchestrator.ts`. Phase 4+ may add dynamic interpretation.

---

### 1.5 GraphDiff

Represents changes between two graph versions.

```typescript
export interface GraphDiff {
  fromVersion: string;       // Source version, e.g., "1.0.0"
  toVersion: string;         // Target version, e.g., "1.0.1"
  changes: GraphChange[];    // List of detected changes
}
```

**Example:**
```json
{
  "fromVersion": "1.0.0",
  "toVersion": "1.0.1",
  "changes": [
    {
      "type": "node_added",
      "path": "nodes[8]",
      "newValue": { "id": "data_quality_check", ... },
      "description": "Added node: data_quality_check"
    },
    {
      "type": "edge_modified",
      "path": "edges[3].condition.expression",
      "oldValue": "features.reflection === true",
      "newValue": "features.reflection === true && replanCount < 2",
      "description": "Modified condition for edge_3"
    }
  ]
}
```

---

### 1.6 GraphChange

Represents a single change in a diff.

```typescript
export interface GraphChange {
  // Change type
  type: 'node_added' | 'node_removed' | 'node_modified' | 
        'edge_added' | 'edge_removed' | 'edge_modified' |
        'metadata_changed';
  
  // JSON path to changed element
  path: string;              // e.g., "nodes[2].binding.skillName"
  
  // Values
  oldValue?: any;            // Present for 'modified' and 'removed'
  newValue?: any;            // Present for 'modified' and 'added'
  
  // Human-readable summary
  description: string;
}
```

**Change Types:**
- **node_added:** New node in v2
- **node_removed:** Node in v1 missing in v2
- **node_modified:** Node exists in both but properties changed
- **edge_added / edge_removed / edge_modified:** Same for edges
- **metadata_changed:** Version, checksum, or metadata fields changed

---

## 2. Checksum Computation

### 2.1 Algorithm

```typescript
import crypto from 'crypto';

function computeChecksum(definition: GraphDefinition): string {
  // Step 1: Create a stable copy with sorted keys
  const stableDef = {
    graphId: definition.graphId,
    version: definition.version,
    description: definition.description,
    entryNodeId: definition.entryNodeId,
    nodes: definition.nodes.map(n => ({
      id: n.id,
      type: n.type,
      label: n.label,
      description: n.description,
      binding: n.binding || null,
      config: n.config || null
    })).sort((a, b) => a.id.localeCompare(b.id)), // Sort nodes by ID
    edges: definition.edges.map(e => ({
      id: e.id,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      condition: e.condition || null,
      label: e.label || null
    })).sort((a, b) => a.id.localeCompare(b.id)), // Sort edges by ID
    // Omit metadata (createdAt, changelog) from checksum - those change on every version
  };
  
  // Step 2: Serialize to stable JSON (no whitespace)
  const stableJson = JSON.stringify(stableDef);
  
  // Step 3: Compute SHA-256 hash
  const hash = crypto.createHash('sha256').update(stableJson, 'utf8').digest('hex');
  
  // Step 4: Return first 12 characters (sufficient for uniqueness in this context)
  return hash.substring(0, 12);
}
```

### 2.2 Properties

- **Deterministic:** Same definition → same checksum (always)
- **Collision-resistant:** Different definitions → different checksums (with high probability)
- **Stable sorting:** Nodes and edges sorted by ID to avoid order-dependent changes
- **Metadata excluded:** `createdAt` and `changelog` not part of checksum (those are version metadata, not graph structure)

### 2.3 Example

**Input:**
```json
{
  "graphId": "flow2_kyc_v1",
  "version": "1.0.0",
  "nodes": [
    { "id": "topic_assembler", "type": "skill", ... },
    { "id": "risk_triage", "type": "skill", ... }
  ],
  "edges": [
    { "id": "edge_1", "fromNodeId": "topic_assembler", "toNodeId": "risk_triage" }
  ],
  "entryNodeId": "topic_assembler"
}
```

**Output:**
```
"a3f2b9c4e1d8"
```

Same graph with different node order → **same checksum** (due to stable sorting).

---

## 3. Trace-to-Definition Mapping

### 3.1 Current Trace Event Schema

**From `app/lib/graphKyc/types.ts`:**
```typescript
export interface GraphTraceEvent {
  node: string;              // Node ID (e.g., "topic_assembler")
  status: 'executed' | 'skipped' | 'waiting' | 'failed';
  decision?: string;         // Decision made (for router nodes)
  reason?: string;           // Explanation (e.g., "Fast path - skip conflict check")
  startedAt?: string;        // ISO timestamp
  endedAt?: string;          // ISO timestamp
  durationMs?: number;       // Execution duration
  inputsSummary?: string;    // Summary of inputs
  outputsSummary?: string;   // Summary of outputs
  data?: any;                // Additional node-specific data
  message?: string;          // Human-readable message
}
```

### 3.2 Mapping Logic

**Phase 3 Enhancement:** No schema changes needed. Mapping is implicit:

1. **Runtime trace event:** `{ node: "topic_assembler", status: "executed", ... }`
2. **Definition lookup:** Find `GraphNode` where `node.id === "topic_assembler"`
3. **Result:** Matched node from definition shows: type (`skill`), binding (`kyc.topic_assemble`), description

**Why Skip Logic is Traced:**
- When a node is skipped, trace event includes `status: "skipped"` and `reason: "Fast path - skip conflict check"`
- Reason already explains **why** (references the conditional logic from `GraphEdge.condition.description`)
- No additional fields needed

### 3.3 Example

**Runtime Trace (from orchestrator):**
```json
{
  "node": "conflict_sweep",
  "status": "skipped",
  "reason": "Fast path - skip conflict check",
  "startedAt": "2025-12-31T12:00:05Z"
}
```

**Definition (from flow2GraphV1.ts):**
```json
{
  "nodes": [
    {
      "id": "conflict_sweep",
      "type": "system",
      "label": "Conflict Sweep",
      "description": "Checks for cross-topic contradictions",
      "binding": { "functionRef": "runConflictSweep" }
    }
  ],
  "edges": [
    {
      "id": "edge_conflict_skip",
      "fromNodeId": "parallel_checks",
      "toNodeId": "conflict_sweep",
      "condition": {
        "type": "output_check",
        "expression": "routePath === 'fast'",
        "description": "Skip conflict check on fast path"
      }
    }
  ]
}
```

**Mapping Result:**
- Trace event `node: "conflict_sweep"` → Definition node `id: "conflict_sweep"`
- Trace `reason: "Fast path..."` → Definition edge condition `description: "Skip conflict check on fast path"`
- UI can show: "This node was skipped because [edge condition description]"

### 3.4 Future Enhancement (Phase 4+)

Add explicit `nodeId` and `edgeId` fields to `GraphTraceEvent`:
```typescript
export interface GraphTraceEvent {
  node: string;              // Legacy field (keep for backward compat)
  nodeId?: string;           // NEW: Explicit reference to GraphNode.id
  edgeId?: string;           // NEW: Which edge was taken to reach this node
  // ... (rest unchanged)
}
```

This would make mapping trivial and enable richer UI (e.g., "Edges Taken" visualization).

---

## 4. Validation (Optional for Phase 3)

### 4.1 Zod Schema (if implemented)

```typescript
import { z } from 'zod';

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['agent', 'skill', 'router', 'gate', 'system']),
  label: z.string(),
  description: z.string(),
  binding: z.object({
    skillName: z.string().optional(),
    agentName: z.string().optional(),
    functionRef: z.string().optional()
  }).optional(),
  config: z.record(z.any()).optional()
});

export const GraphEdgeSchema = z.object({
  id: z.string().min(1),
  fromNodeId: z.string(),
  toNodeId: z.string(),
  condition: z.object({
    type: z.enum(['always', 'state_check', 'output_check', 'reflection_decision']),
    expression: z.string().optional(),
    description: z.string()
  }).optional(),
  label: z.string().optional()
});

export const GraphDefinitionSchema = z.object({
  graphId: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semantic version
  checksum: z.string().length(12),
  description: z.string(),
  nodes: z.array(GraphNodeSchema).min(1),
  edges: z.array(GraphEdgeSchema),
  entryNodeId: z.string(),
  metadata: z.object({
    createdAt: z.string().datetime(),
    author: z.string(),
    changelog: z.array(z.string()).optional()
  }).optional()
});
```

### 4.2 Validation Function

```typescript
export function validateGraphDefinition(definition: unknown): GraphDefinition {
  const result = GraphDefinitionSchema.safeParse(definition);
  if (!result.success) {
    console.error('Graph definition validation failed:', result.error.errors);
    throw new Error('Invalid graph definition');
  }
  return result.data;
}
```

**Usage:** Call at app startup to ensure graph definition is valid.

---

## 5. Baseline Graph: flow2GraphV1.ts

### 5.1 Current Flow2 Graph Structure (as of Phase 2)

**Nodes (in execution order):**
1. `topic_assembler` (skill: `kyc.topic_assemble`)
2. `risk_triage` (skill: `risk.triage`)
3. `parallel_checks` (system function: executor)
   - Sub-nodes (internal to executor):
     - `conflict_sweep` (conditional: escalate/crosscheck/human_gate paths)
     - `gap_collector` (always runs)
     - `policy_flags_check` (conditional: escalate/human_gate paths)
4. `reflect_and_replan` (system function, conditional: if `features.reflection === true`)
5. `routing_decision` (router, conditional: based on `state.nextAction`)
6. `human_gate` (gate, conditional: if routed by reflection)
7. `finalize` (system function: always runs at end)
8. `error_handler` (system function: only on exception)

**Edges (conditional logic):**
- `topic_assembler` → `risk_triage` (always)
- `risk_triage` → `parallel_checks` (always)
- `parallel_checks` → `reflect_and_replan` (if reflection enabled)
- `parallel_checks` → `finalize` (if reflection disabled)
- `reflect_and_replan` → `routing_decision` (always)
- `routing_decision` → `parallel_checks` (if `nextAction === 'rerun_batch_review'`)
- `routing_decision` → `human_gate` (if `nextAction === 'ask_human_for_scope'`)
- `routing_decision` → `finalize` (if `nextAction === 'skip'` or `'switch_to_section_review'`)
- `human_gate` → `finalize` (after resume)
- Any node → `error_handler` (on exception)

### 5.2 Simplified Baseline (for flow2GraphV1.ts)

For Phase 3, we define **9 top-level nodes** (conflict_sweep/gap_collector/policy_flags_check are implicit in parallel_checks):

```typescript
{
  graphId: "flow2_kyc_v1",
  version: "1.0.0",
  nodes: [
    { id: "topic_assembler", type: "skill", binding: { skillName: "kyc.topic_assemble" } },
    { id: "risk_triage", type: "skill", binding: { skillName: "risk.triage" } },
    { id: "parallel_checks", type: "system", binding: { functionRef: "executeParallelChecks" } },
    { id: "reflect_and_replan", type: "system", binding: { functionRef: "reflectAndReplan" } },
    { id: "routing_decision", type: "router", binding: { functionRef: "routeAfterReflection" } },
    { id: "human_gate", type: "gate" },
    { id: "finalize", type: "system", binding: { functionRef: "finalizeResults" } },
    { id: "error_handler", type: "system", binding: { functionRef: "handleError" } }
  ],
  edges: [
    // (see full definition in flow2GraphV1.ts file)
  ],
  entryNodeId: "topic_assembler"
}
```

**Full definition:** See `app/lib/graphs/flow2GraphV1.ts` after implementation.

---

## 6. Diff Example: v1.0.0 → v1.0.1

**Change:** Add a new `data_quality_check` node after `topic_assembler` (demo only)

**v1.0.1 adds:**
- Node: `{ id: "data_quality_check", type: "system", label: "Data Quality Check", ... }`
- Edge: `{ id: "edge_dq", fromNodeId: "topic_assembler", toNodeId: "data_quality_check", ... }`
- Edge: Update `edge_2` to go from `data_quality_check` → `risk_triage` instead of `topic_assembler` → `risk_triage`

**Computed Diff:**
```json
{
  "fromVersion": "1.0.0",
  "toVersion": "1.0.1",
  "changes": [
    {
      "type": "node_added",
      "path": "nodes[8]",
      "newValue": { "id": "data_quality_check", "type": "system", ... },
      "description": "Added node: data_quality_check for validation step"
    },
    {
      "type": "edge_added",
      "path": "edges[10]",
      "newValue": { "id": "edge_dq", "fromNodeId": "topic_assembler", "toNodeId": "data_quality_check" },
      "description": "Added edge: topic_assembler → data_quality_check"
    },
    {
      "type": "edge_modified",
      "path": "edges[1].fromNodeId",
      "oldValue": "topic_assembler",
      "newValue": "data_quality_check",
      "description": "Modified edge_2: now routes data_quality_check → risk_triage"
    }
  ]
}
```

---

## 7. Summary Table

| Concept | Type | Purpose | Example |
|---------|------|---------|---------|
| **GraphDefinition** | Interface | Root artifact | `{ graphId, version, nodes, edges, ... }` |
| **GraphNode** | Interface | Execution unit | `{ id: "topic_assembler", type: "skill", ... }` |
| **GraphEdge** | Interface | Flow connection | `{ fromNodeId: "A", toNodeId: "B", condition: ... }` |
| **GraphCondition** | Interface | Edge firing rule | `{ type: "state_check", expression: "features.reflection === true" }` |
| **GraphDiff** | Interface | Version changes | `{ fromVersion: "1.0.0", toVersion: "1.0.1", changes: [...] }` |
| **GraphChange** | Interface | Single diff entry | `{ type: "node_added", path: "nodes[8]", ... }` |
| **Checksum** | Function | Stable hash | `computeChecksum(def) → "a3f2b9c4e1d8"` |
| **Trace Mapping** | Logic | Event → Node | `event.node === nodeDefinition.id` |

---

_Phase 3 Graph Schema v1.0 • Reference for Implementation_

