'use client';

import { useState, useEffect } from 'react';
import type { AgentParticipant } from '../lib/computeParticipants';
import type { AgentCategory, AgentVariant } from '../lib/agentVariants';
import { getAgentsByCategory, getAgentVariant, AGENT_VARIANTS } from '../lib/agentVariants';
import type { ReviewConfig } from '../lib/reviewConfig';
import type { ClientContext } from '../lib/reviewProfiles';
import type { VisibilityMode } from '../types/visibility';
import { getVisibilityConfig } from '../types/visibility';
import ContractProfilePanel from './ContractProfilePanel';
import { recommendAgentBundle } from '../lib/reviewProfileMapping';
import { validateAgentFeasibility } from '../lib/agentFeasibilityValidator';
import { getClientProfile, DEFAULT_CLIENT_PROFILE, type ClientProfile } from '../lib/demo/clientProfiles';

interface ReviewConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: AgentParticipant[];
  reviewConfig: ReviewConfig;
  onConfigChange: (config: ReviewConfig) => void;
  onRunReview: () => void;
}

type SelectionMode = 'none' | 'evaluation' | 'rewrite';  // Note: compliance NOT included (always locked)

export default function ReviewConfigDrawer({
  open,
  onOpenChange,
  participants,
  reviewConfig,
  onConfigChange,
  onRunReview
}: ReviewConfigDrawerProps) {
  // Drawer owns visibilityMode state (Stage 8.1)
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('reviewer');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [contextForm, setContextForm] = useState<Partial<ClientContext & { contractNumber?: string }>>(reviewConfig.context || {});
  const [showMessage, setShowMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  
  // FIX 1: Client Profile state
  const [contractId, setContractId] = useState('');
  const [clientProfile, setClientProfile] = useState<ClientProfile>(DEFAULT_CLIENT_PROFILE);
  const [contractIdHint, setContractIdHint] = useState('');

  const visibility = getVisibilityConfig(visibilityMode);
  
  // FIX 1: Initialize with default client profile on mount
  useEffect(() => {
    if (!reviewConfig.context || Object.keys(reviewConfig.context).length === 0) {
      setClientProfile(DEFAULT_CLIENT_PROFILE);
      setContextForm({
        clientSegment: DEFAULT_CLIENT_PROFILE.clientSegment as any,
        jurisdiction: DEFAULT_CLIENT_PROFILE.jurisdiction,
        riskAppetite: DEFAULT_CLIENT_PROFILE.riskAppetite,
        productScope: DEFAULT_CLIENT_PROFILE.productScope as any,
        notes: DEFAULT_CLIENT_PROFILE.notes
      });
    }
  }, []);

  // Self-healing: on drawer open or config load (Stage 8.10)
  useEffect(() => {
    if (open && reviewConfig.context && reviewConfig.locked?.compliance) {
      const recommendation = recommendAgentBundle(reviewConfig.context);
      
      // If compliance doesn't match recommendation, auto-fix
      if (reviewConfig.selectedAgents.compliance !== recommendation.selectedAgents.compliance) {
        console.log('[ReviewConfigDrawer] Self-heal: fixing compliance to match context');
        onConfigChange({
          ...reviewConfig,
          selectedAgents: {
            ...reviewConfig.selectedAgents,
            compliance: recommendation.selectedAgents.compliance
          },
          validationStatus: 'required'
        });
        showTemporaryMessage('info', 'Compliance agent auto-corrected to match context. Please validate feasibility.');
      }
    }
  }, [open]);

  const showTemporaryMessage = (type: 'success' | 'info' | 'error', text: string) => {
    setShowMessage({ type, text });
    setTimeout(() => setShowMessage(null), 4000);
  };

  if (!open) return null;

  // Handle contract profile pull (Stage 8.4)
  const handlePullProfile = (pulledContext: ClientContext & { contractNumber: string; productScope: string[] }) => {
    const recommendation = recommendAgentBundle(pulledContext);

    const newConfig: ReviewConfig = {
      ...reviewConfig,
      profileId: recommendation.profileId,
      selectedAgents: recommendation.selectedAgents,
      context: pulledContext,
      locked: recommendation.locked,
      validationStatus: 'required',  // Must validate before proceeding
      validationErrors: [],
      validationWarnings: []
    };

    onConfigChange(newConfig);
    setContextForm(pulledContext);
    showTemporaryMessage('info', `Profile loaded: ${pulledContext.contractNumber}. Validate feasibility to proceed.`);
  };

  // Handle manual context edit (Stage 8.5)
  const handleContextFieldChange = (field: keyof ClientContext, value: any) => {
    const updatedContext = { ...contextForm, [field]: value };
    setContextForm(updatedContext);

    // If clientSegment or jurisdiction changed, trigger auto-recommendation
    if ((field === 'clientSegment' || field === 'jurisdiction') && updatedContext.clientSegment && updatedContext.jurisdiction) {
      const fullContext = {
        clientSegment: updatedContext.clientSegment,
        jurisdiction: updatedContext.jurisdiction,
        riskAppetite: updatedContext.riskAppetite || 'Medium',
        productScope: updatedContext.productScope || 'Equities',
        contractNumber: updatedContext.contractNumber,
        notes: updatedContext.notes
      } as ClientContext & { contractNumber?: string };

      const recommendation = recommendAgentBundle(fullContext);

      onConfigChange({
        ...reviewConfig,
        profileId: recommendation.profileId,
        selectedAgents: recommendation.selectedAgents,
        context: fullContext,
        locked: recommendation.locked,
        validationStatus: 'required'
      });

      showTemporaryMessage('info', 'Agent bundle updated based on context. Validate feasibility to proceed.');
    }
  };

  // Handle agent selection (Stage 8.9 - only for optional agents, only in Explainability)
  const handleSelectAgent = (category: AgentCategory, agentId: string) => {
    const newSelectedAgents = { ...reviewConfig.selectedAgents, [category]: agentId };

    onConfigChange({
      ...reviewConfig,
      selectedAgents: newSelectedAgents,
      validationStatus: 'required'  // Any manual change requires re-validation
    });

    setSelectionMode('none');
    showTemporaryMessage('info', 'Agent selection changed. Validate feasibility to proceed.');
  };

  // Handle feasibility validation (Stage 8.6)
  const handleValidateFeasibility = () => {
    if (!reviewConfig.context) {
      showTemporaryMessage('error', 'No context available. Pull a contract profile or enter context manually.');
      return;
    }

    const result = validateAgentFeasibility(reviewConfig.context, reviewConfig.selectedAgents);

    onConfigChange({
      ...reviewConfig,
      validationStatus: result.valid ? 'valid' : 'failed',
      validationErrors: result.errors,
      validationWarnings: result.warnings,
      lastValidatedAt: new Date().toISOString()
    });

    if (result.valid) {
      showTemporaryMessage('success', '✓ Agent configuration is valid. You can now run review.');
    } else {
      showTemporaryMessage('error', '✗ Validation failed. Review errors below.');
    }
  };

  // Gating logic (Stage 8.7)
  const isGated = reviewConfig.validationStatus === 'required' || reviewConfig.validationStatus === 'failed';
  const canRunReview = !isGated || reviewConfig.validationStatus === undefined;  // undefined = backward compat, don't gate

  const handleResetToRecommended = () => {
    const defaultConfig: ReviewConfig = {
      profileId: 'compliance-standard-v1',
      selectedAgents: {
        compliance: 'compliance_standard_v1',
        evaluation: 'evaluation_standard_v1',
        rewrite: 'rewrite_standard_v1'
      }
    };
    onConfigChange(defaultConfig);
    setContextForm({});
    showTemporaryMessage('success', 'Reset to default configuration.');
  };
  
  // FIX 1: Handle contract ID change
  const handleContractIdChange = (id: string) => {
    setContractId(id);
    const { profile, found } = getClientProfile(id);
    
    setClientProfile(profile);
    setContextForm({
      clientSegment: profile.clientSegment as any,
      jurisdiction: profile.jurisdiction,
      riskAppetite: profile.riskAppetite,
      productScope: profile.productScope as any,
      notes: profile.notes,
      contractNumber: profile.contractId
    });
    
    if (id.trim() && !found) {
      setContractIdHint('Unknown contract ID; using default profile');
    } else if (found) {
      setContractIdHint(`✓ Profile loaded for contract ${id}`);
    } else {
      setContractIdHint('');
    }
  };

  const handleUpdateProfile = () => {
    if (!contextForm.clientSegment || !contextForm.jurisdiction || !contextForm.riskAppetite || !contextForm.productScope) {
      showTemporaryMessage('error', 'Please fill in all required context fields');
      return;
    }

    const fullContext = contextForm as ClientContext & { contractNumber?: string };
    const recommendation = recommendAgentBundle(fullContext);

    const newConfig: ReviewConfig = {
      ...reviewConfig,
      profileId: recommendation.profileId,
      selectedAgents: recommendation.selectedAgents,
      context: fullContext,
      locked: recommendation.locked,
      validationStatus: 'required'
    };

    onConfigChange(newConfig);
    showTemporaryMessage('info', 'Profile updated. Validate feasibility to proceed.');
  };

  const getActiveAgentsCount = () => {
    return Object.values(reviewConfig.selectedAgents).filter(Boolean).length;
  };

  const getTotalChecksCount = () => {
    let count = 0;
    Object.values(reviewConfig.selectedAgents).forEach(agentId => {
      if (agentId) {
        const agent = getAgentVariant(agentId);
        if (agent) count += agent.skills.length;
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

        {/* Visibility Mode Toggle (Stage 8.2) */}
        <div className="px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex gap-2">
            {(['reviewer', 'why', 'explainability'] as VisibilityMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setVisibilityMode(mode)}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  visibilityMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {mode === 'reviewer' && '👤 Reviewer'}
                {mode === 'why' && '💡 Why'}
                {mode === 'explainability' && '🔬 Explainability'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Selection Mode Sub-Panel (Only for optional agents in Explainability) */}
          {selectionMode !== 'none' && visibility.showAgentSelection && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col">
              <div className="p-6 border-b-2 border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">
                    Select {selectionMode === 'evaluation' ? 'Evaluation' : 'Rewrite'} Agent
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
                  
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(selectionMode as AgentCategory, agent.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
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
                      
                      {visibility.showAgentSkills && agent.applicableTo && (
                        <div className="mb-2">
                          <div className="text-xs font-semibold text-slate-700 mb-1">Applicable to:</div>
                          <p className="text-xs text-slate-600">{agent.applicableTo.note}</p>
                        </div>
                      )}
                      
                      {visibility.showAgentSkills && (
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
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <div className="p-6 space-y-6">
            {/* Message Banner */}
            {showMessage && (
              <div className={`p-3 rounded-lg border-2 text-sm font-semibold ${
                showMessage.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
                showMessage.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
                'bg-blue-50 border-blue-300 text-blue-800'
              }`}>
                {showMessage.text}
              </div>
            )}

            {/* Validation Status Banner (Stage 8.6) */}
            {visibility.showValidation && reviewConfig.validationStatus && (
              <div className={`p-4 rounded-lg border-2 ${
                reviewConfig.validationStatus === 'valid' ? 'bg-green-50 border-green-300' :
                reviewConfig.validationStatus === 'failed' ? 'bg-red-50 border-red-300' :
                'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm mb-1">
                      {reviewConfig.validationStatus === 'valid' && '✓ Configuration Valid'}
                      {reviewConfig.validationStatus === 'failed' && '✗ Validation Failed'}
                      {reviewConfig.validationStatus === 'required' && '⚠ Validation Required'}
                    </div>
                    {reviewConfig.validationErrors && reviewConfig.validationErrors.length > 0 && (
                      <ul className="text-xs space-y-1 mt-2">
                        {reviewConfig.validationErrors.map((err, idx) => (
                          <li key={idx} className="text-red-700">• {err}</li>
                        ))}
                      </ul>
                    )}
                    {reviewConfig.validationStatus === 'required' && (
                      <p className="text-xs mt-1 text-slate-700">
                        Click "Validate Agent Feasibility" below to check if agent selection matches context.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
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
                  disabled={isGated}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                    isGated
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title={isGated ? 'Validate agent feasibility first' : 'Run full review'}
                >
                  🔄 Re-run Review
                </button>
                <button
                  onClick={handleResetToRecommended}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold text-sm"
                >
                  ↻ Reset to Default
                </button>
              </div>
            </div>

            {/* Contract Profile Panel (Stage 8.3 - only in Explainability) */}
            {visibility.showContractInput && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3">Contract Lookup</h3>
                <ContractProfilePanel onPull={handlePullProfile} />
              </div>
            )}

            {/* Context Display (Stage 8.3 - shown in Why & Explainability) */}
            {visibility.showContextDetails && reviewConfig.context && (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Current Context</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-slate-700">Segment:</span>{' '}
                    <span className="text-slate-900">{reviewConfig.context.clientSegment}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Jurisdiction:</span>{' '}
                    <span className="text-slate-900">{reviewConfig.context.jurisdiction}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Risk:</span>{' '}
                    <span className="text-slate-900">{reviewConfig.context.riskAppetite}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Products:</span>{' '}
                    <span className="text-slate-900">
                      {Array.isArray(reviewConfig.context.productScope)
                        ? reviewConfig.context.productScope.join(', ')
                        : reviewConfig.context.productScope}
                    </span>
                  </div>
                  {reviewConfig.context.contractNumber && (
                    <div className="col-span-2">
                      <span className="font-semibold text-slate-700">Contract:</span>{' '}
                      <span className="text-slate-900">{reviewConfig.context.contractNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 2) Agent Categories (Governed Selection) */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Agent Categories</h3>
              
              <div className="space-y-3">
                {/* Compliance Checks (MANDATORY - LOCKED) */}
                {(() => {
                  const selectedAgentId = reviewConfig.selectedAgents.compliance;
                  const selectedAgent = selectedAgentId ? getAgentVariant(selectedAgentId) : null;
                  const isLocked = reviewConfig.locked?.compliance === true;
                  
                  return (
                    <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800">
                            Compliance Checks
                            <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase">
                              Mandatory
                            </span>
                            {isLocked && (
                              <span className="ml-2 px-2 py-0.5 bg-slate-700 text-white text-[10px] font-bold rounded">
                                🔒 Locked by Policy
                              </span>
                            )}
                          </h4>
                          {selectedAgent && (
                            <p className="text-sm text-slate-700 mt-1">
                              <span className="font-semibold">{selectedAgent.name}</span> ({selectedAgent.version})
                            </p>
                          )}
                        </div>
                        {/* No Select button if locked (Stage 8.8) */}
                        {!isLocked && visibility.showAgentSelection && (
                          <button
                            onClick={() => alert('Compliance agent selection is locked by context policy')}
                            className="px-3 py-1 bg-slate-400 text-white rounded cursor-not-allowed text-xs font-semibold"
                            disabled
                          >
                            Locked
                          </button>
                        )}
                      </div>
                      
                      {selectedAgent && visibility.showAgentSkills && (
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
                      )}
                    </div>
                  );
                })()}
                
                {/* Evaluation (OPTIONAL) */}
                {(() => {
                  const selectedAgentId = reviewConfig.selectedAgents.evaluation;
                  const selectedAgent = selectedAgentId ? getAgentVariant(selectedAgentId) : null;
                  
                  return (
                    <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800">
                            Evaluation
                            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase">
                              Optional
                            </span>
                          </h4>
                          {selectedAgent && (
                            <p className="text-sm text-slate-700 mt-1">
                              <span className="font-semibold">{selectedAgent.name}</span> ({selectedAgent.version})
                            </p>
                          )}
                        </div>
                        {visibility.showAgentSelection && (
                          <button
                            onClick={() => setSelectionMode('evaluation')}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-semibold"
                          >
                            Select Agent
                          </button>
                        )}
                      </div>
                      
                      {selectedAgent && visibility.showAgentSkills && (
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
                      )}
                    </div>
                  );
                })()}
                
                {/* Rewrite (OPTIONAL) */}
                {(() => {
                  const selectedAgentId = reviewConfig.selectedAgents.rewrite;
                  const selectedAgent = selectedAgentId ? getAgentVariant(selectedAgentId) : null;
                  
                  return (
                    <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800">
                            Rewrite / Remediation
                            <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded uppercase">
                              Optional
                            </span>
                          </h4>
                          {selectedAgent && (
                            <p className="text-sm text-slate-700 mt-1">
                              <span className="font-semibold">{selectedAgent.name}</span> ({selectedAgent.version})
                            </p>
                          )}
                        </div>
                        {visibility.showAgentSelection && (
                          <button
                            onClick={() => setSelectionMode('rewrite')}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-semibold"
                          >
                            Select Agent
                          </button>
                        )}
                      </div>
                      
                      {selectedAgent && visibility.showAgentSkills && (
                        <div className="mb-2">
                          <div className="text-xs font-semibold text-slate-700 mb-1">Skills:</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedAgent.skills.map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-white text-slate-700 text-xs rounded border border-green-200">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Validate Feasibility Button (Stage 8.6 - only in Explainability) */}
            {visibility.showValidation && (
              <button
                onClick={handleValidateFeasibility}
                disabled={!reviewConfig.context}
                className={`w-full px-4 py-3 rounded-lg font-bold text-sm ${
                  !reviewConfig.context
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                🔍 Validate Agent Feasibility
              </button>
            )}
            
            {/* 3) Context Inputs (only in Explainability) */}
            {visibility.showContextDetails && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3">
                  Client Profile Overview
                </h3>
                
                {/* FIX 1: Contract ID Input */}
                <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Contract ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={contractId}
                    onChange={(e) => handleContractIdChange(e.target.value)}
                    placeholder="e.g., 12345678 or 87654321"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {contractIdHint && (
                    <p className={`text-xs mt-1.5 ${contractIdHint.includes('✓') ? 'text-green-700' : 'text-slate-600'}`}>
                      {contractIdHint}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Enter contract ID to load predefined profile (12345678 → UHNW/SG, 87654321 → CIC/CH)
                  </p>
                </div>
                
                <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Client Segment *
                      </label>
                      <select
                        value={contextForm.clientSegment || ''}
                        onChange={(e) => handleContextFieldChange('clientSegment', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="Retail">Retail</option>
                        <option value="HNW">HNW (High Net Worth)</option>
                        <option value="UHNW">UHNW (Ultra High Net Worth)</option>
                        <option value="CIC">CIC</option>
                        <option value="Institutional">Institutional</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jurisdiction *
                      </label>
                      <select
                        value={contextForm.jurisdiction || ''}
                        onChange={(e) => handleContextFieldChange('jurisdiction', e.target.value)}
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
                        onChange={(e) => handleContextFieldChange('riskAppetite', e.target.value)}
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
                        value={Array.isArray(contextForm.productScope) ? contextForm.productScope[0] : contextForm.productScope || ''}
                        onChange={(e) => handleContextFieldChange('productScope', e.target.value)}
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
                  
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isGated && reviewConfig.validationStatus !== 'required'}
                    className={`w-full px-4 py-3 rounded-lg font-bold ${
                      isGated && reviewConfig.validationStatus !== 'required'
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-white hover:bg-slate-800'
                    }`}
                  >
                    📋 Update Review Profile
                  </button>
                </div>
              </div>
            )}
            
            {/* Runtime Participation (Last Review) */}
            {participants.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-3">
                  Runtime Participation
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                    Last Review
                  </span>
                </h3>
                
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
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {participant.counts.issuesTotal > 0 && (
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <div className="text-xs text-slate-600">Issues</div>
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
              </div>
            )}
            
            {/* System Components (Non-configurable) */}
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
