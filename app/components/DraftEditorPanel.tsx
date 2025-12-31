'use client';

/**
 * Phase 4: Draft Editor Panel
 * 
 * Allows users to manually edit graph definitions, validate, and save as drafts
 */

import React, { useState, useEffect } from 'react';
import type { GraphDefinition } from '../lib/graphs/types';
import { computeGraphDiff } from '../lib/graphs/graphUtils';
import type { GraphDiff } from '../lib/graphs/types';

interface DraftEditorPanelProps {
  baseline: GraphDefinition;
}

interface ValidationStatus {
  validated: boolean;
  ok: boolean;
  errors?: Array<{ path: string; message: string }>;
}

interface SaveResult {
  draftId: string;
  savedAt: string;
  filePath: string;
}

function safeDisplay(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Complex Object]';
    }
  }
  return String(value);
}

export default function DraftEditorPanel({ baseline }: DraftEditorPanelProps) {
  const [editorText, setEditorText] = useState('');
  const [parsedDraft, setParsedDraft] = useState<GraphDefinition | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    validated: false,
    ok: false
  });
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [diff, setDiff] = useState<GraphDiff | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editor with baseline JSON
  useEffect(() => {
    setEditorText(JSON.stringify(baseline, null, 2));
  }, [baseline]);

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationStatus({ validated: false, ok: false });
    setParsedDraft(null);
    setDiff(null);

    try {
      // Try to parse JSON first
      let parsed: any;
      try {
        parsed = JSON.parse(editorText);
      } catch (parseError) {
        setValidationStatus({
          validated: true,
          ok: false,
          errors: [{
            path: 'json',
            message: `Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
          }]
        });
        setIsValidating(false);
        return;
      }

      // Call validation API
      const response = await fetch('/api/graphs/validate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphDraft: parsed })
      });

      const result = await response.json();
      
      setValidationStatus({
        validated: true,
        ok: result.ok,
        errors: result.errors
      });

      if (result.ok && result.parsed) {
        setParsedDraft(result.parsed);
        // Compute diff
        const graphDiff = computeGraphDiff(baseline, result.parsed);
        setDiff(graphDiff);
      }
    } catch (error) {
      setValidationStatus({
        validated: true,
        ok: false,
        errors: [{
          path: 'network',
          message: `Network error: ${error instanceof Error ? error.message : 'Unknown'}`
        }]
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validationStatus.ok || !parsedDraft) return;

    setIsSaving(true);
    setSaveResult(null);

    try {
      const response = await fetch('/api/graphs/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphDraft: parsedDraft,
          base: {
            version: baseline.version,
            checksum: baseline.checksum
          }
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        setSaveResult({
          draftId: result.draftId,
          savedAt: result.savedAt,
          filePath: result.filePath
        });
      } else {
        setValidationStatus({
          validated: true,
          ok: false,
          errors: result.errors || [{ path: 'save', message: result.error || 'Save failed' }]
        });
      }
    } catch (error) {
      setValidationStatus({
        validated: true,
        ok: false,
        errors: [{
          path: 'network',
          message: `Save error: ${error instanceof Error ? error.message : 'Unknown'}`
        }]
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-4 border-t-2 border-slate-300 pt-6">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <span className="text-2xl">✏️</span>
        Draft Editor (Phase 4 MVP)
      </h3>

      {/* JSON Editor */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Graph Definition JSON
        </label>
        <textarea
          data-testid="graph-draft-json-editor"
          value={editorText}
          onChange={(e) => setEditorText(e.target.value)}
          className="w-full h-96 p-3 font-mono text-xs bg-slate-50 border-2 border-slate-300 rounded focus:border-blue-500 focus:outline-none"
          spellCheck={false}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          data-testid="graph-draft-validate-button"
          onClick={handleValidate}
          disabled={isValidating}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isValidating ? 'Validating...' : '🔍 Validate'}
        </button>
        
        <button
          data-testid="graph-draft-save-button"
          onClick={handleSave}
          disabled={!validationStatus.ok || isSaving}
          className="px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : '💾 Save Draft'}
        </button>
      </div>

      {/* Validation Status */}
      {validationStatus.validated && (
        <div
          data-testid="graph-draft-status"
          className={`p-4 rounded border-2 ${
            validationStatus.ok
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          {validationStatus.ok ? (
            <div className="text-green-800 font-semibold">
              ✅ Valid! Ready to save.
            </div>
          ) : (
            <div>
              <div className="text-red-800 font-semibold mb-2">
                ❌ Validation Errors:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {validationStatus.errors?.map((err, idx) => (
                  <li key={idx}>
                    <code className="font-mono bg-red-100 px-1">{safeDisplay(err.path)}</code>: {safeDisplay(err.message)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Save Result */}
      {saveResult && (
        <div
          data-testid="graph-draft-save-result"
          className="p-4 bg-green-50 border-2 border-green-300 rounded"
        >
          <div className="text-green-800 font-semibold mb-2">
            ✅ Draft saved successfully!
          </div>
          <div className="text-sm space-y-1 text-green-700">
            <div>
              <span className="font-semibold">Draft ID:</span>{' '}
              <code className="bg-green-100 px-1 font-mono">{safeDisplay(saveResult.draftId)}</code>
            </div>
            <div>
              <span className="font-semibold">Saved at:</span> {safeDisplay(saveResult.savedAt)}
            </div>
            <div>
              <span className="font-semibold">File:</span>{' '}
              <code className="bg-green-100 px-1 font-mono">{safeDisplay(saveResult.filePath)}</code>
            </div>
          </div>
        </div>
      )}

      {/* Diff Summary */}
      {diff && diff.changes.length > 0 && (
        <div
          data-testid="graph-draft-diff"
          className="p-4 bg-orange-50 border-2 border-orange-300 rounded"
        >
          <h4 className="font-bold text-orange-800 mb-2">
            📝 Changes ({diff.changes.length})
          </h4>
          <ul className="space-y-2 text-sm">
            {diff.changes.slice(0, 10).map((change, idx) => (
              <li key={idx} className="text-orange-700">
                <span className="font-mono bg-orange-100 px-1 text-xs">
                  {safeDisplay(change.type)}
                </span>
                {' '}
                <code className="font-mono text-xs">{safeDisplay(change.path)}</code>
                {': '}
                {safeDisplay(change.description)}
              </li>
            ))}
            {diff.changes.length > 10 && (
              <li className="text-orange-600 italic">
                ... and {diff.changes.length - 10} more changes
              </li>
            )}
          </ul>
        </div>
      )}

      {diff && diff.changes.length === 0 && parsedDraft && (
        <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded text-blue-700">
          ℹ️ No changes detected from baseline
        </div>
      )}
    </div>
  );
}

