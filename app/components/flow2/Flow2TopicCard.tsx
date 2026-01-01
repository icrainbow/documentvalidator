'use client';

import { useState } from 'react';
import type { DerivedTopic } from '../../lib/flow2/derivedTopicsTypes';

interface Flow2TopicCardProps {
  topic: DerivedTopic;
  isHighlighted?: boolean;
  onMoreInputsClick?: (topicKey: string) => void;
}

export default function Flow2TopicCard({ topic, isHighlighted, onMoreInputsClick }: Flow2TopicCardProps) {
  const [isSnippetsExpanded, setIsSnippetsExpanded] = useState(false);

  return (
    <div
      data-testid={`topic-card-${topic.topic_key}`}
      className={`border-2 rounded-lg overflow-hidden transition-all ${
        isHighlighted
          ? 'border-yellow-400 bg-yellow-50 shadow-lg'
          : 'border-slate-300 bg-white'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50">
        <h4 className="font-bold text-slate-800 text-sm">{topic.title}</h4>
        <p className="text-xs text-slate-600 mt-1">{topic.summary}</p>
      </div>

      {/* Sources */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div
          data-testid={`topic-sources-${topic.topic_key}`}
          className="space-y-1"
        >
          <div className="text-xs font-semibold text-slate-700 mb-2">
            📁 Source Files ({topic.sources.length})
          </div>
          {topic.sources.map((source, idx) => (
            <div
              key={idx}
              className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 flex items-center gap-2"
            >
              <span className="text-slate-500">📄</span>
              <span className="text-slate-800 font-medium">{source.filename}</span>
              {source.doc_type_hint && (
                <span className="text-slate-500 text-[10px]">({source.doc_type_hint})</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Evidence/Snippets (Expandable) */}
      {topic.snippets.length > 0 && (
        <div className="border-t border-slate-200">
          <button
            onClick={() => setIsSnippetsExpanded(!isSnippetsExpanded)}
            className="w-full px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs font-semibold text-slate-700"
          >
            <span>🔍 Evidence Snippets ({topic.snippets.length})</span>
            <span className="text-slate-500">{isSnippetsExpanded ? '▲' : '▼'}</span>
          </button>
          {isSnippetsExpanded && (
            <div className="px-4 pb-3 space-y-2 max-h-64 overflow-y-auto bg-slate-50">
              {topic.snippets.map((snippet, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-white border border-slate-200 rounded p-2"
                >
                  <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span className="text-slate-500">📄</span>
                    {snippet.filename}
                  </div>
                  <div className="text-slate-600 italic">{snippet.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* More Inputs Button (Phase 5) */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <button
          data-testid={`topic-more-inputs-${topic.topic_key}`}
          onClick={() => onMoreInputsClick?.(topic.topic_key)}
          className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded transition-colors"
        >
          + More Inputs
        </button>
      </div>
    </div>
  );
}

