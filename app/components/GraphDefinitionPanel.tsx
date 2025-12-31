'use client';

/**
 * Phase 3: Graph Definition Panel
 * 
 * Displays graph metadata, definition, and diff for Flow2.
 * 
 * CONSTRAINT #3: All dynamic values MUST go through safeDisplay()
 */

import React, { useState } from 'react';
import type { GraphDefinition, GraphDiff, GraphChange } from '../lib/graphs/types';
import DraftEditorPanel from './DraftEditorPanel'; // Phase 4

interface GraphDefinitionPanelProps {
  graph: {
    graphId: string;
    version: string;
    checksum: string;
  };
  graphDefinition?: GraphDefinition;
  graphDiff?: GraphDiff;
}

/**
 * Type-safe display helper (CONSTRAINT #3)
 * Ensures no crashes from unexpected types
 */
function safeDisplay(value: any): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return '[Complex Object]';
    }
  }
  return String(value);
}

/**
 * Get color class for change type
 */
function getChangeColorClass(changeType: GraphChange['type']): string {
  if (changeType.includes('added')) {
    return 'bg-green-100 border-green-300 text-green-800';
  }
  if (changeType.includes('removed')) {
    return 'bg-red-100 border-red-300 text-red-800';
  }
  if (changeType.includes('modified')) {
    return 'bg-orange-100 border-orange-300 text-orange-800';
  }
  return 'bg-gray-100 border-gray-300 text-gray-800';
}

/**
 * Get icon for change type
 */
function getChangeIcon(changeType: GraphChange['type']): string {
  if (changeType.includes('added')) return '➕';
  if (changeType.includes('removed')) return '➖';
  if (changeType.includes('modified')) return '✏️';
  return '📝';
}

export default function GraphDefinitionPanel({
  graph,
  graphDefinition,
  graphDiff
}: GraphDefinitionPanelProps) {
  const [isDefExpanded, setIsDefExpanded] = useState(false);
  
  return (
    <div className="space-y-4">
      {/* Section 1: Metadata Summary (Always Visible) */}
      <div
        data-testid="graph-metadata-summary"
        className="bg-white border-2 border-slate-200 rounded-lg p-4"
      >
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">📐</span>
          Graph Metadata
        </h3>
        
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">ID:</span>
            <code className="px-2 py-1 bg-slate-100 rounded text-purple-600 font-mono">
              {safeDisplay(graph.graphId)}
            </code>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Version:</span>
            <code className="px-2 py-1 bg-slate-100 rounded text-blue-600 font-mono">
              {safeDisplay(graph.version)}
            </code>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Checksum:</span>
            <code className="px-2 py-1 bg-slate-100 rounded text-green-600 font-mono">
              {safeDisplay(graph.checksum)}
            </code>
          </div>
          
          <div className="mt-2 flex items-center gap-2">
            {graphDefinition ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                ✓ Full definition available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                ℹ️ Metadata only (production mode)
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Section 2: Definition Viewer (If Present) */}
      {graphDefinition && (
        <div
          data-testid="graph-definition-view"
          className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setIsDefExpanded(!isDefExpanded)}
            className="w-full px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-xl">{isDefExpanded ? '▼' : '▶'}</span>
              Full Definition (JSON)
            </span>
            <span className="text-xs text-slate-600 font-normal">
              {safeDisplay(graphDefinition.nodes.length)} nodes, {safeDisplay(graphDefinition.edges.length)} edges
            </span>
          </button>
          
          {isDefExpanded && (
            <div className="px-4 py-3 bg-slate-50 border-t-2 border-slate-200">
              <pre className="text-xs overflow-x-auto bg-white p-3 rounded border border-slate-200 max-h-96 overflow-y-auto">
                {safeDisplay(graphDefinition)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Section 3: Diff Viewer (If Present) */}
      {graphDiff && graphDiff.changes.length > 0 && (
        <div
          data-testid="graph-diff-view"
          className="bg-white border-2 border-slate-200 rounded-lg p-4"
        >
          <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="text-2xl">🔀</span>
            Changes: {safeDisplay(graphDiff.fromVersion)} → {safeDisplay(graphDiff.toVersion)}
          </h3>
          
          <div className="space-y-2">
            {graphDiff.changes.map((change, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-lg p-3 ${getChangeColorClass(change.type)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{getChangeIcon(change.type)}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">
                      {safeDisplay(change.description)}
                    </div>
                    <div className="text-xs opacity-75">
                      Path: <code className="font-mono">{safeDisplay(change.path)}</code>
                    </div>
                    {change.oldValue !== undefined && (
                      <div className="text-xs mt-1 opacity-75">
                        Old: <code className="font-mono">{safeDisplay(change.oldValue)}</code>
                      </div>
                    )}
                    {change.newValue !== undefined && (
                      <div className="text-xs mt-1 opacity-75">
                        New: <code className="font-mono">{safeDisplay(change.newValue)}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-sm text-slate-600 font-semibold">
            📝 {safeDisplay(graphDiff.changes.length)} changes total
          </div>
        </div>
      )}
      
      {/* Empty state if no diff */}
      {graphDiff && graphDiff.changes.length === 0 && (
        <div className="bg-white border-2 border-slate-200 rounded-lg p-4 text-center text-slate-500">
          <span className="text-2xl block mb-2">✓</span>
          No changes detected between versions
        </div>
      )}
      
      {/* Phase 4: Draft Editor (only if definition is available) */}
      {graphDefinition && (
        <DraftEditorPanel baseline={graphDefinition} />
      )}
    </div>
  );
}

