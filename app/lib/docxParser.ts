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

/**
 * Parse a .docx file and extract sections based on Heading 1 structure.
 * 
 * Algorithm:
 * - Iterate through document paragraphs in order
 * - When encountering a Heading 1 paragraph, start a new section
 * - Append all subsequent non-heading paragraphs to current section
 * - Preserve paragraph boundaries with newlines
 * 
 * @param file - The uploaded .docx File object
 * @returns Promise<ParseResult> containing extracted sections
 */
export async function parseDocxBySections(file: File): Promise<ParseResult> {
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
    
    elements.forEach((element) => {
      const tagName = element.tagName.toLowerCase();
      const text = element.textContent?.trim() || '';
      
      if (!text) return; // Skip empty elements
      
      // Check if this is a Heading 1
      if (tagName === 'h1' || element.classList.contains('docx-heading-1')) {
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
          headingLevel: 1
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
    
    // Fallback: If no headings detected, try parsing by text patterns
    if (sections.length === 0) {
      console.log('[docxParser] No Heading 1 elements found, attempting fallback text parsing...');
      const fallbackSections = parseFallbackByTextPatterns(doc.body.textContent || '');
      sections.push(...fallbackSections);
    }
    
    console.log(`[docxParser] ✓ Parse complete: ${sections.length} sections detected`);
    sections.forEach((s, i) => {
      console.log(`[docxParser] [${i + 1}] "${s.title}" (${s.paragraphCount} paragraphs, ${s.content.length} chars)`);
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
    /^Document\s+(ID|Status)/i,
    /^Executive\s+Summary/i,
    /^Investment\s+Strategy/i,
    /^Risk\s+Disclosure/i,
    /^Liability/i,
    /^Termination/i,
    /^Governing\s+Law/i,
  ];
  
  lines.forEach((line, idx) => {
    const isLikelyHeader = 
      (line.length < 50 && line.length > 5) && // Reasonable header length
      (headerPatterns.some(p => p.test(line)) || // Matches pattern
       (line === line.toUpperCase() && line.split(' ').length <= 5)); // Short ALL CAPS
    
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

