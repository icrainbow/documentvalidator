'use client';

import { useState } from 'react';
import type { AgentParticipant } from '../lib/computeParticipants';
import type { AgentMetadata } from '../lib/agentRegistry';
import { getAllAgents } from '../lib/agentRegistry';

interface AgentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: AgentParticipant[];
}

export default function AgentsDrawer({ open, onOpenChange, participants }: AgentsDrawerProps) {
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const allAgents = getAllAgents();
  
  if (!open) return null;
  
  const toggleExpand = (agentId: string) => {
    setExpandedAgentId(prev => prev === agentId ? null : agentId);
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Execution Inspector</h2>
            <p className="text-sm text-slate-600 mt-1">Agent reasoning & debug view</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section A: Runtime Participation */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              In This Review
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                Runtime
              </span>
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Agents that contributed to the current review analysis
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
                    className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
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
                          {/* Severity Breakdown */}
                          {(participant.counts.critical > 0 || participant.counts.high > 0) && (
                            <div className="text-[10px] text-slate-500 mt-1 space-x-2">
                              {participant.counts.critical > 0 && (
                                <span className="text-red-700 font-semibold">
                                  Critical: {participant.counts.critical}
                                </span>
                              )}
                              {participant.counts.high > 0 && (
                                <span className="text-orange-700 font-semibold">
                                  High: {participant.counts.high}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {participant.counts.proposedTexts > 0 && (
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-xs text-slate-600">Proposed Texts</div>
                          <div className="text-lg font-bold text-blue-800">{participant.counts.proposedTexts}</div>
                        </div>
                      )}
                      
                      {participant.counts.checklists > 0 && (
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <div className="text-xs text-slate-600">Checklists</div>
                          <div className="text-lg font-bold text-green-800">{participant.counts.checklists}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Section B: Agent Directory */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Agent Directory
              <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded">
                Capabilities
              </span>
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              All available agents and their capabilities
            </p>
            
            <div className="space-y-2">
              {allAgents.map(agent => {
                const isExpanded = expandedAgentId === agent.id;
                
                return (
                  <div 
                    key={agent.id}
                    className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white"
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => toggleExpand(agent.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{agent.displayName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded uppercase tracking-wide">
                            {agent.roleType}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{agent.description}</p>
                      </div>
                      <span className="ml-4 text-slate-400 text-xl font-bold">
                        {isExpanded ? '−' : '+'}
                      </span>
                    </button>
                    
                    {/* Accordion Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-slate-50 space-y-3">
                        {/* Inputs */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Inputs</h5>
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {agent.inputs.map((input, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2 text-slate-400">•</span>
                                <span>{input}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Outputs */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Outputs</h5>
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {agent.outputs.map((output, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2 text-slate-400">•</span>
                                <span>{output}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Constraints */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Constraints</h5>
                          <ul className="text-sm text-slate-600 space-y-0.5">
                            {agent.constraints.map((constraint, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2 text-red-400">⚠</span>
                                <span>{constraint}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Skills */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Skills</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {agent.skills.map((skill, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


