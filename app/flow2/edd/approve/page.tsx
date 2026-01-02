'use client';

/**
 * Flow2: EDD Approve Page (Stage 2)
 * 
 * Requires 1 deliberate click after checkbox confirmation.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EddApprovePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'confirming' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [runId, setRunId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  
  // EDD findings (deterministic demo data)
  const eddFindings = [
    {
      severity: 'high',
      title: 'Source of Funds Mismatch',
      detail: 'Current disclosure: $5M from business sale | Wealth division record: $50M AUM (10x discrepancy)',
    },
    {
      severity: 'medium',
      title: 'Policy Change Triggers Additional Review',
      detail: 'Dec 1 2025 regulation: Offshore holding structures now require EDD',
    },
    {
      severity: 'medium',
      title: 'Complex Offshore Structure',
      detail: '3-layer chain (BVI → Cayman → Swiss trust) obscures ultimate beneficial owner',
    },
  ];
  
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing or invalid approval token');
    } else {
      setStatus('ready');
    }
  }, [token]);
  
  const handleApprove = async () => {
    if (!confirmed || !token) return;
    
    setStatus('confirming');
    
    try {
      const res = await fetch(`/api/flow2/edd/submit?token=${token}&action=approve`);
      const data = await res.json();
      
      if (data.ok) {
        setRunId(data.run_id);
        setStatus('success');
        
        // Redirect to document page after 2 seconds
        setTimeout(() => {
          router.push(`/document?docKey=${data.run_id}`);
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to approve EDD');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage('Network error: ' + error.message);
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-300 bg-red-50 text-red-800';
      case 'medium': return 'border-orange-300 bg-orange-50 text-orange-800';
      default: return 'border-slate-300 bg-slate-50 text-slate-800';
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-2xl p-8">
        
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        )}
        
        {status === 'ready' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">🔍</span>
              <h1 className="text-3xl font-bold text-purple-900">EDD Approval Required</h1>
            </div>
            
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-800">
                The initial review was rejected due to identified risk factors. An Enhanced Due Diligence (EDD) sub-review has been completed automatically.
              </p>
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-4">📋 EDD Findings</h2>
            
            <div className="space-y-3 mb-6">
              {eddFindings.map((finding, idx) => (
                <div key={idx} className={`border-2 rounded-lg p-4 ${getSeverityColor(finding.severity)}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {finding.severity === 'high' ? '🔴' : finding.severity === 'medium' ? '🟠' : 'ℹ️'}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold mb-1">{finding.title}</p>
                      <p className="text-sm">{finding.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm text-yellow-900 font-semibold">
                  I have reviewed the EDD evidence and findings above, and I confirm that I want to approve this review for continuation.
                </span>
              </label>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={!confirmed}
                className={`flex-1 px-8 py-4 rounded-lg font-bold text-lg transition-all ${
                  confirmed
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                ✅ Approve EDD & Continue
              </button>
              
              <button
                onClick={() => router.push(`/flow2/edd/reject?token=${token}`)}
                className="px-8 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-lg shadow-lg"
              >
                ❌ Reject
              </button>
            </div>
          </>
        )}
        
        {status === 'confirming' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
            <p className="text-lg font-semibold text-green-800">Submitting approval...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <span className="text-6xl mb-4 block">✅</span>
            <h2 className="text-2xl font-bold text-green-800 mb-2">EDD Approved Successfully!</h2>
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
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}

