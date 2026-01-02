'use client';

/**
 * Case2ThinkingTracePanel
 * 
 * Animated panel showing the "Thinking Process" - retrieval of 3 demo sources.
 * 
 * Timeline:
 * t=0ms:    Source A queued → retrieving
 * t=600ms:  Source B queued → retrieving
 * t=1200ms: Source C queued → retrieving
 * t=1800ms: Source A retrieving → done
 * t=2400ms: Source B retrieving → done
 * t=2800ms: Source C retrieving → done
 * t=3000ms: Call onComplete()
 * 
 * Strict Mode safe: uses hasStartedRef to prevent double-start.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Case2Source } from '@/app/lib/case2/demoCase2Data';

type SourceStatus = 'queued' | 'retrieving' | 'done';

interface Case2ThinkingTracePanelProps {
  sources: Case2Source[];
  isAnimating: boolean;
  onComplete: () => void;
}

export default function Case2ThinkingTracePanel({
  sources,
  isAnimating,
  onComplete
}: Case2ThinkingTracePanelProps) {
  const [sourceStates, setSourceStates] = useState<Map<number, SourceStatus>>(
    new Map(sources.map((_, idx) => [idx, 'queued']))
  );
  
  const hasStartedRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  useEffect(() => {
    if (!isAnimating || hasStartedRef.current) return;
    
    hasStartedRef.current = true;
    const timers: NodeJS.Timeout[] = [];
    
    // Source A starts retrieving immediately
    setSourceStates(prev => {
      const next = new Map(prev);
      next.set(0, 'retrieving');
      return next;
    });
    
    // Source B starts retrieving at t=600ms
    timers.push(setTimeout(() => {
      setSourceStates(prev => {
        const next = new Map(prev);
        next.set(1, 'retrieving');
        return next;
      });
    }, 600));
    
    // Source C starts retrieving at t=1200ms
    timers.push(setTimeout(() => {
      setSourceStates(prev => {
        const next = new Map(prev);
        next.set(2, 'retrieving');
        return next;
      });
    }, 1200));
    
    // Source A completes at t=1800ms
    timers.push(setTimeout(() => {
      setSourceStates(prev => {
        const next = new Map(prev);
        next.set(0, 'done');
        return next;
      });
    }, 1800));
    
    // Source B completes at t=2400ms
    timers.push(setTimeout(() => {
      setSourceStates(prev => {
        const next = new Map(prev);
        next.set(1, 'done');
        return next;
      });
    }, 2400));
    
    // Source C completes at t=2800ms
    timers.push(setTimeout(() => {
      setSourceStates(prev => {
        const next = new Map(prev);
        next.set(2, 'done');
        return next;
      });
    }, 2800));
    
    // Call onComplete at t=3000ms
    timers.push(setTimeout(() => {
      onComplete();
    }, 3000));
    
    timersRef.current = timers;
    
    // Cleanup on unmount
    return () => {
      timers.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isAnimating, onComplete]);
  
  const getStatusBadge = (status: SourceStatus) => {
    switch (status) {
      case 'queued':
        return (
          <span className="px-2 py-1 rounded text-xs font-bold bg-slate-200 text-slate-600">
            Queued
          </span>
        );
      case 'retrieving':
        return (
          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Retrieving
          </span>
        );
      case 'done':
        return (
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
            ✓ Done
          </span>
        );
    }
  };
  
  const getTypeBadge = (type: Case2Source['type']) => {
    const styles = {
      'PPT': 'bg-orange-100 text-orange-800',
      'Confluence': 'bg-purple-100 text-purple-800',
      'Email-PDF': 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${styles[type]}`}>
        {type}
      </span>
    );
  };
  
  return (
    <div className="mb-6 bg-white border-2 border-slate-300 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔍</span>
        <h3 className="text-lg font-bold text-slate-800">Thinking Process</h3>
      </div>
      
      <div className="space-y-4">
        {sources.map((source, idx) => {
          const status = sourceStates.get(idx) || 'queued';
          
          return (
            <div key={source.id} className="border-2 border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeBadge(source.type)}
                  {getStatusBadge(status)}
                </div>
              </div>
              
              <h4 className="font-bold text-sm text-slate-800 mb-1">
                {source.title}
              </h4>
              
              <p className="text-xs text-slate-600 leading-relaxed">
                {source.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}


