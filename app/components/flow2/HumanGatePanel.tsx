'use client';

import React, { useState } from 'react';

interface HumanGatePanelProps {
  gateId: string;
  prompt: string;
  options: string[];
  context?: string;
  onSubmit: (selectedOption: string, signer: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const HumanGatePanel: React.FC<HumanGatePanelProps> = ({
  gateId,
  prompt,
  options,
  context,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [signer, setSigner] = useState<string>('');

  const handleSubmit = () => {
    if (!selectedOption || !signer.trim()) {
      return;
    }
    onSubmit(selectedOption, signer.trim());
  };

  return (
    <div className="mb-6 bg-orange-50 border-2 border-orange-400 rounded-lg p-5 shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">🚦</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-orange-900 mb-1">
            Human Decision Required
          </h3>
          <p className="text-sm text-orange-700">
            Gate ID: <span className="font-mono">{gateId}</span>
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-md font-semibold text-slate-800 mb-2">{prompt}</p>
        {context && (
          <p className="text-sm text-slate-600 bg-orange-100 p-2 rounded border border-orange-200">
            {context}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Select Decision <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option}
              className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                selectedOption === option
                  ? 'border-orange-500 bg-orange-100'
                  : 'border-slate-300 bg-white hover:border-orange-300'
              }`}
            >
              <input
                type="radio"
                name="gate-option"
                value={option}
                checked={selectedOption === option}
                onChange={(e) => setSelectedOption(e.target.value)}
                disabled={isSubmitting}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-slate-800">
                {option.replace(/_/g, ' ').toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Your Name/ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={signer}
          onChange={(e) => setSigner(e.target.value)}
          placeholder="e.g., Victoria Smith"
          disabled={isSubmitting}
          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedOption || !signer.trim()}
          className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all shadow-md ${
            isSubmitting || !selectedOption || !signer.trim()
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
          }`}
        >
          {isSubmitting ? '⏳ Submitting...' : '✓ Submit Decision'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-3 rounded-lg font-bold text-sm bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors disabled:opacity-50"
        >
          🚫 Cancel / Reset
        </button>
      </div>
    </div>
  );
};

export default HumanGatePanel;


