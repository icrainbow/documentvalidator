'use client';

/**
 * Case4Container
 * 
 * Top-level orchestrator for IT Review Mode.
 * Owns ALL Case 4 state, timeline, and animation logic.
 * 
 * Strict Mode safe: useRef guard prevents double-start.
 * Cleanup: all timers cleared on unmount.
 */

import React, { useState, useEffect, useRef } from 'react';
import Case4ModeHeader from './Case4ModeHeader';
import Case4BulletinPanel from './Case4BulletinPanel';
import Case4ReasoningTrace from './Case4ReasoningTrace';
import Case4RiskHeatmap from './Case4RiskHeatmap';
import Case4BriefingPanel from './Case4BriefingPanel';
import { DEMO_IT_BULLETINS, DEMO_RISK_NODES, DEMO_BRIEFINGS, RiskNode } from '@/app/lib/case4/demoCase4Data';
import { CASE4_TIMELINE, REASONING_STEPS, HEATMAP_UPDATES } from '@/app/lib/case4/case4Timeline';

type Case4State = 'idle' | 'bulletins_loading' | 'analyzing' | 'risk_identified' | 'briefing_ready';

interface Case4ContainerProps {
  onExit: () => void;
}

export default function Case4Container({ onExit }: Case4ContainerProps) {
  // State machine
  const [case4State, setCase4State] = useState<Case4State>('idle');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  
  // Data
  const [bulletins] = useState(DEMO_IT_BULLETINS);
  const [riskNodes, setRiskNodes] = useState<RiskNode[]>(DEMO_RISK_NODES);
  const [briefings] = useState(DEMO_BRIEFINGS);
  const [activeBriefingTab, setActiveBriefingTab] = useState('Technical Architect');
  
  // Animation guards
  const hasStartedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Timeline orchestration
  useEffect(() => {
    // Strict Mode guard: prevent double-start
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    // Initialize
    setCase4State('bulletins_loading');
    startTimeRef.current = performance.now();
    
    // Animation loop: update currentTimeMs
    const animate = () => {
      if (startTimeRef.current === null) return;
      
      const elapsed = performance.now() - startTimeRef.current;
      setCurrentTimeMs(elapsed);
      
      // State transitions based on absolute timeline
      if (elapsed >= CASE4_TIMELINE.STATE_BRIEFING_READY) {
        setCase4State('briefing_ready');
      } else if (elapsed >= CASE4_TIMELINE.STATE_RISK_IDENTIFIED) {
        setCase4State('risk_identified');
      } else if (elapsed >= CASE4_TIMELINE.STATE_ANALYZING) {
        setCase4State('analyzing');
      }
      
      // Heatmap updates
      HEATMAP_UPDATES.forEach(update => {
        if (elapsed >= update.atMs && elapsed < update.atMs + 50) {
          // Update node risk level (only once per update)
          setRiskNodes(prev => prev.map(node => 
            node.id === update.nodeId
              ? { ...node, risk_level: update.riskLevel }
              : node
          ));
        }
      });
      
      // Continue animation if not at final state
      if (elapsed < CASE4_TIMELINE.STATE_BRIEFING_READY + 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);
  
  // Show briefings only when ready
  const showBriefings = case4State === 'briefing_ready';
  
  return (
    <div className="fixed inset-0 bg-purple-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Header (10% height) */}
        <Case4ModeHeader onExit={onExit} />
        
        {/* Content Area */}
        <div className="flex-1 p-6 space-y-4 max-w-7xl mx-auto w-full">
          {/* Bulletins Panel (15% height) */}
          <Case4BulletinPanel
            bulletins={bulletins}
            currentTime={currentTimeMs}
          />
          
          {/* Reasoning Trace (10% height) */}
          <Case4ReasoningTrace
            steps={REASONING_STEPS}
            currentTime={currentTimeMs}
          />
          
          {/* Risk Heatmap (40% height) */}
          <Case4RiskHeatmap
            nodes={riskNodes}
            currentTime={currentTimeMs}
          />
          
          {/* Briefings Panel (25% height) */}
          {showBriefings && (
            <Case4BriefingPanel
              briefings={briefings}
              activeTab={activeBriefingTab}
              onTabChange={setActiveBriefingTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}

