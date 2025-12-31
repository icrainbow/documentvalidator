/**
 * Skills Panel Component
 * 
 * Displays skill catalog and current run invocations.
 * Phase A: Demo-focused Skills UI.
 * Phase 2: Transport badges and target display.
 */

import React, { useState } from 'react';
import type { SkillDef, SkillInvocation } from '../lib/skills/types';

interface SkillsPanelProps {
  catalog: SkillDef[];
  invocations: SkillInvocation[];
}

/**
 * Safe display helper for any value type
 */
function safeDisplay(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }
  return String(value);
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

export default function SkillsPanel({ catalog, invocations }: SkillsPanelProps) {
  const [expandedCatalogSkill, setExpandedCatalogSkill] = useState<string | null>(null);
  const [expandedInvocation, setExpandedInvocation] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Section A: Skill Catalog */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">📚</span>
          Skill Catalog
        </h3>
        
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" data-testid="skill-catalog-list">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Description</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Owner Agent</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Tags</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((skill) => (
                <React.Fragment key={skill.name}>
                  <tr 
                    className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedCatalogSkill(expandedCatalogSkill === skill.name ? null : skill.name)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-purple-600">{skill.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{skill.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{skill.ownerAgent}</td>
                    <td className="px-4 py-3 text-xs">
                      {skill.tags?.map(tag => (
                        <span key={tag} className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1">
                          {tag}
                        </span>
                      ))}
                    </td>
                  </tr>
                  {expandedCatalogSkill === skill.name && (
                    <tr className="bg-slate-50">
                      <td colSpan={4} className="px-4 py-3 text-sm text-slate-600">
                        <div className="space-y-2">
                          {skill.version && (
                            <div><span className="font-semibold">Version:</span> {skill.version}</div>
                          )}
                          {skill.inputSchemaSummary && (
                            <div><span className="font-semibold">Input:</span> <code className="text-xs bg-slate-100 px-2 py-1 rounded">{skill.inputSchemaSummary}</code></div>
                          )}
                          {skill.outputSchemaSummary && (
                            <div><span className="font-semibold">Output:</span> <code className="text-xs bg-slate-100 px-2 py-1 rounded">{skill.outputSchemaSummary}</code></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section B: This Run - Skill Invocations */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          This Run: Skill Invocations
        </h3>
        
        {invocations.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
            No skills invoked in this run.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" data-testid="skill-invocations-list">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Skill Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Transport</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Duration (ms)</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Started At</th>
                </tr>
              </thead>
              <tbody>
                {invocations.map((inv) => (
                  <React.Fragment key={inv.id}>
                    <tr 
                      className="border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setExpandedInvocation(expandedInvocation === inv.id ? null : inv.id)}
                      data-testid={`skill-invocation-row-${inv.id}`}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-purple-600">{safeDisplay(inv.skillName)}</td>
                      <td className="px-4 py-3 text-sm">
                        {inv.transport === 'remote' ? (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded font-semibold text-xs">
                            🌐 REMOTE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold text-xs">
                            💻 LOCAL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{inv.durationMs}ms</td>
                      <td className="px-4 py-3 text-sm">
                        {inv.ok ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                            ✓ ok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                            ✗ error
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(inv.startedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                    {expandedInvocation === inv.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-4 py-3 text-xs text-slate-600">
                          <div className="space-y-2">
                            <div>
                              <span className="font-semibold">Owner Agent:</span> {safeDisplay(inv.ownerAgent)}
                            </div>
                            <div>
                              <span className="font-semibold">Transport:</span> {safeDisplay(inv.transport)}
                            </div>
                            <div>
                              <span className="font-semibold">Target:</span>{' '}
                              <span className="font-mono text-purple-600" title={safeDisplay(inv.target)}>
                                {truncateUrl(safeDisplay(inv.target))}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold">Correlation ID:</span> {safeDisplay(inv.correlationId)}
                            </div>
                            {inv.error && (
                              <div className="text-red-600">
                                <span className="font-semibold">Error:</span> {safeDisplay(inv.error)}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold">Input Summary:</span>
                              <pre className="mt-1 bg-slate-100 p-2 rounded text-xs overflow-x-auto">
                                {safeDisplay(inv.inputSummary)}
                              </pre>
                            </div>
                            <div>
                              <span className="font-semibold">Output Summary:</span>
                              <pre className="mt-1 bg-slate-100 p-2 rounded text-xs overflow-x-auto">
                                {safeDisplay(inv.outputSummary)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

