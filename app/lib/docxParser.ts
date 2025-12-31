/**
 * Real .docx parser using mammoth library
 * Extracts sections based on Heading 1 structure
 */

import mammoth from 'mammoth';

export interface ParsedSection {
  title: string;
  content: string;
  paragraphCount: number;
  headingLevel?: number;
}

export interface ParseResult {
  sections: ParsedSection[];
  totalSections: number;
  rawText: string;
}

export interface ParseOptions {
  targetHeadingLevel?: 1 | 2 | 'auto';
}

/**
 * Parse a .docx file and extract sections based on heading structure.
 * 
 * Algorithm:
 * - Iterate through document paragraphs in order
 * - When encountering a target heading, start a new section
 * - Append all subsequent non-heading paragraphs to current section
 * - Preserve paragraph boundaries with newlines
 * 
 * @param file - The uploaded .docx File object
 * @param options - Parsing options (targetHeadingLevel: 1, 2, or 'auto')
 * @returns Promise<ParseResult> containing extracted sections
 */
export async function parseDocxBySections(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  console.log('[docxParser] Starting parse of file:', file.name);
  
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract raw text and HTML with style info
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        includeDefaultStyleMap: true,
        styleMap: [
          // Map Word heading styles to HTML elements with data attributes
          "p[style-name='Heading 1'] => h1.docx-heading-1",
          "p[style-name='Heading 2'] => h2.docx-heading-2",
          "p[style-name='Heading 3'] => h3.docx-heading-3",
        ]
      }
    );
    
    console.log('[docxParser] Mammoth conversion complete');
    console.log('[docxParser] Messages:', result.messages);
    
    // Parse HTML to extract sections
    const parser = new DOMParser();
    const doc = parser.parseFromString(result.value, 'text/html');
    
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;
    let currentContent: string[] = [];
    
    // Iterate through all body elements
    const elements = doc.body.querySelectorAll('*');
    
    // ============================================================
    // AUTO-DETECT HEADING LEVEL
    // ============================================================
    // Count h1 and h2 elements to determine which level to use for section splits
    let h1Count = 0;
    let h2Count = 0;
    const debugHeadings: Array<{ text: string; level: number }> = [];
    
    elements.forEach((element) => {
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent?.trim() || '';
      
      if (!text) return;
      
      const isH1 = tagName === 'h1' || element.classList.contains('docx-heading-1');
      const isH2 = tagName === 'h2' || element.classList.contains('docx-heading-2');
      
      if (isH1) {
        h1Count++;
        debugHeadings.push({ text, level: 1 });
      } else if (isH2) {
        h2Count++;
        debugHeadings.push({ text, level: 2 });
      }
    });
    
    // Determine target heading level
    let targetHeadingLevel: 1 | 2 = 2; // Default
    
    if (options.targetHeadingLevel && options.targetHeadingLevel !== 'auto') {
      // Explicit strategy specified by caller (e.g., Document Structuring Agent)
      targetHeadingLevel = options.targetHeadingLevel;
      console.log(`[docxParser] Heading detection: h1=${h1Count}, h2=${h2Count}`);
      console.log(`[docxParser] Using EXPLICIT strategy: Heading ${targetHeadingLevel}`);
    } else {
      // Auto mode: prefer Heading 2, fallback to Heading 1
      if (h2Count >= 2) {
        targetHeadingLevel = 2;
      } else if (h1Count >= 2) {
        targetHeadingLevel = 1;
      }
      // else: default to 2 (will trigger fallback if no h2 found)
      
      console.log(`[docxParser] Heading detection: h1=${h1Count}, h2=${h2Count}`);
      console.log(`[docxParser] Auto-selected heading level: Heading ${targetHeadingLevel}`);
    }
    
    console.log(`[docxParser] Detected headings:`, debugHeadings);
    
    // ============================================================
    // EXTRACT SECTIONS BY TARGET HEADING LEVEL
    // ============================================================
    elements.forEach((element) => {
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent?.trim() || '';
      
      if (!text) return; // Skip empty elements
      
      // Check if this is the target heading level
      const isHeading1 = tagName === 'h1' || element.classList.contains('docx-heading-1');
      const isHeading2 = tagName === 'h2' || element.classList.contains('docx-heading-2');
      const isSectionHeading = (targetHeadingLevel === 1 && isHeading1) || 
                               (targetHeadingLevel === 2 && isHeading2);
      
      if (isSectionHeading) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n\n').trim();
          currentSection.paragraphCount = currentContent.length;
          sections.push(currentSection);
          console.log(`[docxParser] Completed section "${currentSection.title}" with ${currentSection.paragraphCount} paragraphs`);
        }
        
        // Start new section
        currentSection = {
          title: text,
          content: '',
          paragraphCount: 0,
          headingLevel: targetHeadingLevel
        };
        currentContent = [];
        
        console.log(`[docxParser] New section detected: "${text}"`);
      } else if (currentSection && (tagName === 'p' || tagName === 'li')) {
        // Add paragraph to current section
        currentContent.push(text);
      }
    });
    
    // Save last section
    if (currentSection !== null) {
      const finalSection: ParsedSection = currentSection;
      if (currentContent.length > 0) {
        finalSection.content = currentContent.join('\n\n').trim();
        finalSection.paragraphCount = currentContent.length;
      } else {
        finalSection.content = '';
        finalSection.paragraphCount = 0;
      }
      sections.push(finalSection);
      console.log(`[docxParser] Completed final section "${finalSection.title}" with ${finalSection.paragraphCount} paragraphs`);
    }
    
    // Fallback: If no sections detected, try parsing by text patterns
    if (sections.length === 0) {
      console.warn('[docxParser] ⚠ Fallback triggered: No heading sections found');
      console.warn(`[docxParser] Reason: h1Count=${h1Count}, h2Count=${h2Count}, targetLevel=${targetHeadingLevel}`);
      console.warn('[docxParser] Attempting fallback text pattern parsing...');
      const fallbackSections = parseFallbackByTextPatterns(doc.body.textContent || '');
      sections.push(...fallbackSections);
    }
    
    console.log(`[docxParser] ✓ Parse complete: ${sections.length} sections detected`);
    console.log(`[docxParser] Section details:`);
    sections.forEach((s, i) => {
      console.log(`  [${i + 1}] "${s.title}" (Heading ${s.headingLevel || 'N/A'}, ${s.paragraphCount} paragraphs, ${s.content.length} chars)`);
    });
    
    return {
      sections,
      totalSections: sections.length,
      rawText: doc.body.textContent || ''
    };
    
  } catch (error) {
    console.error('[docxParser] Parse error:', error);
    throw new Error(`Failed to parse .docx file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fallback parser when heading styles are not detected.
 * Identifies sections by recognizing common document header patterns.
 */
function parseFallbackByTextPatterns(text: string): ParsedSection[] {
  console.log('[docxParser] Running fallback text pattern parser');
  
  const sections: ParsedSection[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentSection: ParsedSection | null = null;
  let currentContent: string[] = [];
  
  // Pattern: Lines that are likely section headers (short, all caps, or title case, standalone)
  const headerPatterns = [
    /^[A-Z][A-Za-z\s&]+$/, // Title Case or ALL CAPS
    /^[A-Z_]+$/, // ALL_CAPS_WITH_UNDERSCORES (e.g., PURPOSE_AND_EXCEPTION_SCOPE)
    /^Document\s+(ID|Status)/i,
    /^Executive\s+Summary/i,
    /^Investment\s+Strategy/i,
    /^Risk\s+Disclosure/i,
    /^Liability/i,
    /^Termination/i,
    /^Governing\s+Law/i,
    /^Purpose/i,
    /^Parties/i,
    /^Approvals/i,
    /^Appendix/i,
  ];
  
  lines.forEach((line, idx) => {
    const isLikelyHeader = 
      (line.length < 80 && line.length > 5) && // Reasonable header length (increased from 50 to 80)
      (headerPatterns.some(p => p.test(line)) || // Matches pattern
       (line === line.toUpperCase() && line.split(/[\s_]/).length <= 6)); // Short ALL CAPS (with space or underscore)
    
    if (isLikelyHeader && idx > 0) { // Don't treat first line as header without context
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent.join('\n\n').trim();
        currentSection.paragraphCount = currentContent.length;
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        title: line,
        content: '',
        paragraphCount: 0
      };
      currentContent = [];
      console.log(`[docxParser] Fallback detected section: "${line}"`);
    } else if (currentSection) {
      currentContent.push(line);
    } else if (!currentSection && line.length > 10) {
      // First content before any header - create a default section
      currentSection = {
        title: 'Document Header',
        content: '',
        paragraphCount: 0
      };
      currentContent = [line];
    }
  });
  
  // Save last section
  if (currentSection !== null && currentContent.length > 0) {
    const finalSection: ParsedSection = currentSection;
    finalSection.content = currentContent.join('\n\n').trim();
    finalSection.paragraphCount = currentContent.length;
    sections.push(finalSection);
  }
  
  console.log(`[docxParser] Fallback parse complete: ${sections.length} sections`);
  return sections;
}

