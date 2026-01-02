'use client';

/**
 * Flow2KeyTopicsPanel
 * 
 * Displays key topics extracted from uploaded documents and review context.
 * Replaces the obsolete "Demo Scenarios" block with useful information.
 * 
 * Data sources (priority order):
 * 1. Phase 8 findings (if available)
 * 2. Review issues (if available)
 * 3. Document text keyword extraction (fallback)
 */

import React, { useState, useMemo } from 'react';

interface Flow2Document {
  doc_id: string;
  filename: string;
  text: string;
}

interface ReviewIssue {
  category?: string;
  title?: string;
  description?: string;
  severity?: string;
}

interface PostRejectData {
  triggered?: boolean;
  findings?: Array<{
    severity: string;
    title: string;
    detail: string;
  }>;
  tasks?: Array<{
    title: string;
    detail?: string;
  }>;
}

interface TopicSignal {
  text: string;
  confidence: 'high' | 'medium' | 'low';
}

interface KeyTopic {
  id: string;
  title: string;
  icon: string;
  signals: TopicSignal[];
  action: string;
  color: string; // Tailwind color classes
}

interface Flow2KeyTopicsPanelProps {
  documents: Flow2Document[];
  reviewIssues?: ReviewIssue[];
  postRejectData?: PostRejectData | null;
  checkpointMetadata?: any;
}

