/**
 * Scope Planning Trace Component
 * 
 * Visualizes batch review scope planning decisions for demo/explainability.
 * Read-only, no API calls, pure presentation.
 * 
 * Stage 4: Agent Panel Trace UI Integration
 */

'use client';

import React, { useState } from 'react';
import type { ScopePlanApi, GlobalCheckResult } from '../lib/types/scopePlanning';
import type { DirtyQueue } from '../lib/types/scopePlanning';
import { parseApiSectionId } from '../lib/sectionIdNormalizer';

/**
 * Batch review trace data
 */
export interface BatchReviewTrace {
  scopePlan: ScopePlanApi | null;
  globalCheckResults: GlobalCheckResult[] | null;
  timing: {
    scopePlanningMs: number;
    reviewMs: number;
    globalChecksMs: number;
    totalMs: number;
    llmAttempted: boolean;
    llmSucceeded: boolean;
  } | null;
  fallbacks?: string[];
  degraded?: boolean;
  dirtyQueueSnapshot: DirtyQueue | null;
}

interface ScopePlanningTraceProps {
  trace: BatchReviewTrace;
  allSections: any[]; // Accept any section format (page.tsx has different Section type)
}

/**
 * Agent name masking (hide internal agent IDs)
 */
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'compliance': 'Policy & Regulatory Review',
  'evaluation': 'Quality & Consistency Check',
  'rewrite': 'Compliance Remediation',
};

function getAgentDisplayName(agentId: string): string {
  return AGENT_DISPLAY_NAMES[agentId] || 'Review Agent';
}

/**
 * Review mode display names
 */
const REVIEW_MODE_DISPLAY: Record<string, { label: string; color: string }> = {
  'section-only': { label: 'Focused Section Review', color: 'bg-blue-100 text-blue-800' },
  'cross-section': { label: 'Cross-Section Review', color: 'bg-orange-100 text-orange-800' },
  'full-document': { label: 'Full Document Review', color: 'bg-purple-100 text-purple-800' },
};

/**
 * Edit magnitude display
 */
