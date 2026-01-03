'use client';

/**
 * Flow2: EDD Reject Page (Stage 2)
 * 
 * Form for rejecting EDD with reason (min 10 characters).
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EddRejectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');
  
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'ready' | 'submitting' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [runId, setRunId] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing or invalid token');
      return;
    }
    
    if (reason.trim().length < 10) {
      setStatus('error');
      setErrorMessage('Rejection reason must be at least 10 characters');
      return;
    }
    
    setStatus('submitting');
    
    try {
      const res = await fetch('/api/flow2/edd/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          action: 'reject',
          reason: reason.trim(),
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setRunId(data.run_id);
        setStatus('success');
        
        // Redirect to document page after 2 seconds (with flow=2 to ensure Flow2 UI)
        // Add status=failed as UX hint (actual state comes from checkpoint metadata)
        setTimeout(() => {
          router.push(`/document?flow=2&docKey=${data.run_id}&status=failed`);
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to submit rejection');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage('Network error: ' + error.message);
    }
  };
  
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8 text-center">
          <span className="text-6xl mb-4 block">❌</span>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Invalid Link</h2>
          <p className="text-slate-600 mb-4">Missing or invalid approval token</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
        
        {status === 'ready' && (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">❌</span>
              <h1 className="text-3xl font-bold text-red-900">Reject EDD Review</h1>
            </div>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                You are about to reject the Enhanced Due Diligence (EDD) review. This will mark the overall review as rejected.
              </p>
            </div>
            
            <div className="mb-6">
              <label htmlFor="reason" className="block text-sm font-bold text-slate-800 mb-2">
                Rejection Reason <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-slate-600 mb-2">
                Please provide a detailed explanation (minimum 10 characters)
              </p>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                required
                minLength={10}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-800"
                placeholder="Example: The EDD findings are insufficient to address the identified risk factors..."
              />
              <p className="text-xs text-slate-600 mt-2">
                {reason.trim().length} / 10 characters minimum
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={reason.trim().length < 10}
                className={`flex-1 px-8 py-4 rounded-lg font-bold text-lg transition-all ${
                  reason.trim().length >= 10
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Submit Rejection
              </button>
              
              <button
                type="button"
                onClick={() => router.push(`/flow2/edd/approve?token=${token}`)}
                className="px-8 py-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-bold text-lg shadow-lg"
              >
                ← Back to Approve
              </button>
            </div>
          </form>
        )}
        
        {status === 'submitting' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mb-4"></div>
            <p className="text-lg font-semibold text-red-800">Submitting rejection...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <span className="text-6xl mb-4 block">✅</span>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Rejection Submitted</h2>
            <p className="text-slate-600 mb-4">Redirecting to document page...</p>
            {runId && (
              <p className="text-xs text-slate-500">Run ID: {runId.slice(0, 13)}...</p>
            )}
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <span className="text-6xl mb-4 block">❌</span>
            <h2 className="text-2xl font-bold text-red-800 mb-2">Error</h2>
            <p className="text-slate-600 mb-4">{errorMessage}</p>
            <button
              onClick={() => setStatus('ready')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ← Try Again
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}


