'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

const TOPICS = [
  {
    id: 'investment_background',
    name: 'Investment Background',
    initialQuestion: "Let's start with your investment background. Please tell me about your experience with investing, time horizons, investment instruments you use, and your financial goals."
  },
  {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    initialQuestion: "Now, let's discuss your risk profile. Please share your risk tolerance, comfort level with market volatility, and how you think about potential drawdowns or losses."
  },
  {
    id: 'technical_strategy',
    name: 'Technical Strategy',
    initialQuestion: "Finally, let's cover your technical strategy. Please describe your investment approach, any technical indicators you follow, and how you make allocation and rebalancing decisions."
  }
];

export default function ChatEntryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messages, setMessages] = useState([
    {
      role: 'system',
      content: "Hi, I'm your AI Investment Assistant. I'll guide you through creating your investment profile. Let's start with your investment background. Please tell me about your experience with investing, time horizons, investment instruments you use, and your financial goals."
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [topicBuffers, setTopicBuffers] = useState<string[][]>([[], [], []]); // Three topics
  const [finalTopicTexts, setFinalTopicTexts] = useState<string[]>(['', '', '']);
  const [topicCompleted, setTopicCompleted] = useState<boolean[]>([false, false, false]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);

  const handleSendMessage = async () => {
    if (inputValue.trim() && !isProcessing) {
      const userMessage = { role: 'user', content: inputValue };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setIsProcessing(true);

      const currentTopic = TOPICS[currentTopicIndex];
      const currentBuffer = topicBuffers[currentTopicIndex];
      const existingContent = currentBuffer.join('\n\n');

      // Check if user is indicating they're done
      const lowerInput = inputValue.toLowerCase().trim();
      const isDoneIndicator = ['no', 'nope', 'that\'s all', 'that is all', 'nothing else', 'done', 'finished', 'complete', 'no thanks'].some(phrase => lowerInput === phrase || lowerInput.includes(phrase));

      if (waitingForConfirmation) {
        if (isDoneIndicator) {
          // User is done with this topic - synthesize
          try {
            const synthesisResponse = await fetch('/api/synthesize-topic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: currentTopic.id,
                contentFragments: currentBuffer
              })
            });

            if (!synthesisResponse.ok) {
              throw new Error('Failed to synthesize content');
            }

            const { synthesizedParagraph } = await synthesisResponse.json();

            // Store synthesized text
            const newFinalTexts = [...finalTopicTexts];
            newFinalTexts[currentTopicIndex] = synthesizedParagraph;
            setFinalTopicTexts(newFinalTexts);

            const newCompleted = [...topicCompleted];
            newCompleted[currentTopicIndex] = true;
            setTopicCompleted(newCompleted);

            // Show synthesis confirmation
            setMessages(prev => [...prev, {
              role: 'system',
              content: `✓ Thank you. I've captured your ${currentTopic.name.toLowerCase()}.\n\n${synthesizedParagraph}`
            }]);

            // Move to next topic or finish
            if (currentTopicIndex < TOPICS.length - 1) {
              const nextTopic = TOPICS[currentTopicIndex + 1];
              setCurrentTopicIndex(currentTopicIndex + 1);
              setWaitingForConfirmation(false);
              
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  role: 'system',
                  content: nextTopic.initialQuestion
                }]);
              }, 500);
            } else {
              // All topics complete
              setMessages(prev => [...prev, {
                role: 'system',
                content: '✓ Thank you for completing your investment profile. Click "Evaluate" to proceed to document evaluation.'
              }]);
            }
          } catch (error) {
            setMessages(prev => [...prev, {
              role: 'system',
              content: '⚠️ Error synthesizing content. Please try again.'
            }]);
          }
        } else {
          // User wants to add more - validate this additional input
          try {
            const validationResponse = await fetch('/api/validate-topic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: currentTopic.id,
                userMessage: inputValue,
                existingContent
              })
            });

            if (!validationResponse.ok) {
              throw new Error('Failed to validate input');
            }

            const result = await validationResponse.json();

            if (result.is_relevant && result.content_fragment) {
              // Add to buffer
              const newBuffers = [...topicBuffers];
              newBuffers[currentTopicIndex] = [...currentBuffer, result.content_fragment];
              setTopicBuffers(newBuffers);

              // Ask if they want to add more
              setMessages(prev => [...prev, {
                role: 'system',
                content: 'Noted. Is there anything else you\'d like to add for this section?'
              }]);
            } else {
              // Not relevant
              const questionText = result.follow_up_question || 'Could you provide more specific information related to this topic?';
              const examplesText = result.examples && result.examples.length > 0
                ? '\n\nFor example:\n' + result.examples.map((ex: string) => `• ${ex}`).join('\n')
                : '';
              
              setMessages(prev => [...prev, {
                role: 'system',
                content: questionText + examplesText
              }]);
            }
          } catch (error) {
            setMessages(prev => [...prev, {
              role: 'system',
              content: '⚠️ Error processing input. Please try again.'
            }]);
          }
        }
      } else {
        // First response or follow-up for current topic - validate relevance
        try {
          const validationResponse = await fetch('/api/validate-topic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: currentTopic.id,
              userMessage: inputValue,
              existingContent
            })
          });

          if (!validationResponse.ok) {
            throw new Error('Failed to validate input');
          }

          const result = await validationResponse.json();

          if (result.is_relevant && result.content_fragment) {
            // Add to buffer
            const newBuffers = [...topicBuffers];
            newBuffers[currentTopicIndex] = [...currentBuffer, result.content_fragment];
            setTopicBuffers(newBuffers);

            // Ask if they want to add more
            setWaitingForConfirmation(true);
            setMessages(prev => [...prev, {
              role: 'system',
              content: 'Thank you. Is there anything else you\'d like to add for this section?'
            }]);
          } else {
            // Not relevant - provide guided question
            const questionText = result.follow_up_question || 'Could you provide more information related to this topic?';
            const examplesText = result.examples && result.examples.length > 0
              ? '\n\nFor example:\n' + result.examples.map((ex: string) => `• ${ex}`).join('\n')
              : '';
            
            setMessages(prev => [...prev, {
              role: 'system',
              content: questionText + examplesText
            }]);
          }
        } catch (error) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: '⚠️ Error processing input. Please try again.'
          }]);
        }
      }

      setIsProcessing(false);
    }
  };

  const handleUpload = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    // Show upload confirmation message
    const uploadMessage = {
      role: 'system',
      content: `[System]:\nDocument "${file.name}" uploaded successfully.\nClick "Evaluate" to proceed.`
    };
    
    setMessages([...messages, uploadMessage]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEvaluate = async () => {
    const hasCompletedChat = topicCompleted.every(c => c);
    const hasUploadedFile = !!uploadedFile;

    // If user has BOTH chat content and uploaded file - automatically merge
    if (hasCompletedChat && hasUploadedFile) {
      await handleAutomaticMerge();
      return;
    }

    // Otherwise proceed with single source
    if (hasUploadedFile) {
      handleFileEvaluation();
    } else if (hasCompletedChat) {
      handleChatEvaluation();
    } else {
      setMessages([...messages, {
        role: 'system',
        content: 'Please upload a document or complete all three profile sections before proceeding to evaluation.'
      }]);
    }
  };

  const handleFileEvaluation = () => {
    if (!uploadedFile) return;
    
    const fileName = uploadedFile.name.toLowerCase();
    
    if (fileName === 'badformat.word' || fileName.includes('badformat')) {
      const explanationMessage = {
        role: 'system',
        content: '[Evaluate Agent]:\nThe uploaded document lacks reliable structural markers.\nRedirecting to manual section definition tool.'
      };
      setMessages(prev => [...prev, explanationMessage]);
      
      setTimeout(() => {
        router.push('/sectioning');
      }, 1500);
    } else {
      router.push('/document');
    }
  };

  const handleChatEvaluation = () => {
    sessionStorage.setItem('investmentBackground', finalTopicTexts[0]);
    sessionStorage.setItem('riskAssessment', finalTopicTexts[1]);
    sessionStorage.setItem('technicalStrategy', finalTopicTexts[2]);
    router.push('/document');
  };

  const handleAutomaticMerge = async () => {
    const fileName = uploadedFile?.name.toLowerCase() || '';
    const isBadFormat = fileName === 'badformat.word' || fileName.includes('badformat');

    setMessages(prev => [...prev, {
      role: 'system',
      content: '🤖 Combining your conversation with the uploaded document... This may take a moment.'
    }]);
    setIsProcessing(true);

    try {
      const mergeResponse = await fetch('/api/merge-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatContent: {
            investmentBackground: finalTopicTexts[0],
            riskAssessment: finalTopicTexts[1],
            technicalStrategy: finalTopicTexts[2]
          },
          documentName: uploadedFile?.name || 'uploaded document'
        })
      });

      if (!mergeResponse.ok) {
        throw new Error('Failed to merge content');
      }

      const result = await mergeResponse.json();

      // Store merged content in session storage
      sessionStorage.setItem('section1_title', result.section1_title || 'Investment Background');
      sessionStorage.setItem('section1_content', result.section1_content);
      sessionStorage.setItem('section2_title', result.section2_title || 'Risk Assessment');
      sessionStorage.setItem('section2_content', result.section2_content);
      sessionStorage.setItem('section3_title', result.section3_title || 'Technical Strategy');
      sessionStorage.setItem('section3_content', result.section3_content);

      setMessages(prev => [...prev, {
        role: 'system',
        content: '✓ Successfully combined your conversation with the document.'
      }]);

      setIsProcessing(false);

      // Route based on document format
      if (isBadFormat) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: '[Evaluate Agent]:\nThe uploaded document lacks reliable structural markers.\nRedirecting to manual section definition tool with your combined content.'
        }]);
        
        setTimeout(() => {
          router.push('/sectioning');
        }, 1500);
      } else {
        setTimeout(() => {
          // Store for document page
          sessionStorage.setItem('investmentBackground', result.section1_content);
          sessionStorage.setItem('riskAssessment', result.section2_content);
          sessionStorage.setItem('technicalStrategy', result.section3_content);
          router.push('/document');
        }, 1000);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⚠️ Error merging content. Proceeding with document only...'
      }]);
      setIsProcessing(false);
      // Fallback to document evaluation
      setTimeout(() => {
        handleFileEvaluation();
      }, 1000);
    }
  };

  const handleChoiceSelection = async (choice: 'chat' | 'document' | 'both') => {
    setShowChoiceDialog(false);
    
    if (choice === 'chat') {
      handleChatEvaluation();
    } else if (choice === 'document') {
      handleFileEvaluation();
    } else if (choice === 'both') {
      // Merge chat content with document using AI
      setMessages(prev => [...prev, {
        role: 'system',
        content: '🤖 Intelligently combining your conversation and document... This may take a moment.'
      }]);
      setIsProcessing(true);

      try {
        const mergeResponse = await fetch('/api/merge-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatContent: {
              investmentBackground: finalTopicTexts[0],
              riskAssessment: finalTopicTexts[1],
              technicalStrategy: finalTopicTexts[2]
            },
            documentName: uploadedFile?.name || 'uploaded document'
          })
        });

        if (!mergeResponse.ok) {
          throw new Error('Failed to merge content');
        }

        const result = await mergeResponse.json();

        // Create enriched sections for the sectioning page
        const enrichedSections = [
          {
            id: 1,
            title: result.section1_title || 'Investment Background',
            content: result.section1_content
          },
          {
            id: 2,
            title: result.section2_title || 'Risk Assessment',
            content: result.section2_content
          },
          {
            id: 3,
            title: result.section3_title || 'Technical Strategy',
            content: result.section3_content
          }
        ];

        // Store merged sections and go to document page
        sessionStorage.setItem('investmentBackground', result.section1_content);
        sessionStorage.setItem('riskAssessment', result.section2_content);
        sessionStorage.setItem('technicalStrategy', result.section3_content);

        setMessages(prev => [...prev, {
          role: 'system',
          content: '✓ Successfully combined your conversation insights with the document context. Proceeding to evaluation...'
        }]);

        setTimeout(() => {
          router.push('/document');
        }, 1000);
      } catch (error) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: '⚠️ Error merging content. Please try again or choose a single source.'
        }]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Choice Dialog Modal */}
      {showChoiceDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Multiple Input Sources Detected
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              You have both chat conversation content and an uploaded document. How would you like to proceed?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleChoiceSelection('chat')}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:border-slate-400 transition-all text-left"
              >
                <div className="font-medium text-slate-800 text-sm mb-1">
                  Use Chat Content Only
                </div>
                <div className="text-xs text-slate-500">
                  Proceed with your conversation responses
                </div>
              </button>

              <button
                onClick={() => handleChoiceSelection('document')}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:border-slate-400 transition-all text-left"
              >
                <div className="font-medium text-slate-800 text-sm mb-1">
                  Use Uploaded Document Only
                </div>
                <div className="text-xs text-slate-500">
                  Proceed with file: {uploadedFile?.name}
                </div>
              </button>

              <button
                onClick={() => handleChoiceSelection('both')}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded hover:bg-slate-800 transition-all text-left"
              >
                <div className="font-medium text-sm mb-1">
                  🤖 Merge Both Intelligently
                </div>
                <div className="text-xs text-slate-200">
                  AI will combine conversation insights with document context
                </div>
              </button>

              <button
                onClick={() => setShowChoiceDialog(false)}
                className="w-full px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl">
          {/* Main card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {/* Header */}
            <div className="border-b border-slate-200 p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-800">
                    AI Investment Assistant
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Document Evaluation System
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="p-6 sm:p-8">
              <div className="bg-slate-50 rounded border border-slate-200 p-5 mb-6 min-h-[350px] max-h-[450px] overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-3 ${msg.role === 'user' ? 'ml-12' : ''}`}
                  >
                    <div
                      className={`p-4 rounded ${
                        msg.role === 'system'
                          ? 'bg-white border border-slate-200'
                          : 'bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {msg.role === 'system' && (
                        <div className="flex items-center mb-2">
                          <span className="text-slate-600 font-medium text-xs uppercase tracking-wide">System</span>
                        </div>
                      )}
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed text-sm">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Uploaded File Display */}
              {uploadedFile && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{uploadedFile.name}</p>
                      <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Chat Input */}
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
                  placeholder={isProcessing ? "Processing..." : "Type your message..."}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white text-sm transition-all disabled:bg-slate-100 disabled:text-slate-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing}
                  className={`px-6 py-3 rounded font-medium text-sm transition-colors ${
                    isProcessing
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-700 text-white hover:bg-slate-800'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Send'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleUpload}
                  className="px-5 py-3.5 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 hover:border-slate-400 transition-all font-medium text-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload Document</span>
                  </div>
                </button>
                <button
                  onClick={handleEvaluate}
                  disabled={!uploadedFile && !topicCompleted.every(c => c)}
                  className={`px-5 py-3.5 rounded font-medium text-sm transition-all ${
                    uploadedFile || topicCompleted.every(c => c)
                      ? 'bg-slate-700 text-white hover:bg-slate-800'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>Evaluate</span>
                  </div>
                </button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,.pdf,.txt,.word"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {/* Tip */}
              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5 text-slate-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-1">Demo Note</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Upload a file named <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">badformat.word</span> to access the manual sectioning workflow
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-slate-400 text-xs">
              Multi-Agent AI System • Powered by Claude Sonnet 4.5
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

