'use client';

/**
 * Case4BulletinPanelV2 (Timeline-Driven)
 * 
 * Displays 3 IT bulletins with status driven by timeline state.
 * No internal timers. Status: queued → loading → done.
 */

import React from 'react';
import { ITBulletin } from '@/app/lib/case4/demoCase4Data';
import { BulletinState, BulletinStatus } from '@/app/lib/case4/case4TimelineV2';

interface Case4BulletinPanelV2Props {
  bulletins: ITBulletin[];
  bulletinStates: Record<string, BulletinState>;
}

export default function Case4BulletinPanelV2({ bulletins, bulletinStates }: Case4BulletinPanelV2Props) {
  
  const getStatusBadge = (status: BulletinStatus) => {
    switch (status) {
      case 'queued':
        return (
          <span className="px-2 py-1 rounded text-xs font-bold bg-slate-200 text-slate-600">
            Queued
          </span>
        );
      case 'loading':
        return (
          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        );
      case 'done':
        return (
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
            ✓ Done
          </span>
        );
    }
  };
  
  const getCategoryBadge = (category: ITBulletin['category']) => {
    const styles = {
      'Infrastructure': 'bg-orange-100 text-orange-800',
      'Cyber': 'bg-red-100 text-red-800',
      'Cloud': 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${styles[category]}`}>
        {category}
      </span>
    );
  };
  
  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📋</span>
        <h2 className="text-base font-bold text-slate-800">IT Bulletins Ingestion</h2>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {bulletins.map((bulletin) => {
          const state = bulletinStates[bulletin.id] || { status: 'queued' };
          
          return (
            <div
              key={bulletin.id}
              className="border-2 border-slate-200 rounded-lg p-3 bg-slate-50"
            >
              <div className="flex items-center justify-between mb-2">
                {getCategoryBadge(bulletin.category)}
                {getStatusBadge(state.status)}
              </div>
              
              <h3 className="font-bold text-xs text-slate-800 mb-1 line-clamp-2">
                {bulletin.title}
              </h3>
              
              <div className="text-xs text-slate-600 space-y-0.5">
                <p><strong>ID:</strong> {bulletin.id}</p>
                <p><strong>Severity:</strong> {bulletin.severity.toUpperCase()}</p>
                {state.completedAt && (
                  <p className="text-green-600"><strong>Completed:</strong> t={state.completedAt}ms</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

