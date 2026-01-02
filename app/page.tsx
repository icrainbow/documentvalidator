'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { createNewSession, saveReviewSession } from './lib/reviewSessions';

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartNewReview = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create new session
    const session = createNewSession(file.name);
    saveReviewSession(session);

    // Store file data in sessionStorage for sectioning page
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      sessionStorage.setItem('uploadedFileName', file.name);
      sessionStorage.setItem('uploadedFileType', file.type);
      sessionStorage.setItem('uploadedFileData', base64);
      sessionStorage.setItem('currentSessionId', session.id);
      
      // Navigate to sectioning page
      router.push('/sectioning');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Document Icon */}
            <svg className="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              <path d="M8 16h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/>
            </svg>
            <h1 className="text-5xl font-bold text-white">
              Agentic Frameworks for Proactive Governance
            </h1>
          </div>
          <p className="text-slate-300 text-lg">
            AI-Powered Compliance & Risk Assessment
          </p>
        </div>

        {/* Flow Selection Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose a review process based on case complexity and uncertainty</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Flow 1: Deterministic Review Process */}
            <div className="bg-white rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden hover:border-blue-400 transition-all">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Flow 1</h2>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Deterministic Review Process</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Predictable, scope-bound review for standard cases. Same inputs produce same outcomes for auditability and cost efficiency.
                </p>
                <button
                  onClick={handleStartNewReview}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-md"
                >
                  Start Flow 1 Review
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf,.txt,.word"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div className="bg-blue-50 px-8 py-3 border-t border-blue-200">
                <p className="text-xs text-blue-700 font-medium">
                  ✓ Scope Planning • ✓ Dirty Queue • ✓ Global Checks
                </p>
              </div>
            </div>

            {/* Flow 2: Agentic Review Process */}
            <div className="bg-white rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden hover:border-purple-400 transition-all">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🕸️</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Flow 2</h2>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Agentic Review Process</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Dynamic review for complex exceptions. Adapts scope and execution path based on signals, with human control at key decision points.
                </p>
                <button
                  onClick={() => router.push('/document?flow=2&scenario=kyc')}
                  className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg shadow-md"
                >
                  Start Flow 2 Review
                </button>
              </div>
              <div className="bg-purple-50 px-8 py-3 border-t border-purple-200">
                <p className="text-xs text-purple-700 font-medium">
                  ✓ Graph Trace • ✓ Risk Triage • ✓ Human Gates
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-slate-400 text-sm">
            Multi-Agent AI System • Powered by Claude Sonnet 4.5
          </p>
        </div>
      </div>
    </div>
  );
}
