import { AgentHandler } from '../types';
import { Fact, EvidenceAnchor } from '../domain';

interface ExtractFactsInput {
  sectionContent: string;
  sectionTitle: string;
  sectionId?: string;
  docId?: string;
}

interface ExtractFactsOutput {
  facts: Fact[];
  summary: string;
  total_confidence: number; // Average confidence
}

export const extractFactsHandler: AgentHandler<ExtractFactsInput, ExtractFactsOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const facts: Fact[] = [];
    const content = input.sectionContent;
    const contentLower = content.toLowerCase();

    // Extract entities (keywords)
    const entityPatterns = [
      { pattern: /tobacco\s+industry/gi, category: 'entity' as const, text: 'tobacco industry' },
      { pattern: /investment\s+background/gi, category: 'entity' as const, text: 'investment background' },
      { pattern: /risk\s+assessment/gi, category: 'entity' as const, text: 'risk assessment' },
      { pattern: /technical\s+strategy/gi, category: 'entity' as const, text: 'technical strategy' },
    ];

    entityPatterns.forEach(({ pattern, category, text }) => {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const startIdx = match.index || 0;
        const endIdx = startIdx + match[0].length;
        const snippet = content.substring(Math.max(0, startIdx - 20), Math.min(content.length, endIdx + 20));
        
        facts.push({
          category,
          text,
          confidence: 0.95,
          source: {
            doc_id: input.docId,
            section_id: input.sectionId,
            section_title: input.sectionTitle,
            snippet,
            char_range: { start: startIdx, end: endIdx },
          },
        });
      }
    });

    // Extract amounts (dollar figures)
    const amountPattern = /\$[\d,]+(?:\.\d{2})?/g;
    const amountMatches = Array.from(content.matchAll(amountPattern));
    for (const match of amountMatches) {
      const startIdx = match.index || 0;
      const endIdx = startIdx + match[0].length;
      const snippet = content.substring(Math.max(0, startIdx - 30), Math.min(content.length, endIdx + 30));
      
      facts.push({
        category: 'amount',
        text: `Financial amount: ${match[0]}`,
        confidence: 0.98,
        source: {
          doc_id: input.docId,
          section_id: input.sectionId,
          section_title: input.sectionTitle,
          snippet,
          char_range: { start: startIdx, end: endIdx },
        },
      });
    }

    // Extract dates
    const datePattern = /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/gi;
    const dateMatches = Array.from(content.matchAll(datePattern));
    for (const match of dateMatches) {
      const startIdx = match.index || 0;
      const endIdx = startIdx + match[0].length;
      const snippet = content.substring(Math.max(0, startIdx - 25), Math.min(content.length, endIdx + 25));
      
      facts.push({
        category: 'date',
        text: `Date reference: ${match[0]}`,
        confidence: 0.90,
        source: {
          doc_id: input.docId,
          section_id: input.sectionId,
          section_title: input.sectionTitle,
          snippet,
          char_range: { start: startIdx, end: endIdx },
        },
      });
    }

    // Extract risks
    if (contentLower.includes('risk') || contentLower.includes('volatile') || contentLower.includes('uncertain')) {
      const riskIdx = content.search(/risk|volatile|uncertain/i);
      const snippet = content.substring(Math.max(0, riskIdx - 40), Math.min(content.length, riskIdx + 60));
      
      facts.push({
        category: 'risk',
        text: 'Risk factor mentioned',
        confidence: 0.85,
        source: {
          doc_id: input.docId,
          section_id: input.sectionId,
          section_title: input.sectionTitle,
          snippet,
        },
      });
    }

    // Extract commitments
    const commitmentPatterns = ['will', 'commit', 'agree to', 'undertake', 'guarantee'];
    commitmentPatterns.forEach(pattern => {
      if (contentLower.includes(pattern)) {
        const idx = contentLower.indexOf(pattern);
        const snippet = content.substring(Math.max(0, idx - 30), Math.min(content.length, idx + 70));
        
        facts.push({
          category: 'commitment',
          text: `Commitment statement: "${pattern}"`,
          confidence: 0.80,
          source: {
            doc_id: input.docId,
            section_id: input.sectionId,
            section_title: input.sectionTitle,
            snippet,
          },
        });
      }
    });

    // Calculate average confidence
    const totalConfidence = facts.length > 0
      ? facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length
      : 0;

    return {
      facts,
      summary: `Extracted ${facts.length} facts from "${input.sectionTitle}"`,
      total_confidence: parseFloat(totalConfidence.toFixed(2)),
    };
  }

  throw new Error('Real extract-facts not implemented yet.');
};

