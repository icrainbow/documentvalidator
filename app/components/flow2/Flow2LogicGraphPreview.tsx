'use client';

/**
 * Flow2LogicGraphPreview
 * 
 * Visual representation of the workflow graph with business stages.
 * Shows injected nodes (e.g., EDD) when demo_mode is active.
 * 
 * IMPORTANT: This is UI-only. Does NOT map to actual LangGraph nodes.
 * Business stages remain stable even if underlying node names change.
 */

import React from 'react';

export interface GraphNode {
  id: string;
  label: string;
  isNew?: boolean;
}

interface Flow2LogicGraphPreviewProps {
  injectedNode?: { id: string; label: string } | null;
}

const BASE_NODES: GraphNode[] = [
  { id: 'doc_analysis', label: 'Document Analysis' },
  { id: 'risk_assessment', label: 'Risk Assessment' },
  { id: 'compliance_review', label: 'Compliance Review' },
  { id: 'human_review', label: 'Human Review' },
  { id: 'finalization', label: 'Finalization' },
];

export default function Flow2LogicGraphPreview({ injectedNode }: Flow2LogicGraphPreviewProps) {
  // Build node list with injected node if present
  const nodes: GraphNode[] = React.useMemo(() => {
    if (!injectedNode) {
      return BASE_NODES;
    }
    
    // Insert injected node after Human Review
    const result: GraphNode[] = [];
    for (const node of BASE_NODES) {
      result.push(node);
      if (node.id === 'human_review') {
        result.push({
          id: injectedNode.id,
          label: injectedNode.label,
          isNew: true,
        });
      }
    }
    return result;
  }, [injectedNode]);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Logic Graph</h3>
        {injectedNode && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Dynamic Step Added
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex items-start">
            {/* Connector line */}
            {index > 0 && (
              <div className="flex flex-col items-center mr-3">
                <div className="w-px h-2 bg-gray-300" />
              </div>
            )}
            
            {/* Node card */}
            <div
              className={`
                flex-1 flex items-center justify-between px-3 py-2 rounded-md text-sm
                ${node.isNew 
                  ? 'bg-amber-50 border-2 border-amber-300 text-amber-900' 
                  : 'bg-gray-50 border border-gray-200 text-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`
                    w-2 h-2 rounded-full
                    ${node.isNew ? 'bg-amber-500' : 'bg-gray-400'}
                  `}
                />
                <span className="font-medium">{node.label}</span>
              </div>
              
              {node.isNew && (
                <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded">
                  NEW
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {injectedNode 
            ? `${nodes.length} stages (including dynamic EDD step)` 
            : `${nodes.length} stages`}
        </p>
      </div>
    </div>
  );
}



