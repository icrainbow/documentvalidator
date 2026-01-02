'use client';

/**
 * Case4RiskHeatmap
 * 
 * SVG-based business flow graph showing 7 nodes with risk color coding.
 * Hover shows tooltip explaining risk level.
 * Red nodes pulse with CSS animation.
 */

import React, { useState } from 'react';
import { RiskNode } from '@/app/lib/case4/demoCase4Data';

interface Case4RiskHeatmapProps {
  nodes: RiskNode[];
  currentTime: number;
}

export default function Case4RiskHeatmap({ nodes, currentTime }: Case4RiskHeatmapProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const getRiskColor = (level: RiskNode['risk_level']) => {
    switch (level) {
      case 'green': return { fill: '#D1FAE5', stroke: '#10B981' };
      case 'yellow': return { fill: '#FEF3C7', stroke: '#F59E0B' };
      case 'orange': return { fill: '#FED7AA', stroke: '#F97316' };
      case 'red': return { fill: '#FEE2E2', stroke: '#EF4444' };
    }
  };
  
  const nodeWidth = 120;
  const nodeHeight = 80;
  
  const handleNodeHover = (nodeId: string, event: React.MouseEvent) => {
    setHoveredNodeId(nodeId);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  };
  
  const hoveredNode = nodes.find(n => n.id === hoveredNodeId);
  
  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-4 relative">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🗺️</span>
        <h2 className="text-base font-bold text-slate-800">RISK HEATMAP – Business Flow Impact</h2>
      </div>
      
      {/* SVG Graph */}
      <div className="bg-slate-50 rounded-lg p-4 overflow-x-auto">
        <svg
          width="800"
          height="600"
          viewBox="0 0 800 600"
          className="mx-auto"
        >
          {/* Edges (arrows) */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#64748B" />
            </marker>
          </defs>
          
          {/* Client → Gateway */}
          <line x1={nodes[0].x + nodeWidth} y1={nodes[0].y + nodeHeight/2} x2={nodes[1].x} y2={nodes[1].y + nodeHeight/2} stroke="#64748B" strokeWidth="2" markerEnd="url(#arrowhead)" />
          
          {/* Gateway → Auth */}
          <line x1={nodes[1].x + nodeWidth} y1={nodes[1].y + nodeHeight/2} x2={nodes[2].x} y2={nodes[2].y + nodeHeight/2} stroke="#64748B" strokeWidth="2" markerEnd="url(#arrowhead)" />
          
          {/* Auth → App Logic */}
          <line x1={nodes[2].x + nodeWidth} y1={nodes[2].y + nodeHeight/2} x2={nodes[3].x} y2={nodes[3].y + nodeHeight/2} stroke="#64748B" strokeWidth="2" markerEnd="url(#arrowhead)" />
          
          {/* App Logic → Database */}
          <line x1={nodes[3].x + nodeWidth} y1={nodes[3].y + nodeHeight/2} x2={nodes[4].x} y2={nodes[4].y + nodeHeight/2} stroke="#64748B" strokeWidth="2" markerEnd="url(#arrowhead)" />
          
          {/* App Logic → Mail Sync (downward) */}
          <line x1={nodes[3].x + nodeWidth/2} y1={nodes[3].y + nodeHeight} x2={nodes[5].x + nodeWidth/2} y2={nodes[5].y} stroke="#64748B" strokeWidth="2" markerEnd="url(#arrowhead)" />
          
          {/* Mail Sync → Response */}
          <line x1={nodes[5].x + nodeWidth} y1={nodes[5].y + nodeHeight/2} x2={nodes[6].x} y2={nodes[6].y + nodeHeight/2} stroke="#64748B" strokeWidth="2" markerEnd="url(#arrowhead)" />
          
          {/* Nodes */}
          {nodes.map((node) => {
            const colors = getRiskColor(node.risk_level);
            const isRed = node.risk_level === 'red';
            
            return (
              <g
                key={node.id}
                onMouseEnter={(e) => handleNodeHover(node.id, e)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className="cursor-pointer"
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={8}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={3}
                  className={isRed ? 'animate-pulse' : 'transition-all duration-300'}
                />
                
                {/* Label */}
                <text
                  x={node.x + nodeWidth / 2}
                  y={node.y + 25}
                  textAnchor="middle"
                  className="font-bold text-xs"
                  fill="#1E293B"
                >
                  {node.label}
                </text>
                
                {/* Baseline */}
                <text
                  x={node.x + nodeWidth / 2}
                  y={node.y + 42}
                  textAnchor="middle"
                  className="text-xs"
                  fill="#64748B"
                >
                  Base: {node.baseline_latency_ms}ms
                </text>
                
                {/* Impact */}
                {node.impact_ms > 0 && (
                  <text
                    x={node.x + nodeWidth / 2}
                    y={node.y + 56}
                    textAnchor="middle"
                    className="text-xs font-bold"
                    fill={isRed ? '#EF4444' : '#F97316'}
                  >
                    +{node.impact_ms}ms
                  </text>
                )}
                
                {/* Risk Badge */}
                <text
                  x={node.x + nodeWidth / 2}
                  y={node.y + 72}
                  textAnchor="middle"
                  className="text-xs font-bold uppercase"
                  fill={colors.stroke}
                >
                  {node.risk_level}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-sm pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-bold mb-1">Why is this {hoveredNode.risk_level.toUpperCase()}?</div>
          <div className="text-slate-200 leading-relaxed">{hoveredNode.explanation}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-3 pt-3 border-t-2 border-slate-200">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
            <span className="text-slate-600">Low Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded"></div>
            <span className="text-slate-600">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-500 rounded"></div>
            <span className="text-slate-600">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded animate-pulse"></div>
            <span className="text-slate-600 font-bold">CRITICAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

