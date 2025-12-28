// Fake handler for validate-agent
// Returns hardcoded validation results without LLM calls

interface ValidateInput {
  topic: string;
  userMessage: string;
  existingContent?: string;
  language?: string;
}

interface ValidateOutput {
  is_relevant: boolean;
  content_fragment: string | null;
  follow_up_question: string | null;
  examples: string[];
}

export async function validateHandler(
  input: ValidateInput
): Promise<ValidateOutput> {
  // Fake validation logic - always returns relevant for demo
  // In real implementation, this would call LLM
  
  const { userMessage, language = 'english' } = input;
  
  // Simple heuristic: if message has more than 5 words, consider it relevant
  const wordCount = userMessage.trim().split(/\s+/).length;
  const isRelevant = wordCount >= 5;
  
  if (isRelevant) {
    return {
      is_relevant: true,
      content_fragment: userMessage.substring(0, 100),
      follow_up_question: null,
      examples: []
    };
  } else {
    // Return fake follow-up question
    const followUps: Record<string, string> = {
      english: "Could you provide more details about your investment experience?",
      chinese: "您能提供更多关于您的投资经验的详细信息吗？",
      german: "Könnten Sie mehr Details zu Ihrer Investitionserfahrung angeben?",
      french: "Pourriez-vous fournir plus de détails sur votre expérience d'investissement?",
      japanese: "投資経験についてもっと詳しく教えていただけますか？"
    };
    
    return {
      is_relevant: false,
      content_fragment: null,
      follow_up_question: followUps[language] || followUps.english,
      examples: [
        "I have 5 years of experience investing in stocks",
        "I'm a beginner investor just starting out"
      ]
    };
  }
}

