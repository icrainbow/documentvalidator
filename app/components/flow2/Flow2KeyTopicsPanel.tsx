'use client';

/**
 * Flow2KeyTopicsPanel
 * 
 * Displays key topics extracted from uploaded documents.
 * Shows DOCUMENT CONTENT SUMMARIES only (NOT risk findings).
 * 
 * Data source: extracted_topics from orchestrator (deterministic, stable across runs)
 */

import React, { useState } from 'react';

interface ExtractedTopic {
  title: string;
  summary: string;
  evidence: string[];
  coverage: 'complete' | 'partial' | 'missing';
}

interface Flow2KeyTopicsPanelProps {
  extractedTopics?: ExtractedTopic[];
  documents: any[];
}

export default function Flow2KeyTopicsPanel({
  extractedTopics,
  documents,
}: Flow2KeyTopicsPanelProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  
  if (documents.length === 0) {
    return (
      <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Key Topics Extracted
        </h3>
        <p className="text-sm text-slate-600 italic">
          Upload documents to see extracted key topics
        </p>
      </div>
    );
  }
  
  if (!extractedTopics || extractedTopics.length === 0) {
    return (
      <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Key Topics Extracted
        </h3>
        <p className="text-sm text-slate-600">
          {documents.length} document(s) loaded. Run review to extract topics.
        </p>
      </div>
    );
  }
  
  return (
    <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
      <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
        <span className="text-xl">📊</span>
        Key Topics Extracted
      </h3>
      <p className="text-xs text-slate-600 mb-3">
        Document content summary (what the documents say)
      </p>
      
      <div className="space-y-2">
        {extractedTopics.map((topic, idx) => {
          const isExpanded = expandedTopic === topic.title;
          
          // Coverage badge color
          const coverageBadge = 
            topic.coverage === 'complete' ? 'bg-green-100 text-green-700' :
            topic.coverage === 'partial' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600';
          
          return (
            <div key={idx} className="border-2 border-slate-300 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setExpandedTopic(isExpanded ? null : topic.title)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 text-left">
                  <span className="font-semibold text-sm text-slate-800">{topic.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${coverageBadge}`}>
                    {topic.coverage.toUpperCase()}
                  </span>
                </div>
                <span className="text-slate-600 text-sm ml-2">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 bg-slate-50/50 border-t border-slate-200">
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Summary:</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{topic.summary}</p>
                  </div>
                  
                  {topic.evidence.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Source documents:</p>
                      <ul className="text-xs text-slate-600 space-y-0.5">
                        {topic.evidence.map((ev, evIdx) => (
                          <li key={evIdx}>• {ev}</li>
                        ))}
                      </ul>
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
          💡 Topics are extracted from document content. For risk assessment details, see Risk Assessment stage.
        </p>
      </div>
    </div>
  );
}
