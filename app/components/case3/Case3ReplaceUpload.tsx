'use client';

import { useState, useRef } from 'react';

/**
 * Case 3: Replace Upload Component
 * 
 * Allows user to upload a replacement document.
 * Reads file as text for demo validation.
 */

interface Case3ReplaceUploadProps {
  currentFileName: string;
  onFileLoaded: (fileLike: { filename: string; text: string }) => void;
  onCancel: () => void;
}

export default function Case3ReplaceUpload({ currentFileName, onFileLoaded, onCancel }: Case3ReplaceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      onFileLoaded({
        filename: file.name,
        text
      });
      setIsLoading(false);
    };
    reader.onerror = () => {
      console.error('Failed to read file');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="bg-white border-4 border-orange-400 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>📤</span>
          <span>Replace Document</span>
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-600 hover:text-slate-800 text-sm"
        >
          ← Back
        </button>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Upload the correct document to replace:
      </p>

      {/* Current blocked file */}
      <div className="bg-slate-100 rounded-lg p-3 mb-6">
        <p className="text-xs text-slate-500 mb-1">Current blocked file:</p>
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span>📄</span>
          <span>{currentFileName}</span>
        </p>
      </div>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-4 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-orange-500 bg-orange-50'
            : 'border-slate-300 bg-slate-50'
        }`}
      >
        {isLoading ? (
          <div className="py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-sm text-slate-600">Reading file...</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">📁</div>
            <p className="text-lg font-semibold text-slate-700 mb-2">
              Drag & Drop file here
            </p>
            <p className="text-sm text-slate-500 mb-4">or</p>
            <button
              onClick={handleBrowseClick}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors"
            >
              Browse Files
            </button>
            <p className="text-xs text-slate-400 mt-4">
              Supported formats: .txt, .pdf, .docx
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept=".txt,.pdf,.docx"
        className="hidden"
      />

      {/* Cancel */}
      <div className="mt-6 text-center">
        <button
          onClick={onCancel}
          className="text-slate-600 hover:text-slate-800 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

