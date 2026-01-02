'use client';

/**
 * Case4ModeHeader
 * 
 * Purple header bar for IT Review Mode with title and Exit button.
 */

import React from 'react';

interface Case4ModeHeaderProps {
  onExit: () => void;
}

export default function Case4ModeHeader({ onExit }: Case4ModeHeaderProps) {
  return (
    <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔧</span>
        <div>
          <h1 className="text-xl font-bold">IT REVIEW MODE</h1>
          <p className="text-xs text-purple-200">Cross-Bulletin Impact Simulation</p>
        </div>
      </div>
      
      <button
        onClick={onExit}
        className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-bold text-sm"
      >
        ← Exit IT Review
      </button>
    </div>
  );
}