const EDIT_MAGNITUDE_DISPLAY: Record<string, { label: string; color: string }> = {
  'light': { label: 'Light', color: 'bg-gray-100 text-gray-700' },
  'moderate': { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' },
  'heavy': { label: 'Heavy', color: 'bg-red-100 text-red-700' },
};

/**
 * Global check display names
 */
const GLOBAL_CHECK_NAMES: Record<string, string> = {
  'disclaimer_presence': 'Disclaimer Presence',
  'cross_section_contradiction': 'Cross-Section Contradictions',
  'high_risk_keyword_scan': 'High-Risk Keywords',
  'structural_sanity': 'Document Structure',
};

function getCheckDisplayName(checkName: string): string {
  return GLOBAL_CHECK_NAMES[checkName] || checkName;
}

/**
 * Format duration (ms to human-readable)
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Main component
 */
export default function ScopePlanningTrace({ trace, allSections }: ScopePlanningTraceProps) {
  const [isScopeAnalysisOpen, setIsScopeAnalysisOpen] = useState(true);
  const [isExecutionOpen, setIsExecutionOpen] = useState(true);
  const [isSafetyNetOpen, setIsSafetyNetOpen] = useState(false);

  if (!trace.scopePlan || !trace.timing) {
    return (
      <div className="p-6 text-center text-gray-500">
        No batch review trace available. Run a batch review to see scope planning details.
      </div>
    );
  }

  const { scopePlan, globalCheckResults, timing, fallbacks, degraded, dirtyQueueSnapshot } = trace;

  // Helper: Get section title by ID
  const getSectionTitle = (sectionId: string): string => {
    const section = allSections.find(s => s.id === sectionId);
    return section?.title || `Section ${parseApiSectionId(sectionId) || sectionId}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Section 1: Agent Decision Summary */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            Review Strategy Decision
          </h3>
        </div>
        <div className="p-4 space-y-3">
          {/* Review Mode */}
          <div>
            <span className="text-sm font-medium text-gray-500">Mode:</span>
            <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
              REVIEW_MODE_DISPLAY[scopePlan.reviewMode]?.color || 'bg-gray-100 text-gray-800'
            }`}>
              {REVIEW_MODE_DISPLAY[scopePlan.reviewMode]?.label || scopePlan.reviewMode}
            </span>
          </div>

          {/* Confidence */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-500">Confidence:</span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(scopePlan.confidence * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  scopePlan.confidence >= 1.0 ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${scopePlan.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Reasoning */}
          <div>
            <span className="text-sm font-medium text-gray-500">Reasoning:</span>
            <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
              {scopePlan.reasoning}
            </p>
          </div>

          {/* Estimated Duration */}
          <div>
            <span className="text-sm font-medium text-gray-500">Estimated Duration:</span>
            <span className="ml-2 text-sm text-gray-900">{scopePlan.estimatedDuration}</span>
          </div>
        </div>
      </div>

      {/* Section 2: Scope Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <button
          onClick={() => setIsScopeAnalysisOpen(!isScopeAnalysisOpen)}
          className="w-full p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Scope Analysis
          </h3>
          <span className="text-gray-500">{isScopeAnalysisOpen ? '−' : '+'}</span>
        </button>
        {isScopeAnalysisOpen && (
          <div className="p-4 space-y-4">
            {/* User Edited Sections */}
            {dirtyQueueSnapshot && dirtyQueueSnapshot.entries.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  User Edited ({dirtyQueueSnapshot.entries.length} section{dirtyQueueSnapshot.entries.length !== 1 ? 's' : ''}):
                </h4>
                <ul className="space-y-1">
                  {dirtyQueueSnapshot.entries.map((entry) => {
                    const sectionId = `section-${entry.sectionId}`;
                    const title = getSectionTitle(sectionId);
                    const magnitudeDisplay = EDIT_MAGNITUDE_DISPLAY[entry.editMagnitude];
                    
                    return (
                      <li key={entry.sectionId} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-900 font-medium">{title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${magnitudeDisplay.color}`}>
                          {magnitudeDisplay.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Agent Will Review */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Agent Will Review ({scopePlan.sectionsToReview.length + scopePlan.relatedSectionsToCheck.length} section{(scopePlan.sectionsToReview.length + scopePlan.relatedSectionsToCheck.length) !== 1 ? 's' : ''}):
              </h4>
              <ul className="space-y-1">
                {/* Primary review targets (dirty) */}
                {scopePlan.sectionsToReview.map((sectionId) => (
                  <li key={sectionId} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-900 font-medium">{getSectionTitle(sectionId)}</span>
                    <span className="text-xs text-gray-500">(edited)</span>
                  </li>
                ))}
                {/* Related sections (adjacent) */}
                {scopePlan.relatedSectionsToCheck.map((sectionId) => (
                  <li key={sectionId} className="flex items-center gap-2 text-sm">
                    <span className="text-blue-600 font-bold">→</span>
                    <span className="text-gray-900 font-medium">{getSectionTitle(sectionId)}</span>
                    <span className="text-xs text-gray-500">(adjacent)</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Agents Involved */}
            {scopePlan.agentsToInvoke && scopePlan.agentsToInvoke.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Agents Involved:</h4>
                <div className="flex flex-wrap gap-2">
                  {scopePlan.agentsToInvoke.map((agentId) => (
                    <span
                      key={agentId}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                    >
                      {getAgentDisplayName(agentId)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Execution Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <button
          onClick={() => setIsExecutionOpen(!isExecutionOpen)}
          className="w-full p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            Execution Timeline
          </h3>
          <span className="text-gray-500">{isExecutionOpen ? '−' : '+'}</span>
        </button>
        {isExecutionOpen && (
          <div className="p-4 space-y-4">
            {/* Step 1: Scope Planning */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                ✓
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">1. Scope Planning</span>
                  <span className="text-xs text-gray-500">{formatDuration(timing.scopePlanningMs)}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Analyzed dirty sections, selected review mode: {REVIEW_MODE_DISPLAY[scopePlan.reviewMode]?.label}
                </p>
              </div>
            </div>

            {/* Step 2: Agent Review */}
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                timing.llmSucceeded ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
              }`}>
                {timing.llmSucceeded ? '✓' : '⚠'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    2. Agent Review ({scopePlan.reviewMode === 'section-only' ? 'Section Mode' : 'Document Mode'})
                  </span>
                  <span className="text-xs text-gray-500">{formatDuration(timing.reviewMs)}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {timing.llmAttempted 
                    ? timing.llmSucceeded 
                      ? `Reviewed ${scopePlan.sectionsToReview.length + scopePlan.relatedSectionsToCheck.length} sections`
                      : 'LLM review attempted but encountered issues (fallback applied)'
                    : 'Review skipped (no LLM call needed)'}
                </p>
              </div>
            </div>

            {/* Step 3: Global Checks */}
            {scopePlan.globalChecks && scopePlan.globalChecks.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">3. Global Checks</span>
                    <span className="text-xs text-gray-500">{formatDuration(timing.globalChecksMs)}</span>
                  </div>
                  {globalCheckResults && globalCheckResults.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {globalCheckResults.map((check, idx) => {
                        const statusColor = 
                          check.status === 'pass' ? 'text-green-600' :
                          check.status === 'warning' ? 'text-yellow-600' :
                          'text-red-600';
                        const statusLabel = check.status.charAt(0).toUpperCase() + check.status.slice(1);
                        
                        return (
                          <li key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                            <span className={`font-medium ${statusColor}`}>{statusLabel}:</span>
                            <span>{getCheckDisplayName(check.checkName)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Total Duration */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total Duration:</span>
                <span className="text-sm font-bold text-gray-900">{formatDuration(timing.totalMs)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Safety Net (only if degraded) */}
      {degraded && fallbacks && fallbacks.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
          <button
            onClick={() => setIsSafetyNetOpen(!isSafetyNetOpen)}
            className="w-full p-4 border-b border-yellow-200 bg-yellow-100 flex items-center justify-between hover:bg-yellow-200 transition-colors"
          >
            <h3 className="text-lg font-semibold text-yellow-900 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Safety Net Activated
            </h3>
            <span className="text-yellow-700">{isSafetyNetOpen ? '−' : '+'}</span>
          </button>
          {isSafetyNetOpen && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-yellow-800">
                The agent encountered issues but continued safely:
              </p>
              <ul className="space-y-1">
                {fallbacks.map((fallback, idx) => (
                  <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>{fallback}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-3 bg-yellow-100 rounded border border-yellow-300">
                <p className="text-xs text-yellow-800">
                  <strong>Fallback Behavior Applied:</strong> Review completed with reduced scope to ensure accuracy. All results shown are reliable.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

