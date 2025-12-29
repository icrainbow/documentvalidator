'use client';

import { useState } from 'react';
import type { ClientContext } from '../lib/reviewProfiles';
import { pullClientProfile, validateContractNumber } from '../lib/clientProfileProvider';

interface ContractProfilePanelProps {
  onPull: (context: ClientContext & { contractNumber: string; productScope: string[] }) => void;
}

export default function ContractProfilePanel({ onPull }: ContractProfilePanelProps) {
  const [contractNumber, setContractNumber] = useState('');
  const [error, setError] = useState('');
  const [isPulling, setIsPulling] = useState(false);

  const handlePull = () => {
    setError('');
    
    // Validate contract number format
    if (!validateContractNumber(contractNumber)) {
      setError('Contract number must be exactly 8 digits');
      return;
    }

    setIsPulling(true);
    
    // Simulate slight delay for realism
    setTimeout(() => {
      const profile = pullClientProfile(contractNumber);
      onPull(profile);
      setIsPulling(false);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePull();
    }
  };

  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Contract Number
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={contractNumber}
            onChange={(e) => {
              setContractNumber(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 12345678"
            maxLength={8}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPulling}
          />
          <button
            onClick={handlePull}
            disabled={!contractNumber || isPulling}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {isPulling ? 'Pulling...' : 'Pull Profile'}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-1.5">{error}</p>
        )}
        <p className="text-xs text-slate-500 mt-1.5">
          Enter an 8-digit contract number to load client context. Try: 12345678 or 87654321
        </p>
      </div>
    </div>
  );
}

