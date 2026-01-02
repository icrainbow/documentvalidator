'use client';

/**
 * PostRejectAnalysisPanel
 * 
 * Phase 8 layered output after EDD-triggered rejection:
 * 1) De-obfuscation tasks (A/B/C)
 * 2) Parallel skill invocation (3 skills)
 * 3) Highlight findings (SOF mismatch + policy)
 * 4) Evidence Dashboard + Logic Graph (rendered by parent)
 * 
 * DEMO ONLY - Read-only, deterministic output, no API calls from this component.
 */

import React from 'react';

interface Task {
  id: string;
  title: string;
  status: 'done' | 'running' | 'pending';
  detail?: string;
}

interface Skill {
  name: string;
  status: 'done' | 'running' | 'pending';
  detail?: string;
  duration_ms?: number;
}

interface Finding {
  severity: 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail: string;
  evidence_ref?: string;
}

export interface PostRejectAnalysisData {
  triggered: boolean;
  reviewer_text: string;
  tasks: Task[];
  skills: Skill[];
  findings: Finding[];
  evidence?: any;
  graph_patch?: any;
}

interface PostRejectAnalysisPanelProps {
  data: PostRejectAnalysisData;
}

export default function PostRejectAnalysisPanel({ data }: PostRejectAnalysisPanelProps) {
  if (!data.triggered) return null;
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-100 border-red-300';
      case 'medium': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'low': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      default: return 'text-blue-700 bg-blue-100 border-blue-300';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return '✓';
      case 'running': return '⏳';
      case 'pending': return '○';
      default: return '?';
    }
  };
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-5 mb-6 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
        <h3 className="text-base font-bold text-purple-900">
          Post-Reject Analysis (Phase 8)
        </h3>
        <span className="ml-auto text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded font-semibold">
          EDD TRIGGERED
        </span>
      </div>
      
      {/* 1) De-obfuscation Tasks */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
          <span className="text-purple-600">1.</span> De-obfuscation Tasks
        </h4>
        <div className="bg-white rounded-lg p-3 border border-purple-200 space-y-2">
          {data.tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-2 text-sm">
              <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                task.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {getStatusIcon(task.status)}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  <span className="text-purple-600 font-bold mr-1">Task {task.id}:</span>
                  {task.title}
                </p>
                {task.detail && (
                  <p className="text-xs text-gray-600 mt-1 italic">→ {task.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 2) Parallel Skills */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
          <span className="text-purple-600">2.</span> Parallel Skill Invocation
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {data.skills.map((skill, idx) => (
            <div 
              key={idx} 
              className={`bg-white rounded-lg p-3 border ${
                skill.status === 'done' 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-gray-800">{skill.name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  skill.status === 'done' 
                    ? 'bg-green-200 text-green-800' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {skill.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-600">{skill.detail}</p>
              {skill.duration_ms && (
                <p className="text-xs text-gray-500 mt-1">⏱️ {skill.duration_ms}ms</p>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* 3) Findings */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
          <span className="text-purple-600">3.</span> Highlight Findings
        </h4>
        <div className="space-y-2">
          {data.findings.map((finding, idx) => (
            <div 
              key={idx} 
              className={`rounded-lg p-3 border-l-4 ${getSeverityColor(finding.severity)}`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-sm font-bold">{finding.title}</span>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-white bg-opacity-50">
                  {finding.severity}
                </span>
              </div>
              <p className="text-xs leading-relaxed">{finding.detail}</p>
              {finding.evidence_ref && (
                <p className="text-xs mt-2 font-mono text-gray-600">
                  📎 {finding.evidence_ref}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Note about Evidence Dashboard and Logic Graph below */}
      <div className="mt-4 pt-3 border-t border-purple-200">
        <p className="text-xs text-purple-700 italic text-center">
          ↓ Evidence Dashboard and Logic Graph rendered below ↓
        </p>
      </div>
    </div>
  );
}

