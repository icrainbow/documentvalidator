'use client';

import { useState } from 'react';
import type { Flow2Document } from '@/app/lib/flow2/types';
import type { GuardrailIssue } from '@/app/lib/case3/types';
import Case3BREditor from './Case3BREditor';
import Case3ReplaceUpload from './Case3ReplaceUpload';
import { detectGuardrailIssue } from '@/app/lib/case3/detectGuardrailIssue';

/**
 * Case 3: Guardrail Banner Component
 * 
 * High-visibility warning banner that blocks review until user resolves
 * document/BR mismatch via one of two paths:
 * 1. Fix BR fields (editing_br mode)
 * 2. Replace document (replacing_doc mode)
 */

interface Case3GuardrailBannerProps {
  blockedDocId: string;
  blockedDocument: Flow2Document;
  issue: GuardrailIssue;
  onResolve: (opts?: { mode: 'fix_br' | 'replace_doc'; patch?: Partial<Flow2Document> }) => void;
  onCancel?: () => void;
}

type ViewMode = 'warning' | 'editing_br' | 'replacing_doc';

export default function Case3GuardrailBanner({
  blockedDocId,
  blockedDocument,
  issue,
  onResolve,
  onCancel
}: Case3GuardrailBannerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('warning');
  const [localIssue, setLocalIssue] = useState<GuardrailIssue>(issue);

  // Warning View
  if (viewMode === 'warning') {
    return (
      <div className="bg-orange-50 border-4 border-orange-500 rounded-xl shadow-lg p-6 mb-6">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-orange-900 flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <span>GUARDRAIL ALERT: Document / BR Mismatch Detected</span>
          </h2>
        </div>

        {/* Warning Details */}
        <div className="mb-4">
          <p className="text-slate-700 font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span>We detected a potential issue with the uploaded document:</span>
          </p>
          <ul className="space-y-2 ml-8">
            {localIssue.details.map((detail, idx) => (
              <li key={idx} className="text-slate-700 flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Why This Matters */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-900 flex items-start gap-2">
            <span className="text-lg">ℹ️</span>
            <span>
              <strong>Why this matters:</strong> Processing mismatched documents can lead to
              compliance failures, approval delays, and operational risk exposure.
            </span>
          </p>
        </div>

        {/* Action Selection */}
        <div className="bg-white rounded-lg border-2 border-slate-300 p-4 mb-6">
          <p className="font-semibold text-slate-800 mb-3">🔍 What caused this issue?</p>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="issue-cause"
                value="fix_br"
                defaultChecked={localIssue.suggestedAction === 'fix_br'}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-slate-800">
                  The Business Requirement (BR) form fields are wrong
                </p>
                <p className="text-sm text-slate-600">
                  → Fix the BR to match this document
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="issue-cause"
                value="replace_doc"
                defaultChecked={localIssue.suggestedAction === 'replace_doc'}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-slate-800">
                  The uploaded document is completely wrong
                </p>
                <p className="text-sm text-slate-600">
                  → Replace it with the correct document
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('editing_br')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span>🔧</span>
            <span>Fix BR Fields</span>
          </button>
          <button
            onClick={() => setViewMode('replacing_doc')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span>📄</span>
            <span>Replace Document</span>
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // BR Editor View
  if (viewMode === 'editing_br') {
    return (
      <Case3BREditor
        initialDocType={localIssue.detectedDocType}
        onSubmit={(payload) => {
          // For demo: BR fix always resolves the issue
          onResolve({ 
            mode: 'fix_br', 
            patch: { guardrailBlocked: false, guardrailIssue: undefined } 
          });
        }}
        onCancel={() => setViewMode('warning')}
      />
    );
  }

  // Replace Document View
  if (viewMode === 'replacing_doc') {
    return (
      <Case3ReplaceUpload
        currentFileName={blockedDocument.filename}
        onFileLoaded={({ filename, text }) => {
          // Create pseudo-document for validation
          const pseudoDoc: Flow2Document = {
            ...blockedDocument,
            filename,
            text
          };

          // Re-run detection
          const newIssue = detectGuardrailIssue(pseudoDoc);

          if (newIssue.isBlocked) {
            // Still blocked - update issue and go back to warning
            setLocalIssue(newIssue);
            setViewMode('warning');
          } else {
            // Valid document - resolve with patch
            onResolve({ 
              mode: 'replace_doc', 
              patch: { 
                filename, 
                text, 
                guardrailBlocked: false, 
                guardrailIssue: undefined 
              } 
            });
          }
        }}
        onCancel={() => setViewMode('warning')}
      />
    );
  }

  return null;
}

