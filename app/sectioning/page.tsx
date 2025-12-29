'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import AgentDashboard from '../components/AgentDashboard';

interface Rectangle {
  id: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  confirmed: boolean;
}

interface Section {
  id: number;
  title: string;
  content: string;
  isEditingTitle?: boolean;
  selected?: boolean;
}

const FULL_DOCUMENT_TEXT = `Investment Background and Portfolio Analysis

This comprehensive section outlines the investor's financial history, current portfolio composition, and primary investment objectives. The analysis takes into account the client's existing asset allocation across multiple investment vehicles including equities, fixed income securities, and alternative investments. Key considerations include risk tolerance assessment based on investment horizon, liquidity requirements for planned expenditures, and tax optimization strategies. The investor's previous investment experience and comfort level with market volatility have been evaluated to establish appropriate risk parameters.

Risk Assessment and Management Framework

Comprehensive analysis of market risks, portfolio volatility, concentration risks, and external macroeconomic factors that may impact investment performance. This evaluation considers both systematic risks inherent to market movements and unsystematic risks specific to individual holdings or sectors. The assessment incorporates stress testing scenarios, correlation analysis between asset classes, and downside protection mechanisms. Currency exposure, interest rate sensitivity, and geopolitical considerations are analyzed to ensure robust risk management. Regular portfolio rebalancing protocols are established to maintain target allocation ranges.

Technical Strategy and Implementation Plan

Detailed methodology for strategic asset allocation, tactical rebalancing frequency, and implementation of investment adjustments based on market conditions. The framework includes specific technical indicators used for entry and exit decisions, position sizing algorithms, and risk management protocols including stop-loss parameters. The strategy incorporates both quantitative metrics such as moving averages and relative strength indicators, as well as qualitative factors including sector rotation dynamics and macroeconomic cycle positioning. Execution protocols ensure optimal trade timing and minimize market impact costs.`;

const PREDEFINED_SECTIONS: Section[] = [
  {
    id: 1,
    title: 'Investment Background',
    content: 'I am a mid-career professional with a stable income and a growing interest in long-term investing. Over the past several years, I have gradually built exposure to financial markets through mutual funds and employer-sponsored retirement plans. My investment knowledge is largely self-taught, relying on online resources, market news, and informal discussions with peers. I do not follow a strict investment philosophy, but I value diversification and consistency. My primary motivation is to preserve and grow capital over time rather than pursue speculative opportunities or short-term trading gains.'
  },
  {
    id: 2,
    title: 'Risk Assessment',
    content: 'I consider myself to have a moderate tolerance for risk, balancing growth potential with capital preservation. While I understand that market volatility is inevitable, I prefer to avoid extreme drawdowns that could significantly impact long-term plans. I am willing to accept moderate fluctuations if they align with a disciplined strategy. My biggest concern relates to market movements are a concern, especially during periods of rapid decline. Therefore, risk management, transparency, and clear downside expectations are important factors in investment decisions.'
  },
  {
    id: 3,
    title: 'Technical Strategy',
    content: 'From a technical perspective, my approach is relatively simple and pragmatic. I do not engage heavily in advanced technical analysis, but I follow basic indicators such as trends, asset allocation signals, and rebalancing thresholds. Automation and rule-based processes are preferred to reduce emotional decisions. I value strategies that can be monitored and adjusted periodically rather than actively traded. Clear reporting, performance metrics, and strategy rationale are essential for maintaining confidence in the approach over time.'
  }
];

// Maximum sections allowed for demo
const MAX_SECTIONS = 5;

/**
 * Demo-only parser: generates exactly 5 predefined sections.
 * Future-proof: replace this function body with real parser/API call.
 * @param text - full document text
 * @returns Array of exactly 5 section definitions
 */
