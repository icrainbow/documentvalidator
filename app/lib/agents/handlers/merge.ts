// Fake handler for merge-agent
// Returns hardcoded merged sections without LLM calls

interface MergeInput {
  chatContent: {
    investmentBackground?: string;
    riskAssessment?: string;
    technicalStrategy?: string;
  };
  documentName: string;
}

interface MergeOutput {
  section1_title: string;
  section1_content: string;
  section2_title: string;
  section2_content: string;
  section3_title: string;
  section3_content: string;
}

export async function mergeHandler(
  input: MergeInput
): Promise<MergeOutput> {
  // Fake merge - combines chat content with document context
  // In real implementation, this would call LLM
  
  const { chatContent, documentName } = input;
  
  const section1 = chatContent.investmentBackground 
    ? `${chatContent.investmentBackground}\n\nThis profile was created in the context of ${documentName}.`
    : `Investment background information to be provided.`;
  
  const section2 = chatContent.riskAssessment
    ? `${chatContent.riskAssessment}\n\nRisk assessment completed for ${documentName}.`
    : `Risk assessment information to be provided.`;
  
  const section3 = chatContent.technicalStrategy
    ? `${chatContent.technicalStrategy}\n\nTechnical strategy aligned with ${documentName}.`
    : `Technical strategy information to be provided.`;
  
  return {
    section1_title: "Investment Background",
    section1_content: section1,
    section2_title: "Risk Assessment",
    section2_content: section2,
    section3_title: "Technical Strategy",
    section3_content: section3
  };
}

