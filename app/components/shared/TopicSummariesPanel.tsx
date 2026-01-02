/**
 * TopicSummariesPanel - Generic Config-Driven Topic Summary Display
 * 
 * Displays LLM-generated topic summaries for any review mode.
 * Config-driven: supports KYC (8 topics), IT (5 topics), or any future mode.
 * 
 * FEATURES:
 * - N-topic flexible template (works with any number of topics)
 * - Multi-document aggregated summaries (from LLM API)
 * - Coverage badges (PRESENT/WEAK/MISSING)
 * - Evidence snippets with doc attribution
 * - Optional risk highlighting (if linked_risks provided)
 * 
 * MODES:
 * - KYC Flow2: 8 topics with risk links
 * - IT Bulletin: 5 topics, no risk links
 * - Future modes: Just add config, no UI changes needed
 */

'use client';

import React, { useState } from 'react';
import type { GenericTopicSummary } from '@/app/lib/topicSummaries/types';

interface TopicSummariesPanelProps {
  panelTitle: string;  // "KYC Topics Summary" | "IT Bulletin Topics Summary"
  panelSubtitle: string;  // Mode-specific subtitle
  topicSummaries?: GenericTopicSummary[];
  documents: any[];
  isLoading?: boolean;
}

export default function TopicSummariesPanel({
  panelTitle,
  panelSubtitle,
  topicSummaries,
  documents,
  isLoading = false,
}: TopicSummariesPanelProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // EMPTY STATES
  // ═══════════════════════════════════════════════════════════════════════

  if (documents.length === 0) {
    return (
      <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-xl">📊</span>
          {panelTitle}
        </h3>
        <p className="text-sm text-slate-600 italic">
          Upload documents to see topic summaries
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-xl">📊</span>
          {panelTitle}
        </h3>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
          <p className="text-sm text-slate-600">
            Generating topic summaries from {documents.length} document(s)...
          </p>
        </div>
      </div>
    );
  }

  if (!topicSummaries || topicSummaries.length === 0) {
    return (
      <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-xl">📊</span>
          {panelTitle}
        </h3>
        <p className="text-sm text-slate-600">
          {documents.length} document(s) loaded. Run review to generate summaries.
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPER: RISK HIGHLIGHTING LOGIC (Optional feature)
  // ═══════════════════════════════════════════════════════════════════════

  const getRiskHighlight = (linkedRisks?: any[]): 'red' | 'yellow' | null => {
    if (!linkedRisks || linkedRisks.length === 0) return null;

    const hasHigh = linkedRisks.some((r) => r.severity === 'high');
    const hasMedium = linkedRisks.some((r) => r.severity === 'medium');

    if (hasHigh) return 'red';
    if (hasMedium) return 'yellow';
    return null;
  };

  const handleRiskLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    const riskElement = document.getElementById('risk-details');
    if (riskElement) {
      const rect = riskElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - 100;

      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    } else {
      console.warn('[TopicSummariesPanel] Risk details element not found (id="risk-details")');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: N-TOPIC FLEXIBLE TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
      <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
        <span className="text-xl">📊</span>
        {panelTitle}
      </h3>
      <p className="text-xs text-slate-600 mb-3">{panelSubtitle}</p>

      <div className="space-y-2">
        {topicSummaries.map((topic) => {
          const isExpanded = expandedTopic === topic.topic_id;
          const riskHighlight = getRiskHighlight(topic.linked_risks);

          // Coverage badge styling
          const coverageBadge =
            topic.coverage === 'PRESENT'
              ? 'bg-green-100 text-green-700'
              : topic.coverage === 'WEAK'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600';

          // Risk border styling (optional feature)
          const riskBorderClass =
            riskHighlight === 'red'
              ? 'border-red-400 border-l-4'
              : riskHighlight === 'yellow'
              ? 'border-yellow-400 border-l-4'
              : 'border-slate-300';

          return (
            <div key={topic.topic_id} className={`border-2 rounded-lg overflow-hidden bg-white ${riskBorderClass}`}>
              <button
                onClick={() => setExpandedTopic(isExpanded ? null : topic.topic_id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 text-left">
                  <span className="font-semibold text-sm text-slate-800">{topic.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${coverageBadge}`}>{topic.coverage}</span>

                  {/* Risk severity indicator (only if linked_risks present) */}
                  {riskHighlight && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                        riskHighlight === 'red' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {riskHighlight === 'red' ? '⚠️ HIGH' : '⚠️ MEDIUM'}
                    </span>
                  )}
                </div>
                <span className="text-slate-600 text-sm ml-2">{isExpanded ? '▼' : '▶'}</span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 bg-slate-50/50 border-t border-slate-200">
                  {/* Summary bullets */}
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Summary:</p>
                    <ul className="text-xs text-slate-700 space-y-1 leading-relaxed">
                      {topic.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex gap-1.5">
                          <span className="text-slate-500 mt-0.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Evidence snippets */}
                  {topic.evidence && topic.evidence.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Evidence:</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        {topic.evidence.map((ev, evIdx) => (
                          <li key={evIdx} className="flex gap-1.5">
                            <span className="text-slate-400 mt-0.5">→</span>
                            <span>
                              &quot;{ev.quote}&quot;
                              {ev.doc_id && <span className="text-slate-500 ml-1">({ev.doc_id})</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Related risks (optional feature - only if linked_risks present) */}
                  {topic.linked_risks && topic.linked_risks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1">
                        Related Risks ({topic.linked_risks.length}):
                      </p>
                      <ul className="text-xs space-y-0.5">
                        {topic.linked_risks.slice(0, 3).map((risk, riskIdx) => (
                          <li key={riskIdx} className="flex items-center gap-1.5">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                risk.severity === 'high'
                                  ? 'bg-red-500'
                                  : risk.severity === 'medium'
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                              }`}
                            />
                            <span className="text-slate-700">{risk.title}</span>
                          </li>
                        ))}
                        {topic.linked_risks.length > 3 && (
                          <li className="text-slate-500 italic">+{topic.linked_risks.length - 3} more</li>
                        )}
                      </ul>
                      <button
                        onClick={handleRiskLinkClick}
                        className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        → View full risk details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-300">
        <p className="text-xs text-slate-600 italic">
          💡 Topics show what the documents say (content summary). For risk reasoning and actions, see Risk Assessment details.
        </p>
      </div>
    </div>
  );
}

