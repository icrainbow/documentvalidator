'use client';

/**
 * PostRejectAnalysisPanel
 * 
 * Phase 8 layered output after EDD-triggered rejection:
 * 1) De-obfuscation tasks (A/B/C)
 * 2) Parallel skill invocation (3 skills) - WITH ANIMATION
 * 3) Highlight findings (SOF mismatch + policy)
 * 4) Evidence Dashboard (rendered by parent)
 * 
 * DEMO ONLY - Read-only, deterministic output, no API calls from this component.
 * Fake concurrency animation with Skip/Replay controls.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  run_id?: string; // For cleanup key
}

interface PostRejectAnalysisPanelProps {
  data: PostRejectAnalysisData;
}

type Phase = 'idle' | 'tasks' | 'skills' | 'findings' | 'evidence' | 'done';
type SkillStatus = 'queued' | 'running' | 'done';

interface SkillState {
  status: SkillStatus;
  progress: number; // 0-100
}

export default function PostRejectAnalysisPanel({ data }: PostRejectAnalysisPanelProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [skillStates, setSkillStates] = useState<Map<number, SkillState>>(new Map());
  const [allowReplay, setAllowReplay] = useState(false);
  
  const hasStartedRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const runIdRef = useRef<string | null>(null);
  
  if (!data.triggered) return null;
  
  // Cleanup function
  const cleanup = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);
  
  // Schedule deterministic animation
  const scheduleAnimation = useCallback(() => {
    cleanup();
    hasStartedRef.current = true;
    setAllowReplay(false);
    
    // Initialize skill states as queued
    const initialStates = new Map<number, SkillState>();
    data.skills.forEach((_, idx) => {
      initialStates.set(idx, { status: 'queued', progress: 0 });
    });
    setSkillStates(initialStates);
    
    // t=0ms: Show tasks
    setPhase('tasks');
    
    // Helper to schedule skill start
    const startSkill = (idx: number, delay: number) => {
      const timer = setTimeout(() => {
        setSkillStates(prev => {
          const next = new Map(prev);
          next.set(idx, { status: 'running', progress: 10 });
          return next;
        });
        
        // Start progress animation
        const interval = setInterval(() => {
          setSkillStates(prev => {
            const next = new Map(prev);
            const current = next.get(idx);
            if (current && current.status === 'running' && current.progress < 90) {
              next.set(idx, { ...current, progress: Math.min(90, current.progress + 5) });
            }
            return next;
          });
        }, 120);
        intervalsRef.current.push(interval);
      }, delay);
      timersRef.current.push(timer);
    };
    
    // Helper to mark skill done
    const doneSkill = (idx: number, delay: number) => {
      const timer = setTimeout(() => {
        setSkillStates(prev => {
          const next = new Map(prev);
          next.set(idx, { status: 'done', progress: 100 });
          return next;
        });
      }, delay);
      timersRef.current.push(timer);
    };
    
    // Schedule skill events
    startSkill(0, 400);   // Skill 0 running at t=400ms
    startSkill(1, 650);   // Skill 1 running at t=650ms
    startSkill(2, 900);   // Skill 2 running at t=900ms
    
    doneSkill(1, 2000);   // Skill 1 done at t=2000ms
    doneSkill(0, 2600);   // Skill 0 done at t=2600ms
    doneSkill(2, 3200);   // Skill 2 done at t=3200ms
    
    // t=3300ms: Show findings
    const findingsTimer = setTimeout(() => {
      setPhase('findings');
    }, 3300);
    timersRef.current.push(findingsTimer);
    
    // t=3600ms: Show evidence note
    const evidenceTimer = setTimeout(() => {
      setPhase('evidence');
    }, 3600);
    timersRef.current.push(evidenceTimer);
    
    // t=3601ms: Done, enable replay
    const doneTimer = setTimeout(() => {
      setPhase('done');
      setAllowReplay(true);
      cleanup(); // Clear intervals
    }, 3601);
    timersRef.current.push(doneTimer);
  }, [data.skills, cleanup]);
  
  // Skip to final state
  const handleSkip = useCallback(() => {
    cleanup();
    
    // Set all skills to done
    const finalStates = new Map<number, SkillState>();
    data.skills.forEach((_, idx) => {
      finalStates.set(idx, { status: 'done', progress: 100 });
    });
    setSkillStates(finalStates);
    
    setPhase('done');
    setAllowReplay(true);
  }, [data.skills, cleanup]);
  
  // Replay animation
  const handleReplay = useCallback(() => {
    hasStartedRef.current = false;
    setPhase('idle');
    scheduleAnimation();
  }, [scheduleAnimation]);
  
  // Auto-start on mount or runId change
  useEffect(() => {
    const currentRunId = data.run_id || 'default';
    
    // Reset if runId changes
    if (runIdRef.current !== currentRunId) {
      runIdRef.current = currentRunId;
      hasStartedRef.current = false;
      cleanup();
    }
    
    // Start animation (Strict Mode safe)
    if (!hasStartedRef.current && data.triggered) {
      scheduleAnimation();
    }
    
    return () => {
      cleanup();
    };
  }, [data.triggered, data.run_id, scheduleAnimation, cleanup]);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-100 border-red-300';
      case 'medium': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'low': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      default: return 'text-blue-700 bg-blue-100 border-blue-300';
    }
  };
  
  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return '✓';
      case 'running': return '⏳';
      case 'pending': return '○';
      default: return '?';
    }
  };
  
  const getSkillStatusBadge = (state: SkillState) => {
    switch (state.status) {
      case 'done':
        return 'bg-green-200 text-green-800';
      case 'running':
        return 'bg-blue-200 text-blue-800';
      case 'queued':
        return 'bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };
  
  const showSkip = phase !== 'done' && phase !== 'idle';
  const showReplay = allowReplay && phase === 'done';
  
  return (
    <div id="post-reject-analysis" className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-5 mb-6 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
        <h3 className="text-base font-bold text-purple-900">
          Post-Reject Analysis (Phase 8)
        </h3>
        {/* Status Badge */}
        {phase === 'idle' || phase === 'tasks' ? (
          <span className="ml-auto text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded font-semibold">
            Running...
          </span>
        ) : phase === 'done' ? (
          <span className="ml-auto text-xs text-green-700 bg-green-100 px-2 py-1 rounded font-semibold">
            Complete
          </span>
        ) : (
          <span className="ml-auto text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded font-semibold">
            ⏱️ Timeline started
          </span>
        )}
        
        {/* Skip/Replay Controls */}
        {showSkip && (
          <button
            onClick={handleSkip}
            className="ml-2 text-xs text-purple-600 hover:text-purple-800 underline font-semibold"
          >
            Skip →
          </button>
        )}
        {showReplay && (
          <button
            onClick={handleReplay}
            className="ml-2 text-xs text-purple-600 hover:text-purple-800 underline font-semibold flex items-center gap-1"
          >
            <span>🔄</span> Replay
          </button>
        )}
      </div>
      
      {/* 1) De-obfuscation Tasks */}
      {phase !== 'idle' && (
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
                  {getTaskStatusIcon(task.status)}
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
      )}
      
      {/* 2) Parallel Skills */}
      {phase !== 'idle' && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
            <span className="text-purple-600">2.</span> Parallel Skill Invocation
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {data.skills.map((skill, idx) => {
              const state = skillStates.get(idx) || { status: 'queued', progress: 0 };
              
              return (
                <div 
                  key={idx} 
                  className={`bg-white rounded-lg p-3 border transition-all ${
                    state.status === 'done' 
                      ? 'border-green-300 bg-green-50' 
                      : state.status === 'running'
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{skill.name}</span>
                      {state.status === 'running' && (
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getSkillStatusBadge(state)}`}>
                      {state.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  {(state.status === 'running' || state.status === 'done') && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          state.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${state.progress}%` }}
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-600">{skill.detail}</p>
                  {skill.duration_ms && state.status === 'done' && (
                    <p className="text-xs text-gray-500 mt-1">⏱️ {skill.duration_ms}ms</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 3) Findings */}
      {phase === 'findings' || phase === 'evidence' || phase === 'done' ? (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
            <span className="text-purple-600">3.</span> Highlight Findings
          </h4>
          <div className="space-y-2">
            {data.findings.map((finding, idx) => (
              <div 
                key={idx} 
                className={`rounded-lg p-3 border-l-4 ${getSeverityColor(finding.severity)} transition-all animate-fade-in`}
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
      ) : null}
      
      {/* Note about Evidence Dashboard below */}
      {phase !== 'idle' && (
        <div className="mt-4 pt-3 border-t border-purple-200">
          {phase === 'evidence' || phase === 'done' ? (
            <p className="text-xs text-green-700 font-semibold text-center flex items-center justify-center gap-1">
              <span>✓</span> Evidence Dashboard ready below
            </p>
          ) : (
            <p className="text-xs text-purple-700 italic text-center">
              ↓ Evidence Dashboard rendered below ↓
            </p>
          )}
        </div>
      )}
    </div>
  );
}
