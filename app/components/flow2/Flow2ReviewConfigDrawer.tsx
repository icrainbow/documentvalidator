'use client';

import { useState } from 'react';
import GraphTrace from '../GraphTrace';
import GraphDefinitionPanel from '../GraphDefinitionPanel';
import SkillsPanel from '../SkillsPanel';
import GapPanel from '../GapPanel';
import ConflictPanel from '../ConflictPanel';
import DemoTracePlayer from './DemoTracePlayer';

interface DemoTraceEvent {
  t: number;
  kind: 'task' | 'skill' | 'finding' | 'action';
  title: string;
  detail?: string;
  status?: 'start' | 'running' | 'done';
  severity?: 'high' | 'medium' | 'low' | 'info';
}

interface Flow2ReviewConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graphReviewTrace: any | null;
  skillCatalog: any[];
  onIssueClick?: (issue: any) => void;
  demoTrace?: DemoTraceEvent[] | null;
  demoRunId?: string | null;
}

export default function Flow2ReviewConfigDrawer({
  isOpen,
  onClose,
  graphReviewTrace,
  skillCatalog,
  onIssueClick,
  demoTrace,
  demoRunId
}: Flow2ReviewConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<'graphTrace' | 'graph' | 'runs' | 'config'>('graphTrace');
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);
  const [isOutputsExpanded, setIsOutputsExpanded] = useState(false);

  if (!isOpen) return null;

  const gaps = graphReviewTrace?.gaps || [];
  const conflicts = graphReviewTrace?.conflicts || [];
  const skillInvocations = graphReviewTrace?.skillInvocations || [];
  const issues = graphReviewTrace?.issues || [];
  const hasDemoTrace = demoTrace && demoTrace.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-4xl bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 z-10">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-2xl font-bold text-slate-800">Agent Panel (Flow2)</h2>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-semibold"
            >
              ✕ Close
            </button>
          </div>

          {/* Flow2: 4 tabs only */}
          <div className="flex gap-2 px-6 border-b-2 border-slate-200">
            <button
              onClick={() => setActiveTab('graphTrace')}
              data-testid="flow2-tab-graph-trace"
              className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
                activeTab === 'graphTrace'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              🕸️ Graph Trace
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              data-testid="flow2-tab-graph"
              className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
                activeTab === 'graph'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              📐 Graph
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              data-testid="flow2-tab-runs"
              className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
                activeTab === 'runs'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              🔄 Runs
            </button>
            <button
              onClick={() => setActiveTab('config')}
              data-testid="flow2-tab-config"
              className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
                activeTab === 'config'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              ⚙️ Config
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Graph Trace Tab */}
          {activeTab === 'graphTrace' && (
            <div className="space-y-6">
              {/* Demo Trace Player (if active) */}
              {hasDemoTrace && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                  <DemoTracePlayer trace={demoTrace} runId={demoRunId || null} />
                </div>
              )}
              
              {graphReviewTrace ? (
                <>
                  <GraphTrace trace={graphReviewTrace} />
                  
                  {/* Collapsible Outputs (Gaps/EDD + Issues) */}
                  {(gaps.length > 0 || conflicts.length > 0 || issues.length > 0) && (
                    <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsOutputsExpanded(!isOutputsExpanded)}
                        className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-blue-900 text-sm">
                          🧾 Outputs (Issues & EDD)
                        </span>
                        <span className="text-blue-700 font-bold">
                          {isOutputsExpanded ? '▲' : '▼'}
                        </span>
                      </button>
                      {isOutputsExpanded && (
                        <div className="p-4 bg-white space-y-4">
                          {issues.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm text-slate-700 mb-2">Issues ({issues.length})</h4>
                              <div className="space-y-2">
                                {issues.map((issue: any, idx: number) => (
                                  <div
                                    key={idx}
                                    data-testid={`issue-row-${idx}`}
                                    onClick={() => onIssueClick?.(issue)}
                                    className="border border-slate-200 rounded p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className={`text-sm font-bold ${
                                        issue.severity === 'fail' || issue.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                                      }`}>
                                        {issue.severity === 'fail' || issue.severity === 'critical' ? '✗' : '⚠'}
                                      </span>
                                      <div className="flex-1">
                                        <div className="text-sm font-semibold text-slate-800">{issue.title || issue.description}</div>
                                        {issue.details && (
                                          <div className="text-xs text-slate-600 mt-1">{issue.details}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {gaps.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm text-slate-700 mb-2">Coverage Gaps ({gaps.length})</h4>
                              <GapPanel gaps={gaps} />
                            </div>
                          )}
                          {conflicts.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm text-slate-700 mb-2">Conflicts ({conflicts.length})</h4>
                              <ConflictPanel conflicts={conflicts} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-3">🕸️</div>
                  <p className="font-semibold">No trace data yet</p>
                  <p className="text-sm mt-1">Run a graph review to see execution trace</p>
                </div>
              )}
            </div>
          )}

          {/* Graph Tab */}
          {activeTab === 'graph' && (
            <div className="space-y-6">
              {graphReviewTrace?.graph ? (
                <>
                  <GraphDefinitionPanel
                    graph={graphReviewTrace.graph}
                    graphDefinition={graphReviewTrace.graphDefinition}
                    graphDiff={graphReviewTrace.graphDiff}
                  />
                  
                  {/* Collapsible Skills */}
                  {skillInvocations.length > 0 && (
                    <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
                        className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-green-900 text-sm">
                          📚 Skills Used by Nodes ({skillInvocations.length})
                        </span>
                        <span className="text-green-700 font-bold">
                          {isSkillsExpanded ? '▲' : '▼'}
                        </span>
                      </button>
                      {isSkillsExpanded && (
                        <div className="p-4 bg-white">
                          <SkillsPanel 
                            catalog={skillCatalog} 
                            invocations={skillInvocations} 
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-3">📐</div>
                  <p className="font-semibold">No graph data yet</p>
                  <p className="text-sm mt-1">Run a graph review to see definition</p>
                </div>
              )}
            </div>
          )}

          {/* Runs Tab */}
          {activeTab === 'runs' && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3">🔄</div>
              <p className="font-semibold">Agent Runs</p>
              <p className="text-sm mt-1">Execution history (coming soon)</p>
            </div>
          )}

          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3">⚙️</div>
              <p className="font-semibold">Configuration</p>
              <p className="text-sm mt-1">Graph settings (coming soon)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

