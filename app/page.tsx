'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { createNewSession, saveReviewSession } from './lib/reviewSessions';

/**
 * Feature flag: show Flow1 entry on landing page.
 * Default: false (Flow1 hidden)
 * Enable via env: NEXT_PUBLIC_SHOW_FLOW1=true
 */
const SHOW_FLOW1 = process.env.NEXT_PUBLIC_SHOW_FLOW1 === 'true' || false;

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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Document Icon */}
            <svg className="w-12 h-12 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              <path d="M8 16h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/>
            </svg>
            <h1 className="text-5xl font-bold text-white">
              Agentic Review Process
            </h1>
          </div>
          <p className="text-slate-300 text-lg max-w-3xl mx-auto mb-6">
            A comparative exploration of agentic frameworks and deterministic workflows in regulated review systems.
          </p>
          
          {/* Execution Model Legend */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Execution Model:</span>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-full">
                <span>🟣</span>
                <span>Agentic (LangGraph) – Required</span>
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-full">
                <span>🟡</span>
                <span>Hybrid (Agent + Workflow)</span>
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-full">
                <span>⚪</span>
                <span>Deterministic Workflow – No Agent</span>
              </span>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="mb-12 flex justify-center">
          <button
            onClick={() => router.push('/document?flow=2')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-bold text-xl shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Agentic Review Process
          </button>
        </div>

        {/* Demo Scenarios Section */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Case 1: Adaptive KYC Review */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 overflow-hidden hover:border-blue-400 transition-all">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🔍</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Adaptive KYC Review</h3>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <span>🟣</span>
                    <span>Agentic Required</span>
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  A dynamic KYC review flow where the agentic graph adjusts scope, routing, and execution path based on detected risk signals.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Signal-driven routing (fast / cross-check / escalate)</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Parallel checks + trace visibility</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Human control at key gates</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Case 2: Natural Language Process Composition */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 overflow-hidden hover:border-green-400 transition-all">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📝</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Natural Language Process Composition</h3>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <span>🟡</span>
                    <span>Hybrid</span>
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  A review process composed from the reviewer's natural language instructions, enabling flexible, on-demand workflows with explicit human confirmation.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>Reviewer instruction → generated steps</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>Deterministic process monitor updates</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>HITL confirm-before-run pattern</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Case 4: IT Impact Review */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200 overflow-hidden hover:border-purple-400 transition-all md:col-span-2">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🔧</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">IT Impact Review</h3>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <span>🟡</span>
                    <span>Hybrid</span>
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  A multi-dimensional IT impact assessment triggered by natural language input, analyzing downstream system, operational, and integration implications.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Multi-dimensional analysis (systems / ops / integration)</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Evidence-style summary output</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-purple-600 mt-0.5">•</span>
                    <span>Safe isolation from KYC flows</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* Built-in Guardrails (Foundation – Always On) */}
          <div className="mt-6 bg-slate-800/40 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🛡️</span>
                </div>
                <h3 className="text-lg font-bold text-slate-200">
                  Built-in Guardrails (Always On)
                </h3>
              </div>
              <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded-full text-xs font-medium flex items-center gap-1">
                <span>⚪</span>
                <span>Deterministic Workflow</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-slate-500 mt-0.5">•</span>
                <span>Blocks wrong document / BR mismatch at upload time</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-500 mt-0.5">•</span>
                <span>Deterministic remediation guidance to prevent downstream pollution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flow 1 Section (Hidden by Default via Feature Flag) */}
        {SHOW_FLOW1 && (
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
        )}

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
