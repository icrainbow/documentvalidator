'use client';

import React, { useState } from 'react';
import { Flow2Document, Flow2DocTypeHint, safeUuid } from '../../lib/flow2/types';

interface Flow2PastePanelProps {
  onDocumentAdded: (doc: Flow2Document) => void;
  disabled?: boolean;
}

const Flow2PastePanel: React.FC<Flow2PastePanelProps> = ({
  onDocumentAdded,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filename, setFilename] = useState('');
  const [docType, setDocType] = useState<Flow2DocTypeHint>('General Document');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const MAX_CONTENT_SIZE = 50 * 1024; // 50KB

  const docTypeOptions: Flow2DocTypeHint[] = [
    'Client Identity',
    'Source of Wealth',
    'Beneficial Ownership',
    'Sanctions Screening',
    'General Document',
  ];

  const handleSubmit = () => {
    setError('');

    // Validate
    if (!filename.trim()) {
      setError('Filename is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (content.length > MAX_CONTENT_SIZE) {
      setError(`Content too large (max ${Math.round(MAX_CONTENT_SIZE / 1024)}KB)`);
      return;
    }

    // Create document
    const doc: Flow2Document = {
      doc_id: safeUuid(),
      filename: filename.trim(),
      doc_type_hint: docType,
      text: content.trim(),
    };

    // Call callback
    onDocumentAdded(doc);

    // Reset form
    setFilename('');
    setDocType('General Document');
    setContent('');
    setIsOpen(false);
  };

  return (
    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
          ✍️ Paste Document Text
        </h3>
        <span className="text-slate-600">{isOpen ? '▼' : '▶'}</span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Filename <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g., client_profile.txt"
              disabled={disabled}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as Flow2DocTypeHint)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {docTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste document content here..."
              rows={6}
              disabled={disabled}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              {content.length} / {MAX_CONTENT_SIZE} characters
            </p>
          </div>

          {error && (
            <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={disabled || !filename.trim() || !content.trim()}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                disabled || !filename.trim() || !content.trim()
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              ➕ Add Document
            </button>
            <button
              onClick={() => {
                setFilename('');
                setContent('');
                setError('');
                setIsOpen(false);
              }}
              disabled={disabled}
              className="px-4 py-2 rounded-lg font-semibold text-sm bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flow2PastePanel;


