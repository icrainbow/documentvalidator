'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RejectActionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  
  const token = searchParams.get('token');
  
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing approval token in URL');
    }
  }, [token]);
  
  async function handleSubmitRejection(e: React.FormEvent) {
    e.preventDefault();
    
    if (!reason.trim()) {
      setReasonError('Please provide a reason for rejection');
      return;
    }
    
    if (reason.trim().length < 10) {
      setReasonError('Reason must be at least 10 characters');
      return;
    }
    
    setReasonError('');
    setStatus('loading');
    
    try {
      const response = await fetch('/api/flow2/approvals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'reject',
          reason: reason.trim(),
          signer: 'Email Approval',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit rejection');
      }
      
      setStatus('success');
      setMessage(data.message || 'Workflow successfully rejected');
      
      // Redirect to document page after 3 seconds
      setTimeout(() => {
        router.push(`/document?flow=2&docKey=${data.run_id || ''}`);
      }, 3000);
      
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'An error occurred while submitting rejection');
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-400 via-purple-400 to-red-400 p-5 font-sans">
      <div className="bg-white rounded-xl p-12 max-w-2xl w-full shadow-2xl">
        {status === 'form' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6 text-4xl">
              ⚠️
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reject Workflow</h1>
            <p className="text-gray-600 mt-4 leading-relaxed">
              You are about to reject this KYC review workflow. Please provide a reason for your decision.
            </p>
            
            <form onSubmit={handleSubmitRejection} className="mt-8 text-left">
              <label htmlFor="reason" className="block font-semibold text-gray-700 mb-2 text-sm">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Missing critical documents, High risk profile, Inconsistent information..."
                className={`w-full p-3 border-2 rounded-md text-sm resize-y transition-colors ${
                  reasonError ? 'border-red-500' : 'border-gray-300 focus:border-red-500'
                } focus:outline-none`}
                rows={4}
                autoFocus
              />
              {reasonError && (
                <p className="text-red-500 text-xs mt-2">{reasonError}</p>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => router.push('/document?flow=2')}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-md font-semibold text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-md font-semibold text-sm hover:bg-red-600 transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        )}
        
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Submitting Rejection...</h1>
            <p className="text-gray-600 mt-4">Please wait while we process your decision.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto mb-6 text-3xl">
              ✓
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflow Rejected</h1>
            <p className="text-gray-600 mt-4">{message}</p>
            <div className="bg-gray-100 border-l-4 border-red-500 p-4 rounded mt-6 text-left">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Reason provided:</p>
              <p className="text-gray-900 leading-relaxed">{reason}</p>
            </div>
            <p className="text-gray-400 text-sm mt-4">Redirecting to document page...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto mb-6 text-3xl">
              ⚠
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mt-4">{message}</p>
            <button
              onClick={() => router.push('/document?flow=2')}
              className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-md font-semibold text-sm hover:bg-blue-600 transition-colors"
            >
              Go to Document Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
