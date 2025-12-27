'use client';

import { useState } from 'react';

interface AgentCall {
  agent: string;
  status: 'success' | 'blocked' | 'pending';
  tokens: number;
  latency_ms: number;
  retries: number;
  summary: string;
  input?: string;
  output?: string;
}

interface AgentDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
  jobStatus?: 'Completed' | 'Blocked' | 'In Progress';
  agentCalls?: AgentCall[];
}

export default function AgentDashboard({ 
  isOpen, 
  onClose,
  jobId = '1042',
  jobStatus = 'Completed',
  agentCalls
}: AgentDashboardProps) {
  const [expandedCallIndex, setExpandedCallIndex] = useState<number | null>(null);

  // Default fake data if none provided
  const defaultAgentCalls: AgentCall[] = [
    {
      agent: 'Validate Agent',
      status: 'success',
      tokens: 180,
      latency_ms: 420,
      retries: 0,
      summary: 'Validated user input relevance for Investment Background',
      input: 'User message about ETF investing experience',
      output: 'Relevant content extracted and validated'
    },
    {
      agent: 'Synthesize Agent',
      status: 'success',
      tokens: 520,
      latency_ms: 1150,
      retries: 0,
      summary: 'Synthesized user responses into coherent paragraph',
      input: '3 user messages about investment background',
      output: 'Professional paragraph summarizing investment profile'
    },
    {
      agent: 'Evaluation Agent',
      status: 'success',
      tokens: 240,
      latency_ms: 380,
      retries: 0,
      summary: 'Evaluated Section 1: Investment Background',
      input: 'Section content with 450 words',
      output: 'PASS - Clear objectives and appropriate risk profile'
    },
    {
      agent: 'Optimize Agent',
      status: 'success',
      tokens: 1420,
      latency_ms: 3200,
      retries: 1,
      summary: 'Rewrote Section 3 with more technical depth',
      input: 'Original Section 3 content',
      output: 'Enhanced content with technical indicators and methodology'
    },
    {
      agent: 'Evaluation Agent',
      status: 'blocked',
      tokens: 190,
      latency_ms: 290,
      retries: 0,
      summary: 'Re-evaluated Section 2: Risk Assessment',
      input: 'Modified section with risk parameters',
      output: 'FAIL - Missing required disclaimer'
    },
    {
      agent: 'Compliance Agent',
      status: 'blocked',
      tokens: 340,
      latency_ms: 680,
      retries: 0,
      summary: 'Detected prohibited terms in Section 3',
      input: 'Section 3 content for compliance check',
      output: 'BLOCKED - "tobacco industry" violates investment policy'
    },
    {
      agent: 'Optimize Agent',
      status: 'success',
      tokens: 890,
      latency_ms: 2100,
      retries: 0,
      summary: 'Removed prohibited terms and adjusted Section 3',
      input: 'Section 3 with compliance violations',
      output: 'Clean content compliant with investment policies'
    },
    {
      agent: 'Evaluation Agent',
      status: 'success',
      tokens: 210,
      latency_ms: 340,
      retries: 0,
      summary: 'Final evaluation of all sections',
      input: 'All three sections for final approval',
      output: 'PASS - All sections meet quality and compliance standards'
    }
  ];

  const calls = agentCalls || defaultAgentCalls;

  // Calculate summary metrics
  const totalTokens = calls.reduce((sum, call) => sum + call.tokens, 0);
  const totalLatency = (calls.reduce((sum, call) => sum + call.latency_ms, 0) / 1000).toFixed(1);
  const bottleneckCall = calls.reduce((max, call) => 
    call.latency_ms > max.latency_ms ? call : max
  );
  const maxLatency = Math.max(...calls.map(c => c.latency_ms));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="text-slate-700 font-bold text-lg">✓</span>;
      case 'blocked':
        return <span className="text-slate-500 font-bold text-lg">✕</span>;
      case 'pending':
        return <span className="text-slate-400 font-bold text-lg">⏳</span>;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-slate-800';
      case 'Blocked':
        return 'text-slate-700';
      case 'In Progress':
        return 'text-slate-700';
      default:
        return 'text-slate-700';
    }
  };

  const isBottleneck = (call: AgentCall) => {
    return call.latency_ms >= maxLatency * 0.7 || call.retries > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-700 text-white px-6 py-4 flex items-center justify-between border-b border-slate-600">
          <div>
            <h2 className="text-xl font-bold">Agent Dashboard</h2>
            <div className="text-slate-300 text-sm mt-1">
              Job #{jobId} · <span className={getStatusColor(jobStatus)}>{jobStatus}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-slate-300 transition-colors text-2xl font-light leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Job Summary Strip */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-slate-600">Total Tokens:</span>{' '}
              <span className="font-semibold text-slate-800">{totalTokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-600">Total Latency:</span>{' '}
              <span className="font-semibold text-slate-800">{totalLatency}s</span>
            </div>
            <div>
              <span className="text-slate-600">Bottleneck:</span>{' '}
              <span className="font-semibold text-slate-700">{bottleneckCall.agent}</span>
            </div>
          </div>
        </div>

        {/* Agent Call Sequence */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
            Agent Call Sequence
          </h3>
          <div className="space-y-3">
            {calls.map((call, index) => {
              const isExpanded = expandedCallIndex === index;
              const isHeavy = isBottleneck(call);

              return (
                <div
                  key={index}
                  className={`border rounded-lg transition-all ${
                    isHeavy
                      ? 'border-slate-400 bg-slate-100'
                      : call.status === 'blocked'
                      ? 'border-slate-400 bg-slate-100'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div
                    onClick={() => setExpandedCallIndex(isExpanded ? null : index)}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(call.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="font-semibold text-slate-800">{call.agent}</div>
                          <div className="flex items-center gap-3 text-sm text-slate-600 shrink-0">
                            <span>{call.tokens} tokens</span>
                            <span className={isHeavy ? 'text-slate-800 font-semibold' : ''}>
                              {call.latency_ms}ms
                            </span>
                            {call.retries > 0 && (
                              <span className="text-slate-700 font-semibold">
                                {call.retries} retry
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-slate-700 mb-2">{call.summary}</div>
                        
                        {/* Latency Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isHeavy ? 'bg-slate-600' : 'bg-slate-500'
                            }`}
                            style={{ width: `${(call.latency_ms / maxLatency) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-slate-400 text-sm shrink-0">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && call.input && call.output && (
                    <div className="px-4 pb-3 pt-1 border-t border-slate-200 bg-slate-50/50 space-y-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                          Input
                        </div>
                        <div className="text-sm text-slate-700">{call.input}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                          Output
                        </div>
                        <div className="text-sm text-slate-700">{call.output}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

