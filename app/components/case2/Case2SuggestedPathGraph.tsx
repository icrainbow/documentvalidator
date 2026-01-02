'use client';

/**
 * Case2SuggestedPathGraph
 * 
 * SVG-based visualization of the 4-step exception approval path.
 * 
 * Node types and shapes:
 * - data_gap: Rectangle with dashed border
 * - validation: Rounded rectangle, solid border
 * - bottleneck: Diamond shape
 * - decision: Bold rounded rectangle
 * 
 * Layout: Vertical flowchart (top-to-bottom)
 */

import React from 'react';
import { Case2PathStep } from '@/app/lib/case2/demoCase2Data';

interface Case2SuggestedPathGraphProps {
  steps: Case2PathStep[];
}

export default function Case2SuggestedPathGraph({ steps }: Case2SuggestedPathGraphProps) {
  const nodeWidth = 280;
  const nodeHeight = 100;
  const horizontalSpacing = 320;
  const verticalSpacing = 150;
  const startX = 50;
  const startY = 40;
  
  // Calculate SVG dimensions
  const svgWidth = startX * 2 + nodeWidth;
  const svgHeight = startY + (steps.length * (nodeHeight + verticalSpacing));
  
  const renderNode = (step: Case2PathStep, index: number) => {
    const x = startX;
    const y = startY + index * (nodeHeight + verticalSpacing);
    const centerX = x + nodeWidth / 2;
    const centerY = y + nodeHeight / 2;
    
    // Node colors by type
    const colors = {
      data_gap: { fill: '#DBEAFE', stroke: '#3B82F6', strokeWidth: 2, dashArray: '5,5' },
      validation: { fill: '#E0E7FF', stroke: '#6366F1', strokeWidth: 2, dashArray: 'none' },
      bottleneck: { fill: '#FED7AA', stroke: '#F97316', strokeWidth: 3, dashArray: 'none' },
      decision: { fill: '#D1FAE5', stroke: '#10B981', strokeWidth: 3, dashArray: 'none' }
    };
    
    const style = colors[step.type];
    
    return (
      <g key={step.id}>
        {/* Node shape */}
        {step.type === 'bottleneck' ? (
          // Diamond shape for bottleneck
          <path
            d={`M ${centerX} ${y} L ${x + nodeWidth} ${centerY} L ${centerX} ${y + nodeHeight} L ${x} ${centerY} Z`}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
          />
        ) : (
          // Rounded rectangle for others
          <rect
            x={x}
            y={y}
            width={nodeWidth}
            height={nodeHeight}
            rx={step.type === 'data_gap' ? 8 : 12}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            strokeDasharray={style.dashArray}
          />
        )}
        
        {/* Label */}
        <text
          x={centerX}
          y={centerY - 15}
          textAnchor="middle"
          className="font-bold text-sm"
          fill="#1E293B"
        >
          {step.label}
        </text>
        
        {/* Detail (truncated) */}
        <foreignObject
          x={x + 10}
          y={centerY}
          width={nodeWidth - 20}
          height={60}
        >
          <div className="text-xs text-slate-700 leading-tight">
            {step.detail.length > 80 ? step.detail.substring(0, 80) + '...' : step.detail}
          </div>
        </foreignObject>
        
        {/* Arrow to next node */}
        {index < steps.length - 1 && (
          <g>
            <line
              x1={centerX}
              y1={y + nodeHeight}
              x2={centerX}
              y2={y + nodeHeight + verticalSpacing - 10}
              stroke="#64748B"
              strokeWidth={2}
            />
            {/* Arrow head */}
            <polygon
              points={`${centerX},${y + nodeHeight + verticalSpacing - 10} ${centerX - 6},${y + nodeHeight + verticalSpacing - 18} ${centerX + 6},${y + nodeHeight + verticalSpacing - 18}`}
              fill="#64748B"
            />
          </g>
        )}
      </g>
    );
  };
  
  const renderReferences = (step: Case2PathStep, index: number) => {
    const x = startX;
    const y = startY + index * (nodeHeight + verticalSpacing) + nodeHeight + 5;
    
    return (
      <foreignObject
        key={`ref-${step.id}`}
        x={x}
        y={y}
        width={nodeWidth}
        height={40}
      >
        <div className="text-xs text-slate-500 italic">
          {step.references.slice(0, 2).join(', ')}
        </div>
      </foreignObject>
    );
  };
  
  return (
    <div className="mb-6 bg-white border-2 border-slate-300 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📋</span>
        <h3 className="text-lg font-bold text-slate-800">Suggested Exception Approval Path</h3>
      </div>
      
      <div className="bg-slate-50 rounded-lg p-4 overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="mx-auto"
        >
          {steps.map((step, index) => renderNode(step, index))}
          {steps.map((step, index) => renderReferences(step, index))}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t-2 border-slate-200">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 border-dashed rounded"></div>
            <span className="text-slate-600">Data Gap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-100 border-2 border-indigo-500 rounded"></div>
            <span className="text-slate-600">Validation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-500 rounded transform rotate-45"></div>
            <span className="text-slate-600">Bottleneck</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
            <span className="text-slate-600">Decision</span>
          </div>
        </div>
      </div>
    </div>
  );
}


