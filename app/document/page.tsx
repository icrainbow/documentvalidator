'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AgentDashboard from '../components/AgentDashboard';
import { useSpeech } from '../hooks/useSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

type SectionStatus = 'unevaluated' | 'pass' | 'fail';

interface LogEntry {
  agent: string;
  action: string;
  timestamp: Date;
}

interface Section {
  id: number;
  title: string;
  content: string;
  status: SectionStatus;
  log: LogEntry[];
}

interface Message {
  role: 'user' | 'agent';
  agent?: string;
  content: string;
}

// Predefined fake demo content (used for manual segmentation and badformat.word)
const FAKE_SECTIONS = [
  {
    id: 1,
    title: 'Investment Background',
    content: 'I am a mid-career professional with a stable income and a growing interest in long-term investing. Over the past several years, I have gradually built exposure to financial markets through mutual funds and employer-sponsored retirement plans. My investment knowledge is largely self-taught, relying on online resources, market news, and informal discussions with peers. I do not follow a strict investment philosophy, but I value diversification and consistency. My primary motivation is to preserve and grow capital over time rather than pursue speculative opportunities or short-term trading gains.',
    status: 'pass' as SectionStatus,
    log: [
      { agent: 'Evaluate', action: 'PASS: All criteria met', timestamp: new Date() }
    ]
  },
  {
    id: 2,
    title: 'Risk Assessment',
    content: 'I consider myself to have a moderate tolerance for risk, balancing growth potential with capital preservation. While I understand that market volatility is inevitable, I prefer to avoid extreme drawdowns that could significantly impact long-term plans. I am willing to accept moderate fluctuations if they align with a disciplined strategy. My biggest concern relates to market movements are a concern, especially during periods of rapid decline. Therefore, risk management, transparency, and clear downside expectations are important factors in investment decisions.',
    status: 'fail' as SectionStatus,
    log: [
      { agent: 'Evaluate', action: 'FAIL: Too long, unclear risk methodology', timestamp: new Date() },
      { agent: 'Optimize', action: 'Proposal: Shorten to 100 words, clarify approach', timestamp: new Date() }
    ]
  },
  {
    id: 3,
    title: 'Technical Strategy',
    content: 'From a technical perspective, my approach is relatively simple and pragmatic. I do not engage heavily in advanced technical analysis, but I follow basic indicators such as trends, asset allocation signals, and rebalancing thresholds. Automation and rule-based processes are preferred to reduce emotional decisions. I value strategies that can be monitored and adjusted periodically rather than actively traded. Clear reporting, performance metrics, and strategy rationale are essential for maintaining confidence in the approach over time.',
    status: 'fail' as SectionStatus,
    log: [
      { agent: 'Evaluate', action: 'FAIL: Missing mandatory disclaimer', timestamp: new Date() },
      { agent: 'Policy', action: 'Mandatory disclaimer required for compliance', timestamp: new Date() }
    ]
  }
];

