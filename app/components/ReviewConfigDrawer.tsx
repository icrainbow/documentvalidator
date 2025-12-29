'use client';

import { useState } from 'react';
import type { AgentParticipant } from '../lib/computeParticipants';
import type { AgentCategory, AgentVariant } from '../lib/agentVariants';
import { getAgentsByCategory, getAgentVariant, validateAgentSelection, AGENT_VARIANTS } from '../lib/agentVariants';
import type { ReviewConfig } from '../lib/reviewConfig';
import type { ClientContext, ReviewProfile } from '../lib/reviewProfiles';
import { getRecommendedProfile, getAllProfiles } from '../lib/reviewProfiles';

interface ReviewConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: AgentParticipant[];
  reviewConfig: ReviewConfig;
  onConfigChange: (config: ReviewConfig) => void;
  onRunReview: () => void;
}

type SelectionMode = 'none' | 'compliance' | 'evaluation' | 'rewrite';

export default function ReviewConfigDrawer({
  open,
  onOpenChange,
  participants,
  reviewConfig,
  onConfigChange,
  onRunReview
}: ReviewConfigDrawerProps) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [contextForm, setContextForm] = useState<Partial<ClientContext>>(reviewConfig.context || {});
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  if (!open) return null;
  
  const handleResetToRecommended = () => {
    const defaultConfig: ReviewConfig = {
      profileId: 'retail-standard',
      selectedAgents: {
        compliance: 'compliance-standard',
        evaluation: 'evaluation-standard',
        rewrite: 'rewrite-standard'
      }
    };
    onConfigChange(defaultConfig);
    setContextForm({});
  };
  
  const handleUpdateProfile = () => {
    if (!contextForm.clientSegment || !contextForm.jurisdiction || !contextForm.riskAppetite || !contextForm.productScope) {
      alert('Please fill in all context fields');
      return;
    }
    
    const fullContext = contextForm as ClientContext;
    const recommendedProfile = getRecommendedProfile(fullContext);
    
    const newConfig: ReviewConfig = {
      profileId: recommendedProfile.id,
      selectedAgents: recommendedProfile.defaultAgents,
      context: fullContext
    };
    
    onConfigChange(newConfig);
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };
  
  const handleSelectAgent = (category: AgentCategory, agentId: string) => {
    const newSelectedAgents = { ...reviewConfig.selectedAgents, [category]: agentId };
    
    // Validate selection
    const errors = validateAgentSelection(newSelectedAgents);
    if (errors.length > 0) {
      alert('Incompatible selection:\n' + errors.join('\n'));
      return;
    }
    
    onConfigChange({
      ...reviewConfig,
      selectedAgents: newSelectedAgents
    });
    
    setSelectionMode('none');
  };
  
  const getCategoryStatus = (category: AgentCategory): { required: boolean; enabled: boolean } => {
    if (category === 'compliance') return { required: true, enabled: true };
    if (category === 'evaluation') return { required: false, enabled: true };
    if (category === 'rewrite') return { required: false, enabled: true }; // Conditional on issues
    return { required: false, enabled: false };
  };
  
  const getActiveAgentsCount = () => {
    return Object.values(reviewConfig.selectedAgents).filter(Boolean).length;
  };
  
  const getTotalChecksCount = () => {
    let count = 0;
    Object.values(reviewConfig.selectedAgents).forEach(agentId => {
      if (agentId) {
        const agent = getAgentVariant(agentId);
        if (agent) {
          count += agent.skills.length;
        }
      }
    });
    return count;
  };
  
  const getDependencyChain = (): string => {
    const chain: string[] = [];
    if (reviewConfig.selectedAgents.compliance) {
      chain.push(AGENT_VARIANTS[reviewConfig.selectedAgents.compliance]?.name || 'Compliance');
    }
    if (reviewConfig.selectedAgents.evaluation) {
      chain.push(AGENT_VARIANTS[reviewConfig.selectedAgents.evaluation]?.name || 'Evaluation');
    }
    if (reviewConfig.selectedAgents.rewrite) {
      chain.push(AGENT_VARIANTS[reviewConfig.selectedAgents.rewrite]?.name || 'Rewrite');
    }
    return chain.join(' → ');
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Review Configuration & Agents</h2>
            <p className="text-sm text-slate-600 mt-1">Governed agent selection and client context</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
            aria-label="Close drawer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Selection Mode Sub-Panel */}
          {selectionMode !== 'none' && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col">
              <div className="p-6 border-b-2 border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">
                    Select {selectionMode === 'compliance' ? 'Compliance' : selectionMode === 'evaluation' ? 'Evaluation' : 'Rewrite'} Agent
                  </h3>
                  <button
                    onClick={() => setSelectionMode('none')}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {getAgentsByCategory(selectionMode as AgentCategory).map(agent => {
                  const isSelected = reviewConfig.selectedAgents[selectionMode as AgentCategory] === agent.id;
                  const isCompatible = true; // TODO: Check compatibility with other selected agents
                  
                  return (
                    <button
                      key={agent.id}
                      onClick={() => isCompatible && handleSelectAgent(selectionMode as AgentCategory, agent.id)}
                      disabled={!isCompatible}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : isCompatible
                          ? 'border-slate-200 hover:border-blue-300 bg-white'
                          : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-slate-800">{agent.name}</h4>
                          <span className="text-xs text-slate-500">{agent.version}</span>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">
                            SELECTED
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-3">{agent.description}</p>
                      
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-slate-700 mb-1">Best for:</div>
                        <div className="flex flex-wrap gap-1">
                          {agent.bestFor.map((item, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-1">Skills:</div>
                        <div className="flex flex-wrap gap-1">
                          {agent.skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <div className="p-6 space-y-8">
            {/* 1) Review Overview (Sticky inside drawer) */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-2 border-blue-200 rounded-lg p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Review Overview</h3>
                  <p className="text-sm text-slate-600 mt-1">Profile: <span className="font-semibold">{reviewConfig.profileId}</span></p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                    {getActiveAgentsCount()} Agents
                  </div>
                  <div className="px-3 py-1 bg-slate-600 text-white rounded-full text-sm font-bold">
                    {getTotalChecksCount()} Checks
                  </div>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-white rounded border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-1">Dependency Chain:</div>
                <div className="text-sm text-slate-800 font-medium">{getDependencyChain()}</div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={onRunReview}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                >
                  🔄 Re-run Review
                </button>
                <button
                  onClick={handleResetToRecommended}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold text-sm"
                >
                  ↻ Reset to Recommended
                </button>
              </div>
            </div>
            
            {/* 2) Agent Categories (Governed Selection) */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Agent Categories
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Select agent variants for each category
              </p>
              
              <div className="space-y-3">
                {/* Compliance Checks (REQUIRED) */}
                {(() => {
                  const selectedAgentId = reviewConfig.selectedAgents.compliance;
                  const selectedAgent = selectedAgentId ? getAgentVariant(selectedAgentId) : null;
                  
                  return (
                    <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">
                            Compliance Checks
                            <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase">
                              REQUIRED
                            </span>
                          </h4>
                          {selectedAgent && (
                            <p className="text-sm text-slate-700 mt-1">
                              Selected: <span className="font-semibold">{selectedAgent.name}</span> ({selectedAgent.version})
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectionMode('compliance')}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-semibold"
                        >
                          Select Agent
                        </button>
                      </div>
                      
                      {selectedAgent && (
                        <>
                          <div className="mb-2">
                            <div className="text-xs font-semibold text-slate-700 mb-1">Skills:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedAgent.skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white text-slate-700 text-xs rounded border border-red-200">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold">Dependencies:</span> None (always runs first)
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
                
                {/* Quality & Completeness (RECOMMENDED) */}
                {(() => {
                  const selectedAgentId = reviewConfig.selectedAgents.evaluation;
                  const selectedAgent = selectedAgentId ? getAgentVariant(selectedAgentId) : null;
                  
                  return (
                    <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">
                            Quality & Completeness
                            <span className="ml-2 px-2 py-0.5 bg-yellow-600 text-white text-[10px] font-bold rounded uppercase">
                              RECOMMENDED
                            </span>
                          </h4>
                          {selectedAgent && (
                            <p className="text-sm text-slate-700 mt-1">
                              Selected: <span className="font-semibold">{selectedAgent.name}</span> ({selectedAgent.version})
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectionMode('evaluation')}
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-xs font-semibold"
                        >
                          Select Agent
                        </button>
                      </div>
                      
                      {selectedAgent && (
                        <>
                          <div className="mb-2">
                            <div className="text-xs font-semibold text-slate-700 mb-1">Skills:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedAgent.skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white text-slate-700 text-xs rounded border border-yellow-200">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold">Dependencies:</span> Runs after Compliance
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
                
                {/* Rewrite / Remediation (CONDITIONAL) */}
                {(() => {
                  const selectedAgentId = reviewConfig.selectedAgents.rewrite;
                  const selectedAgent = selectedAgentId ? getAgentVariant(selectedAgentId) : null;
                  
                  return (
                    <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">
                            Rewrite / Remediation
                            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase">
                              CONDITIONAL
                            </span>
                          </h4>
                          {selectedAgent && (
                            <p className="text-sm text-slate-700 mt-1">
                              Selected: <span className="font-semibold">{selectedAgent.name}</span> ({selectedAgent.version})
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectionMode('rewrite')}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-semibold"
                        >
                          Select Agent
                        </button>
                      </div>
                      
                      {selectedAgent && (
                        <>
                          <div className="mb-2">
                            <div className="text-xs font-semibold text-slate-700 mb-1">Skills:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedAgent.skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white text-slate-700 text-xs rounded border border-blue-200">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold">Dependencies:</span> Only runs if issues exist
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* 3) Context Inputs (Client & Engagement Context) */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Client & Engagement Context
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Update context to auto-select recommended agents
              </p>
              
              {showConfirmation && (
                <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-sm text-green-800 font-semibold">
                  ✓ Profile updated! Switched to recommended agent variants.
                </div>
              )}
              
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Client Segment *
                    </label>
                    <select
                      value={contextForm.clientSegment || ''}
                      onChange={(e) => setContextForm({ ...contextForm, clientSegment: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="Retail">Retail</option>
                      <option value="HNW">HNW (High Net Worth)</option>
                      <option value="UHNW">UHNW (Ultra High Net Worth)</option>
                      <option value="Institutional">Institutional</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jurisdiction *
                    </label>
                    <select
                      value={contextForm.jurisdiction || ''}
                      onChange={(e) => setContextForm({ ...contextForm, jurisdiction: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="SG">Singapore (SG)</option>
                      <option value="EU">European Union (EU)</option>
                      <option value="CH">Switzerland (CH)</option>
                      <option value="UK">United Kingdom (UK)</option>
                      <option value="US">United States (US)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Risk Appetite *
                    </label>
                    <select
                      value={contextForm.riskAppetite || ''}
                      onChange={(e) => setContextForm({ ...contextForm, riskAppetite: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Product Scope *
                    </label>
                    <select
                      value={contextForm.productScope || ''}
                      onChange={(e) => setContextForm({ ...contextForm, productScope: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="Equities">Equities</option>
                      <option value="Derivatives">Derivatives</option>
                      <option value="Structured Products">Structured Products</option>
                      <option value="Alternatives">Alternatives</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={contextForm.notes || ''}
                    onChange={(e) => setContextForm({ ...contextForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Additional context or requirements..."
                  />
                </div>
                
                <button
                  onClick={handleUpdateProfile}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold"
                >
                  📋 Update Review Profile
                </button>
              </div>
            </div>
            
            {/* Runtime Participation (moved from old drawer) */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Runtime Participation
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                  Last Review
                </span>
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Agents that contributed to the most recent review
              </p>
              
              {participants.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-600 text-sm">
                  No review has been run yet. Click "Run Full Review" to see participating agents.
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map(participant => (
                    <div 
                      key={participant.agentId}
                      className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-slate-800">{participant.displayName}</h4>
                          <span className="text-xs text-slate-500 uppercase tracking-wide">{participant.roleType}</span>
                        </div>
                      </div>
                      
                      {/* Counts Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {participant.counts.issuesTotal > 0 && (
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-xs text-slate-600">Issues Produced</div>
                            <div className="text-lg font-bold text-slate-800">{participant.counts.issuesTotal}</div>
                          </div>
                        )}
                        
                        {participant.counts.proposedTexts > 0 && (
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-xs text-slate-600">Proposed Texts</div>
                            <div className="text-lg font-bold text-blue-800">{participant.counts.proposedTexts}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* System Components (Non-configurable) - Collapsed by default */}
            <details className="group">
              <summary className="cursor-pointer p-4 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-150 transition-colors">
                <span className="font-semibold text-slate-700">
                  System Components (Non-configurable)
                  <span className="ml-2 text-slate-500 text-sm">▼</span>
                </span>
              </summary>
              <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div>
                  <h5 className="font-bold text-slate-700 text-sm">Orchestrator</h5>
                  <p className="text-xs text-slate-600">Coordinates agent execution and manages workflow dependencies</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-700 text-sm">Trace Logger</h5>
                  <p className="text-xs text-slate-600">Records execution traces for audit and explainability</p>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </>
  );
}

