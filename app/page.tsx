'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useSpeech } from './hooks/useSpeech';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

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
  const chatInputRef = useRef<HTMLInputElement>(null);
  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('english'); // Track user's language
  
  const { 
    isListening, 
    transcript, 
    isSupported: isRecognitionSupported, 
    startListening, 
    stopListening,
    resetTranscript 
  } = useSpeechRecognition(detectedLanguage);
  
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

  // Auto-focus input on component mount and cleanup speech on unmount
  useEffect(() => {
    chatInputRef.current?.focus();
    
    // Cleanup: stop any ongoing speech when component unmounts
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

  // Detect language from user input
  const detectLanguage = (text: string): string => {
    // Simple heuristic: check for Chinese characters
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    if (hasChinese) return 'chinese';
    
    // Check for Japanese
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
    if (hasJapanese) return 'japanese';
    
    // Check for Korean
    const hasKorean = /[\uac00-\ud7af]/.test(text);
    if (hasKorean) return 'korean';
    
    // Check for German common words and umlauts
    const germanPattern = /\b(ich|der|die|das|und|ist|nicht|mit|von|zu|auf|für|auch|werden|ein|eine|kann|wie|wenn|oder|aber|über|mehr|nach|aus|bei|sein|seine|wird|war)\b/i;
    const hasUmlaut = /[äöüÄÖÜß]/.test(text);
    if (germanPattern.test(text) || hasUmlaut) return 'german';
    
    // Check for French common words and accents
    const frenchPattern = /\b(je|tu|il|elle|nous|vous|ils|elles|le|la|les|un|une|de|et|est|sont|être|avoir|dans|pour|avec|que|qui|ce|cette|mon|ma|mes|son|sa|ses)\b/i;
    const hasFrenchAccent = /[àâäéèêëïîôùûüÿæœç]/i.test(text);
    if (frenchPattern.test(text) || hasFrenchAccent) return 'french';
    
    // Check for Spanish common words
    const spanishPattern = /\b(el|la|los|las|un|una|de|y|es|en|por|para|con|que|su|como|pero|más|también|muy|cuando|donde)\b/i;
    if (spanishPattern.test(text)) return 'spanish';
    
  // Default to English
  return 'english';
};

  // Multi-language message templates
  const getLocalizedMessages = (lang: string) => {
    const messages: Record<string, any> = {
      english: {
        initialGreeting: "Hi, I'm your AI Investment Assistant. I'll guide you through creating your investment profile. Let's start with your investment background. Please tell me about your experience with investing, time horizons, investment instruments you use, and your financial goals.",
        captured: (topicName: string) => `✓ Thank you. I've captured your ${topicName.toLowerCase()}.`,
        nextTopic: {
          investment_background: "Let's start with your investment background. Please tell me about your experience with investing, time horizons, investment instruments you use, and your financial goals.",
          risk_assessment: "Now, let's discuss your risk profile. Please share your risk tolerance, comfort level with market volatility, and how you think about potential drawdowns or losses.",
          technical_strategy: "Finally, let's cover your technical strategy. Please describe your investment approach, any technical indicators you follow, and how you make allocation and rebalancing decisions."
        },
        complete: '✓ Thank you for completing your investment profile. Click "Evaluate" to proceed to document evaluation.',
        anythingElse: 'Noted. Is there anything else you\'d like to add for this section?'
      },
      chinese: {
        initialGreeting: "您好，我是您的AI投资助手。我将指导您创建投资档案。让我们从您的投资背景开始。请告诉我您的投资经验、时间跨度、使用的投资工具以及您的财务目标。",
        captured: (topicName: string) => `✓ 谢谢。我已经记录了您的${topicName === 'Investment Background' ? '投资背景' : topicName === 'Risk Assessment' ? '风险评估' : '技术策略'}。`,
        nextTopic: {
          investment_background: "让我们从您的投资背景开始。请告诉我您的投资经验、时间跨度、使用的投资工具以及您的财务目标。",
          risk_assessment: "现在，让我们讨论您的风险状况。请分享您的风险承受能力、对市场波动的舒适度，以及您如何看待潜在的损失。",
          technical_strategy: "最后，让我们谈谈您的技术策略。请描述您的投资方法、您关注的技术指标，以及您如何进行资产配置和再平衡决策。"
        },
        complete: '✓ 感谢您完成投资档案。点击"Evaluate"进入文档评估。',
        anythingElse: '好的，我记下了。关于这个部分，您还有其他想补充的吗？'
      },
      japanese: {
        initialGreeting: "こんにちは、私はあなたのAI投資アシスタントです。投資プロファイルの作成をガイドします。投資背景から始めましょう。投資経験、時間軸、使用する投資商品、財務目標について教えてください。",
        captured: (topicName: string) => `✓ ありがとうございます。${topicName === 'Investment Background' ? '投資背景' : topicName === 'Risk Assessment' ? 'リスク評価' : 'テクニカル戦略'}を記録しました。`,
        nextTopic: {
          investment_background: "投資背景から始めましょう。投資経験、時間軸、使用する投資商品、財務目標について教えてください。",
          risk_assessment: "次に、リスクプロファイルについて話しましょう。リスク許容度、市場のボラティリティへの対応、損失に対する考え方を共有してください。",
          technical_strategy: "最後に、テクニカル戦略について説明してください。投資アプローチ、注目するテクニカル指標、資産配分とリバランスの決定方法を教えてください。"
        },
        complete: '✓ 投資プロファイルの完成ありがとうございます。"Evaluate"をクリックして文書評価に進んでください。',
        anythingElse: '承知しました。このセクションについて、他に追加したいことはありますか？'
      },
      german: {
        initialGreeting: "Hallo, ich bin Ihr KI-Investitionsassistent. Ich werde Sie durch die Erstellung Ihres Investitionsprofils führen. Beginnen wir mit Ihrem Investitionshintergrund. Bitte erzählen Sie mir von Ihrer Erfahrung mit Investitionen, Zeithorizonten, verwendeten Anlageinstrumenten und Ihren finanziellen Zielen.",
        captured: (topicName: string) => `✓ Vielen Dank. Ich habe Ihren ${topicName === 'Investment Background' ? 'Investitionshintergrund' : topicName === 'Risk Assessment' ? 'Risikobewertung' : 'technische Strategie'} erfasst.`,
        nextTopic: {
          investment_background: "Beginnen wir mit Ihrem Investitionshintergrund. Bitte erzählen Sie mir von Ihrer Erfahrung mit Investitionen, Zeithorizonten, verwendeten Anlageinstrumenten und Ihren finanziellen Zielen.",
          risk_assessment: "Lassen Sie uns nun Ihr Risikoprofil besprechen. Teilen Sie bitte Ihre Risikotoleranz, Ihr Komfortniveau mit Marktvolatilität und Ihre Einstellung zu potenziellen Verlusten mit.",
          technical_strategy: "Abschließend besprechen wir Ihre technische Strategie. Beschreiben Sie bitte Ihren Investitionsansatz, alle technischen Indikatoren, denen Sie folgen, und wie Sie Allokations- und Rebalancing-Entscheidungen treffen."
        },
        complete: '✓ Vielen Dank für das Ausfüllen Ihres Investitionsprofils. Klicken Sie auf "Evaluate", um zur Dokumentbewertung zu gelangen.',
        anythingElse: 'Verstanden. Möchten Sie zu diesem Abschnitt noch etwas hinzufügen?'
      },
      french: {
        initialGreeting: "Bonjour, je suis votre assistant d'investissement IA. Je vais vous guider dans la création de votre profil d'investissement. Commençons par votre contexte d'investissement. Parlez-moi de votre expérience en investissement, de vos horizons temporels, des instruments d'investissement que vous utilisez et de vos objectifs financiers.",
        captured: (topicName: string) => `✓ Merci. J'ai enregistré votre ${topicName === 'Investment Background' ? 'contexte d\'investissement' : topicName === 'Risk Assessment' ? 'évaluation des risques' : 'stratégie technique'}.`,
        nextTopic: {
          investment_background: "Commençons par votre contexte d'investissement. Parlez-moi de votre expérience en investissement, de vos horizons temporels, des instruments d'investissement que vous utilisez et de vos objectifs financiers.",
          risk_assessment: "Discutons maintenant de votre profil de risque. Partagez votre tolérance au risque, votre niveau de confort avec la volatilité du marché et votre perception des pertes potentielles.",
          technical_strategy: "Enfin, abordons votre stratégie technique. Décrivez votre approche d'investissement, les indicateurs techniques que vous suivez et comment vous prenez vos décisions d'allocation et de rééquilibrage."
        },
        complete: '✓ Merci d\'avoir complété votre profil d\'investissement. Cliquez sur "Evaluate" pour passer à l\'évaluation du document.',
        anythingElse: 'Noté. Souhaitez-vous ajouter quelque chose d\'autre pour cette section?'
      }
    };
    
    return messages[lang] || messages.english;
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() && !isProcessing) {
      const userMessage = { role: 'user', content: inputValue };
      
      // Detect language from user input
      const userLanguage = detectLanguage(inputValue);
      const previousLanguage = detectedLanguage;
      setDetectedLanguage(userLanguage);
      
      // Store language preference
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userLanguage', userLanguage);
      }
      
      // Check if this is the first user message and language is different from initial
      const isFirstUserMessage = messages.filter(m => m.role === 'user').length === 0;
      
      // If language changed on first message, replace initial greeting
      if (isFirstUserMessage && userLanguage !== 'english') {
        const localizedMsg = getLocalizedMessages(userLanguage);
        setMessages([
          {
            role: 'system',
            content: localizedMsg.initialGreeting
          },
          userMessage
        ]);
      } else {
        setMessages(prev => [...prev, userMessage]);
      }
      
      setInputValue('');
      setIsProcessing(true);

      const currentTopic = TOPICS[currentTopicIndex];
      const currentBuffer = topicBuffers[currentTopicIndex];
      const existingContent = currentBuffer.join('\n\n');

      // Check if user is indicating they're done
      const lowerInput = inputValue.toLowerCase().trim();
      const isDoneIndicator = ['no', 'nope', 'that\'s all', 'that is all', 'nothing else', 'done', 'finished', 'complete', 'no thanks', 
                                '不', '没有', '没了', '完了', '就这些', '好了', '结束', 
                                'いいえ', 'ない', '終わり', '完了',
                                '아니요', '없어요', '끝', '완료',
                                'nein', 'fertig', 'das ist alles', 'nichts mehr', 'abgeschlossen',
                                'non', 'fini', 'terminé', 'c\'est tout', 'rien de plus'].some(phrase => lowerInput === phrase || lowerInput.includes(phrase));

      if (waitingForConfirmation) {
        if (isDoneIndicator) {
          // User is done with this topic - synthesize
          try {
            const synthesisResponse = await fetch('/api/synthesize-topic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: currentTopic.id,
                contentFragments: currentBuffer,
                language: userLanguage // Pass detected language
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

            const localizedMsg = getLocalizedMessages(userLanguage);

            // Show synthesis confirmation
            setMessages(prev => [...prev, {
              role: 'system',
              content: `${localizedMsg.captured(currentTopic.name)}\n\n${synthesizedParagraph}`
            }]);

            // Move to next topic or finish
            if (currentTopicIndex < TOPICS.length - 1) {
              const nextTopic = TOPICS[currentTopicIndex + 1];
              setCurrentTopicIndex(currentTopicIndex + 1);
              setWaitingForConfirmation(false);
              
              setTimeout(() => {
                setMessages(prev => [...prev, {
                  role: 'system',
                  content: localizedMsg.nextTopic[nextTopic.id]
                }]);
              }, 500);
            } else {
              // All topics complete
              setMessages(prev => [...prev, {
                role: 'system',
                content: localizedMsg.complete
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
                existingContent,
                language: userLanguage // Pass detected language
              })
            });

            if (!validationResponse.ok) {
              throw new Error('Failed to validate input');
            }

            const result = await validationResponse.json();

            const localizedMsg = getLocalizedMessages(userLanguage);

            if (result.is_relevant && result.content_fragment) {
              // Add to buffer
              const newBuffers = [...topicBuffers];
              newBuffers[currentTopicIndex] = [...currentBuffer, result.content_fragment];
              setTopicBuffers(newBuffers);

              // Ask if they want to add more (in detected language)
              setMessages(prev => [...prev, {
                role: 'system',
                content: localizedMsg.anythingElse
              }]);
              
              setWaitingForConfirmation(true);
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

            const localizedMsg = getLocalizedMessages(userLanguage);

            // Ask if they want to add more
            setWaitingForConfirmation(true);
            setMessages(prev => [...prev, {
              role: 'system',
              content: localizedMsg.anythingElse
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
      
      // Auto-focus on input after system message
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Content */}
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl">
          {/* Main card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {/* Header */}
            <div className="border-b border-slate-200 p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-3">
                {/* Document Search Icon */}
                <div className="w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      {/* Gradient for document */}
                      <linearGradient id="docGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#E8705B"/>
                        <stop offset="100%" stopColor="#D32F2F"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Pixelated particles on the left */}
                    <g fill="#E8705B" opacity="0.8">
                      <rect x="8" y="35" width="4" height="4"/>
                      <rect x="8" y="42" width="4" height="4"/>
                      <rect x="15" y="28" width="5" height="5"/>
                      <rect x="15" y="38" width="5" height="5"/>
                      <rect x="15" y="48" width="5" height="5"/>
                      <rect x="23" y="32" width="6" height="6"/>
                      <rect x="23" y="44" width="6" height="6"/>
                      <rect x="23" y="56" width="6" height="6"/>
                      <rect x="32" y="38" width="7" height="7"/>
                      <rect x="32" y="52" width="7" height="7"/>
                    </g>
                    
                    {/* Main document body */}
                    <rect x="45" y="15" width="50" height="65" rx="3" fill="url(#docGradient)"/>
                    
                    {/* Document folded corner */}
                    <path d="M 95 15 L 95 30 L 80 30 Z" fill="#B71C1C"/>
                    <path d="M 95 15 L 95 30 L 80 30 Z" fill="#FFFFFF" opacity="0.2"/>
                    
                    {/* Document lines */}
                    <rect x="52" y="28" width="30" height="3" rx="1.5" fill="#FFFFFF"/>
                    <rect x="52" y="38" width="30" height="3" rx="1.5" fill="#FFFFFF"/>
                    <rect x="52" y="48" width="20" height="3" rx="1.5" fill="#FFFFFF"/>
                    
                    {/* Magnifying glass */}
                    <g>
                      {/* Glass rim - outer */}
                      <circle cx="75" cy="70" r="18" fill="none" stroke="#FFFFFF" strokeWidth="5"/>
                      {/* Glass rim - inner */}
                      <circle cx="75" cy="70" r="15" fill="none" stroke="#E8705B" strokeWidth="3"/>
                      {/* Glass interior highlight */}
                      <circle cx="75" cy="70" r="12" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.5"/>
                      
                      {/* Handle */}
                      <path d="M 87 82 L 100 95" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round"/>
                      <path d="M 87 82 L 100 95" stroke="#E8705B" strokeWidth="4" strokeLinecap="round"/>
                    </g>
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
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-600 font-medium text-xs uppercase tracking-wide">System</span>
                          
                          {/* Voice Button - Only show for system messages if speech is supported */}
                          {isSupported && (
                            <button
                              onClick={() => {
                                if (speakingMessageIndex === idx && isSpeaking) {
                                  stop();
                                  setSpeakingMessageIndex(null);
                                } else {
                                  stop(); // Stop any current speech
                                  speak(msg.content, detectedLanguage);
                                  setSpeakingMessageIndex(idx);
                                }
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                speakingMessageIndex === idx && isSpeaking
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              aria-label={speakingMessageIndex === idx && isSpeaking ? 'Stop speaking' : 'Play audio'}
                            >
                              {speakingMessageIndex === idx && isSpeaking ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                                  </svg>
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          )}
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
                  ref={chatInputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isProcessing && !isListening && handleSendMessage()}
                  placeholder={isListening ? "Listening..." : isProcessing ? "Processing..." : "Type your message..."}
                  disabled={isProcessing || isListening}
                  spellCheck={true}
                  autoComplete="off"
                  autoCorrect="on"
                  className="flex-1 px-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white text-sm transition-all disabled:bg-slate-100 disabled:text-slate-400"
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
                    disabled={isProcessing}
                    className={`px-4 py-3 rounded font-medium text-sm transition-all ${
                      isListening
                        ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                        : isProcessing
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-600 text-white hover:bg-slate-700'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1"/>
                          <rect x="14" y="4" width="4" height="16" rx="1"/>
                        </svg>
                        <span>Stop</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                        <span>Talk</span>
                      </div>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing || isListening}
                  className={`px-6 py-3 rounded font-medium text-sm transition-colors ${
                    isProcessing || isListening
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