export default function DocumentPage() {
  const router = useRouter();
  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  const { 
    isListening, 
    transcript, 
    isSupported: isRecognitionSupported, 
    startListening, 
    stopListening 
  } = useSpeechRecognition('english');
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>(FAKE_SECTIONS);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      agent: 'Evaluate Agent',
      content: 'Document evaluation completed:\n✓ Section 1 (Investment Background): PASS\n✗ Section 2 (Risk Assessment): FAIL - Issues detected\n✗ Section 3 (Technical Strategy): FAIL - Issues detected'
    }
  ]);

  // Check on mount if we should use user-provided content from chat flow
  useEffect(() => {
    // Check for sections from manual segmentation (new format)
    const section1Title = sessionStorage.getItem('section1_title');
    const section1Content = sessionStorage.getItem('section1_content');
    const section2Title = sessionStorage.getItem('section2_title');
    const section2Content = sessionStorage.getItem('section2_content');
    const section3Title = sessionStorage.getItem('section3_title');
    const section3Content = sessionStorage.getItem('section3_content');

    // If we have sections from manual segmentation with the new format
    if (section1Content || section2Content || section3Content) {
      const loadedSections: Section[] = [];
      
      if (section1Content) {
        loadedSections.push({
          id: 1,
          title: section1Title || 'Section 1',
          content: section1Content,
          status: 'pass' as SectionStatus,
          log: [{ agent: 'Evaluate', action: 'PASS: All criteria met', timestamp: new Date() }]
        });
      }
      
      if (section2Content) {
        loadedSections.push({
          id: 2,
          title: section2Title || 'Section 2',
          content: section2Content,
          status: 'fail' as SectionStatus,
          log: [
            { agent: 'Evaluate', action: 'FAIL: Too long, unclear risk methodology', timestamp: new Date() },
            { agent: 'Optimize', action: 'Proposal: Shorten to 100 words, clarify approach', timestamp: new Date() }
          ]
        });
      }
      
      if (section3Content) {
        loadedSections.push({
          id: 3,
          title: section3Title || 'Section 3',
          content: section3Content,
          status: 'fail' as SectionStatus,
          log: [
            { agent: 'Evaluate', action: 'FAIL: Missing mandatory disclaimer', timestamp: new Date() },
            { agent: 'Policy', action: 'Mandatory disclaimer required for compliance', timestamp: new Date() }
          ]
        });
      }
      
      if (loadedSections.length > 0) {
        setSections(loadedSections);
        
        // Update initial message
        const sectionMessages = loadedSections.map((sec, idx) => 
          `${idx === 0 ? '✓' : '✗'} Section ${idx + 1} (${sec.title}): ${idx === 0 ? 'PASS' : 'FAIL - Issues detected'}`
        ).join('\n');
        
        setMessages([
          {
            role: 'agent',
            agent: 'Evaluate Agent',
            content: `Document evaluation completed:\n${sectionMessages}`
          }
        ]);
        return;
      }
    }

    // Check if coming from chat-only flow (user answered questions)
    const investmentBackground = sessionStorage.getItem('investmentBackground');
    const riskAssessment = sessionStorage.getItem('riskAssessment');
    const technicalStrategy = sessionStorage.getItem('technicalStrategy');

    // Check if coming from manual segmentation (old format - fallback)
    const definedSectionsStr = sessionStorage.getItem('definedSections');

    if (definedSectionsStr) {
      // Coming from manual segmentation page - use sections with custom titles
      try {
        const definedSections = JSON.parse(definedSectionsStr);
        
        // Map defined sections to full section objects with logs
        const customSections: Section[] = definedSections.map((section: any, index: number) => {
          const isFirstSection = index === 0;
          return {
            id: section.id,
            title: section.title, // Use custom title from segmentation page
            content: section.content,
            status: isFirstSection ? 'pass' as SectionStatus : 'fail' as SectionStatus,
            log: isFirstSection 
              ? [{ agent: 'Evaluate', action: 'PASS: All criteria met', timestamp: new Date() }]
              : index === 1
                ? [
                    { agent: 'Evaluate', action: 'FAIL: Too long, unclear risk methodology', timestamp: new Date() },
                    { agent: 'Optimize', action: 'Proposal: Shorten to 100 words, clarify approach', timestamp: new Date() }
                  ]
                : [
                    { agent: 'Evaluate', action: 'FAIL: Missing mandatory disclaimer', timestamp: new Date() },
                    { agent: 'Policy', action: 'Mandatory disclaimer required for compliance', timestamp: new Date() }
                  ]
          };
        });
        
        setSections(customSections);
        
        // Update initial message to reflect custom sections
        setMessages([
          {
            role: 'agent',
            agent: 'Evaluate Agent',
            content: `Document evaluation completed:\n✓ Section 1 (${customSections[0]?.title}): PASS\n✗ Section 2 (${customSections[1]?.title}): FAIL - Issues detected\n✗ Section 3 (${customSections[2]?.title}): FAIL - Issues detected`
          }
        ]);
      } catch (error) {
        console.error('Error parsing defined sections:', error);
      }
      
      // Clear the session storage
      sessionStorage.removeItem('definedSections');
    } else if (investmentBackground && riskAssessment && technicalStrategy) {
      // Coming from chat-only flow - use real user input
      const userSections: Section[] = [
        {
          id: 1,
          title: 'Investment Background',
          content: investmentBackground,
          status: 'pass',
          log: [
            { agent: 'Evaluate', action: 'PASS: User input captured', timestamp: new Date() }
          ]
        },
        {
          id: 2,
          title: 'Risk Assessment',
          content: riskAssessment,
          status: 'fail',
          log: [
            { agent: 'Evaluate', action: 'FAIL: Requires optimization', timestamp: new Date() },
            { agent: 'Optimize', action: 'Ready for user refinement', timestamp: new Date() }
          ]
        },
        {
          id: 3,
          title: 'Technical Strategy',
          content: technicalStrategy,
          status: 'fail',
          log: [
            { agent: 'Evaluate', action: 'FAIL: Needs additional details', timestamp: new Date() },
            { agent: 'Policy', action: 'Compliance review required', timestamp: new Date() }
          ]
        }
      ];
      
      setSections(userSections);
      
      // Clear session storage
      sessionStorage.removeItem('investmentBackground');
      sessionStorage.removeItem('riskAssessment');
      sessionStorage.removeItem('technicalStrategy');
    }
    // Otherwise, use default fake sections (already set in initial state)
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Update input value when speech recognition provides transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const [inputValue, setInputValue] = useState('');
  const [globalStatus, setGlobalStatus] = useState<'none' | 'ok' | 'nok'>('none');
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState<any | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [hasComplianceIssue, setHasComplianceIssue] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showAgentDashboard, setShowAgentDashboard] = useState(false);

  const handleEvaluateSection = (sectionId: number) => {
    const section = sections.find(s => s.id === sectionId);
    const newStatus: SectionStatus = sectionId === 2 ? 'fail' : 'pass';
    
    const logAction = newStatus === 'pass' 
      ? 'PASS: All criteria met'
      : 'FAIL: Issues detected, requires revision';
    
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        return {
          ...s,
          status: newStatus,
          log: [...s.log, { agent: 'Evaluate', action: logAction, timestamp: new Date() }]
        };
      }
      return s;
    }));

    const newMessage: Message = {
      role: 'agent',
      agent: 'Evaluate Agent',
      content: newStatus === 'pass' 
        ? `Section ${sectionId} "${section?.title}" meets all evaluation criteria. ✓`
        : `Section ${sectionId} "${section?.title}" does not meet evaluation criteria. Issues detected.`
    };

    setMessages([...messages, newMessage]);
    setGlobalStatus('none');
  };

  const handleModifySection = (sectionId: number) => {
    if (editingSectionId === sectionId) {
      // Check for compliance issues when saving ANY section
      if (editContent.toLowerCase().includes('tobacco')) {
        // Compliance Agent blocks the save
        setHasComplianceIssue(true);
        
        setSections(prevSections => prevSections.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              status: 'fail', // Mark section as failed
              log: [...s.log, { agent: 'Compliance', action: 'BLOCKED: Prohibited term "tobacco" detected', timestamp: new Date() }]
            };
          }
          return s;
        }));
        
        const newMessage: Message = {
          role: 'agent',
          agent: 'Compliance Agent',
          content: `⚠️ COMPLIANCE VIOLATION: Your modification to Section ${getSectionPosition(sectionId)} contains "tobacco" which violates our company\'s KYC (Know Your Customer) compliance rules. We cannot include investments related to tobacco in client documents due to regulatory restrictions. The section has been marked as FAILED. Please remove or replace this term before saving.`
        };
        setMessages(prevMessages => [...prevMessages, newMessage]);
        return; // Don't save, keep in edit mode
      }

      // If no compliance issues, proceed with save
      setHasComplianceIssue(false);
      setSections(prevSections => prevSections.map(s => {
        if (s.id === sectionId) {
          const newStatus = (sectionId === 2 || sectionId === 3) ? 'pass' : s.status;
          const logAction = (sectionId === 2 || sectionId === 3)
            ? 'Content optimized and saved, status updated to PASS'
            : 'Content updated successfully';
          
          return {
            ...s,
            content: editContent,
            status: newStatus,
            log: [...s.log, { agent: 'Optimize', action: logAction, timestamp: new Date() }]
          };
        }
        return s;
      }));
      
      const section = sections.find(s => s.id === sectionId);
      const statusUpdate = (sectionId === 2 || sectionId === 3) ? ' Status updated to PASS. ✓' : '';
      const newMessage: Message = {
        role: 'agent',
        agent: 'Optimize Agent',
        content: `Section ${sectionId} "${section?.title}" has been saved successfully.${statusUpdate}`
      };
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      setEditingSectionId(null);
      setEditContent('');
    } else {
      // Enter edit mode
      setHasComplianceIssue(false);
      const section = sections.find(s => s.id === sectionId);
      setEditingSectionId(sectionId);
      setEditContent(section?.content || '');
      
      setSections(prevSections => prevSections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            log: [...s.log, { agent: 'Optimize', action: 'Entered edit mode for modifications', timestamp: new Date() }]
          };
        }
        return s;
      }));
      
      const newMessage: Message = {
        role: 'agent',
        agent: 'Optimize Agent',
        content: `Section ${sectionId} "${section?.title}" is now in edit mode. Make your changes and click Save.`
      };
      setMessages(prevMessages => [...prevMessages, newMessage]);
    }
  };

  const handleGlobalEvaluate = () => {
    const allPass = sections.every(s => s.status === 'pass');
    const anyFail = sections.some(s => s.status === 'fail');
    const anyUnevaluated = sections.some(s => s.status === 'unevaluated');

    let status: 'ok' | 'nok' = 'nok';
    let messageContent = '';

    if (anyUnevaluated) {
      messageContent = 'Global evaluation cannot be completed. Some sections remain unevaluated.';
      status = 'nok';
    } else if (allPass) {
      messageContent = 'Overall document evaluation completed: OK. All sections meet requirements. ✓';
      status = 'ok';
    } else {
      messageContent = 'Overall document evaluation completed: NOK. Some sections need revision.';
      status = 'nok';
    }

    setGlobalStatus(status);
    setMessages([...messages, {
      role: 'agent',
      agent: 'Evaluate Agent',
      content: messageContent
    }]);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    setMessages([...messages, {
      role: 'agent',
      agent: 'System',
      content: '✓ Submission successfully! Your submission has been recorded.'
    }]);
  };

  const handleFullComplianceReview = async () => {
    setIsOrchestrating(true);
    setOrchestrationResult(null);
    
    try {
      // Use the first section for review
      const sectionToReview = sections[0];
      
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow_id: 'compliance-review-v1',
          document_id: 'DOC-' + Date.now(),
          sections: [{
            id: String(sectionToReview.id),
            title: sectionToReview.title,
            content: sectionToReview.content
          }],
          options: {
            language: 'english',
            tone: 'formal',
            mode: 'fake'
          }
        })
      });
      
      const result = await response.json();
      setOrchestrationResult(result);
      
      // Add a chat message about the orchestration
      if (result.ok) {
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'Orchestrator',
          content: `Full compliance review completed. Decision: ${result.decision.next_action}. ${result.execution.steps.length} agents executed.`
        }]);
      }
    } catch (error: any) {
      console.error('Orchestration error:', error);
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `❌ Orchestration failed: ${error.message}`
      }]);
    } finally {
      setIsOrchestrating(false);
    }
  };

  const canSubmit = sections.every(s => s.status === 'pass');

  const highlightProhibitedTerms = (text: string) => {
    const prohibitedTerm = 'tobacco industry';
    const regex = new RegExp(`(${prohibitedTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === prohibitedTerm.toLowerCase()) {
        return (
          <span key={index} className="bg-red-600 text-white px-1 rounded font-bold border-2 border-red-800">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const hasProhibitedTerm = (text: string) => {
    return text.toLowerCase().includes('tobacco industry');
  };

  const handleDownloadPDF = () => {
    let pdfContent = 'INVESTMENT DOCUMENT\n\n';
    pdfContent += '='.repeat(80) + '\n\n';
    
    sections.forEach((section, index) => {
      pdfContent += `Section ${section.id}: ${section.title}\n`;
      pdfContent += `Status: ${section.status.toUpperCase()}\n`;
      pdfContent += '-'.repeat(80) + '\n';
      pdfContent += section.content + '\n\n';
      if (index < sections.length - 1) {
        pdfContent += '\n';
      }
    });
    
    pdfContent += '\n' + '='.repeat(80) + '\n';
    pdfContent += 'End of Document\n';
    
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investment-document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Get section position (1-based index) in the sections array
  const getSectionPosition = (sectionId: number): number => {
    const index = sections.findIndex(s => s.id === sectionId);
    return index >= 0 ? index + 1 : sectionId; // Fallback to ID if not found
  };

  // Detect section by position (index) in the sections array, not by name or ID
  const detectSectionByPosition = (input: string): number | null => {
    const lower = input.toLowerCase();
    
    // Extract section number from user input (e.g., "section 2", "section 3")
    const sectionMatch = lower.match(/section\s*(\d+)/);
    if (sectionMatch) {
      const position = parseInt(sectionMatch[1], 10);
      // Position is 1-based, check if it's within bounds
      if (position >= 1 && position <= sections.length) {
        // Return the actual section ID at this position (index = position - 1)
        return sections[position - 1].id;
      }
    }
    
    // Fallback: try to match by section title keywords (for backward compatibility)
    // But still map to position-based ID
    for (let i = 0; i < sections.length; i++) {
      const sectionTitle = sections[i].title.toLowerCase();
      // Check if input contains significant keywords from the title
      const titleWords = sectionTitle.split(/[\s:+]+/).filter(w => w.length > 3);
      if (titleWords.some(word => lower.includes(word))) {
        return sections[i].id;
      }
    }
    
    return null;
  };

  // For "fix" command - only sections 2 and 3 can be fixed
  const detectSection = (input: string): number | null => {
    const sectionId = detectSectionByPosition(input);
    if (!sectionId) return null;
    
    // Find the position (index) of this section
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return null;
    
    // Only allow fixing sections at position 2 or 3 (index 1 or 2)
    if (sectionIndex === 1 || sectionIndex === 2) {
      return sectionId;
    }
    
    return null;
  };

  // For modify/optimize command - any section can be modified
  const detectSectionForModify = (input: string): number | null => {
    return detectSectionByPosition(input);
  };

  const callLLMForOptimization = async (sectionId: number, userPrompt: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return null;

    // Get user's language preference
    const userLanguage = typeof window !== 'undefined' 
      ? sessionStorage.getItem('userLanguage') || 'english'
      : 'english';

    try {
      setIsAIProcessing(true);

      const response = await fetch('/api/optimize-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sectionContent: section.content,
          sectionTitle: section.title,
          userPrompt: userPrompt,
          language: userLanguage // Pass language preference
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API returned non-JSON response:', await response.text());
        throw new Error('API configuration error. Please check ANTHROPIC_API_KEY in .env.local');
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to optimize content');
      }

      const data = await response.json();
      return data.revisedContent;
    } catch (error) {
      console.error('Error calling LLM:', error);
      throw error;
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      const userMessage: Message = {
        role: 'user',
        content: inputValue
      };

      const lowerInput = inputValue.toLowerCase();
      let agentMessage: Message;

      // Check if user is requesting AI optimization for a specific section
      const mentionedSection = detectSectionForModify(lowerInput);
      
      if (mentionedSection && !lowerInput.includes('global evaluate') && !lowerInput.startsWith('fix ')) {
        // User mentioned a section - use real LLM to optimize
        setMessages([...messages, userMessage]);
        
        const processingMessage: Message = {
          role: 'agent',
          agent: 'Optimize Agent',
          content: `Processing your request for Section ${getSectionPosition(mentionedSection)}... AI is analyzing and optimizing the content.`
        };
        setMessages(prev => [...prev, processingMessage]);

        try {
          const revisedContent = await callLLMForOptimization(mentionedSection, inputValue);
          
          if (revisedContent) {
            // COMPLIANCE CHECK: Validate AI-generated content for ANY section
            if (revisedContent.toLowerCase().includes('tobacco')) {
              // Compliance Agent blocks AI-generated content with forbidden terms
              const complianceWarning: Message = {
                role: 'agent',
                agent: 'Compliance Agent',
                content: `⚠️ COMPLIANCE VIOLATION: The AI-generated content for Section ${getSectionPosition(mentionedSection)} contains "tobacco" which violates our company\'s KYC compliance rules. We cannot include investments related to tobacco in client documents due to regulatory restrictions. The section has been marked as FAILED and content has NOT been updated. Please modify your request to exclude prohibited terms.`
              };
              setMessages(prev => [...prev, complianceWarning]);

              // Add to decision log and mark section as FAIL
              setSections(prevSections => prevSections.map(s => {
                if (s.id === mentionedSection) {
                  return {
                    ...s,
                    status: 'fail',
                    log: [...s.log, { 
                      agent: 'Compliance', 
                      action: 'BLOCKED: AI-generated content contains prohibited term "tobacco"', 
                      timestamp: new Date() 
                    }]
                  };
                }
                return s;
              }));

              return; // Stop here, don't update content
            }

            // No compliance issues - proceed with update
            setSections(prevSections => prevSections.map(s => {
              if (s.id === mentionedSection) {
                return {
                  ...s,
                  content: revisedContent,
                  status: 'pass',
                  log: [...s.log, { 
                    agent: 'Optimize', 
                    action: 'AI optimized content successfully, status updated to PASS', 
                    timestamp: new Date() 
                  }]
                };
              }
              return s;
            }));

            const successMessage: Message = {
              role: 'agent',
              agent: 'Optimize Agent',
              content: `✓ Section ${getSectionPosition(mentionedSection)} has been optimized based on your request. The content has been updated and the section status is now PASS.`
            };
            setMessages(prev => [...prev, successMessage]);
          }
        } catch (error) {
          const errorMessage: Message = {
            role: 'agent',
            agent: 'System',
            content: `⚠️ Failed to optimize content: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your API configuration.`
          };
          setMessages(prev => [...prev, errorMessage]);
        }

        setInputValue('');
        return;
      }

      // Original logic for other commands
      if (lowerInput.includes('global evaluate')) {
        setSections(sections.map(s => {
          let newStatus: SectionStatus = s.status;
          let logAction = '';
          
          if (s.id === 1) {
            newStatus = 'pass';
            logAction = 'PASS: Global evaluation confirmed';
          } else if (s.id === 2) {
            newStatus = 'fail';
            logAction = 'FAIL: Issues detected in global evaluation';
          } else if (s.id === 3) {
            newStatus = 'pass';
            logAction = 'PASS: Global evaluation confirmed';
          }
          
          return {
            ...s,
            status: newStatus,
            log: [...s.log, { agent: 'Evaluate', action: logAction, timestamp: new Date() }]
          };
        }));

        agentMessage = {
          role: 'agent',
          agent: 'Evaluate Agent',
          content: 'Global evaluation completed:\n✓ Section 1: PASS\n✗ Section 2: FAIL - Issues detected\n✓ Section 3: PASS'
        };
      } else if (lowerInput.includes('fix')) {
        const sectionId = detectSection(lowerInput);
        if (sectionId === 2 || sectionId === 3) {
          const section = sections.find(s => s.id === sectionId);
          setSections(prevSections => prevSections.map(s => {
            if (s.id === sectionId) {
              return {
                ...s,
                status: 'pass',
                log: [...s.log, { agent: 'Optimize', action: 'Fixed via chat command, status updated to PASS', timestamp: new Date() }]
              };
            }
            return s;
          }));

          agentMessage = {
            role: 'agent',
            agent: 'Optimize Agent',
            content: `Section ${getSectionPosition(sectionId)} "${section?.title}" has been fixed and optimized. Status updated to PASS. ✓`
          };
        } else {
          agentMessage = {
            role: 'agent',
            agent: 'Optimize Agent',
            content: 'Please specify which section to fix. You can fix Section 2 (Risk Assessment) or Section 3 (Technical Strategy).'
          };
        }
      } else if (lowerInput.includes('modify')) {
        const sectionId = detectSectionForModify(lowerInput);
        if (sectionId) {
          const section = sections.find(s => s.id === sectionId);
          setEditingSectionId(sectionId);
          setEditContent(section?.content || '');

          agentMessage = {
            role: 'agent',
            agent: 'Optimize Agent',
            content: `Section ${sectionId} "${section?.title}" is now in edit mode. Make your changes and click Save.`
          };
        } else {
          agentMessage = {
            role: 'agent',
            agent: 'Optimize Agent',
            content: 'Please specify which section to modify (e.g., "modify section 1", "modify Risk Assessment", or "modify Technical Strategy").'
          };
        }
      } else {
        agentMessage = {
          role: 'agent',
          agent: lowerInput.includes('section') ? 'Optimize Agent' : 'System',
          content: lowerInput.includes('section')
            ? `Understood. Processing your request: "${inputValue}"`
            : 'I\'m here to help. You can type "global evaluate" to evaluate all sections, "fix [section]" to fix a section, or "modify [section]" to edit.'
        };
      }

      setMessages([...messages, userMessage, agentMessage]);
      setInputValue('');
    }
  };

  const getSectionColor = (status: SectionStatus) => {
    switch (status) {
      case 'pass':
        return 'border-green-500 bg-green-50';
      case 'fail':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-slate-300 bg-white';
    }
  };

  const getStatusBadge = (status: SectionStatus) => {
    switch (status) {
      case 'pass':
        return <span className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">✓ PASS</span>;
      case 'fail':
        return <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">✗ FAIL</span>;
      default:
        return <span className="px-3 py-1 bg-slate-300 text-slate-600 text-sm font-semibold rounded-full">UNEVALUATED</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">
          {isSubmitted ? 'Document Preview' : 'Document Evaluation'}
        </h1>
        
        {isSubmitted ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                ✓ Document Submitted Successfully!
              </h2>
              <p className="text-slate-600">
                Your document has been submitted. Review the final version below.
              </p>
            </div>

            <div className="space-y-6 mb-8">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`border-4 rounded-xl p-6 ${getSectionColor(section.status)}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">
                        Section {index + 1}: {section.title}
                      </h2>
                      {getStatusBadge(section.status)}
                    </div>
                  </div>
                  
                  <p className="text-slate-700 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="px-8 py-4 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-bold text-lg shadow-sm"
              >
                ← Back to Main Page
              </button>
              <button
                onClick={() => setShowAgentDashboard(true)}
                className="px-8 py-4 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-lg shadow-sm"
              >
                📊 Agent Dashboard
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-8 py-4 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-lg shadow-sm"
              >
                📥 Download
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`border-4 rounded-xl p-6 transition-all ${getSectionColor(section.status)}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">
                        Section {index + 1}: {section.title}
                      </h2>
                      {getStatusBadge(section.status)}
                    </div>
                  </div>

                  {/* Decision Log / Timeline */}
                  <div className="mb-4 bg-slate-50 border border-slate-300 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase">Decision Log</h4>
                    <div className="space-y-1">
                      {section.log.slice(-3).map((entry, idx) => (
                        <div key={idx} className="text-xs">
                          <span className={`font-bold ${
                            entry.agent === 'Evaluate' ? 'text-purple-700' :
                            entry.agent === 'Optimize' ? 'text-blue-700' :
                            entry.agent === 'Compliance' ? 'text-red-700' :
                            'text-slate-700'
                          }`}>
                            [{entry.agent}]
                          </span>
                          <span className="text-slate-700"> {entry.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {editingSectionId === section.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className={`w-full text-slate-700 mb-2 leading-relaxed p-3 rounded-lg focus:outline-none focus:ring-2 min-h-[120px] ${
                          hasComplianceIssue && hasProhibitedTerm(editContent)
                            ? 'border-4 border-red-600 bg-red-50 focus:ring-red-500'
                            : 'border-2 border-blue-400 focus:ring-blue-500'
                        }`}
                      />
                      {hasComplianceIssue && hasProhibitedTerm(editContent) && (
                        <div className="mb-2 p-3 bg-red-100 border-2 border-red-500 rounded-lg">
                          <div className="text-red-800 text-sm font-bold mb-2">
                            ⚠️ Compliance Violation Detected:
                          </div>
                          <div className="text-red-700 text-sm leading-relaxed">
                            {highlightProhibitedTerms(editContent)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {hasProhibitedTerm(section.content) && section.status === 'fail' ? (
                        <div className="mb-4">
                          <div className="mb-2 p-2 bg-red-100 border-2 border-red-500 rounded text-red-800 text-sm font-bold">
                            ⚠️ Compliance Violation: Prohibited terms detected
                          </div>
                          <p className="text-slate-700 leading-relaxed">
                            {highlightProhibitedTerms(section.content)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-700 mb-4 leading-relaxed">
                          {section.content}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEvaluateSection(section.id)}
                      className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
                    >
                      Evaluate
                    </button>
                    <button
                      onClick={() => handleModifySection(section.id)}
                      className={`px-6 py-2 text-white rounded-lg transition-colors font-semibold ${
                        editingSectionId === section.id
                          ? 'bg-slate-700 hover:bg-slate-800'
                          : 'bg-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {editingSectionId === section.id ? 'Save' : 'Modify'}
                    </button>
                    {hasComplianceIssue && editingSectionId === section.id && section.id === 3 && (
                      <span className="flex items-center text-red-600 font-semibold">
                        ⚠️ Cannot Save
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="bg-white border-2 border-slate-300 rounded-xl p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Document Actions</h3>
                
                {globalStatus !== 'none' && (
                  <div className={`mb-4 p-4 rounded-lg text-center font-bold text-lg ${
                    globalStatus === 'ok' 
                      ? 'bg-green-100 text-green-800 border-2 border-green-600' 
                      : 'bg-red-100 text-red-800 border-2 border-red-600'
                  }`}>
                    {globalStatus === 'ok' ? '✓ OK' : '✗ NOK'}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <button
                      onClick={handleGlobalEvaluate}
                      className="flex-1 px-6 py-4 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-lg shadow-sm"
                    >
                      Global Evaluate
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitted || !canSubmit}
                      className={`flex-1 px-6 py-4 rounded-lg transition-colors font-bold text-lg shadow-sm ${
                        isSubmitted || !canSubmit
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-700 text-white hover:bg-slate-800'
                      }`}
                    >
                      Submit
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setShowAgentDashboard(true)}
                    className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold shadow-sm"
                  >
                    📊 Agent Dashboard
                  </button>
                  
                  <button
                    onClick={handleFullComplianceReview}
                    disabled={isOrchestrating || isSubmitted}
                    className={`w-full px-6 py-3 rounded-lg transition-colors font-semibold shadow-sm ${
                      isOrchestrating || isSubmitted
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isOrchestrating ? '🔄 Running Review...' : '🔍 Run Full Compliance Review'}
                  </button>
                </div>
                {!canSubmit && !isSubmitted && (
                  <p className="text-sm text-red-600 mt-2 text-center font-semibold">
                    ⚠️ All sections must pass evaluation before submission
                  </p>
                )}
                
                {/* Orchestration Result Panel */}
                {orchestrationResult && (
                  <div className="mt-6 bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span>🎯</span> Compliance Review Results
                    </h3>
                    
                    {/* Parent Trace ID */}
                    <div className="mb-4 text-xs text-slate-600 font-mono bg-white px-3 py-2 rounded border border-slate-200">
                      Trace: {orchestrationResult.parent_trace_id}
                    </div>
                    
                    {/* Decision */}
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      orchestrationResult.decision?.next_action === 'ready_to_send' || orchestrationResult.decision?.next_action === 'approved'
                        ? 'bg-green-50 border-green-400'
                        : orchestrationResult.decision?.next_action === 'rejected'
                        ? 'bg-red-50 border-red-400'
                        : 'bg-yellow-50 border-yellow-400'
                    }`}>
                      <div className="font-bold text-sm mb-1">
                        Decision: <span className="uppercase">{orchestrationResult.decision?.next_action}</span>
                      </div>
                      <div className="text-sm text-slate-700">{orchestrationResult.decision?.reason}</div>
                    </div>
                    
                    {/* Agent Timeline */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Agent Timeline ({orchestrationResult.execution?.steps?.length || 0} steps)</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {orchestrationResult.execution?.steps?.map((step: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded border border-slate-200">
                            <span className={`w-2 h-2 rounded-full ${
                              step.status === 'success' ? 'bg-green-500' : step.status === 'error' ? 'bg-red-500' : 'bg-slate-400'
                            }`}></span>
                            <span className="font-mono text-slate-600 flex-1">{step.agent_id}</span>
                            <span className="text-slate-500">{step.latency_ms}ms</span>
                            <span className="text-slate-400 font-mono text-[10px]">{step.trace_id?.substring(0, 12)}...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Artifacts Counts */}
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <div className="bg-white px-3 py-2 rounded border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-600">Facts</div>
                        <div className="text-lg font-bold text-slate-800">{orchestrationResult.artifacts?.facts?.facts?.length || 0}</div>
                      </div>
                      <div className="bg-white px-3 py-2 rounded border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-600">Policy Mappings</div>
                        <div className="text-lg font-bold text-slate-800">{orchestrationResult.artifacts?.policy_mappings?.mappings?.length || 0}</div>
                      </div>
                      <div className="bg-white px-3 py-2 rounded border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-600">Issues</div>
                        <div className="text-lg font-bold text-red-600">{orchestrationResult.artifacts?.review_issues?.issues?.length || 0}</div>
                      </div>
                      <div className="bg-white px-3 py-2 rounded border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-600">Evidence Requests</div>
                        <div className="text-lg font-bold text-slate-800">{orchestrationResult.artifacts?.evidence_requests?.requests?.length || 0}</div>
                      </div>
                    </div>
                    
                    {/* First 2 Issues */}
                    {orchestrationResult.artifacts?.review_issues?.issues && orchestrationResult.artifacts.review_issues.issues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Top Issues</h4>
                        <div className="space-y-2">
                          {orchestrationResult.artifacts.review_issues.issues.slice(0, 2).map((issue: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg border-l-4 text-xs ${
                              issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                              issue.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                              'bg-yellow-50 border-yellow-500'
                            }`}>
                              <div className="font-bold mb-1 uppercase text-[10px]">{issue.severity}</div>
                              <div className="text-slate-700 mb-1">{issue.description}</div>
                              {issue.suggested_fix && (
                                <div className="text-slate-600 italic">→ {issue.suggested_fix}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* First Evidence Request */}
                    {orchestrationResult.artifacts?.evidence_requests?.requests && orchestrationResult.artifacts.evidence_requests.requests.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Evidence Request</h4>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-slate-700">
                          {orchestrationResult.artifacts.evidence_requests.requests[0].request_text}
                        </div>
                      </div>
                    )}
                    
                    {/* Client Communication Preview */}
                    {orchestrationResult.artifacts?.client_communication && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Client Communication</h4>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                          <div className="font-bold mb-1">{orchestrationResult.artifacts.client_communication.subject}</div>
                          <div className="text-slate-600">
                            {orchestrationResult.artifacts.client_communication.body?.substring(0, 200)}
                            {orchestrationResult.artifacts.client_communication.body?.length > 200 && '...'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Audit Log */}
                    {orchestrationResult.artifacts?.audit_log && (
                      <div className="text-xs text-slate-600 bg-white px-3 py-2 rounded border border-slate-200">
                        <span className="font-semibold">Audit:</span> {orchestrationResult.artifacts.audit_log.audit_id} @ {new Date(orchestrationResult.artifacts.audit_log.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white border-2 border-slate-300 rounded-xl p-6 sticky top-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Chat & Agents</h3>
                
                <div className="bg-slate-50 rounded-lg p-4 mb-4 max-h-[500px] overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-3 p-3 rounded-lg ${
                        msg.role === 'agent'
                          ? msg.agent === 'Compliance Agent'
                            ? 'bg-red-100 border-2 border-red-400'
                            : 'bg-blue-100 border border-blue-300'
                          : 'bg-green-100 border border-green-300'
                      }`}
                    >
                      {msg.agent && (
                        <div className="flex items-center justify-between mb-1">
                          <div className={`font-bold text-sm ${
                            msg.agent === 'Compliance Agent' ? 'text-red-800' : 'text-slate-700'
                          }`}>
                            [{msg.agent}]
                          </div>
                          
                          {/* Voice Button - Only show for agent messages if speech is supported */}
                          {msg.role === 'agent' && isSupported && (
                            <button
                              onClick={() => {
                                if (speakingMessageIndex === idx && isSpeaking) {
                                  stop();
                                  setSpeakingMessageIndex(null);
                                } else {
                                  stop(); // Stop any current speech
                                  speak(msg.content, 'english'); // Document page uses English by default
                                  setSpeakingMessageIndex(idx);
                                }
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all ${
                                speakingMessageIndex === idx && isSpeaking
                                  ? 'bg-red-200 text-red-800 hover:bg-red-300'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                              aria-label={speakingMessageIndex === idx && isSpeaking ? 'Stop speaking' : 'Play audio'}
                            >
                              {speakingMessageIndex === idx && isSpeaking ? (
                                <>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                                  </svg>
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      <p className={`text-sm ${
                        msg.agent === 'Compliance Agent' ? 'text-red-800' : 'text-slate-700'
                      }`}>{msg.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isAIProcessing && !isListening && handleSendMessage()}
                      placeholder={isListening ? "Listening..." : "Type your message..."}
                      disabled={isAIProcessing || isListening}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100"
                    />
                    
                    {/* Talk Button */}
                    {isRecognitionSupported && (
                      <button
                        onClick={() => {
                          if (isListening) {
                            stopListening();
                          } else {
                            startListening();
                          }
                        }}
                        disabled={isAIProcessing}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          isListening
                            ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                            : isAIProcessing
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-600 text-white hover:bg-slate-700'
                        }`}
                        title={isListening ? 'Stop listening' : 'Start voice input'}
                      >
                        {isListening ? (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="4" width="4" height="16" rx="1"/>
                              <rect x="14" y="4" width="4" height="16" rx="1"/>
                            </svg>
                            <span>Stop</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                            </svg>
                            <span>Talk</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={isAIProcessing || isListening}
                    className={`w-full px-4 py-2 rounded-lg transition-colors font-semibold ${
                      isAIProcessing || isListening
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isAIProcessing ? 'AI Processing...' : 'Send'}
                  </button>
                  {isAIProcessing && (
                    <p className="text-xs text-blue-600 text-center">
                      🤖 Claude is optimizing your content...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Dashboard Modal */}
      <AgentDashboard 
        isOpen={showAgentDashboard}
        onClose={() => setShowAgentDashboard(false)}
      />
    </div>
  );
}