function parseDocumentInto5Sections(text: string): Section[] {
  const sectionDefinitions = [
    { title: 'Overview & Scope', keywords: ['overview', 'scope', 'purpose', 'objective'] },
    { title: 'Investment Strategy & Restricted Areas', keywords: ['investment', 'strategy', 'restricted', 'prohibited', 'allocation'] },
    { title: 'Liability & Indemnification', keywords: ['liability', 'indemnification', 'responsibility', 'risk'] },
    { title: 'Termination & Governing Law', keywords: ['termination', 'governing', 'law', 'jurisdiction', 'legal'] },
    { title: 'Signatures & Annexes', keywords: ['signature', 'annex', 'appendix', 'exhibit', 'attachment'] }
  ];

  const sections: Section[] = [];
  const lowerText = text.toLowerCase();

  for (let i = 0; i < 5; i++) {
    const def = sectionDefinitions[i];
    
    // Try keyword-based extraction (simple demo logic)
    let content = '';
    let startIndex = -1;
    
    // Find first keyword occurrence
    for (const kw of def.keywords) {
      const idx = lowerText.indexOf(kw);
      if (idx !== -1) {
        startIndex = idx;
        break;
      }
    }
    
    // Extract ~250-300 chars if keyword found
    if (startIndex !== -1) {
      const endIndex = Math.min(startIndex + 280, text.length);
      content = text.substring(startIndex, endIndex).trim();
      // Clean up: if content is too short or doesn't make sense, use placeholder
      if (content.length < 50) {
        content = '';
      }
    }
    
    // Fallback to placeholder if no match or extraction failed
    if (!content) {
      content = getPlaceholderContent(i);
    }
    
    sections.push({
      id: Date.now() + i,
      title: def.title,
      content: content,
      selected: false
    });
  }

  return sections;
}

/**
 * Get hardcoded placeholder content for section index.
 */
function getPlaceholderContent(sectionIndex: number): string {
  const placeholders = [
    'This section provides an overview and defines the scope of the agreement. It outlines the purpose, parties involved, and the general framework under which the document operates. Key objectives and boundaries are established to ensure clarity and mutual understanding.',
    'Investment strategy focuses on diversified portfolios with careful consideration of asset allocation, risk tolerance, and time horizons. Restricted areas include investments in sectors deemed high-risk, non-compliant with regulatory requirements, or inconsistent with institutional guidelines. Prohibited activities are clearly defined to prevent exposure to unacceptable risk levels.',
    'Liability provisions outline responsibilities, obligations, and indemnification clauses for all parties. This section establishes the legal framework for accountability, defines limits of liability, and specifies conditions under which indemnification may be claimed. Insurance requirements and breach consequences are detailed.',
    'Termination clauses specify conditions under which the agreement may be ended by either party, including notice periods, breach conditions, and mutual consent scenarios. Governing law establishes the jurisdiction and legal framework that will apply to the interpretation and enforcement of this agreement.',
    'Signatures and annexes complete the formal documentation. This section includes signature blocks for all authorized parties, dates of execution, and references to attached exhibits, schedules, and appendices that form an integral part of this agreement.'
  ];
  return placeholders[sectionIndex] || 'Content placeholder for section ' + (sectionIndex + 1) + '.';
}

