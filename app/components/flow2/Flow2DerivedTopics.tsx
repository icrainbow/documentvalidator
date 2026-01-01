'use client';

import { useState } from 'react';
import Flow2TopicCard from './Flow2TopicCard';
import type { DerivedTopic } from '../../lib/flow2/derivedTopicsTypes';

interface Flow2DerivedTopicsProps {
  topics: DerivedTopic[];
  highlightedTopicKey?: string | null;
}

export default function Flow2DerivedTopics({ topics, highlightedTopicKey }: Flow2DerivedTopicsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (topics.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="derived-topics"
      className="border-2 border-purple-300 rounded-lg overflow-hidden bg-white mt-6"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-150 hover:to-blue-150 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🗂️</span>
          <h3 className="font-bold text-slate-800 text-sm">
            Derived Topics ({topics.length})
          </h3>
        </div>
        <span className="text-slate-700 font-bold">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {/* Topic Cards */}
      {isExpanded && (
        <div className="p-4 space-y-3 bg-slate-50">
          {topics.map((topic) => (
            <Flow2TopicCard
              key={topic.topic_key}
              topic={topic}
              isHighlighted={highlightedTopicKey === topic.topic_key}
            />
          ))}
        </div>
      )}
    </div>
  );
}

