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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '48px',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#ef4444',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }} />
            <h1 style={{ fontSize: '24px', color: '#1f2937', marginBottom: '8px' }}>
              Processing Rejection...
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Please wait while we process your decision.
            </p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px',
              color: 'white',
            }}>
              ✕
            </div>
            <h1 style={{ fontSize: '24px', color: '#1f2937', marginBottom: '8px' }}>
              Workflow Rejected
            </h1>
            <p style={{ color: '#6b7280', margin: '16px 0 0 0' }}>
              {message}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '16px 0 0 0' }}>
              Redirecting to document page...
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '32px',
              color: 'white',
            }}>
              ⚠
            </div>
            <h1 style={{ fontSize: '24px', color: '#1f2937', marginBottom: '8px' }}>
              Error
            </h1>
            <p style={{ color: '#6b7280', margin: '16px 0 0 0' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/document?flow=2')}
              style={{
                marginTop: '24px',
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Go to Document Page
            </button>
          </>
        )}
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

