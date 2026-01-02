'use client';

/**
 * DemoTracePlayer
 * 
 * Plays a deterministic timeline of demo EDD analysis events.
 * Shows tasks, skills (parallel), findings, and actions.
 * 
 * DEMO ONLY - Read-only, no side effects, no API calls.
 */

import React, { useState, useEffect, useRef } from 'react';

interface DemoTraceEvent {
  t: number; // Timestamp offset in ms
  kind: 'task' | 'skill' | 'finding' | 'action';
  title: string;
  detail?: string;
  status?: 'start' | 'running' | 'done';
  severity?: 'high' | 'medium' | 'low' | 'info';
}

interface DemoTracePlayerProps {
  trace: DemoTraceEvent[];
  runId: string | null;
}

export default function DemoTracePlayer({ trace, runId }: DemoTracePlayerProps) {
  const [displayedEvents, setDisplayedEvents] = useState<DemoTraceEvent[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const prevRunIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Reset if runId changes
    if (runId !== prevRunIdRef.current) {
      prevRunIdRef.current = runId;
      setDisplayedEvents([]);
      setIsPlaying(true);
      setIsCompleted(false);
      
      // Clear existing timers
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    }
    
    if (!trace || trace.length === 0) {
      setIsCompleted(true);
      setIsPlaying(false);
      return;
    }
    
    // Schedule events
    trace.forEach((event) => {
      const timer = setTimeout(() => {
        setDisplayedEvents(prev => [...prev, event]);
        
        // Check if this is the last event
        if (event === trace[trace.length - 1]) {
          setIsPlaying(false);
          setIsCompleted(true);
        }
      }, event.t);
      
      timersRef.current.push(timer);
    });
    
    // Cleanup on unmount
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, [trace, runId]);
  
  if (!trace || trace.length === 0) {
    return null;
  }
  
  // Group events by kind for rendering
  const tasks = displayedEvents.filter(e => e.kind === 'task');
  const skills = displayedEvents.filter(e => e.kind === 'skill');
  const findings = displayedEvents.filter(e => e.kind === 'finding');
  const actions = displayedEvents.filter(e => e.kind === 'action');
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">
            Agent Live Analysis Log
          </h4>
          <span className="text-xs text-gray-500">(Demo: parallel skill invocation + evidence synthesis)</span>
        </div>
        <div className="flex items-center gap-2">
          {isPlaying && (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-semibold">LIVE</span>
            </>
          )}
          {isCompleted && (
            <span className="text-xs text-gray-500 font-semibold">COMPLETED</span>
          )}
        </div>
      </div>
      
      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-blue-900 mb-2">Tasks</h5>
          <ul className="space-y-1">
            {tasks.map((task, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-blue-600 mt-0.5">•</span>
                <div>
                  <span className="font-medium text-blue-900">{task.title}:</span>
                  <span className="text-blue-700 ml-1">{task.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Skills (parallel) */}
      {skills.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <h5 className="text-xs font-semibold text-purple-900 mb-2">
            Parallel Skills Execution
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Group skills by title to show running -> done transition */}
            {uniqueSkillTitles(skills).map((title) => {
              const skillEvents = skills.filter(s => s.title === title);
              const latestEvent = skillEvents[skillEvents.length - 1];
              
              return (
                <div
                  key={title}
                  className={`
                    rounded p-2 text-xs border
                    ${latestEvent.status === 'running' 
                      ? 'bg-yellow-50 border-yellow-300' 
                      : 'bg-green-50 border-green-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={latestEvent.status} />
                    <span className="font-mono font-semibold text-gray-900 text-[10px]">
                      {title}
                    </span>
                  </div>
                  <p className={`
                    text-[10px]
                    ${latestEvent.status === 'running' ? 'text-yellow-700' : 'text-green-700'}
                  `}>
                    {latestEvent.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Findings */}
      {findings.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-gray-900">Findings</h5>
          {findings.map((finding, idx) => (
            <div
              key={idx}
              className={`
                rounded-lg p-3 border-l-4 text-xs
                ${finding.severity === 'high' 
                  ? 'bg-red-50 border-red-500' 
                  : 'bg-blue-50 border-blue-500'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={finding.severity} />
                <span className="font-semibold text-gray-900">{finding.title}</span>
              </div>
              <p className="text-gray-700">{finding.detail}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Actions */}
      {actions.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3">
          {actions.map((action, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-900">{action.title}</span>
              </div>
              <p className="text-xs text-amber-800 ml-4">{action.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function uniqueSkillTitles(skills: DemoTraceEvent[]): string[] {
  const titles = new Set<string>();
  skills.forEach(s => titles.add(s.title));
  return Array.from(titles);
}

function StatusBadge({ status }: { status?: string }) {
  if (status === 'running') {
    return (
      <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-800 rounded text-[9px] font-bold">
        RUNNING
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="px-1.5 py-0.5 bg-green-200 text-green-800 rounded text-[9px] font-bold">
        DONE
      </span>
    );
  }
  return null;
}

function SeverityBadge({ severity }: { severity?: string }) {
  if (severity === 'high') {
    return (
      <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[9px] font-bold">
        HIGH
      </span>
    );
  }
  if (severity === 'info') {
    return (
      <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[9px] font-bold">
        INFO
      </span>
    );
  }
  return null;
}

