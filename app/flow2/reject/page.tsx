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
          decision: 'reject',
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
    <>
      <style>{`
        @keyframes reject-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div className="reject-page-container">
        <div className="reject-card">
          {status === 'form' && (
            <div className="reject-content">
              <div className="reject-icon reject-icon-warning">⚠️</div>
              <h1 className="reject-title">Reject Workflow</h1>
              <p className="reject-text">
                You are about to reject this KYC review workflow. Please provide a reason for your decision.
              </p>
              
              <form onSubmit={handleSubmitRejection} className="reject-form">
                <label htmlFor="reason" className="reject-label">
                  Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Missing critical documents, High risk profile, Inconsistent information..."
                  className={`reject-textarea ${reasonError ? 'reject-textarea-error' : ''}`}
                  rows={4}
                  autoFocus
                />
                {reasonError && (
                  <p className="reject-error">{reasonError}</p>
                )}
                
                <div className="reject-form-actions">
                  <button
                    type="button"
                    onClick={() => router.push('/document?flow=2')}
                    className="reject-button reject-button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="reject-button reject-button-danger"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {status === 'loading' && (
            <div className="reject-content">
              <div className="reject-spinner" />
              <h1 className="reject-title">Submitting Rejection...</h1>
              <p className="reject-text">Please wait while we process your decision.</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="reject-content">
              <div className="reject-icon reject-icon-rejected">✓</div>
              <h1 className="reject-title">Workflow Rejected</h1>
              <p className="reject-text">{message}</p>
              <div className="reject-reason-display">
                <p className="reject-reason-label">Reason provided:</p>
                <p className="reject-reason-text">{reason}</p>
              </div>
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
                className="reject-button reject-button-primary"
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
          padding: 20px;
        }
        
        .reject-card {
          background: white;
          border-radius: 12px;
          padding: 48px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .reject-content {
          text-align: center;
        }
        
        .reject-form {
          margin-top: 32px;
          text-align: left;
        }
        
        .reject-label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .reject-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
        }
        
        .reject-textarea:focus {
          outline: none;
          border-color: #ef4444;
        }
        
        .reject-textarea-error {
          border-color: #ef4444;
        }
        
        .reject-error {
          color: #ef4444;
          font-size: 13px;
          margin: 8px 0 0 0;
        }
        
        .reject-form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
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
        }
        
        .reject-icon-warning {
          background: #fef3c7;
          font-size: 36px;
        }
        
        .reject-icon-rejected {
          background: #ef4444;
          color: white;
        }
        
        .reject-icon-error {
          background: #ef4444;
          color: white;
        }
        
        .reject-title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .reject-text {
          color: #6b7280;
          margin: 16px 0 0 0;
          line-height: 1.6;
        }
        
        .reject-reason-display {
          background: #f3f4f6;
          border-left: 4px solid #ef4444;
          padding: 16px;
          border-radius: 4px;
          margin: 24px 0;
          text-align: left;
        }
        
        .reject-reason-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }
        
        .reject-reason-text {
          color: #1f2937;
          margin: 0;
          line-height: 1.5;
        }
        
        .reject-subtext {
          color: #9ca3af;
          font-size: 14px;
          margin: 16px 0 0 0;
        }
        
        .reject-button {
          flex: 1;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .reject-button-primary {
          background: #3b82f6;
          color: white;
        }
        
        .reject-button-primary:hover {
          background: #2563eb;
        }
        
        .reject-button-secondary {
          background: #e5e7eb;
          color: #374151;
        }
        
        .reject-button-secondary:hover {
          background: #d1d5db;
        }
        
        .reject-button-danger {
          background: #ef4444;
          color: white;
        }
        
        .reject-button-danger:hover {
          background: #dc2626;
        }
      `}</style>
    </>
  );
}