export default function SectioningPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [rectangles, setRectangles] = useState<Rectangle[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState<Rectangle | null>(null);
  const [confirmedSections, setConfirmedSections] = useState<Section[]>([]);
  const [dragCount, setDragCount] = useState(0);
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([]);
  const [sectionsSource, setSectionsSource] = useState<Section[]>([]);
  const [displayedDocumentText, setDisplayedDocumentText] = useState<string>(FULL_DOCUMENT_TEXT);
  const [showAgentDashboard, setShowAgentDashboard] = useState(false);

  // Load merged content from session storage if available and build document display
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const section1Content = sessionStorage.getItem('section1_content');
      const section1Title = sessionStorage.getItem('section1_title');
      const section2Content = sessionStorage.getItem('section2_content');
      const section2Title = sessionStorage.getItem('section2_title');
      const section3Content = sessionStorage.getItem('section3_content');
      const section3Title = sessionStorage.getItem('section3_title');

      // Check for chat summaries (from main page)
      const investmentBg = sessionStorage.getItem('investmentBackground');
      const riskAssessment = sessionStorage.getItem('riskAssessment');
      const technicalStrategy = sessionStorage.getItem('technicalStrategy');

      // If we have merged content from LLM, use that for sections
      if (section1Content && section2Content && section3Content) {
        setSectionsSource([
          {
            id: 1,
            title: section1Title || 'Investment Background',
            content: section1Content
          },
          {
            id: 2,
            title: section2Title || 'Risk Assessment',
            content: section2Content
          },
          {
            id: 3,
            title: section3Title || 'Technical Strategy',
            content: section3Content
          }
        ]);
      } else {
        // Use predefined sections
        setSectionsSource(PREDEFINED_SECTIONS);
      }

      // Build the displayed document text with user summaries appended
      const hasUserInput = (investmentBg && investmentBg.trim()) || 
                          (riskAssessment && riskAssessment.trim()) || 
                          (technicalStrategy && technicalStrategy.trim());
      
      if (hasUserInput) {
        let combinedText = FULL_DOCUMENT_TEXT;
        
        // Append a separator
        combinedText += '\n\n' + '='.repeat(80) + '\n\n';
        combinedText += 'USER INPUT SUMMARY (From Chat Conversation)\n\n';
        combinedText += '='.repeat(80) + '\n\n';

        if (investmentBg && investmentBg.trim()) {
          combinedText += 'Investment Background (User Profile):\n\n';
          combinedText += investmentBg + '\n\n';
        }

        if (riskAssessment && riskAssessment.trim()) {
          combinedText += 'Risk Assessment (User Profile):\n\n';
          combinedText += riskAssessment + '\n\n';
        }

        if (technicalStrategy && technicalStrategy.trim()) {
          combinedText += 'Technical Strategy (User Profile):\n\n';
          combinedText += technicalStrategy + '\n\n';
        }

        setDisplayedDocumentText(combinedText);
      }
    }
  }, []); // Run once on mount

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (dragCount >= MAX_SECTIONS) return; // Max sections
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentRect({
      id: Date.now(),
      startX,
      startY,
      width: 0,
      height: 0,
      confirmed: false
    });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentRect) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = currentX - currentRect.startX;
    const height = currentY - currentRect.startY;
    
    setCurrentRect({
      ...currentRect,
      width,
      height
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;
    
    setIsDrawing(false);
    
    // Add the rectangle to permanent list
    const newRect = { ...currentRect, confirmed: false };
    setRectangles([...rectangles, newRect]);
    setCurrentRect(null);
  };

  const handleUndo = () => {
    if (rectangles.length > 0) {
      const newRectangles = rectangles.slice(0, -1);
      setRectangles(newRectangles);
      
      // Also remove last confirmed section if it exists
      if (confirmedSections.length > 0) {
        setConfirmedSections(confirmedSections.slice(0, -1));
        setDragCount(dragCount - 1);
      }
    }
  };

  const handleReset = () => {
    setRectangles([]);
    setConfirmedSections([]);
    setCurrentRect(null);
    setDragCount(0);
  };

  const handleAddSection = () => {
    if (rectangles.length === 0) return;
    if (confirmedSections.length >= MAX_SECTIONS) return;
    
    // Parse document to get all 5 section definitions
    const allSections = parseDocumentInto5Sections(displayedDocumentText);
    
    // Get the next section based on current count
    const nextSectionIndex = confirmedSections.length;
    const newSection = allSections[nextSectionIndex];
    
    setConfirmedSections([...confirmedSections, newSection]);
    setDragCount(dragCount + 1);
    
    // Mark the last rectangle as confirmed
    const updatedRects = rectangles.map((r, idx) => 
      idx === rectangles.length - 1 ? { ...r, confirmed: true } : r
    );
    setRectangles(updatedRects);
  };

  const handleAutoParse = () => {
    if (confirmedSections.length >= MAX_SECTIONS) return;
    
    // Generate all 5 sections at once
    const allSections = parseDocumentInto5Sections(displayedDocumentText);
    
    setConfirmedSections(allSections);
    setDragCount(MAX_SECTIONS);
    
    // Clear rectangles and current drawing state
    setRectangles([]);
    setCurrentRect(null);
    setIsDrawing(false);
    
    // Auto-select all sections for easy confirmation
    setSelectedSectionIds(allSections.map(s => s.id));
  };

  const handleEditTitle = (sectionId: number) => {
    const section = confirmedSections.find(s => s.id === sectionId);
    if (section) {
      setEditingTitleId(sectionId);
      setTempTitle(section.title);
    }
  };

  const handleSaveTitle = (sectionId: number) => {
    if (tempTitle.trim()) {
      setConfirmedSections(confirmedSections.map(s => 
        s.id === sectionId ? { ...s, title: tempTitle.trim() } : s
      ));
    }
    setEditingTitleId(null);
    setTempTitle('');
  };

  const handleCancelEditTitle = () => {
    setEditingTitleId(null);
    setTempTitle('');
  };

  const handleToggleSelection = (sectionId: number) => {
    setSelectedSectionIds(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };

  const handleMergeSections = () => {
    if (selectedSectionIds.length < 2) return;

    // Sort selected IDs to maintain order
    const sortedIds = [...selectedSectionIds].sort((a, b) => a - b);
    
    // Get sections to merge
    const sectionsToMerge = sortedIds.map(id => 
      confirmedSections.find(s => s.id === id)
    ).filter((s): s is Section => s !== undefined);

    if (sectionsToMerge.length < 2) return;

    // Create merged section
    const mergedTitle = sectionsToMerge.map(s => s.title).join(' + ');
    const mergedContent = sectionsToMerge.map(s => s.content).join('\n\n');
    const firstId = sectionsToMerge[0].id;

    // Remove old sections and add merged one
    const newSections = confirmedSections.filter(s => !sortedIds.includes(s.id));
    const mergedSection: Section = {
      id: firstId,
      title: mergedTitle,
      content: mergedContent,
      selected: false
    };

    // Insert merged section at the position of the first merged section
    const insertIndex = confirmedSections.findIndex(s => s.id === firstId);
    newSections.splice(insertIndex, 0, mergedSection);

    setConfirmedSections(newSections);
    setSelectedSectionIds([]);

    // Update drag count
    setDragCount(newSections.length);
  };

  const handleSelectAll = () => {
    if (selectedSectionIds.length === confirmedSections.length) {
      // Deselect all
      setSelectedSectionIds([]);
    } else {
      // Select all
      setSelectedSectionIds(confirmedSections.map(s => s.id));
    }
  };

  const handleConfirmSections = () => {
    if (selectedSectionIds.length < 1) return;

    // Get only the selected sections
    const selectedSections = confirmedSections.filter(s => 
      selectedSectionIds.includes(s.id)
    );

    if (selectedSections.length === 0) return;

    // Clear stale section keys first (1 through 10)
    for (let i = 1; i <= 10; i++) {
      sessionStorage.removeItem(`section${i}_title`);
      sessionStorage.removeItem(`section${i}_content`);
    }

    // Store the selected sections in sessionStorage
    selectedSections.forEach((section, index) => {
      const sectionNum = index + 1;
      sessionStorage.setItem(`section${sectionNum}_title`, section.title);
      sessionStorage.setItem(`section${sectionNum}_content`, section.content);
    });

    // Also store for backward compatibility with document page
    if (selectedSections[0]) {
      sessionStorage.setItem('investmentBackground', selectedSections[0].content);
    }
    if (selectedSections[1]) {
      sessionStorage.setItem('riskAssessment', selectedSections[1].content);
    }
    if (selectedSections[2]) {
      sessionStorage.setItem('technicalStrategy', selectedSections[2].content);
    }

    // Navigate to document page
    router.push('/document');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Normal position */}
        <div className="pt-6 px-6 pb-4">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Manual Document Sectioning</h1>
          <p className="text-slate-600">
            Drag over the document to define sections. Each section will be evaluated independently by multiple agents.
          </p>
        </div>

        {/* Sticky Action Buttons Bar */}
        <div className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex gap-4 items-center flex-wrap">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-slate-600 text-white rounded font-semibold hover:bg-slate-700 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleUndo}
                disabled={rectangles.length === 0}
                className={`px-6 py-2 rounded font-semibold transition-colors ${
                  rectangles.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                ↶ Undo
              </button>
              <button
                onClick={handleReset}
                disabled={rectangles.length === 0}
                className={`px-6 py-2 rounded font-semibold transition-colors ${
                  rectangles.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                ✕ Reset
              </button>
              <button
                onClick={handleAutoParse}
                disabled={confirmedSections.length >= MAX_SECTIONS}
                className={`px-6 py-2 rounded font-semibold transition-colors shadow-md ${
                  confirmedSections.length >= MAX_SECTIONS
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                🔍 Auto Parse
              </button>
              <button
                onClick={handleAddSection}
                disabled={rectangles.length === 0 || dragCount >= MAX_SECTIONS || rectangles[rectangles.length - 1]?.confirmed}
                className={`px-6 py-2 rounded font-semibold transition-colors shadow-md ${
                  rectangles.length === 0 || dragCount >= MAX_SECTIONS || rectangles[rectangles.length - 1]?.confirmed
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                + Add Section
              </button>
              <button
                onClick={handleMergeSections}
                disabled={selectedSectionIds.length < 2}
                className={`px-6 py-2 rounded font-semibold transition-colors ${
                  selectedSectionIds.length < 2
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                🔗 Merge Sections ({selectedSectionIds.length})
              </button>
              <button
                onClick={handleConfirmSections}
                disabled={selectedSectionIds.length < 1}
                className={`px-6 py-2 rounded font-semibold transition-colors shadow-sm ${
                  selectedSectionIds.length < 1
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                }`}
              >
                ✓ Confirm Sections ({selectedSectionIds.length})
              </button>
              <button
                onClick={() => setShowAgentDashboard(true)}
                className="px-6 py-2 rounded font-semibold transition-colors bg-slate-600 text-white hover:bg-slate-700 shadow-sm"
              >
                📊 Agent Dashboard
              </button>
              <div className="ml-auto text-slate-700 font-semibold">
                Sections: {confirmedSections.length} / {MAX_SECTIONS}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pt-6">
          {/* Left Side - Document View */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Full Document</h2>
            <p className="text-sm text-slate-600 mb-4">
              Drag to select text regions. You can create up to {MAX_SECTIONS} sections in any order. Sections can overlap.
            </p>
            <div
              ref={containerRef}
              className="relative border-2 border-slate-300 rounded-lg p-4 bg-slate-50 cursor-crosshair select-none overflow-hidden"
              style={{ minHeight: '600px' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {displayedDocumentText}
              </div>

              {/* Draw all confirmed rectangles */}
              {rectangles.map((rect, index) => {
                // Find which section this rectangle corresponds to
                const sectionIndex = confirmedSections.findIndex((_, idx) => {
                  const confirmedRects = rectangles.filter(r => r.confirmed);
                  return confirmedRects[idx] === rect;
                });
                
                return (
                  <div
                    key={rect.id}
                    className={`absolute pointer-events-none ${
                      rect.confirmed
                        ? 'border-4 border-slate-600 bg-slate-300 bg-opacity-30'
                        : 'border-4 border-slate-400 bg-slate-200 bg-opacity-30'
                    }`}
                    style={{
                      left: Math.min(rect.startX, rect.startX + rect.width),
                      top: Math.min(rect.startY, rect.startY + rect.height),
                      width: Math.abs(rect.width),
                      height: Math.abs(rect.height),
                      zIndex: index + 1
                    }}
                  >
                    {/* Section number indicator */}
                    {rect.confirmed && sectionIndex >= 0 && (
                      <div className="absolute top-1 left-1 bg-slate-700 text-white text-xs px-2 py-1 rounded font-semibold">
                        ✓ Section {sectionIndex + 1}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Draw current rectangle being created */}
              {currentRect && isDrawing && (
                <div
                  className="absolute border-4 border-slate-500 bg-slate-200 bg-opacity-40 pointer-events-none"
                  style={{
                    left: Math.min(currentRect.startX, currentRect.startX + currentRect.width),
                    top: Math.min(currentRect.startY, currentRect.startY + currentRect.height),
                    width: Math.abs(currentRect.width),
                    height: Math.abs(currentRect.height),
                    zIndex: 1000
                  }}
                >
                  <div className="absolute top-1 left-1 bg-slate-700 text-white text-xs px-2 py-1 rounded font-semibold animate-pulse">
                    Drawing...
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-slate-600">
              <p><strong>Instructions:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click and drag to create a selection rectangle</li>
                <li>Click "Add Section" to confirm the selection</li>
                <li>Repeat for up to {MAX_SECTIONS} sections</li>
                <li>Or click "🔍 Auto Parse" to instantly create all {MAX_SECTIONS} sections</li>
                <li>Click "Confirm Sections" when ready</li>
              </ul>
            </div>
          </div>

          {/* Right Side - Sections Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Confirmed Sections</h2>
              
              {confirmedSections.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectedSectionIds.length === confirmedSections.length && confirmedSections.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Select All
                  </label>
                </div>
              )}
            </div>
            
            {confirmedSections.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-lg">No sections defined yet</p>
                <p className="text-sm mt-2">Drag over the document to create sections</p>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedSections.map((section) => (
                  <div
                    key={section.id}
                    className={`border-4 rounded-xl p-4 transition-all ${
                      selectedSectionIds.includes(section.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-green-500 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={selectedSectionIds.includes(section.id)}
                          onChange={() => handleToggleSelection(section.id)}
                          className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          {editingTitleId === section.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') handleSaveTitle(section.id);
                                  if (e.key === 'Escape') handleCancelEditTitle();
                                }}
                                className="flex-1 px-3 py-1 border-2 border-blue-500 rounded font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveTitle(section.id)}
                                className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-800 text-sm font-semibold"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleCancelEditTitle}
                                className="px-3 py-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 text-sm font-semibold"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3 className="text-lg font-bold text-slate-800">
                                {section.title}
                              </h3>
                              <button
                                onClick={() => handleEditTitle(section.id)}
                                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 hover:border-slate-400 text-xs font-semibold"
                              >
                                ✎ Edit
                              </button>
                            </>
                          )}
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {confirmedSections.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-slate-700 text-center">
                  <strong>💡 Tip:</strong> You can create up to {MAX_SECTIONS} sections. Drag rectangles anywhere on the document - they can overlap or be in any order. Select sections and click "✓ Confirm Sections" to proceed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Dashboard Modal */}
      <AgentDashboard 
        isOpen={showAgentDashboard}
        onClose={() => setShowAgentDashboard(false)}
      />
    </div>
  );
}

