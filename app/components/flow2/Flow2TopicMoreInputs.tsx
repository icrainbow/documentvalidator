'use client';

import { useState } from 'react';
import type { TopicKey, DerivedTopic } from '../../lib/flow2/derivedTopicsTypes';

interface Flow2TopicMoreInputsProps {
  isOpen: boolean;
  onClose: () => void;
  topicKey: TopicKey;
  topicTitle: string;
  existingTopic: DerivedTopic;
  onSubmit: (topicKey: TopicKey, files: File[]) => Promise<void>;
}

export default function Flow2TopicMoreInputs({
  isOpen,
  onClose,
  topicKey,
  topicTitle,
  existingTopic,
  onSubmit
}: Flow2TopicMoreInputsProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(topicKey, files);
      setFiles([]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">
            Add More Inputs: {topicTitle}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Upload additional files to update this topic
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Current Sources */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Current Sources ({existingTopic.sources.length})
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {existingTopic.sources.map((src, idx) => (
                <div key={idx} className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  📄 {src.filename}
                </div>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Upload New Files
            </label>
            <input
              type="file"
              multiple
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {files.length > 0 && (
              <div className="mt-2 text-xs text-slate-600">
                {files.length} file(s) selected
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-300 rounded text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || files.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded disabled:opacity-50"
          >
            {isSubmitting ? 'Uploading...' : 'Upload & Fuse'}
          </button>
        </div>
      </div>
    </div>
  );
}

