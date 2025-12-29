'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { getRecentSessionsMetadata, generateSessionId, createNewSession, saveReviewSession } from './lib/reviewSessions';
import type { ReviewSessionMetadata } from './lib/reviewSessions';

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [recentSessions, setRecentSessions] = useState<ReviewSessionMetadata[]>([]);
  const [manualSessionId, setManualSessionId] = useState('');

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

  const handleContinueExisting = () => {
    // Load recent sessions (client-side only)
    if (typeof window !== 'undefined') {
      const recent = getRecentSessionsMetadata();
      setRecentSessions(recent);
    }
    setShowContinueModal(true);
  };

  const handleSelectSession = (sessionId: string) => {
    sessionStorage.setItem('currentSessionId', sessionId);
    setShowContinueModal(false);
    router.push(`/document?sessionId=${sessionId}`);
  };

  const handleManualSessionInput = () => {
    if (manualSessionId.trim()) {
      handleSelectSession(manualSessionId.trim());
    }
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
              Document Review System
            </h1>
          </div>
          <p className="text-slate-300 text-lg">
            AI-Powered Compliance & Risk Assessment
          </p>
        </div>

        {/* Primary Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Start New Review */}
          <div className="bg-white rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden hover:border-blue-400 transition-all">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Start New Review</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Upload documents to begin a new compliance review. Our AI agents will analyze content, identify risks, and provide recommendations.
              </p>
              <button
                onClick={handleStartNewReview}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Document
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,.pdf,.txt,.word"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="bg-slate-50 px-8 py-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Supported formats: .doc, .docx, .pdf, .txt
              </p>
            </div>
          </div>

          {/* Card 2: Continue Existing Review */}
          <div className="bg-white rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden hover:border-green-400 transition-all">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Continue Existing</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Resume or view an existing review workflow. Access previously analyzed documents and continue where you left off.
              </p>
              <button
                onClick={handleContinueExisting}
                className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Open Existing
              </button>
            </div>
            <div className="bg-slate-50 px-8 py-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Resume a previously started review
              </p>
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

      {/* Continue Existing Modal */}
      {showContinueModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border-2 border-slate-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Select Review to Continue</h3>
                <button
                  onClick={() => setShowContinueModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {recentSessions.length > 0 ? (
                <>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                    Recent Reviews
                  </h4>
                  <div className="space-y-2 mb-6">
                    {recentSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className="w-full text-left p-4 bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-400 rounded-lg transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-bold text-slate-800 truncate flex-1">{session.title}</h5>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            session.status === 'Signed' 
                              ? 'bg-green-100 text-green-800'
                              : session.status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span>📄 {session.sectionCount || 0} sections</span>
                          <span>⚠️ {session.issueCount || 0} issues</span>
                          <span className="ml-auto">
                            {new Date(session.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="mb-4">No recent reviews found.</p>
                </div>
              )}

              {/* Manual Input Option */}
              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                  Or Enter Review ID
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSessionInput()}
                    placeholder="rev_1234567890_abcdef"
                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <button
                    onClick={handleManualSessionInput}
                    disabled={!manualSessionId.trim()}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      manualSessionId.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
