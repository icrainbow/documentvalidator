'use client';

/**
 * Case4Container (V2 - Timeline-Driven)
 * 
 * Top-level orchestrator for IT Review Mode.
 * ALL state driven by useCase4Timeline hook (no internal timers).
 * 
 * Strict Mode safe: timeline hook handles guards.
 * Cleanup: hook clears all timers on unmount.
 */

import React, { useState } from 'react';
import Case4ModeHeader from './Case4ModeHeader';
import Case4BulletinPanelV2 from './Case4BulletinPanelV2';
import Case4ReasoningTraceV2 from './Case4ReasoningTraceV2';
import Case4RiskHeatmapV2 from './Case4RiskHeatmapV2';
import Case4BriefingPanel from './Case4BriefingPanel';
import { DEMO_IT_BULLETINS, DEMO_BRIEFINGS } from '@/app/lib/case4/demoCase4Data';
import { useCase4Timeline } from './useCase4Timeline';

interface Case4ContainerProps {
  onExit: () => void;
}

export default function Case4ContainerV2({ onExit }: Case4ContainerProps) {
  // Timeline state machine (single source of truth)
  const { timelineState, elapsedMs } = useCase4Timeline({ enabled: true });
  
  // Local UI-only state
  const [activeBriefingTab, setActiveBriefingTab] = useState('Technical Architect');
  
  // Derive display states from timeline
  const showBriefings = timelineState.briefingsReady;
  const currentPhase = timelineState.phase;
  
  // Phase labels for UI
  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'idle': return 'Initializing...';
      case 'ingesting': return 'Ingesting Bulletins';
      case 'analyzing': return 'Analyzing Cross-Bulletin Interactions';
      case 'risk_updates': return 'Updating Risk Heatmap';
      case 'briefing_ready': return 'Briefings Ready';
      default: return '';
    }
  };
  
  return (
    <div className="fixed inset-0 bg-purple-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Header (10% height) */}
        <Case4ModeHeader onExit={onExit} />
        
        {/* Timeline Indicator (NEW) */}
        <div className="bg-purple-600 text-white px-6 py-2 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wide">
                {getPhaseLabel()}
              </span>
              <span className="text-xs text-purple-200">
                t={Math.round(elapsedMs)}ms
              </span>
            </div>
            
            {/* Phase progress dots */}
            <div className="flex items-center gap-2">
              {(['ingesting', 'analyzing', 'risk_updates', 'briefing_ready'] as const).map((phase, idx) => {
                const phases = ['ingesting', 'analyzing', 'risk_updates', 'briefing_ready'] as const;
                const currentIdx = phases.indexOf(currentPhase as any);
                const thisIdx = phases.indexOf(phase);
                
                return (
                  <div
                    key={phase}
                    className={`w-2 h-2 rounded-full transition-all ${
                      timelineState.phase === phase
                        ? 'bg-white scale-125'
                        : thisIdx < currentIdx
                        ? 'bg-purple-300'
                        : 'bg-purple-700'
                    }`}
                    title={phase}
                  />
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6 space-y-4 max-w-7xl mx-auto w-full">
          {/* Bulletins Panel (15% height) */}
          <Case4BulletinPanelV2
            bulletins={DEMO_IT_BULLETINS}
            bulletinStates={timelineState.bulletins}
          />
          
          {/* Reasoning Trace (10% height) */}
          <Case4ReasoningTraceV2
            steps={timelineState.reasoningSteps}
          />
          
          {/* Risk Heatmap (40% height) */}
          <Case4RiskHeatmapV2
            nodeStates={timelineState.heatmapNodes}
          />
          
          {/* Briefings Panel (25% height) */}
          {showBriefings && (
            <Case4BriefingPanel
              briefings={DEMO_BRIEFINGS}
              activeTab={activeBriefingTab}
              onTabChange={setActiveBriefingTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}

