'use client';

/**
 * Flow2RiskDetailsPanel
 * 
 * Displays risk assessment details: overall level, reasons, gaps, and suggested actions.
 * This is where risk findings belong (NOT in Key Topics Extracted).
 * 
 * Scroll target for Risk Assessment stage clicks in Flow Monitor.
 */

import React from 'react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskSignal {
  category?: string;
  severity?: string;
  title?: string;
  description?: string;
  detail?: string;
}

interface Coverage {
  topicId: string;
  status: 'complete' | 'partial' | 'missing';
  reason?: string;
}

interface Conflict {
  description: string;
  severity: string;
}

interface Flow2RiskDetailsPanelProps {
  riskLevel?: RiskLevel;
  riskSignals?: RiskSignal[];
  coverageGaps?: Coverage[];
  conflicts?: Conflict[];
  riskScore?: number;
  visible?: boolean;
}

const RISK_LEVEL_CONFIG = {
  low: {
    color: 'border-green-300 bg-green-50',
    icon: '✅',
    label: 'LOW RISK',
    textColor: 'text-green-800'
  },
  medium: {
    color: 'border-yellow-300 bg-yellow-50',
    icon: '⚠️',
    label: 'MEDIUM RISK',
    textColor: 'text-yellow-800'
  },
  high: {
    color: 'border-orange-300 bg-orange-50',
    icon: '🔶',
    label: 'HIGH RISK',
    textColor: 'text-orange-800'
  },
  critical: {
    color: 'border-red-300 bg-red-50',
    icon: '🚨',
    label: 'CRITICAL RISK',
    textColor: 'text-red-800'
  }
};

export default function Flow2RiskDetailsPanel({
  riskLevel = 'low',
  riskSignals = [],
  coverageGaps = [],
  conflicts = [],
  riskScore,
  visible = true
}: Flow2RiskDetailsPanelProps) {
  if (!visible) {
    return null;
  }
  
  const config = RISK_LEVEL_CONFIG[riskLevel];
  const hasRiskSignals = riskSignals.length > 0;
  const hasCoverageIssues = coverageGaps.some(g => g.status === 'missing' || g.status === 'partial');
  const hasConflicts = conflicts.length > 0;
  const hasAnyIssues = hasRiskSignals || hasCoverageIssues || hasConflicts;
  
  return (
    <div 
      id="risk-details" 
      className={`mb-6 border-2 rounded-lg p-5 scroll-mt-6 ${config.color}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <span className={config.textColor}>Risk Assessment</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full font-bold text-sm ${config.color} border-2`}>
            {config.label}
          </span>
          {riskScore !== undefined && (
            <span className="text-xs text-slate-600">
              Score: {riskScore}/100
            </span>
          )}
        </div>
      </div>
      
      {!hasAnyIssues ? (
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-800">
            ✓ No significant risk signals detected. All required KYC topics are adequately covered.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Risk Signals */}
          {hasRiskSignals && (
            <div className="bg-white rounded-lg p-4 border border-slate-300">
              <h4 className="font-semibold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <span>⚠️</span> Risk Signals Detected ({riskSignals.length})
              </h4>
              <div className="space-y-2">
                {riskSignals.map((signal, idx) => {
                  const severity = signal.severity || 'medium';
                  const severityColor = 
                    severity === 'high' || severity === 'critical' 
                      ? 'bg-red-100 text-red-700' 
                      : severity === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700';
                  
                  return (
                    <div key={idx} className="flex gap-2 text-xs">
                      <span className={`px-2 py-1 rounded font-semibold flex-shrink-0 ${severityColor}`}>
                        {severity.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{signal.title || signal.description || 'Risk detected'}</p>
                        <p className="text-slate-600 mt-0.5">{signal.detail || signal.description || ''}</p>
                        {signal.category && (
                          <p className="text-slate-500 mt-0.5 italic">Category: {signal.category}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Coverage Gaps */}
          {hasCoverageIssues && (
            <div className="bg-white rounded-lg p-4 border border-slate-300">
              <h4 className="font-semibold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <span>📋</span> Missing/Incomplete Topics
              </h4>
              <div className="space-y-1">
                {coverageGaps
                  .filter(g => g.status === 'missing' || g.status === 'partial')
                  .map((gap, idx) => {
                    const statusColor = gap.status === 'missing' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-yellow-100 text-yellow-700';
                    
                    return (
                      <div key={idx} className="flex gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded font-semibold flex-shrink-0 ${statusColor}`}>
                          {gap.status.toUpperCase()}
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800">
                            {gap.topicId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          {gap.reason && (
                            <span className="text-slate-600"> — {gap.reason}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          {/* Conflicts */}
          {hasConflicts && (
            <div className="bg-white rounded-lg p-4 border border-slate-300">
              <h4 className="font-semibold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <span>⚡</span> Conflicts Detected ({conflicts.length})
              </h4>
              <div className="space-y-2">
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className="text-xs">
                    <p className="text-slate-800">{conflict.description}</p>
                    <p className="text-slate-500 mt-0.5 italic">
                      Severity: {conflict.severity}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Suggested Actions */}
      {hasAnyIssues && (
        <div className="mt-3 pt-3 border-t border-slate-300">
          <h4 className="font-semibold text-xs text-slate-800 mb-1.5">Suggested Actions:</h4>
          <ul className="text-xs text-slate-700 space-y-0.5">
            {hasRiskSignals && (
              <li>• Review and address all HIGH/CRITICAL risk signals before proceeding</li>
            )}
            {hasCoverageIssues && (
              <li>• Request additional documentation for missing/incomplete topics</li>
            )}
            {hasConflicts && (
              <li>• Resolve data conflicts through additional verification</li>
            )}
            {riskLevel === 'high' || riskLevel === 'critical' ? (
              <li>• Consider escalating to senior reviewer or compliance officer</li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}

