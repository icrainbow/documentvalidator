'use client';

/**
 * Impact Agentic Review Card (Read-only Derived)
 * 
 * Displays multi-agent perspective analysis derived from Impact Simulator output.
 * Pure component: no effects, no state, no timers.
 * 
 * ISOLATION: Only renders when Impact Simulator analysis is complete (phase='done').
 */

import React from 'react';
import { ConsumerSystem } from '@/app/lib/impactSimulator/demoImpactData';

interface ImpactAgenticReviewCardProps {
  systems: ConsumerSystem[];
  scenarioTitle: string;
}

export default function ImpactAgenticReviewCard({
  systems,
  scenarioTitle
}: ImpactAgenticReviewCardProps): JSX.Element {
  
  // ============================================================
  // PURE DERIVED METRICS (Deterministic)
  // ============================================================
  
  const total = systems.length;
  const criticalCount = systems.filter(s => s.criticality === 'critical').length;
  const highCount = systems.filter(s => s.criticality === 'high').length;
  const mediumCount = systems.filter(s => s.criticality === 'medium').length;
  const lowCount = systems.filter(s => s.criticality === 'low').length;
  
  // Risk veto logic
  const riskVeto = criticalCount > 0;
  const decision = riskVeto ? 'Conditional Approval' : 'Auto-Approval Eligible';
  
  // Top 3 impacted systems (stable sort: critical > high > medium > low, preserve original order within same severity)
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  
  // Create index map for stable sort
  const systemIndexMap = new Map(systems.map((s, idx) => [s.id, idx]));
  
  const topImpacted = [...systems]
    .sort((a, b) => {
      const rankDiff = severityRank[a.criticality] - severityRank[b.criticality];
      if (rankDiff !== 0) return rankDiff;
      // Preserve original order by comparing indices
      return (systemIndexMap.get(a.id) || 0) - (systemIndexMap.get(b.id) || 0);
    })
    .slice(0, 3);
  
  // Extract critical system names for recommendations
  const criticalSystems = systems.filter(s => s.criticality === 'critical');
  const criticalNames = criticalSystems.slice(0, 2).map(s => s.name).join(', ');
  
  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-6 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🤖</span>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Agentic IT Impact Review</h3>
          <p className="text-xs text-slate-500">
            Derived from Impact Simulator output · Read-only
          </p>
        </div>
      </div>
      
      {/* Section A: Agent Perspectives */}
      <div className="space-y-3 mb-4">
        
        {/* 1) Change Interpreter Agent */}
        <details className="border border-slate-200 rounded-lg p-3" open>
          <summary className="font-bold text-sm text-slate-700 cursor-pointer hover:text-purple-700 transition-colors">
            🔍 Change Interpreter Agent
          </summary>
          <div className="mt-2 text-sm text-slate-600 space-y-2">
            <p><strong>Scenario:</strong> {scenarioTitle}</p>
            <p><strong>Dependent systems identified:</strong> {total}/{total}</p>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Change vectors:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-600">
                <li>Routing change: mailbox removal → reroute to REST API or alternative intake</li>
                <li>Data retention & archival export requirements pre-shutdown</li>
                <li>Consumer contract deprecation and migration handling</li>
              </ul>
            </div>
          </div>
        </details>
        
        {/* 2) System Impact Agent */}
        <details className="border border-slate-200 rounded-lg p-3" open>
          <summary className="font-bold text-sm text-slate-700 cursor-pointer hover:text-purple-700 transition-colors">
            ⚙️ System Impact Agent
          </summary>
          <div className="mt-2 text-sm text-slate-600 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">
                Critical: {criticalCount}
              </span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded">
                High: {highCount}
              </span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                Medium: {mediumCount}
              </span>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">
                Low: {lowCount}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Top impacted systems:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-600">
                {topImpacted.map(sys => (
                  <li key={sys.id}>
                    <strong>{sys.name}</strong> 
                    <span className="text-slate-500"> ({sys.criticality})</span>
                    <span className="text-slate-400"> — {sys.description}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Operational notes:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 text-slate-600">
                <li>Parallel run / dual-routing required for critical consumers during transition</li>
                <li>Audit trail and event continuity validation required for compliance</li>
              </ul>
            </div>
          </div>
        </details>
        
        {/* 3) Risk & Compliance Agent */}
        <details className="border border-slate-200 rounded-lg p-3" open>
          <summary className="font-bold text-sm text-slate-700 cursor-pointer hover:text-purple-700 transition-colors">
            🛡️ Risk & Compliance Agent
          </summary>
          <div className="mt-2 text-sm text-slate-600 space-y-2">
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Policy gates:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {riskVeto && (
                  <li className="text-red-700 font-semibold">
                    Critical dependency detected → HITL (Human-in-the-Loop) mandatory
                  </li>
                )}
                <li className="text-slate-600">
                  Decommission requires retention export validation + audit sign-off
                </li>
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-2">
              <p className="text-xs font-bold text-slate-700">
                Verdict: {riskVeto ? (
                  <span className="text-red-700">VETO full auto-approval</span>
                ) : (
                  <span className="text-green-700">No veto</span>
                )}
              </p>
            </div>
          </div>
        </details>
      </div>
      
      {/* Section B: Detected Conflicts */}
      <div className="mb-4 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
          <span>⚡</span>
          <span>Detected Conflicts</span>
        </h4>
        <div className="space-y-2">
          {riskVeto && (
            <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
              <p className="font-semibold text-yellow-800 text-xs mb-1">
                Conflict #1: Efficiency vs Control
              </p>
              <div className="text-xs text-slate-700 space-y-1">
                <p>
                  <strong className="text-blue-700">System Impact view:</strong> 
                  {' '}Phased rollout is feasible with parallel routing for critical consumers
                </p>
                <p>
                  <strong className="text-red-700">Risk & Compliance view:</strong> 
                  {' '}Critical dependencies block auto-deployment → HITL gate required
                </p>
              </div>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
            <p className="font-semibold text-yellow-800 text-xs mb-1">
              Conflict #{riskVeto ? '2' : '1'}: Speed vs Retention Completeness
            </p>
            <div className="text-xs text-slate-700 space-y-1">
              <p>
                <strong className="text-blue-700">System Impact view:</strong> 
                {' '}Prefer faster decommission to reduce operational cost
              </p>
              <p>
                <strong className="text-red-700">Risk & Compliance view:</strong> 
                {' '}Retention export + audit trail validation required pre-shutdown
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Section C: Synthesis Decision */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
          <span>🎯</span>
          <span>Synthesis Decision</span>
        </h4>
        <div className="bg-purple-50 border border-purple-300 rounded p-4">
          <p className="font-bold text-purple-800 mb-2 text-sm">{decision}</p>
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-700 mb-1">Required actions:</p>
            <ol className="list-decimal list-inside text-xs space-y-1 text-slate-600">
              <li>Phase 1: Retention export validation + parallel routing setup</li>
              <li>
                Phase 2: Consumer contract update for critical systems: 
                <strong className="text-slate-800"> {criticalNames || 'N/A'}</strong>
              </li>
              <li>Phase 3: Decommission after critical consumer readiness confirmation</li>
            </ol>
          </div>
          <p className="text-xs text-slate-500 italic">
            {riskVeto && (
              <>
                ⚠️ Risk veto applied due to {criticalCount} critical {criticalCount === 1 ? 'dependency' : 'dependencies'}.
                {' '}
              </>
            )}
            Decision derived from simulator output (read-only).
          </p>
        </div>
      </div>
    </div>
  );
}

