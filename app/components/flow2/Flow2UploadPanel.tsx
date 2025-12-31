'use client';

import React, { useRef, useState } from 'react';
import { Flow2Document, safeUuid } from '../../lib/flow2/types';

interface Flow2UploadPanelProps {
  onDocumentsLoaded: (docs: Flow2Document[]) => void;
  disabled?: boolean;
}

const Flow2UploadPanel: React.FC<Flow2UploadPanelProps> = ({
  onDocumentsLoaded,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const inferDocType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('identity') || lower.includes('id')) return 'Client Identity';
    if (lower.includes('wealth') || lower.includes('income')) return 'Source of Wealth';
    if (lower.includes('beneficial') || lower.includes('ownership')) return 'Beneficial Ownership';
    if (lower.includes('sanction') || lower.includes('screening')) return 'Sanctions Screening';
    return 'General Document';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      const validDocs: Flow2Document[] = [];
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension !== 'txt' && extension !== 'md') {
          errors.push(`${file.name}: unsupported file type (only .txt and .md allowed)`);
          continue;
        }

        // Validate size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: file too large (max 5MB)`);
          continue;
        }

        // Read file
        try {
          const text = await readFileAsText(file);
          const doc: Flow2Document = {
            doc_id: safeUuid(),
            filename: file.name,
            doc_type_hint: inferDocType(file.name) as any,
            text: text,
          };
          validDocs.push(doc);
        } catch (readError: any) {
          errors.push(`${file.name}: failed to read (${readError.message})`);
        }
      }

      // Report errors
      if (errors.length > 0) {
        setError(errors.join('; '));
      }

      // Call callback with valid docs
      if (validDocs.length > 0) {
        onDocumentsLoaded(validDocs);
      }
    } finally {
      setIsProcessing(false);
      // Reset input so same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('FileReader error'));
      };
      reader.readAsText(file);
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
      <h3 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2">
        📤 Upload Documents
      </h3>
      <p className="text-sm text-slate-600 mb-3">
        Upload one or more .txt or .md files (max 5MB each)
      </p>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      <button
        onClick={handleButtonClick}
        disabled={disabled || isProcessing}
        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
          disabled || isProcessing
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isProcessing ? '⏳ Processing...' : '📁 Select Files'}
      </button>

      {error && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default Flow2UploadPanel;


