import { useState, useCallback, useEffect } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports speech synthesis
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback((text: string, language: string = 'en-US') => {
    if (!isSupported) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    // Stop any ongoing speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }

    // Map our language codes to speech synthesis codes
    const languageMap: Record<string, string> = {
      'english': 'en-US',
      'chinese': 'zh-CN',
      'german': 'de-DE',
      'french': 'fr-FR',
      'japanese': 'ja-JP'
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageMap[language] || 'en-US';
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setCurrentUtterance(null);
    };

    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, isSupported]);

  const stop = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentUtterance(null);
    }
  }, [isSpeaking, isSupported]);

  const toggle = useCallback((text: string, language: string = 'en-US') => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, language);
    }
  }, [isSpeaking, speak, stop]);

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isSupported
  };
}