export default function Flow2KeyTopicsPanel({
  documents,
  reviewIssues = [],
  postRejectData,
  checkpointMetadata,
}: Flow2KeyTopicsPanelProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  
  // Extract topics based on available data
  const topics = useMemo(() => {
    const extracted: KeyTopic[] = [];
    
    // Priority 1: Phase 8 findings
    if (postRejectData?.findings && postRejectData.findings.length > 0) {
      const identitySignals: TopicSignal[] = [];
      const sofSignals: TopicSignal[] = [];
      const ownershipSignals: TopicSignal[] = [];
      const policySignals: TopicSignal[] = [];
      
      postRejectData.findings.forEach(finding => {
        const signal: TopicSignal = {
          text: finding.title,
          confidence: finding.severity === 'high' ? 'high' : 'medium'
        };
        
        // Classify finding into topic bucket
        if (/identity|kyc|verification|mismatch/i.test(finding.title)) {
          identitySignals.push(signal);
        } else if (/source of funds|sof|wealth|disclosure/i.test(finding.title)) {
          sofSignals.push(signal);
        } else if (/ubo|beneficial owner|offshore|structure/i.test(finding.title)) {
          ownershipSignals.push(signal);
        } else if (/policy|regulation|compliance/i.test(finding.title)) {
          policySignals.push(signal);
        }
      });
      
      if (identitySignals.length > 0) {
        extracted.push({
          id: 'identity',
          title: 'Identity & KYC Consistency',
          icon: '🆔',
          signals: identitySignals,
          action: 'Cross-reference identity documents with declared information',
          color: 'border-blue-300 bg-blue-50'
        });
      }
      
      if (sofSignals.length > 0) {
        extracted.push({
          id: 'sof',
          title: 'Source of Funds & Disclosures',
          icon: '💰',
          signals: sofSignals,
          action: 'Verify consistency across all financial disclosures',
          color: 'border-green-300 bg-green-50'
        });
      }
      
      if (ownershipSignals.length > 0) {
        extracted.push({
          id: 'ownership',
          title: 'Ownership / UBO / Offshore',
          icon: '🏢',
          signals: ownershipSignals,
          action: 'Trace ultimate beneficial ownership through structure',
          color: 'border-purple-300 bg-purple-50'
        });
      }
      
      if (policySignals.length > 0) {
        extracted.push({
          id: 'policy',
          title: 'Policy & Regulatory Triggers',
          icon: '📋',
          signals: policySignals,
          action: 'Review against latest policy updates and regulations',
          color: 'border-orange-300 bg-orange-50'
        });
      }
    }
    
    // Priority 2: Review issues (if no Phase 8 data)
    else if (reviewIssues.length > 0) {
      const categoryMap: Record<string, TopicSignal[]> = {};
      
      reviewIssues.forEach(issue => {
        const category = issue.category || 'general';
        if (!categoryMap[category]) {
          categoryMap[category] = [];
        }
        categoryMap[category].push({
          text: issue.title || issue.description || 'Issue detected',
          confidence: issue.severity === 'FAIL' ? 'high' : 'medium'
        });
      });
      
      Object.entries(categoryMap).forEach(([category, signals]) => {
        extracted.push({
          id: category,
          title: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          icon: '⚠️',
          signals,
          action: 'Address identified issues before proceeding',
          color: 'border-red-300 bg-red-50'
        });
      });
    }
    
    // Priority 3: Keyword extraction from documents
    else if (documents.length > 0) {
      const allText = documents.map(d => d.text).join('\n\n').toLowerCase();
      
      const patterns = [
        {
          id: 'identity',
          title: 'Identity & KYC Consistency',
          icon: '🆔',
          keywords: ['identity', 'kyc', 'passport', 'id card', 'verification', 'name', 'address'],
          color: 'border-blue-300 bg-blue-50'
        },
        {
          id: 'sof',
          title: 'Source of Funds',
          icon: '💰',
          keywords: ['source of funds', 'sof', 'wealth', 'income', 'assets', 'financial'],
          color: 'border-green-300 bg-green-50'
        },
        {
          id: 'ownership',
          title: 'Ownership Structure',
          icon: '🏢',
          keywords: ['beneficial owner', 'ubo', 'shareholder', 'offshore', 'entity', 'structure'],
          color: 'border-purple-300 bg-purple-50'
        },
        {
          id: 'risk',
          title: 'Risk Indicators',
          icon: '⚠️',
          keywords: ['pep', 'sanctions', 'high risk', 'politically exposed', 'aml', 'risk'],
          color: 'border-orange-300 bg-orange-50'
        }
      ];
      
      patterns.forEach(pattern => {
        const matches = pattern.keywords.filter(kw => allText.includes(kw));
        if (matches.length > 0) {
          extracted.push({
            id: pattern.id,
            title: pattern.title,
            icon: pattern.icon,
            signals: matches.map(kw => ({
              text: `Keyword detected: "${kw}"`,
              confidence: 'low' as const
            })),
            action: 'Review document context for relevance',
            color: pattern.color
          });
        }
      });
    }
    
    return extracted;
  }, [documents, reviewIssues, postRejectData]);
  
  if (documents.length === 0) {
    return (
      <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Key Topics Extracted
        </h3>
        <p className="text-sm text-slate-600 italic">
          Upload documents to see extracted key topics and signals
        </p>
      </div>
    );
  }
  
  if (topics.length === 0) {
    return (
      <div className="mb-6 bg-slate-50 border-2 border-slate-300 rounded-lg p-5">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-xl">📊</span>
          Key Topics Extracted
        </h3>
        <p className="text-sm text-slate-600">
          {documents.length} document(s) loaded. Run review to extract detailed topics.
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
        Derived from uploaded documents and review context
      </p>
      
      <div className="space-y-2">
        {topics.map(topic => {
          const isExpanded = expandedTopic === topic.id;
          
          return (
            <div key={topic.id} className={`border-2 rounded-lg overflow-hidden ${topic.color}`}>
              <button
                onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{topic.icon}</span>
                  <span className="font-semibold text-sm text-slate-800">{topic.title}</span>
                  <span className="text-xs text-slate-600">({topic.signals.length})</span>
                </div>
                <span className="text-slate-600 text-sm">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </button>
              
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 bg-white/30">
                  <div className="space-y-1 mb-2">
                    {topic.signals.map((signal, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${
                          signal.confidence === 'high'
                            ? 'bg-red-100 text-red-700'
                            : signal.confidence === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {signal.confidence.toUpperCase()}
                        </span>
                        <span className="flex-1 text-slate-700">{signal.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-700 bg-white px-2 py-1 rounded border border-slate-300">
                    <span className="font-semibold">Suggested action:</span> {topic.action}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

