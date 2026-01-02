'use client';

/**
 * Case2ProcessBanner
 * 
 * Top-level orchestrator for Case 2 UI.
 * 
 * State-driven rendering:
 * - triggered/tracing: Show thinking trace panel
 * - synthesized: Show graph + assistant text + Accept button
 * - accepted: Show file upload section
 * - files_ready: Enable Start button
 * - started: Show success message
 */

import React, { useState, useEffect, useRef } from 'react';
import { Case2DemoData } from '@/app/lib/case2/demoCase2Data';
import Case2ThinkingTracePanel from './Case2ThinkingTracePanel';
import Case2SuggestedPathGraph from './Case2SuggestedPathGraph';

export type Case2State = 'idle' | 'triggered' | 'tracing' | 'synthesized' | 'accepted' | 'files_ready' | 'started';

interface Case2ProcessBannerProps {
  state: Case2State;
  data: Case2DemoData;
  uploadedFiles: File[];
  onAccept: () => void;
  onFileUpload: (files: File[]) => void;
  onStart: () => void;
  onTraceComplete: () => void;
}

export default function Case2ProcessBanner({
  state,
  data,
  uploadedFiles,
  onAccept,
  onFileUpload,
  onStart,
  onTraceComplete
}: Case2ProcessBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  
  // Auto-scroll into view when first shown
  useEffect(() => {
    if (state !== 'idle' && !hasScrolledRef.current && bannerRef.current) {
      hasScrolledRef.current = true;
      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [state]);
  
  // Map uploaded files to required documents
  const mapFileToDocType = (filename: string): string | null => {
    const lower = filename.toLowerCase();
    
    if (lower.includes('legacy') || lower.includes('profile') || lower.includes('cs'))
      return data.required_documents[0].name;
    
    if (lower.includes('waiver') || lower.includes('strategic'))
      return data.required_documents[1].name;
    
    if (lower.includes('escalation') || lower.includes('committee') || lower.includes('memo'))
      return data.required_documents[2].name;
    
    return null;
  };
  
  // Check if all required documents are covered
  const coveredDocs = new Set<string>();
  uploadedFiles.forEach(file => {
    const docType = mapFileToDocType(file.name);
    if (docType) coveredDocs.add(docType);
  });
  
  const allDocsUploaded = data.required_documents.every(doc => coveredDocs.has(doc.name));
  const canStart = state === 'files_ready' && allDocsUploaded;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      onFileUpload(filesArray);
    }
  };
  
  if (state === 'idle') return null;
  
  return (
    <div ref={bannerRef} className="mb-6 bg-blue-50 border-2 border-blue-400 rounded-xl overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-700 font-bold text-xl">
            {isCollapsed ? '▶' : '▼'}
          </span>
          <div className="text-left">
            <h2 className="text-lg font-bold text-blue-900">
              Case 2: CS Integration Exception
            </h2>
            <p className="text-sm text-blue-700">
              {state === 'started' ? 'Approval flow initiated' : 'Analyzing exception approval requirements'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full font-bold text-xs uppercase bg-blue-600 text-white">
          {state === 'started' ? '✓ Started' : 'Active'}
        </span>
      </button>
      
      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="p-6 pt-0">
          {/* Thinking Trace Panel (triggered/tracing) */}
          {(state === 'triggered' || state === 'tracing') && (
            <Case2ThinkingTracePanel
              sources={data.sources}
              isAnimating={state === 'tracing'}
              onComplete={onTraceComplete}
            />
          )}
          
          {/* Graph + Assistant Text (synthesized and beyond) */}
          {(state === 'synthesized' || state === 'accepted' || state === 'files_ready' || state === 'started') && (
            <>
              <Case2SuggestedPathGraph steps={data.path_steps} />
              
              {/* Assistant Text Panel */}
              <div className="mb-6 bg-white border-2 border-slate-300 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🤖</span>
                  <h3 className="text-lg font-bold text-slate-800">Analysis Summary</h3>
                </div>
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
                  {data.assistant_text}
                </div>
              </div>
            </>
          )}
          
          {/* Accept Button (synthesized only) */}
          {state === 'synthesized' && (
            <div className="mb-6">
              <button
                onClick={onAccept}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg shadow-md"
              >
                ✓ Accept Process
              </button>
              <p className="text-xs text-slate-600 text-center mt-2">
                Click to proceed with document uploads and approval initiation
              </p>
            </div>
          )}
          
          {/* File Upload Section (accepted and beyond) */}
          {(state === 'accepted' || state === 'files_ready') && (
            <div className="mb-6 bg-white border-2 border-slate-300 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📎</span>
                <h3 className="text-lg font-bold text-slate-800">Required Documents</h3>
              </div>
              
              {/* Checklist */}
              <div className="mb-4 space-y-2">
                {data.required_documents.map((doc, idx) => {
                  const isUploaded = coveredDocs.has(doc.name);
                  
                  return (
                    <div
                      key={idx}
                      className={`border-2 rounded-lg p-3 ${
                        isUploaded ? 'border-green-400 bg-green-50' : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">
                          {isUploaded ? '✅' : '⬜'}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-slate-800">{doc.name}</h4>
                          <p className="text-xs text-slate-600 mt-1">{doc.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* File Input */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Upload Files (3 required)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-slate-700 mb-2">
                    Uploaded Files ({uploadedFiles.length}/3)
                  </p>
                  <div className="space-y-1">
                    {uploadedFiles.map((file, idx) => {
                      const mappedDoc = mapFileToDocType(file.name);
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono">{file.name}</span>
                          {mappedDoc && (
                            <span className="text-blue-600 italic">→ {mappedDoc}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Start Button (files_ready) */}
          {state === 'files_ready' && (
            <div className="mb-6">
              <button
                onClick={onStart}
                disabled={!canStart}
                className={`w-full px-6 py-4 rounded-lg transition-colors font-bold text-lg shadow-md ${
                  canStart
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {canStart ? '🚀 Start Approval Flow' : '⏳ Upload 3 Required Documents'}
              </button>
            </div>
          )}
          
          {/* Success Message (started) */}
          {state === 'started' && (
            <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">✅</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    Exception Approval Flow Initiated
                  </h3>
                  <p className="text-sm text-green-800 leading-relaxed mb-3">
                    Your request has been successfully submitted to the Joint Steering Committee for review. 
                    The case will follow the approved exception path outlined above.
                  </p>
                  <div className="text-xs text-green-700 space-y-1">
                    <p><strong>Next Steps:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Data Gap Remediation team will retrieve CS archive documents</li>
                      <li>Strategic Value Waiver will be validated by LOD1</li>
                      <li>Joint Steering Committee will schedule case review</li>
                      <li>Group Head approval will be requested upon committee recommendation</li>
                    </ul>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <p className="text-xs text-green-700 italic">
                      This is a demonstration flow. In production, automated notifications would be sent to all stakeholders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

