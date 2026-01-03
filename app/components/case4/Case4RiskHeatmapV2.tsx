'use client';

/**
 * Case4RiskHeatmapV2 (Timeline-Driven with Delta Visibility Gating)
 * 
 * Displays business flow nodes with:
 * - Base latency always visible
 * - Delta latency only visible after HEATMAP_UPDATE event
 * - Color transitions driven by timeline severity
 * - Pulse animation on RED nodes
 * 
 * CRITICAL: Delta "+Xms" appears ONLY when deltaVisible=true.
 */

import React, { useState } from 'react';
import { HeatmapNodeState, NodeSeverity } from '@/app/lib/case4/case4TimelineV2';

interface Case4RiskHeatmapV2Props {
  nodeStates: Record<string, HeatmapNodeState>;
}

export default function Case4RiskHeatmapV2({ nodeStates }: Case4RiskHeatmapV2Props) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Node positions (x, y in SVG coordinates)
  const nodePositions: Record<string, { x: number; y: number; label: string }> = {
    client_request: { x: 50, y: 200, label: 'Client Request' },
    api_gateway: { x: 200, y: 200, label: 'API Gateway' },
    authentication: { x: 350, y: 200, label: 'Authentication' },
    app_logic: { x: 500, y: 200, label: 'App Logic' },
    database: { x: 650, y: 200, label: 'Database' },
    mail_sync: { x: 500, y: 350, label: 'Mail_Sync' },
    response: { x: 650, y: 350, label: 'Response' }
  };
  
  const getSeverityColor = (severity: NodeSeverity): string => {
    switch (severity) {
      case 'green': return '#10b981'; // emerald-500
      case 'yellow': return '#eab308'; // yellow-500
      case 'orange': return '#f97316'; // orange-500
      case 'red': return '#ef4444'; // red-500
    }
  };
  
  const getExplanation = (nodeId: string, state: HeatmapNodeState): string => {
    const totalMs = state.baseLatencyMs + state.deltaMs;
    
    if (state.severity === 'red') {
      return `CRITICAL: Combined latency (${totalMs}ms) exceeds timeout threshold (500ms). Cross-region sync delayed by Azure platform update. Retry storms from TLS failures amplify risk. SLA breach probability: 85%.`;
    }
    
    if (state.severity === 'orange') {
      return `WARNING: Oracle kernel upgrade adds +${state.deltaMs}ms average query latency during and after maintenance. Combined with other impacts, this could cause cascading delays.`;
    }
    
    if (state.severity === 'yellow') {
      return `CAUTION: TLS mutual auth adds +${state.deltaMs}ms handshake time. Legacy client retries amplify load. Monitor closely during maintenance window.`;
    }
    
    return `No significant impact detected. Baseline latency: ${state.baseLatencyMs}ms.`;
  };
  
  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <h2 className="text-base font-bold text-slate-800">Risk Heatmap</h2>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-slate-600">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-slate-600">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-slate-600">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-slate-600">Critical</span>
          </div>
        </div>
      </div>
      
      {/* SVG Heatmap */}
      <svg
        viewBox="0 0 750 450"
        className="w-full h-auto"
        style={{ minHeight: '300px' }}
      >
        {/* Edges (arrows) */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>
        
        {/* Draw edges */}
        <line x1="100" y1="200" x2="170" y2="200" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <line x1="230" y1="200" x2="320" y2="200" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <line x1="380" y1="200" x2="470" y2="200" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <line x1="530" y1="200" x2="620" y2="200" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <line x1="650" y1="230" x2="550" y2="320" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <line x1="550" y1="350" x2="620" y2="350" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrowhead)" />
        
        {/* Nodes */}
        {Object.entries(nodePositions).map(([nodeId, pos]) => {
          const state = nodeStates[nodeId];
          if (!state) return null;
          
          const color = getSeverityColor(state.severity);
          const isHovered = hoveredNode === nodeId;
          const totalMs = state.baseLatencyMs + state.deltaMs;
          
          return (
            <g
              key={nodeId}
              onMouseEnter={() => setHoveredNode(nodeId)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? 32 : 30}
                fill={color}
                stroke="#fff"
                strokeWidth="3"
                className={`transition-all duration-300 ${
                  state.pulseActive ? 'animate-pulse' : ''
                }`}
              />
              
              {/* Label */}
              <text
                x={pos.x}
                y={pos.y - 45}
                textAnchor="middle"
                className="text-xs font-bold fill-slate-800"
              >
                {pos.label}
              </text>
              
              {/* Base latency (always visible) */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                className="text-xs font-bold fill-white"
              >
                {state.baseLatencyMs}ms
              </text>
              
              {/* Delta latency (only visible after HEATMAP_UPDATE) */}
              {state.deltaVisible && state.deltaMs > 0 && (
                <text
                  x={pos.x}
                  y={pos.y + 12}
                  textAnchor="middle"
                  className="text-xs font-bold fill-white animate-fadeIn"
                >
                  +{state.deltaMs}ms
                </text>
              )}
              
              {/* Total latency below (only if delta visible) */}
              {state.deltaVisible && state.deltaMs > 0 && (
                <text
                  x={pos.x}
                  y={pos.y + 50}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-slate-600"
                >
                  Total: {totalMs}ms
                </text>
              )}
              
              {/* Hover tooltip */}
              {isHovered && (
                <foreignObject x={pos.x - 150} y={pos.y - 120} width="300" height="100">
                  <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs">
                    <p className="font-bold mb-1">Why is this {state.severity.toUpperCase()}?</p>
                    <p className="text-slate-300 leading-relaxed">
                      {getExplanation(nodeId, state)}
                    </p>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

