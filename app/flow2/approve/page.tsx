'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ApproveActionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing approval...');
  
  const token = searchParams.get('token');
  
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing approval token in URL');
      return;
    }
    
    // Auto-submit approval
    async function submitApproval() {
      try {
        const response = await fetch('/api/flow2/approvals/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            decision: 'approve',
            signer: 'Email Approval',
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit approval');
        }
        
        setStatus('success');
        setMessage(data.message || 'Workflow successfully approved');
        
        // Redirect to document page after 3 seconds
        setTimeout(() => {
          router.push(`/document?flow=2&docKey=${data.run_id || ''}`);
        }, 3000);
        
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred while submitting approval');
      }
    }
    
    submitApproval();
  }, [token, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 p-5 font-sans">
      <div className="bg-white rounded-xl p-12 max-w-md w-full shadow-2xl text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Processing Approval...</h1>
            <p className="text-gray-600 mt-4">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6 text-3xl">
              ✓
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflow Approved!</h1>
            <p className="text-gray-600 mt-4">{message}</p>
            <p className="text-gray-400 text-sm mt-4">Redirecting to document page...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
