/**
 * Flow2: Graph Trace Visualization Component
 * 
 * Displays LangGraph KYC execution trace.
 * Pure presentational - no state management.
 */

import React from 'react';

interface GraphTraceProps {
  trace: {
    events: Array<{
      node: string;
      status: 'executed' | 'skipped' | 'waiting' | 'failed';
      decision?: string;
      reason?: string;
      startedAt?: string;
      endedAt?: string;
      durationMs?: number;
      inputsSummary?: string;
      outputsSummary?: string;
    }>;
    summary: {
      path: string;
      riskScore: number;
      riskBreakdown?: { // NEW: Risk breakdown
        coveragePoints: number;
        keywordPoints: number;
        totalPoints: number;
      };
      coverageMissingCount: number;
      conflictCount: number;
    };
    degraded?: boolean;
  };
}

const STATUS_STYLES = {
  executed: 'bg-green-100 text-green-800 border-green-300',
  skipped: 'bg-gray-100 text-gray-600 border-gray-300',
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  failed: 'bg-red-100 text-red-800 border-red-300'
};

const STATUS_ICONS = {
  executed: '✓',
  skipped: '⊘',
  waiting: '⏳',
  failed: '✗'
};

export default function GraphTrace({ trace }: GraphTraceProps) {
  const { events, summary, degraded } = trace;
  
  // Calculate total duration
  const totalDuration = events
    .filter(e => e.durationMs)
    .reduce((sum, e) => sum + (e.durationMs || 0), 0);
  
  return (
    <div className="space-y-6">
      {/* Route Decision Inputs - NEW */}
      {summary.riskBreakdown && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Route Decision Inputs
          </h3>
          
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center bg-white rounded p-2 border border-slate-200">
              <span className="text-sm text-slate-600">Coverage Issues:</span>
              <span className="font-bold text-orange-600">
                +{summary.riskBreakdown.coveragePoints} points
              </span>
            </div>
            
            <div className="flex justify-between items-center bg-white rounded p-2 border border-slate-200">
              <span className="text-sm text-slate-600">High-Risk Keywords:</span>
              <span className="font-bold text-red-600">
                +{summary.riskBreakdown.keywordPoints} points
              </span>
            </div>
            
            <div className="flex justify-between items-center bg-blue-50 rounded p-2 border-2 border-blue-300">
              <span className="font-semibold text-slate-700">Total Risk Score:</span>
              <span className="font-bold text-lg text-purple-600">
                {summary.riskScore}/100
              </span>
            </div>
          </div>
          
          <div className="p-2 bg-white border border-blue-200 rounded text-sm text-slate-700">
            <span className="font-semibold">Decision:</span> Route to{' '}
            <span className="font-bold uppercase text-purple-600">
              {summary.path}
            </span>
            {' '}path based on risk threshold
            {summary.riskScore <= 30 && ' (≤30: fast)'}
            {summary.riskScore > 30 && summary.riskScore <= 60 && ' (31-60: crosscheck)'}
            {summary.riskScore > 60 && summary.riskScore <= 80 && ' (61-80: escalate)'}
            {summary.riskScore > 80 && ' (>80: human gate)'}
            .
          </div>
        </div>
      )}
      
      {/* Summary Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">🕸️</span>
          Graph Execution Summary
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 border border-purple-200">
            <div className="text-xs text-slate-600 mb-1">Path</div>
            <div className="text-lg font-bold text-purple-700 uppercase">{summary.path}</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-purple-200">
            <div className="text-xs text-slate-600 mb-1">Risk Score</div>
            <div className={`text-lg font-bold ${
              summary.riskScore > 80 ? 'text-red-600' :
              summary.riskScore > 60 ? 'text-orange-600' :
              summary.riskScore > 30 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {summary.riskScore}/100
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-purple-200">
            <div className="text-xs text-slate-600 mb-1">Coverage Gaps</div>
            <div className="text-lg font-bold text-slate-700">{summary.coverageMissingCount}</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-purple-200">
            <div className="text-xs text-slate-600 mb-1">Conflicts</div>
            <div className="text-lg font-bold text-slate-700">{summary.conflictCount}</div>
          </div>
        </div>
        
        {degraded && (
          <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded p-3">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <div>
                <div className="font-semibold text-yellow-800 text-sm">Degraded Mode</div>
                <div className="text-xs text-yellow-700">
                  Some graph nodes may have failed or returned partial results.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Demo Helper: Quick Navigation */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-600">Quick Jump:</span>
          <button
            onClick={() => {
              const reflectNode = events.findIndex(e => e.node && e.node.includes('reflect'));
              if (reflectNode >= 0) {
                document.getElementById(`trace-event-${reflectNode}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors"
          >
            → Reflection Node
          </button>
          <button
            onClick={() => {
              const routingNode = events.findIndex(e => e.node && e.node.includes('routing'));
              if (routingNode >= 0) {
                document.getElementById(`trace-event-${routingNode}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                // Fallback: scroll to risk_triage which makes routing decision
                const triageNode = events.findIndex(e => e.node && e.node.includes('triage'));
                if (triageNode >= 0) {
                  document.getElementById(`trace-event-${triageNode}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
          >
            → Routing Decision
          </button>
          <span className="text-xs text-slate-500 ml-auto">({events.length} nodes)</span>
        </div>
      </div>
      
      {/* Node Execution Timeline */}
      <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Node Execution Timeline
          <span className="ml-auto text-sm font-normal text-slate-500">
            Total: {totalDuration}ms
          </span>
        </h3>
        
        <div className="space-y-3">
          {events.map((event, idx) => (
            <div
              key={idx}
              id={`trace-event-${idx}`}
              className={`border-2 rounded-lg p-3 ${STATUS_STYLES[event.status]}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{STATUS_ICONS[event.status]}</span>
                  <span className="font-bold text-sm uppercase tracking-wide">
                    {event.node.replace(/_/g, ' ')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  {event.durationMs !== undefined && (
                    <span className="font-mono bg-white/50 px-2 py-1 rounded">
                      {event.durationMs}ms
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded font-semibold uppercase ${
                    event.status === 'executed' ? 'bg-green-200' :
                    event.status === 'skipped' ? 'bg-gray-200' :
                    event.status === 'waiting' ? 'bg-yellow-200' :
                    'bg-red-200'
                  }`}>
                    {event.status}
                  </span>
                </div>
              </div>
              
              {event.decision && (
                <div className="text-sm mb-1">
                  <span className="font-semibold">Decision:</span> {event.decision}
                </div>
              )}
              
              {event.reason && (
                <div className="text-sm mb-1">
                  <span className="font-semibold">Reason:</span> {event.reason}
                </div>
              )}
              
              {event.outputsSummary && (
                <div className="text-sm text-slate-700 mt-2 bg-white/30 rounded p-2">
                  <span className="font-semibold">Output:</span> {event.outputsSummary}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-600 mb-2">Legend</div>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-green-600">✓</span>
            <span>Executed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">⊘</span>
            <span>Skipped</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-600">⏳</span>
            <span>Waiting</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-600">✗</span>
            <span>Failed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

