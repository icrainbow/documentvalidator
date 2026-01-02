'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RejectActionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');
  
  useEffect(() => {
    async function submitRejection() {
      if (!token) {
        setStatus('error');
        setMessage('Missing approval token');
        return;
      }
      
      try {
        const response = await fetch('/api/flow2/approvals/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            decision: 'reject',
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to reject');
        }
        
        setStatus('success');
        setMessage(data.message || 'Successfully rejected');
        
        // Redirect to document page after 2 seconds
        setTimeout(() => {
          router.push(`/document?flow=2&docKey=${data.run_id || ''}`);
        }, 2000);
        
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred');
      }
    }
    
    submitRejection();
  }, [token, router]);
  
  return (
    <>
      <style>{`
        @keyframes reject-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div className="reject-page-container">
        <div className="reject-card">
          {status === 'loading' && (
            <div className="reject-content">
              <div className="reject-spinner" />
              <h1 className="reject-title">Processing Rejection...</h1>
              <p className="reject-text">Please wait while we process your decision.</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="reject-content">
              <div className="reject-icon reject-icon-rejected">✕</div>
              <h1 className="reject-title">Workflow Rejected</h1>
              <p className="reject-text">{message}</p>
              <p className="reject-subtext">Redirecting to document page...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="reject-content">
              <div className="reject-icon reject-icon-error">⚠</div>
              <h1 className="reject-title">Error</h1>
              <p className="reject-text">{message}</p>
              <button
                onClick={() => router.push('/document?flow=2')}
                className="reject-button"
              >
                Go to Document Page
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .reject-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        
        .reject-card {
          background: white;
          border-radius: 12px;
          padding: 48px;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .reject-content {
          text-align: center;
        }
        
        .reject-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #ef4444;
          border-radius: 50%;
          animation: reject-spin 1s linear infinite;
          margin: 0 auto 24px;
        }
        
        .reject-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 32px;
          color: white;
        }
        
        .reject-icon-rejected {
          background: #ef4444;
        }
        
        .reject-icon-error {
          background: #ef4444;
        }
        
        .reject-title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .reject-text {
          color: #6b7280;
          margin: 16px 0 0 0;
        }
        
        .reject-subtext {
          color: #9ca3af;
          font-size: 14px;
          margin: 16px 0 0 0;
        }
        
        .reject-button {
          margin-top: 24px;
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .reject-button:hover {
          background: #2563eb;
        }
      `}</style>
    </>
  );
}

