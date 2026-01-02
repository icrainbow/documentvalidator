'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ApprovalActionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');
  const action = searchParams.get('action') || 'approve'; // 'approve' or 'reject'
  
  useEffect(() => {
    async function submitApproval() {
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
            decision: action,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Failed to ${action}`);
        }
        
        setStatus('success');
        setMessage(data.message || `Successfully ${action}ed`);
        
        // Redirect to document page after 2 seconds
        setTimeout(() => {
          router.push(`/document?flow=2&docKey=${data.run_id || ''}`);
        }, 2000);
        
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'An error occurred');
      }
    }
    
    submitApproval();
  }, [token, action, router]);
  
  return (
    <>
      <style>{`
        @keyframes approval-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div className="approval-page-container">
        <div className="approval-card">
          {status === 'loading' && (
            <div className="approval-content">
              <div className="approval-spinner" />
              <h1 className="approval-title">
                Processing {action === 'approve' ? 'Approval' : 'Rejection'}...
              </h1>
              <p className="approval-text">
                Please wait while we process your decision.
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="approval-content">
              <div className="approval-icon approval-icon-success">✓</div>
              <h1 className="approval-title">
                {action === 'approve' ? 'Approved!' : 'Rejected'}
              </h1>
              <p className="approval-text">{message}</p>
              <p className="approval-subtext">Redirecting to document page...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="approval-content">
              <div className="approval-icon approval-icon-error">✕</div>
              <h1 className="approval-title">Error</h1>
              <p className="approval-text">{message}</p>
              <button
                onClick={() => router.push('/document?flow=2')}
                className="approval-button"
              >
                Go to Document Page
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .approval-page-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        
        .approval-card {
          background: white;
          border-radius: 12px;
          padding: 48px;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .approval-content {
          text-align: center;
        }
        
        .approval-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: approval-spin 1s linear infinite;
          margin: 0 auto 24px;
        }
        
        .approval-icon {
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
        
        .approval-icon-success {
          background: #10b981;
        }
        
        .approval-icon-error {
          background: #ef4444;
        }
        
        .approval-title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .approval-text {
          color: #6b7280;
          margin: 16px 0 0 0;
        }
        
        .approval-subtext {
          color: #9ca3af;
          font-size: 14px;
          margin: 16px 0 0 0;
        }
        
        .approval-button {
          margin-top: 24px;
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .approval-button:hover {
          background: #2563eb;
        }
      `}</style>
    </>
  );
}

