'use client';

/**
 * Impact Simulator Panel (UI Layer)
 * 
 * Deterministic mailbox decommissioning what-if simulation.
 * Renders scenario selection, timeline, dependency reveal, and impact stats.
 * 
 * ISOLATION: Does not affect Flow1/Flow2/Case* states.
 */

import React from 'react';
import {
  SimulatorState,
  SimulatorAction,
  TimelineStepStatus
} from '@/app/lib/impactSimulator/impactSimulatorReducer';
import {
  SCENARIOS,
  CONSUMER_SYSTEMS,
  BUSINESS_SCENARIOS
} from '@/app/lib/impactSimulator/demoImpactData';

interface ImpactSimulatorPanelProps {
  state: SimulatorState;
  dispatch: (action: SimulatorAction) => void;
  onExit: () => void;
}

export default function ImpactSimulatorPanel({
  state,
  dispatch,
  onExit
}: ImpactSimulatorPanelProps) {
  
  const getStatusBadge = (status: TimelineStepStatus) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded text-xs font-bold bg-slate-200 text-slate-600">Pending</span>;
      case 'running':
        return (
          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Running
          </span>
        );
      case 'done':
        return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">✓ Done</span>;
    }
  };
  
  const getSeverityBadge = (level: string) => {
    const styles = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${styles[level as keyof typeof styles]}`}>
        {level}
      </span>
    );
  };
  
  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-6 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📡</span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Impact Simulator</h2>
            <p className="text-xs text-slate-500">Deterministic Mailbox Decommissioning Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {state.phase === 'done' && (
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm"
            >
              🔄 Restart
            </button>
          )}
          <button
            onClick={onExit}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold text-sm"
          >
            ← Exit
          </button>
        </div>
      </div>
      
      {/* Awaiting Confirmation Prompt */}
      {state.phase === 'await_confirm' && (
        <div className="mb-6">
          <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-800 mb-1">Ready to Start Analysis</h3>
                <p className="text-sm text-blue-700">
                  The simulator will analyze mailbox decommissioning impact across 16 consumer systems and business scenarios.
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => dispatch({ type: 'CONFIRM_YES' })}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-md flex items-center justify-center gap-2"
          >
            <span>▶️</span>
            <span>Start Analysis</span>
          </button>
        </div>
      )}
      
      {/* Scenario Selection (only show in await_choice phase) */}
      {state.phase === 'await_choice' && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Select Decommissioning Scenario:</h3>
          <div className="grid grid-cols-2 gap-3">
            {SCENARIOS.map((scenario, idx) => (
              <button
                key={scenario.id}
                onClick={() => dispatch({
                  type: 'CHOOSE_SCENARIO',
                  payload: { scenarioId: scenario.id }
                })}
                className="text-left p-4 border-2 border-slate-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-slate-800">{idx + 1}. {scenario.label}</span>
                  {getSeverityBadge(scenario.riskLevel)}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{scenario.description}</p>
                <p className="text-xs text-purple-600 mt-2 font-semibold">
                  Impact: {Math.round(scenario.impactMultiplier * 100)}% of baseline
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Timeline Steps */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Simulation Timeline:</h3>
        <div className="space-y-2">
          {state.timelineSteps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <span className="text-sm text-slate-700">{step.label}</span>
              {getStatusBadge(step.status)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Dependency Reveal (show during running/done) */}
      {(state.phase === 'running' || state.phase === 'done') && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            Dependent Systems Identified: {state.revealedSystems.length} / {CONSUMER_SYSTEMS.length}
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-lg">
            {state.revealedSystems.map((sysId) => {
              const system = CONSUMER_SYSTEMS.find(s => s.id === sysId);
              if (!system) return null;
              return (
                <div
                  key={sysId}
                  className="p-2 bg-white border border-slate-200 rounded text-xs animate-fadeIn"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">{system.name}</span>
                    <span className={`px-1 py-0.5 rounded text-xs ${
                      system.criticality === 'critical' ? 'bg-red-100 text-red-700' :
                      system.criticality === 'high' ? 'bg-orange-100 text-orange-700' :
                      system.criticality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {system.criticality}
                    </span>
                  </div>
                  <p className="text-slate-600">{system.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Business Scenarios Reveal */}
      {(state.phase === 'running' || state.phase === 'done') && state.revealedBusinessScenarios.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            Business Scenarios Analyzed: {state.revealedBusinessScenarios.length} / {BUSINESS_SCENARIOS.length}
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-lg">
            {state.revealedBusinessScenarios.map((bizId) => {
              const biz = BUSINESS_SCENARIOS.find(b => b.id === bizId);
              if (!biz) return null;
              return (
                <div
                  key={bizId}
                  className="p-2 bg-white border border-slate-200 rounded text-xs animate-fadeIn"
                >
                  <p className="font-bold text-slate-800 mb-1">{biz.title}</p>
                  <p className="text-slate-600">{biz.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Impact Stats Summary (show when done) */}
      {state.phase === 'done' && state.impactStats && (
        <div className="border-t-2 border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📊 Impact Analysis Results</h3>
          
          {/* Total Impact */}
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <p className="text-sm text-slate-600 mb-1">Total Messages Affected (Monthly)</p>
            <p className="text-3xl font-bold text-purple-700">
              {state.impactStats.totalMessagesAffected.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Risk Level: {getSeverityBadge(state.impactStats.scenario.riskLevel)}
            </p>
          </div>
          
          {/* By Segment */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Impact by Business Segment:</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(state.impactStats.bySegment).map(([segment, count]) => (
                <div key={segment} className="p-2 bg-slate-50 rounded border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">{segment}</p>
                  <p className="text-lg font-bold text-slate-800">{count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* By Region */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-700 mb-2">Impact by Region:</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(state.impactStats.byRegion).map(([region, count]) => (
                <div key={region} className="p-2 bg-slate-50 rounded border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">{region}</p>
                  <p className="text-lg font-bold text-slate-800">{count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Top Affected Scenarios */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">Top 5 Most Affected Business Scenarios:</h4>
            <div className="space-y-2">
              {state.impactStats.topAffectedScenarios.map(({ scenario, estimatedImpact }, idx) => (
                <div key={scenario.id} className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">
                      {idx + 1}. {scenario.title}
                    </span>
                    <span className="text-sm font-bold text-purple-700">
                      {estimatedImpact.toLocaleString()} msgs
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{scenario.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Log (narrative) */}
      {state.logs.length > 0 && (
        <div className="mt-6 border-t-2 border-slate-200 pt-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Simulation Log:</h3>
          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs max-h-40 overflow-y-auto">
            {state.logs.map((log, idx) => (
              <div key={idx} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

