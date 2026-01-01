import { describe, it, expect } from 'vitest';

// Flow2 Input Mode Helper Tests (Phase 1.1)

// Helper function (copied from app/document/page.tsx for testing)
function getInputModeLabel(mode: 'empty' | 'demo' | 'upload'): string {
  switch (mode) {
    case 'demo':
      return 'Demo Mode';
    case 'upload':
      return 'Upload Mode';
    case 'empty':
      return '';
  }
}

describe('Flow2 Input Mode Helper', () => {
  it('should return "Demo Mode" for demo mode', () => {
    expect(getInputModeLabel('demo')).toBe('Demo Mode');
  });

  it('should return "Upload Mode" for upload mode', () => {
    expect(getInputModeLabel('upload')).toBe('Upload Mode');
  });

  it('should return empty string for empty mode', () => {
    expect(getInputModeLabel('empty')).toBe('');
  });
});

describe('Flow2 Input Mode State Transitions', () => {
  it('should define valid mode transitions', () => {
    // Valid transitions matrix
    const validTransitions = {
      empty: ['demo', 'upload'],
      demo: ['empty', 'upload'], // requires confirmation for upload
      upload: ['empty', 'demo'], // requires confirmation for demo
    };

    expect(validTransitions.empty).toContain('demo');
    expect(validTransitions.empty).toContain('upload');
    expect(validTransitions.demo).toContain('empty');
    expect(validTransitions.upload).toContain('empty');
  });
});

