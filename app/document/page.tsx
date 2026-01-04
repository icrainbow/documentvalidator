'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReviewConfigDrawer from '../components/ReviewConfigDrawer';
import Flow2ReviewConfigDrawer from '../components/flow2/Flow2ReviewConfigDrawer';
import Flow2UploadPanel from '../components/flow2/Flow2UploadPanel';
import Flow2PastePanel from '../components/flow2/Flow2PastePanel';
import Flow2DocumentsList from '../components/flow2/Flow2DocumentsList';
import Flow2RightPanel from '../components/flow2/Flow2RightPanel';
import Flow2DerivedTopics from '../components/flow2/Flow2DerivedTopics';
import Flow2TopicMoreInputs from '../components/flow2/Flow2TopicMoreInputs';
import Flow2ModeSwitchModal from '../components/flow2/Flow2ModeSwitchModal';
import TopicSummariesPanel from '../components/shared/TopicSummariesPanel';
import Flow2RiskDetailsPanel, { type RiskLevel } from '../components/flow2/Flow2RiskDetailsPanel';
import type { GenericTopicSummary } from '@/app/lib/topicSummaries/types';
import { KYC_FLOW2_CONFIG, IT_BULLETIN_CONFIG, CASE2_CS_INTEGRATION_CONFIG } from '@/app/lib/topicSummaries/configs';
import { KYC_TOPIC_IDS } from '@/app/lib/flow2/kycTopicsSchema';
import { mapIssuesToRiskInputs } from '@/app/lib/flow2/issueAdapter';
import { buildFlow2DemoEvidencePseudoDocs, hasFlow2DemoEvidence } from '@/app/lib/flow2/demoEvidencePseudoDocs';
import type { FlowStatus, CheckpointMetadata, RiskData } from '../components/flow2/Flow2MonitorPanel';
import { useSpeech } from '../hooks/useSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { computeParticipants } from '../lib/computeParticipants';
import { normalizeAgentId, getAgentMetadata } from '../lib/agentRegistry';
import { 
  createEmptyQueue, 
  addToDirtyQueue, 
  clearDirtyQueue
} from '../lib/dirtyQueue';
import type { DirtyQueue } from '../lib/types/scopePlanning';
import { DEMO_SCENARIOS, getDemoScenario, type Flow2Document } from '../lib/graphKyc/demoData';
import { HumanGateState } from '../lib/flow2/types';
import { 
  loadReviewSession, 
  saveReviewSession, 
  type ReviewSession 
} from '../lib/reviewSessions';
import type { Issue as APIIssue, ReviewResult, ReviewRequest } from '../lib/types/review';
import { 
  toAPISection, 
  computeSectionStatus, 
  computeWarningsFingerprint, 
  computeDocumentStatus as computeRealDocumentStatus,
  createSignOff,
  saveSignOff,
  loadSignOff,
  type UISection
} from '../lib/reviewBridge';
import { 
  getDefaultReviewConfig, 
  saveReviewConfig, 
  loadReviewConfig,
  type ReviewConfig 
} from '../lib/reviewConfig';
import { buildDerivedTopicsFallback, type DerivedTopic, type TopicKey } from '../lib/flow2/derivedTopicsTypes';
import { mapIssueToTopic } from '../lib/flow2/issueTopicMapping';
import Case2ProcessBanner, { type Case2State } from '../components/case2/Case2ProcessBanner';
import Case2RecommendedStagesPanel from '../components/case2/Case2RecommendedStagesPanel';
import { CASE2_DEMO_DATA, type Case2DemoData } from '../lib/case2/demoCase2Data';
import { detectCase2Trigger } from '../lib/case2/case2Trigger';
import Case4Container from '../components/case4/Case4ContainerV2';
import Case3GuardrailBanner from '../components/case3/Case3GuardrailBanner';
import { detectGuardrailIssue } from '../lib/case3/detectGuardrailIssue';
import type { GuardrailIssue } from '../lib/case3/types';
// Impact Simulator imports
import { simulatorReducer, getInitialSimulatorState } from '../lib/impactSimulator/impactSimulatorReducer';
import { parseImpactChat } from '../lib/impactSimulator/impactChat';
import ImpactSimulatorPanel from '../components/impactSimulator/ImpactSimulatorPanel';
import { useImpactSimulatorTimeline } from '../hooks/useImpactSimulatorTimeline';
import { useReducer } from 'react';
// Flow2: Input mode type (Phase 1.1)
type Flow2InputMode = 'empty' | 'demo' | 'upload';

// Flow2: Helper to get mode display label (Phase 1.1)
function getInputModeLabel(mode: Flow2InputMode): string {
  switch (mode) {
    case 'demo':
      return 'Demo Mode';
    case 'upload':
      return 'Upload Mode';
    case 'empty':
      return '';
  }
}

type SectionStatus = 'unreviewed' | 'pass' | 'fail' | 'warning';

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

// Phase 2-A: Issue Action Types
interface AddSectionPayload {
  sectionTitle: string;
  sectionContent: string;
  insertPosition?: 'end' | 'after-current';
}

interface DraftFixPayload {
  chatMessage: string;
  targetSectionId?: number;
}

interface RequestInfoPayload {
  chatMessage: string;
  infoType: 'evidence' | 'clarification' | 'documentation';
}

type ActionPayload = AddSectionPayload | DraftFixPayload | RequestInfoPayload;

interface IssueAction {
  id: string;
  type: 'ADD_SECTION' | 'DRAFT_FIX' | 'REQUEST_INFO';
  label: string;
  description?: string;
  payload: ActionPayload;
}

// Phase 2-B: Proposed Fix Templates (hard-coded, demo-safe)
const PROPOSED_FIX_TEMPLATES: Record<string, string> = {
  policy_violation: `Alpha Capital intends to invest USD 100,000 into a diversified portfolio managed by Beta Growth Partners.

The portfolio may include exposure to the following sectors, subject to applicable regulatory restrictions and internal compliance requirements:
- Consumer goods
- Emerging markets infrastructure
- Energy and commodities
- Other permitted sectors as agreed in writing

Beta Growth Partners will exercise discretion in selecting instruments intended to meet the Client's investment objectives, which may include equities and permitted derivatives or structured products, provided that all instruments are compliant with applicable regulations and internal policies.

The Client acknowledges that certain sectors and instruments may carry heightened regulatory or reputational considerations. Any exposure to restricted sectors is expressly excluded, and portfolio construction will be aligned with the Client's stated risk tolerance and suitability parameters.`,
  missing_disclaimer: "IMPORTANT DISCLOSURE: Past performance is not indicative of future results. The value of investments may fluctuate, and investors may not recover the full amount invested. This document does not constitute financial advice. All investment decisions should be made in consultation with a qualified financial advisor.",
  missing_evidence: "Supporting documentation: [Client financial statements dated XX/XX/XXXX], [Transaction history from authorized custodian], [Third-party valuation report by certified appraiser]. All evidence has been verified and is available for compliance review.",
  unclear_wording: "This section has been clarified to state: The client's investment objectives are capital preservation with moderate growth potential over a 5-10 year horizon. Risk tolerance is assessed as moderate, with acceptance of short-term volatility in exchange for long-term returns.",
  missing_signature: "CLIENT ACKNOWLEDGMENT: By signing below, I confirm that I have read and understood the contents of this document and agree to the terms outlined herein.\n\nClient Name: ___________________\nSignature: ___________________\nDate: ___________________",
  generic_fallback: "This section should be reviewed and revised to address the identified issue. Please ensure compliance with internal policy guidelines and regulatory requirements."
};

/**
 * Utility: Highlight problematic keywords in text (case-insensitive)
 * Returns JSX with red-highlighted spans for matched keywords
 */
const COMPLIANCE_KEYWORDS = ['tobacco', 'tobacco-related'];

const highlightComplianceKeywords = (text: string): JSX.Element => {
  // Build regex pattern for all keywords (case-insensitive)
  const pattern = new RegExp(`(${COMPLIANCE_KEYWORDS.join('|')})`, 'gi');
  const parts = text.split(pattern);
  
  return (
    <>
      {parts.map((part, idx) => {
        const isKeyword = COMPLIANCE_KEYWORDS.some(kw => 
          part.toLowerCase() === kw.toLowerCase()
        );
        
        if (isKeyword) {
          return (
            <span 
              key={idx} 
              className="text-red-700 bg-red-50 px-1 rounded font-semibold"
            >
              {part}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
};

/**
 * Check if text contains compliance keywords
 */
const hasComplianceKeywords = (text: string): boolean => {
  return COMPLIANCE_KEYWORDS.some(kw => 
    text.toLowerCase().includes(kw.toLowerCase())
  );
};

// Predefined fake demo content (used for manual segmentation and badformat.word)
const FAKE_SECTIONS = [
  {
    id: 1,
    title: 'Investment Background',
    content: 'I am a mid-career professional with a stable income and a growing interest in long-term investing. Over the past several years, I have gradually built exposure to financial markets through mutual funds and employer-sponsored retirement plans. My investment knowledge is largely self-taught, relying on online resources, market news, and informal discussions with peers. I do not follow a strict investment philosophy, but I value diversification and consistency. My primary motivation is to preserve and grow capital over time rather than pursue speculative opportunities or short-term trading gains.',
    status: 'unreviewed' as SectionStatus,
    log: []
  },
  {
    id: 2,
    title: 'Risk Assessment',
    content: 'I consider myself to have a moderate tolerance for risk, balancing growth potential with capital preservation. While I understand that market volatility is inevitable, I prefer to avoid extreme drawdowns that could significantly impact long-term plans. I am willing to accept moderate fluctuations if they align with a disciplined strategy. My biggest concern relates to market movements are a concern, especially during periods of rapid decline. Therefore, risk management, transparency, and clear downside expectations are important factors in investment decisions.',
    status: 'unreviewed' as SectionStatus,
    log: []
  },
  {
    id: 3,
    title: 'Technical Strategy',
    content: 'From a technical perspective, my approach is relatively simple and pragmatic. I do not engage heavily in advanced technical analysis, but I follow basic indicators such as trends, asset allocation signals, and rebalancing thresholds. Automation and rule-based processes are preferred to reduce emotional decisions. I value strategies that can be monitored and adjusted periodically rather than actively traded. Clear reporting, performance metrics, and strategy rationale are essential for maintaining confidence in the approach over time.',
    status: 'unreviewed' as SectionStatus,
    log: []
  }
];

// Force dynamic rendering because we use useSearchParams
export const dynamic = 'force-dynamic';

// Helper: Compute overall risk level from issues and gaps
function computeRiskLevel(issues: any[], gaps: any[]): RiskLevel {
  const hasHighRisk = issues.some((i: any) => 
    (i.severity === 'high' || i.severity === 'critical') && i.category === 'kyc_risk'
  );
  const hasMediumRisk = issues.some((i: any) => 
    i.severity === 'medium' && i.category === 'kyc_risk'
  );
  const hasMissingTopics = gaps.some((g: any) => g.status === 'missing');
  const hasPartialTopics = gaps.some((g: any) => g.status === 'partial');
  
  if (hasHighRisk) return 'high';
  if (hasMediumRisk || hasMissingTopics) return 'medium';
  if (hasPartialTopics) return 'medium';
  return 'low';
}

// Internal component that uses useSearchParams
function DocumentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract docKey SYNCHRONOUSLY from URL - critical for Priority 1 loading
  const docKey = searchParams.get("docKey");
  console.log("[document] URL docKey from searchParams:", docKey);
  
  // Flow routing: "1" (default) = batch review, "2" = LangGraph KYC
  const flowMode = searchParams.get("flow") || "1";
  const isFlow2 = flowMode === "2";
  
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
      agent: 'System',
      content: isFlow2 
        ? '👋 Welcome to Agentic Review Process!\n\n' +
          'Please choose your chat mode using the buttons below:'
        : 'Document loaded. Sections are ready for review. Click "Run Full Review" to analyze a section with the orchestrator.'
    }
  ]);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  // PRIORITY 1: Load from new unified storage format if docKey exists
  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;
    
    console.log("[document] Priority 1 useEffect triggered, docKey:", docKey, "loadedFromStorage:", loadedFromStorage, "isFlow2:", isFlow2);
    
    // CRITICAL: Skip for Flow2 mode - Flow2 uses checkpoint restoration, not sessionStorage sections
    if (isFlow2) {
      console.log("[document] Skipping Priority 1 - Flow2 mode uses checkpoint restoration");
      return;
    }
    
    // Skip if already loaded to prevent resetting section statuses
    if (loadedFromStorage) {
      console.log("[document] Already loaded from storage, skipping to prevent status reset");
      return;
    }
    
    if (!docKey) {
      console.log("[document] No docKey found, skipping unified storage load");
      return;
    }

    const storageKey = `draft_sections::${docKey}`;
    console.log("[document] Looking for storage key:", storageKey);
    
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      console.log("[document] No data found in storage for key:", storageKey);
      console.log("[document] All sessionStorage keys:", Object.keys(sessionStorage));
      return;
    }

    console.log("[document] Found raw data, length:", raw.length);
    
    try {
      const parsed = JSON.parse(raw);
      console.log("[document] Parsed data:", parsed);
      
      if (Array.isArray(parsed?.sections) && parsed.sections.length > 0) {
        console.log("[document] Sections array found, length:", parsed.sections.length);
        
        // Map to full Section objects with required fields
        const loadedSections: Section[] = parsed.sections.map((s: any, idx: number) => ({
          id: s.id || idx + 1,
          title: s.title || `Section ${idx + 1}`,
          content: s.content || '',
          status: 'unreviewed' as SectionStatus,
          log: []
        }));
        
        console.log("[document] Mapped sections:", loadedSections.map(s => ({ id: s.id, title: s.title })));
        
        setSections(loadedSections);
        setLoadedFromStorage(true);
        
        setMessages([
          {
            role: 'agent',
            agent: 'System',
            content: `${loadedSections.length} section(s) loaded from sectioning. Ready for review.`
          }
        ]);
        
        console.log("[document] ✓ Successfully loaded sections", docKey, parsed.sections.length);
      } else {
        console.log("[document] ✗ sections not found or empty in parsed data");
      }
    } catch (error) {
      console.error("[document] ✗ failed to parse storage", error);
      // Fall through to legacy loading logic
    }
  }, [docKey, isFlow2]);

  // PRIORITY 2: Legacy loading logic (only if NOT loaded from new storage)
  useEffect(() => {
    console.log("[document] Priority 2 useEffect triggered, docKey:", docKey, "loadedFromStorage:", loadedFromStorage, "isFlow2:", isFlow2);
    
    // CRITICAL: Skip for Flow2 mode - Flow2 uses checkpoint restoration, not sessionStorage sections
    if (isFlow2) {
      console.log("[document] Skipping Priority 2 - Flow2 mode uses checkpoint restoration");
      return;
    }
    
    // If docKey exists, Priority 1 handles loading - do not run Priority 2
    if (docKey) {
      console.log("[document] Skipping Priority 2 - docKey exists, Priority 1 will handle loading");
      return;
    }
    
    if (loadedFromStorage) {
      console.log("[document] Skipping Priority 2 - already loaded from unified storage");
      return; // Guard: do not override if already loaded from unified storage
    }
    
    console.log("[document] Running legacy loading logic...");
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
          status: 'unreviewed' as SectionStatus,
          log: []
        });
      }
      
      if (section2Content) {
        loadedSections.push({
          id: 2,
          title: section2Title || 'Section 2',
          content: section2Content,
          status: 'unreviewed' as SectionStatus,
          log: []
        });
      }
      
      if (section3Content) {
        loadedSections.push({
          id: 3,
          title: section3Title || 'Section 3',
          content: section3Content,
          status: 'unreviewed' as SectionStatus,
          log: []
        });
      }
      
      if (loadedSections.length > 0) {
        setSections(loadedSections);
        
        // Update initial message
        setMessages([
          {
            role: 'agent',
            agent: 'System',
            content: `${loadedSections.length} section(s) loaded. Ready for review.`
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
          return {
            id: section.id,
            title: section.title, // Use custom title from segmentation page
            content: section.content,
            status: 'unreviewed' as SectionStatus,
            log: []
          };
        });
        
        setSections(customSections);
        
        // Update initial message to reflect custom sections
        setMessages([
          {
            role: 'agent',
            agent: 'System',
            content: `${customSections.length} section(s) loaded from manual segmentation. Ready for review.`
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
          status: 'unreviewed',
          log: []
        },
        {
          id: 2,
          title: 'Risk Assessment',
          content: riskAssessment,
          status: 'unreviewed',
          log: []
        },
        {
          id: 3,
          title: 'Technical Strategy',
          content: technicalStrategy,
          status: 'unreviewed',
          log: []
        }
      ];
      
      setSections(userSections);
      
      // Clear session storage
      sessionStorage.removeItem('investmentBackground');
      sessionStorage.removeItem('riskAssessment');
      sessionStorage.removeItem('technicalStrategy');
    } else if (!docKey && sections.length === 0) {
      // Final fallback: use FAKE_SECTIONS only if no other data source
      console.log("[document] No data from any source, using FAKE_SECTIONS fallback");
      setSections(FAKE_SECTIONS);
      setMessages([
        {
          role: 'agent',
          agent: 'System',
          content: 'Document loaded. Sections are ready for review. Click "Run Full Review" to analyze a section with the orchestrator.'
        }
      ]);
    }
  }, [docKey, loadedFromStorage]);

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
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Case 1: Approval Evidence Attestation
  // User must confirm they have reviewed approval evidence before submitting
  const [case1Attested, setCase1Attested] = useState(false);
  
  const [selectedFlowId, setSelectedFlowId] = useState<string>('compliance-review-v1');
  const [orchestrationResult, setOrchestrationResult] = useState<any | null>(null);
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [hasComplianceIssue, setHasComplianceIssue] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [chatHeight, setChatHeight] = useState(400); // NEW: Adjustable chat height in pixels
  const [executedActionIds, setExecutedActionIds] = useState<Set<string>>(new Set());
  const [hasNewChatMessage, setHasNewChatMessage] = useState(false);
  
  // Phase 2-B: Copy and Re-review states
  const [copiedIssueKey, setCopiedIssueKey] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [reviewingSectionId, setReviewingSectionId] = useState<number | null>(null);
  const [highlightedSectionId, setHighlightedSectionId] = useState<number | null>(null);
  
  // Phase 2-C: Apply/Undo state per section
  // Map: sectionId -> { previousContent: string, appliedText: string }
  const [appliedFixes, setAppliedFixes] = useState<Record<number, { previousContent: string; appliedText: string }>>({});
  
  // Phase 2-D: Expansion state for section bundles (WARNING sections collapsed by default)
  const [expandedBundles, setExpandedBundles] = useState<Set<number>>(new Set());
  
  // Track which section warnings have been signed off
  const [signedOffWarnings, setSignedOffWarnings] = useState<Set<number>>(new Set());
  
  // AUDIT: Expansion state for Accepted Warnings section (collapsed by default)
  const [showAcceptedWarnings, setShowAcceptedWarnings] = useState(false);
  
  // Agents Drawer state
  const [showAgentsDrawer, setShowAgentsDrawer] = useState(false);
  
  // Review state synchronization - REAL API issues only
  const [reviewRunId, setReviewRunId] = useState(0); // Increment on each review run
  const [currentIssues, setCurrentIssues] = useState<APIIssue[]>([]); // Issues from REAL API
  const [lastReviewResult, setLastReviewResult] = useState<ReviewResult | null>(null);
  
  // Sign-off state - for WARNING acceptance
  const [signOff, setSignOff] = useState<{ signerName: string; signedAt: string; warningsFingerprint: string; runId: string } | null>(null);
  
  // Review configuration state - for governed agent selection
  const [reviewConfig, setReviewConfig] = useState<ReviewConfig>(getDefaultReviewConfig());

  // Batch review trace state - for scope planning visualization (Stage 4)
  const [batchReviewTrace, setBatchReviewTrace] = useState<{
    scopePlan: any | null; // ScopePlanApi
    globalCheckResults: any[] | null; // GlobalCheckResult[]
    timing: {
      scopePlanningMs: number;
      reviewMs: number;
      globalChecksMs: number;
      totalMs: number;
      llmAttempted: boolean;
      llmSucceeded: boolean;
    } | null;
    fallbacks?: string[];
    degraded?: boolean;
    dirtyQueueSnapshot: any | null; // DirtyQueue snapshot at time of review
  } | null>(null);

  // Phase 5: Dirty queue state - tracks user edits for batch review (Flow1 only)
  const [dirtyQueue, setDirtyQueue] = useState<DirtyQueue>(createEmptyQueue());
  const [sectionContentBeforeEdit, setSectionContentBeforeEdit] = useState<Record<number, string>>({});

  // Flow2: ISOLATED state (NEVER touches Flow1 sections/dirtyQueue)
  const [flow2Documents, setFlow2Documents] = useState<Flow2Document[]>([]);
  const [flow2ActiveScenario, setFlow2ActiveScenario] = useState<string>('');
  const [graphReviewTrace, setGraphReviewTrace] = useState<any | null>(null);
  const [graphTopics, setGraphTopics] = useState<any[]>([]);
  const [extractedTopics, setExtractedTopics] = useState<any[]>([]); // DEPRECATED in Flow2: Use flow2TopicSummaries
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [coverageGaps, setCoverageGaps] = useState<any[]>([]);
  
  // ✅ STEP 4: Flow2-only KYC Topics Summary state (LLM-generated, SSOT)
  const [flow2TopicSummaries, setFlow2TopicSummaries] = useState<any[]>([]); // TopicSummary[] from API
  const [topicSummariesRunId, setTopicSummariesRunId] = useState<string | null>(null);
  const [isLoadingTopicSummaries, setIsLoadingTopicSummaries] = useState(false);
  
  // ✅ IT Bulletin Topics Summary state (generic engine, IT config)
  const [itBulletinTopicSummaries, setItBulletinTopicSummaries] = useState<any[]>([]);
  const [itTopicSummariesRunId, setItTopicSummariesRunId] = useState<string | null>(null);
  const [isLoadingItTopicSummaries, setIsLoadingItTopicSummaries] = useState(false);
  const [derivedTopics, setDerivedTopics] = useState<DerivedTopic[]>([]);
  const [highlightedTopicKey, setHighlightedTopicKey] = useState<string | null>(null);
  const [moreInputsModal, setMoreInputsModal] = useState<{ isOpen: boolean; topicKey: TopicKey | null; topic: DerivedTopic | null }>({
    isOpen: false,
    topicKey: null,
    topic: null
  });
  
  // Phase 1.1: Flow2 input mode state
  const [flow2InputMode, setFlow2InputMode] = useState<Flow2InputMode>('empty');
  
  // Phase 1.2: Mode switch modal state
  const [modeSwitchModal, setModeSwitchModal] = useState<{
    isOpen: boolean;
    targetMode: 'demo' | 'upload' | null;
    onConfirmAction: (() => void) | null;
  }>({
    isOpen: false,
    targetMode: null,
    onConfirmAction: null
  });
  const [humanGateData, setHumanGateData] = useState<any | null>(null);
  
  // MILESTONE C: New state for workspace + degraded mode
  const [humanGateState, setHumanGateState] = useState<HumanGateState | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);
  const [degradedReason, setDegradedReason] = useState('');
  
  // Flow Monitor state (SSOT for runtime status)
  const [flowMonitorStatus, setFlowMonitorStatus] = useState<FlowStatus>('idle');
  const [flowMonitorRunId, setFlowMonitorRunId] = useState<string | null>(null);
  const [flowMonitorMetadata, setFlowMonitorMetadata] = useState<CheckpointMetadata | null>(null);
  
  // Phase 8: Post-reject analysis state
  const [postRejectAnalysisData, setPostRejectAnalysisData] = useState<any | null>(null);
  
  // Phase 8: Auto-scroll guard
  const didScrollToPhase8Ref = useRef<string | null>(null);
  
  // Case 2: CS Integration Exception state
  const [case2State, setCase2State] = useState<Case2State>('idle');
  const [case2Data, setCase2Data] = useState<Case2DemoData | null>(null);
  const [case2Id, setCase2Id] = useState<string | null>(null);
  const [case2Query, setCase2Query] = useState<string>(''); // Store original query
  
  // Case 2: Unified upload + routing state (Phase 4)
  const [case2ProcessAccepted, setCase2ProcessAccepted] = useState<boolean>(false); // SINGLE source of truth for routing
  const [case2BannerCollapsed, setCase2BannerCollapsed] = useState<boolean>(false); // Parent-owned collapse state
  const [case2TopicSummaries, setCase2TopicSummaries] = useState<any[]>([]);
  const [isLoadingCase2TopicSummaries, setIsLoadingCase2TopicSummaries] = useState<boolean>(false);
  const [case2RecommendedStageStatuses, setCase2RecommendedStageStatuses] = useState<('pending' | 'completed')[]>([
    'pending',
    'pending',
    'pending',
    'pending',
  ]);
  
  // STRATEGIC: Derive Case2 active state (single gating condition)
  // True ONLY when: Flow2 mode + Case2 triggered + Case2 process accepted
  const isCase2Active = isFlow2 && case2State !== 'idle' && case2ProcessAccepted;
  
  // STRATEGIC: Compute Case2 stages for Flow Monitor (derived, not stored)
  const getCase2FlowMonitorStages = () => {
    if (!isCase2Active || !case2Data) return null;
    
    // Map Case2 path_steps to Flow Monitor stage format
    return case2Data.path_steps.map((step, idx) => ({
      id: idx + 1,
      label: step.label,
      icon: ['📋', '✓', '👥', '✅'][idx] || '📋', // Simple icons for 4 stages
    }));
  };
  
  // STRATEGIC: Compute current stage index for Case2
  const getCase2CurrentStageIndex = () => {
    if (!isCase2Active) return undefined; // Must return undefined for normal Flow2!
    
    // If all stages completed, return last stage index
    const allCompleted = case2RecommendedStageStatuses.every(s => s === 'completed');
    if (allCompleted) {
      return case2RecommendedStageStatuses.length;
    }
    
    // Find first non-completed stage (0-indexed becomes 1-indexed for display)
    const firstPendingIdx = case2RecommendedStageStatuses.findIndex(s => s === 'pending');
    return firstPendingIdx === -1 ? case2RecommendedStageStatuses.length : firstPendingIdx;
  };
  
  // UNIFIED: Compute data extraction loading state and context
  const getDataExtractionState = (): { isExtracting: boolean; context: 'case2' | 'kyc' | 'it' } => {
    // DEBUG: Log all loading states
    console.log('[DataExtraction] isLoadingCase2TopicSummaries:', isLoadingCase2TopicSummaries);
    console.log('[DataExtraction] isLoadingItTopicSummaries:', isLoadingItTopicSummaries);
    console.log('[DataExtraction] isLoadingTopicSummaries:', isLoadingTopicSummaries);
    
    // Priority 1: Case2 loading
    if (isLoadingCase2TopicSummaries) {
      console.log('[DataExtraction] → Returning: case2');
      return { isExtracting: true, context: 'case2' };
    }
    // Priority 2: IT Review loading
    if (isLoadingItTopicSummaries) {
      console.log('[DataExtraction] → Returning: it');
      return { isExtracting: true, context: 'it' };
    }
    // Priority 3: Standard KYC loading
    if (isLoadingTopicSummaries) {
      console.log('[DataExtraction] → Returning: kyc');
      return { isExtracting: true, context: 'kyc' };
    }
    // Default: not extracting
    console.log('[DataExtraction] → Returning: not extracting');
    return { isExtracting: false, context: 'kyc' };
  };
  
  const dataExtractionState = getDataExtractionState();
  console.log('[DataExtraction] Final state:', dataExtractionState);
  
  // ========== HELPER: Clear previous review state ==========
  // Called when starting a new case to ensure clean UI
  const clearPreviousReviewState = () => {
    console.log('[ClearState] Clearing previous review state for new case');
    
    // Flow Monitor state
    setFlowMonitorStatus('idle');
    setFlowMonitorRunId(null);
    setFlowMonitorMetadata(null);
    
    // Review results
    setCurrentIssues([]);
    setGraphReviewTrace(null);
    setGraphTopics([]);
    setConflicts([]);
    setCoverageGaps([]);
    
    // Topic summaries
    setFlow2TopicSummaries([]);
    setTopicSummariesRunId(null);
    
    // Human gate
    setHumanGateState(null);
    
    // Post-reject data
    setPostRejectAnalysisData(null);
    
    // Loading states
    setIsLoadingTopicSummaries(false);
    setIsLoadingCase2TopicSummaries(false);
    setIsLoadingItTopicSummaries(false);
    setIsOrchestrating(false);
    
    console.log('[ClearState] ✓ Previous review state cleared');
  };
  
  // Case 4: IT Review state
  const [case4Active, setCase4Active] = useState(false);
  
  // Case 3: Guardrail minimal state (Flow2-only)
  const [case3Active, setCase3Active] = useState(false);
  const [case3BlockedDocId, setCase3BlockedDocId] = useState<string | null>(null);
  const [case3Issue, setCase3Issue] = useState<GuardrailIssue | null>(null);
  
  // Impact Simulator state (fully isolated)
  const [impactSimulatorActive, setImpactSimulatorActive] = useState(false);
  const [impactSimulatorState, impactSimulatorDispatch] = useReducer(
    simulatorReducer,
    getInitialSimulatorState()
  );
  
  // Chat mode selection (Flow2 only)
  type ChatMode = 'unselected' | 'process_review' | 'it_impact';
  const [chatMode, setChatMode] = useState<ChatMode>('unselected');
  
  // Workspace limits
  const MAX_FLOW2_DOCUMENTS = 10;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Impact Simulator: Timeline engine hook (deterministic animation)
  useImpactSimulatorTimeline({
    active: impactSimulatorActive,
    phase: impactSimulatorState.phase,
    selectedScenarioId: impactSimulatorState.selectedScenarioId,
    dispatch: impactSimulatorDispatch,
    onComplete: (message) => {
      // Add completion message to chat
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'Impact Simulator',
        content: message
      }]);
    }
  });

  // Clear new message flag when chat is expanded
  useEffect(() => {
    if (isChatExpanded && hasNewChatMessage) {
      setHasNewChatMessage(false);
    }
  }, [isChatExpanded, hasNewChatMessage]);
  
  // Sync currentIssues from orchestrationResult
  useEffect(() => {
    if (orchestrationResult?.artifacts?.review_issues?.issues) {
      setCurrentIssues(orchestrationResult.artifacts.review_issues.issues);
      setReviewRunId(prev => prev + 1);
    }
  }, [orchestrationResult]);
  
  // Load review config on mount
  useEffect(() => {
    if (docKey) {
      const loaded = loadReviewConfig(docKey);
      if (loaded) {
        setReviewConfig(loaded);
      }
    }
  }, [docKey]);
  
  // Save review config whenever it changes
  useEffect(() => {
    if (docKey && reviewConfig) {
      saveReviewConfig(docKey, reviewConfig);
    }
  }, [reviewConfig, docKey]);
  
  // Load session data on mount (if sessionId in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');
    
    if (sessionId) {
      const session = loadReviewSession(sessionId);
      if (session) {
        // IMPORTANT: Only restore sections from session if NOT already loaded from docKey
        // Priority: docKey storage (fresh from sectioning) > session storage (might be stale)
        if (session.sections && session.sections.length > 0 && !loadedFromStorage) {
          console.log('[document] Restoring sections from session:', session.sections.length);
          setSections(session.sections);
        } else if (loadedFromStorage) {
          console.log('[document] Skipping session sections - already loaded from docKey storage');
        }
        
        // Always restore other session state (non-conflicting)
        if (session.issues) {
          setCurrentIssues(session.issues);
        }
        if (session.signOff) {
          setSignOff(session.signOff);
        }
        if (session.orchestrationResult) {
          setOrchestrationResult(session.orchestrationResult);
        }
        if (session.flowId) {
          setSelectedFlowId(session.flowId);
        }
        
        // Add system message only if not already loaded from docKey
        if (!loadedFromStorage) {
          setMessages(prev => [...prev, {
            role: 'agent' as const,
            agent: 'System',
            content: `✓ Restored review session: ${session.title}`
          }]);
        }
        
        console.log('✓ Loaded session:', sessionId, session);
      }
    } else if (docKey) {
      // Fallback: load sign-off from legacy docKey
      const loaded = loadSignOff(docKey);
      setSignOff(loaded);
    }
  }, [docKey, loadedFromStorage, searchParams]);
  
  // Flow2: Read scenario parameter from URL and pre-select it
  useEffect(() => {
    if (!isFlow2) return;
    
    const scenarioParam = searchParams.get('scenario');
    if (scenarioParam) {
      console.log('[Flow2] Setting active scenario from URL:', scenarioParam);
      setFlow2ActiveScenario(scenarioParam);
    }
  }, [isFlow2, searchParams]);
  
  // Flow2: Reset Flow1 state when entering Flow2 mode
  useEffect(() => {
    if (isFlow2) {
      // Clear Flow1-specific state to prevent showing Flow1 content
      setIsSubmitted(false);
      console.log('[Flow2] Cleared Flow1 state (isSubmitted reset)');
    }
  }, [isFlow2]);
  
  // Flow2: Load checkpoint state when docKey is present (e.g., after approval/rejection)
  useEffect(() => {
    if (!isFlow2 || !docKey) return;
    
    // Only load if we don't already have documents (avoid overwriting current work)
    if (flow2Documents.length > 0) {
      console.log('[Flow2] Skipping checkpoint load - documents already present');
      return;
    }
    
    console.log('[Flow2] Loading checkpoint for run_id:', docKey);
    
    // Poll for checkpoint status
    const loadCheckpoint = async () => {
      try {
        const response = await fetch(`/api/flow2/approvals/poll?run_id=${docKey}`);
        if (!response.ok) {
          console.warn('[Flow2] Failed to load checkpoint:', response.status);
          return;
        }
        
        const data = await response.json();
        console.log('[Flow2] Checkpoint data loaded:', data);
        
        // Restore documents from checkpoint
        if (data.checkpoint_metadata?.documents) {
          const restoredDocs: Flow2Document[] = data.checkpoint_metadata.documents.map((doc: any) => ({
            id: doc.doc_id || `doc-${Date.now()}`,
            filename: doc.filename || 'Untitled',
            text: doc.text || doc.content || '',
            uploadedAt: new Date()
          }));
          
          setFlow2Documents(restoredDocs);
          console.log('[Flow2] Restored', restoredDocs.length, 'document(s) from checkpoint');
        }
        
        // Restore flow monitor state
        if (data.status) {
          const statusMap: Record<string, FlowStatus> = {
            'waiting_human': 'waiting_human',
            'approved': 'completed',
            'rejected': 'rejected'
          };
          setFlowMonitorStatus(statusMap[data.status] || 'idle');
          setFlowMonitorRunId(docKey);
          
          if (data.checkpoint_metadata) {
            setFlowMonitorMetadata(data.checkpoint_metadata);
          }
        }
        
        // Restore issues if present
        if (data.checkpoint_metadata?.graph_state?.issues) {
          setCurrentIssues(data.checkpoint_metadata.graph_state.issues);
        }
        
        // Restore topics if present
        if (data.checkpoint_metadata?.graph_state?.topicSections) {
          setGraphTopics(data.checkpoint_metadata.graph_state.topicSections);
        }
        
        // NEW: Restore topic summaries from checkpoint (persists after approve/reject)
        if (data.checkpoint_metadata?.topic_summaries && data.checkpoint_metadata.topic_summaries.length > 0) {
          console.log('[Flow2/Restore] Restoring', data.checkpoint_metadata.topic_summaries.length, 'topic summaries from checkpoint');
          setFlow2TopicSummaries(data.checkpoint_metadata.topic_summaries);
          setTopicSummariesRunId(docKey);
        }
        
        // Phase 8: If status is rejected, fetch post-reject analysis
        if (data.status === 'rejected') {
          console.log('[Flow2/Phase8] Rejected workflow detected, fetching post-reject analysis...');
          try {
            const analysisResponse = await fetch(`/api/flow2/demo/post-reject-analysis?run_id=${docKey}`);
            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              console.log('[Flow2/Phase8] Post-reject analysis loaded:', analysisData);
              
              if (analysisData.triggered) {
                setPostRejectAnalysisData(analysisData);
                console.log('[Flow2/Phase8] ✅ Phase 8 EDD demo activated');
              } else {
                console.log('[Flow2/Phase8] Trigger not detected in reject comment');
              }
            }
          } catch (error) {
            console.error('[Flow2/Phase8] Failed to load post-reject analysis:', error);
          }
        }
        
        // Add system message
        const statusLabel = data.status === 'approved' ? 'Approved' : 
                           data.status === 'rejected' ? 'Rejected' : 
                           data.status === 'waiting_human' ? 'Awaiting Approval' : 'Unknown';
        
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'System',
          content: `✓ Workflow restored from checkpoint\n\nRun ID: ${docKey}\nStatus: ${statusLabel}\nDocuments: ${data.checkpoint_metadata?.documents?.length || 0}`
        }]);
        
      } catch (error: any) {
        console.error('[Flow2] Failed to load checkpoint:', error);
      }
    };
    
    loadCheckpoint();
  }, [isFlow2, docKey, flow2Documents.length]);
  
  // Auto-scroll to Phase 8 panel when rejection + triggered (guarantee visibility)
  useEffect(() => {
    if (postRejectAnalysisData?.triggered && 
        flowMonitorRunId && 
        didScrollToPhase8Ref.current !== flowMonitorRunId) {
      
      // Guard: only scroll once per run_id
      didScrollToPhase8Ref.current = flowMonitorRunId;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const panel = document.getElementById('post-reject-analysis');
        if (panel) {
          console.log('[Flow2/Phase8] Auto-scrolling to Phase 8 panel');
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          console.warn('[Flow2/Phase8] Panel element not found for scroll');
        }
      });
    }
  }, [postRejectAnalysisData?.triggered, flowMonitorRunId]);
  
  // Auto-save session on state changes
  useEffect(() => {
    // Only save if we have a sessionId
    const sessionId = typeof window !== 'undefined' 
      ? sessionStorage.getItem('currentSessionId') 
      : null;
    
    // Don't auto-save if no sessionId or if sections haven't been loaded yet
    if (!sessionId || sections.length === 0) return;
    
    // Don't auto-save if sections are still the initial FAKE_SECTIONS (check by comparing titles)
    const isFakeSections = sections.length === 3 && 
      sections[0].title === 'Investment Background' &&
      sections[1].title === 'Risk Assessment' &&
      sections[2].title === 'Technical Strategy' &&
      !loadedFromStorage;
    
    if (isFakeSections) {
      console.log('[document] Skipping auto-save - sections are still FAKE_SECTIONS');
      return;
    }
    
    // Get session title (from first section or fallback)
    const title = sections[0]?.title || 'Untitled Review';
    
    // Save session
    const session: ReviewSession = {
      id: sessionId,
      title,
      lastUpdated: new Date().toISOString(),
      sections,
      issues: currentIssues,
      signOff: signOff || undefined,
      orchestrationResult: orchestrationResult || undefined,
      flowId: selectedFlowId
    };
    
    saveReviewSession(session);
    
    console.log('✓ Auto-saved session:', sessionId);
  }, [sections, currentIssues, signOff, orchestrationResult, selectedFlowId, loadedFromStorage]);

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
      
      // Phase 5: Add to dirty queue if content changed
      const previousContent = sectionContentBeforeEdit[sectionId] || '';
      if (previousContent !== editContent) {
        console.log('[document/Phase5] Adding section', sectionId, 'to dirty queue');
        setDirtyQueue((prev: DirtyQueue) => addToDirtyQueue(prev, sectionId, previousContent, editContent));
      }
      
      setSections(prevSections => prevSections.map(s => {
        if (s.id === sectionId) {
          // After manual edit, status should be 'unreviewed' until re-reviewed
          return {
            ...s,
            content: editContent,
            status: 'unreviewed',
            log: [...s.log, { agent: 'User', action: 'Content modified and saved - requires re-review', timestamp: new Date() }]
          };
        }
        return s;
      }));
      
      // Remove issues for this section since content changed
      const sectionKey = `section-${sectionId}`;
      const updatedIssues = currentIssues.filter(issue => issue.sectionId !== sectionKey);
      setCurrentIssues(updatedIssues);
      
      // Also update orchestrationResult to keep in sync
      setOrchestrationResult((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          artifacts: {
            ...prev.artifacts,
            review_issues: {
              issues: updatedIssues,
              total_count: updatedIssues.length
            }
          }
        };
      });
      
      // Invalidate sign-off if warnings existed
      if (signOff) {
        setSignOff(null);
        localStorage.removeItem(`doc:${docKey || 'default'}:signoff`);
      }
      
      // Increment review run ID to force recomputation
      setReviewRunId(prev => prev + 1);
      
      const section = sections.find(s => s.id === sectionId);
      const newMessage: Message = {
        role: 'agent',
        agent: 'System',
        content: `✓ Section ${getSectionPosition(sectionId)} "${section?.title}" saved. Status set to UNREVIEWED. Please run "Re-review Section" to update compliance status.`
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
      
      // Phase 5: Store content before edit for dirty queue calculation
      setSectionContentBeforeEdit(prev => ({
        ...prev,
        [sectionId]: section?.content || ''
      }));
      
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

  const handleSubmit = () => {
    // Case 1: Guard - require attestation before submission
    if (!isFlow2 && !case1Attested) {
      setMessages([...messages, {
        role: 'agent',
        agent: 'System',
        content: '⚠️ Submission blocked: Please review the Approval Evidence and confirm the attestation checkbox before submitting.'
      }]);
      return;
    }
    
    setIsSubmitted(true);
    setMessages([...messages, {
      role: 'agent',
      agent: 'System',
      content: '✓ Submission successfully! Your submission has been recorded.'
    }]);
  };

  /**
   * STEP 7: Demo function to review all sections
   * Returns status for each section based on hard-coded rules
   */
  const demoRunFullReview = (sectionsToReview: Section[]) => {
    const results: Record<number, { status: SectionStatus; issues: any[] }> = {};
    
    sectionsToReview.forEach((section, idx) => {
      const content = section.content.toLowerCase();
      const title = section.title.toLowerCase();
      
      // Hard-coded demo logic for different sections
      let status: SectionStatus = 'pass';
      const issues: any[] = [];
      
      // Rule 1: Sections with "tobacco" always fail
      if (content.includes('tobacco')) {
        status = 'fail';
        issues.push({
          severity: 'critical',
          type: 'policy_violation',
          description: 'Section contains reference to tobacco industry which is prohibited by compliance policy.',
          section_id: section.id,
          section_title: section.title,
          section_index: idx
        });
      }
      
      // Rule 2: Investment Strategy sections need disclaimers
      if (title.includes('investment') || title.includes('strategy')) {
        if (!content.includes('disclaimer') && !content.includes('risk')) {
          status = status === 'fail' ? 'fail' : 'warning';
          issues.push({
            severity: 'high',
            type: 'missing_disclaimer',
            description: 'Investment strategy section missing required risk disclaimer.',
            section_id: section.id,
            section_title: section.title,
            section_index: idx
          });
        }
      }
      
      // Rule 3: Liability sections must exist
      if (title.includes('liability') || title.includes('indemnification')) {
        if (content.length < 50) {
          status = status === 'fail' ? 'fail' : 'warning';
          issues.push({
            severity: 'medium',
            type: 'insufficient_content',
            description: 'Liability section appears incomplete or too brief.',
            section_id: section.id,
            section_title: section.title,
            section_index: idx
          });
        }
      }
      
      // Rule 4: Signature sections should mention signatures
      if (title.includes('signature') || title.includes('status')) {
        if (!content.includes('signature') && !content.includes('sign')) {
          status = status === 'fail' ? 'fail' : 'warning';
          issues.push({
            severity: 'low',
            type: 'missing_signature',
            description: 'Signature section does not contain signature placeholders.',
            section_id: section.id,
            section_title: section.title,
            section_index: idx
          });
        }
      }
      
      results[section.id] = { status, issues };
    });
    
    return results;
  };

  /**
   * Phase 5: Batch review API integration
   * 
   * Attempts to call batch_review API if dirtyQueue has entries.
   * Returns non-null on success, null on failure or no dirty sections.
   * 
   * @returns { issues, remediations, trace } on success, null otherwise
   */
  const runBatchReviewIfPossible = async (): Promise<null | { 
    issues: any[]; 
    remediations: any[]; 
    trace: any 
  }> => {
    // No dirty sections => skip batch review
    if (!dirtyQueue || dirtyQueue.entries.length === 0) {
      console.log('[document/Phase5] No dirty sections, skipping batch review');
      return null;
    }

    console.log('[document/Phase5] Attempting batch review with', dirtyQueue.entries.length, 'dirty sections');

    try {
      const documentId = docKey || `doc-${Date.now()}`;
      
      // Convert sections to API format (with string IDs)
      const apiSections = sections.map(s => ({
        id: `section-${s.id}`,
        title: s.title,
        content: s.content,
        order: s.id // Use numeric id as order
      }));

      // Snapshot dirty queue before review
      const queueSnapshot = { ...dirtyQueue };

      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch_review',
          documentId,
          dirtyQueue,
          sections: apiSections,
          config: reviewConfig
        })
      });

      if (!response.ok) {
        console.warn('[document/Phase5] Batch review API returned non-2xx:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[document/Phase5] Batch review succeeded:', data);

      // Populate batch review trace for UI
      setBatchReviewTrace({
        scopePlan: data.scopePlan || null,
        globalCheckResults: data.globalCheckResults || null,
        timing: data.timing || null,
        fallbacks: data.fallbacks,
        degraded: data.degraded,
        dirtyQueueSnapshot: queueSnapshot
      });

      // Clear dirty queue after successful review
      setDirtyQueue(clearDirtyQueue());
      setSectionContentBeforeEdit({});

      return {
        issues: data.issues || [],
        remediations: data.remediations || [],
        trace: data
      };
    } catch (error) {
      console.error('[document/Phase5] Batch review failed:', error);
      console.warn('[document/Phase5] Falling back to existing review logic');
      return null;
    }
  };

  const handleFullComplianceReview = async () => {
    setIsOrchestrating(true);
    setOrchestrationResult(null);
    
    console.log("[document] Starting full review of all", sections.length, "sections");
    
    try {
      // Phase 5: Try batch review first if dirty sections exist
      const batchResult = await runBatchReviewIfPossible();
      
      if (batchResult) {
        console.log('[document/Phase5] Using batch review results');
        
        // Update currentIssues with batch review results
        setCurrentIssues(batchResult.issues);
        
        // Create orchestration result for UI compatibility
        const mockResult = {
          ok: true,
          parent_trace_id: `batch-${Date.now()}`,
          mode: 'batch_review',
          artifacts: {
            review_issues: {
              issues: batchResult.issues,
              total_count: batchResult.issues.length
            },
            remediations: batchResult.remediations
          },
          decision: {
            next_action: batchResult.issues.some((i: any) => i.severity === 'FAIL') ? 'rejected' : 
                         batchResult.issues.some((i: any) => i.severity === 'WARNING') ? 'request_more_info' : 
                         'ready_to_send',
            reason: `Batch review completed: ${batchResult.issues.length} issue(s) found.`
          },
          execution: {
            steps: []
          }
        };
        
        setOrchestrationResult(mockResult);
        
        // Update section statuses based on issues
        setSections(prev => prev.map(s => {
          const sectionKey = `section-${s.id}`;
          const sectionIssues = batchResult.issues.filter((i: any) => i.sectionId === sectionKey);
          
          let status: SectionStatus = 'pass';
          if (sectionIssues.some((i: any) => i.severity === 'FAIL')) {
            status = 'fail';
          } else if (sectionIssues.some((i: any) => i.severity === 'WARNING')) {
            status = 'warning';
          }
          
          return {
            ...s,
            status,
            log: [
              ...s.log,
              {
                agent: 'Batch Review',
                action: `Batch review: ${status.toUpperCase()}. ${sectionIssues.length} issue(s) found.`,
                timestamp: new Date()
              }
            ]
          };
        }));
        
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'Batch Review Agent',
          content: `✓ Batch review completed.\n\nReviewed: ${batchResult.trace.scopePlan?.sectionsToReview?.length || 0} section(s)\nTotal issues: ${batchResult.issues.length}\n\nScope: ${batchResult.trace.scopePlan?.reviewMode || 'unknown'}`
        }]);
        
        setIsOrchestrating(false);
        return; // Exit early, batch review succeeded
      }
      
      // Fallback: Demo review all sections locally (existing logic)
      console.log('[document] Falling back to demo review logic');
      const reviewResults = demoRunFullReview(sections);
      console.log("[document] Review results:", reviewResults);
      
      // Aggregate all issues
      const allIssues: any[] = [];
      let totalPass = 0;
      let totalFail = 0;
      let totalWarning = 0;
      
      Object.values(reviewResults).forEach(result => {
        allIssues.push(...result.issues);
        if (result.status === 'pass') totalPass++;
        else if (result.status === 'fail') totalFail++;
        else if (result.status === 'warning') totalWarning++;
      });
      
      // Generate remediations for sections with policy violations (demo)
      const remediations: any[] = [];
      Object.entries(reviewResults).forEach(([sectionId, result]) => {
        const hasPolicyViolation = result.issues.some((issue: any) => issue.type === 'policy_violation');
        if (hasPolicyViolation) {
          remediations.push({
            sectionId: `section-${sectionId}`,
            proposedText: PROPOSED_FIX_TEMPLATES.policy_violation,
            agent: { id: 'rewrite-agent', name: 'Rewrite Agent (Demo)' }
          });
        }
      });
      
      // Create mock orchestration result for compatibility with existing UI
      const mockResult = {
        ok: true,
        parent_trace_id: `orch_${Date.now()}`,
        mode: 'demo',
        artifacts: {
          review_issues: {
            issues: allIssues,
            total_count: allIssues.length
          },
          remediations: remediations // Add remediations for proposed text
        },
        decision: {
          next_action: totalFail > 0 ? 'rejected' : totalWarning > 0 ? 'request_more_info' : 'ready_to_send',
          reason: `Reviewed ${sections.length} sections: ${totalPass} passed, ${totalFail} failed, ${totalWarning} warnings.`
        },
        execution: {
          steps: [] // Empty for demo
        }
      };
      
      setOrchestrationResult(mockResult);
      
      // Update currentIssues with all issues from full review
      setCurrentIssues(allIssues);
      
      // Update all section statuses
      setSections(prev => {
        const updatedSections = prev.map(s => {
          const result = reviewResults[s.id];
          if (!result) return s;
          
          console.log(`[document] Updating section ${s.id} (${s.title}) status: ${s.status} -> ${result.status}`);
          
          return {
            ...s,
            status: result.status,
            log: [
              ...s.log,
              {
                agent: 'Evaluate',
                action: `Full review: ${result.status.toUpperCase()}. ${result.issues.length} issue(s) found.`,
                timestamp: new Date()
              }
            ]
          };
        });
        
        console.log("[document] ✓ Sections after update:", updatedSections.map(s => ({ id: s.id, title: s.title, status: s.status })));
        return updatedSections;
      });
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'Evaluation Agent',
        content: `✓ Full document review completed.\n\nReviewed: ${sections.length} sections\nPassed: ${totalPass}\nFailed: ${totalFail}\nWarnings: ${totalWarning}\nTotal issues: ${allIssues.length}`
      }]);
      
      console.log("[document] ✓ Full review complete, all section statuses updated");
    } catch (error: any) {
      console.error('Review error:', error);
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `❌ Review failed: ${error.message}`
      }]);
    } finally {
      setIsOrchestrating(false);
    }
  };

  /**
   * Flow2: Load Demo Scenario
   * 
   * ISOLATED: Only writes to flow2Documents, never touches sections/dirtyQueue.
   */
  const handleLoadDemoScenario = () => {
    // GUARD: Only works in Flow2 mode
    if (!isFlow2) {
      console.warn('[Flow2] Cannot load demo in Flow1 mode');
      return;
    }
    
    if (!flow2ActiveScenario) {
      console.warn('[Flow2] No scenario selected');
      return;
    }
    
    const scenario = getDemoScenario(flow2ActiveScenario);
    if (!scenario) {
      console.error('[Flow2] Invalid scenario ID:', flow2ActiveScenario);
      return;
    }
    
    console.log('[Flow2] Loading demo scenario:', scenario.name);
    
    // ISOLATED WRITE: Only touches Flow2 state
    setFlow2Documents(scenario.documents);
    
    // Build derived topics from loaded documents
    const topics = buildDerivedTopicsFallback(scenario.documents);
    setDerivedTopics(topics);
    
    // Clear previous Flow2 results
    setGraphReviewTrace(null);
    setGraphTopics([]);
    setConflicts([]);
    setCoverageGaps([]);
    setCurrentIssues([]);
    setOrchestrationResult(null);
    
    // Notify user
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'Demo Loader',
      content: `✓ Loaded demo scenario: ${scenario.name}\n\n${scenario.description}\n\nExpected routing: ${scenario.expected.path.toUpperCase()} (risk ${scenario.expected.minRiskScore}-${scenario.expected.maxRiskScore})\n\nDocuments loaded: ${scenario.documents.length}\n\nClick "🕸️ Run Graph KYC Review" to execute.`
    }]);
  };

  /**
   * MILESTONE C: Flow2 Workspace Handlers
   * All handlers are ISOLATED to Flow2 state only.
   * NEVER call setSections, setDirtyQueue, or setBatchReviewTrace.
   */
  
  const handleFlow2Upload = (docs: Flow2Document[]) => {
    if (!isFlow2) return; // GUARD
    
    // Check limits
    if (flow2Documents.length + docs.length > MAX_FLOW2_DOCUMENTS) {
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `⚠️ Cannot add ${docs.length} document(s). Maximum ${MAX_FLOW2_DOCUMENTS} documents allowed in workspace.`
      }]);
      return;
    }
    
    // Case 3: Guardrail detection (deterministic, upload-only trigger)
    const processed = docs.map(doc => {
      const issue = detectGuardrailIssue(doc);
      if (issue.isBlocked) {
        return { ...doc, guardrailBlocked: true, guardrailIssue: issue };
      }
      return doc;
    });
    
    // Find first blocked document
    const blocked = processed.find(d => d.guardrailBlocked);
    if (blocked) {
      setCase3Active(true);
      setCase3BlockedDocId(blocked.doc_id);
      setCase3Issue(blocked.guardrailIssue || null);
    }
    
    // ISOLATED WRITE: Only Flow2 state
    setFlow2Documents(prev => [...prev, ...processed]);
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'System',
      content: `✓ Added ${docs.length} document(s) to Flow2 workspace. Total: ${flow2Documents.length + docs.length}${blocked ? ' 🚨 Guardrail triggered: Resolve the orange alert to start review.' : ''}`
    }]);
  };
  
  const handleFlow2PasteAdd = (doc: Flow2Document) => {
    if (!isFlow2) return; // GUARD
    
    if (flow2Documents.length >= MAX_FLOW2_DOCUMENTS) {
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `⚠️ Workspace full. Maximum ${MAX_FLOW2_DOCUMENTS} documents allowed.`
      }]);
      return;
    }
    
    // ISOLATED WRITE: Only Flow2 state
    setFlow2Documents(prev => [...prev, doc]);
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'System',
      content: `✓ Added "${doc.filename}" to Flow2 workspace.`
    }]);
  };
  
  const handleFlow2RemoveDocument = (docId: string) => {
    if (!isFlow2) return; // GUARD
    
    // ISOLATED WRITE: Only Flow2 state
    const doc = flow2Documents.find(d => d.doc_id === docId);
    setFlow2Documents(prev => prev.filter(d => d.doc_id !== docId));
    
    // Case 3: If removed document was blocked, clear guardrail state
    if (case3BlockedDocId === docId) {
      setCase3Active(false);
      setCase3BlockedDocId(null);
      setCase3Issue(null);
    }
    
    if (doc) {
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `🗑️ Removed "${doc.filename}" from workspace.${case3BlockedDocId === docId ? ' Guardrail cleared.' : ''}`
      }]);
    }
  };
  
  const handleFlow2ClearWorkspace = () => {
    if (!isFlow2) return; // GUARD
    
    // Clear ALL Flow2-only state (NEVER touch Flow1 state)
    const docCount = flow2Documents.length;
    setFlow2Documents([]); // ISOLATED WRITE
    setFlow2ActiveScenario('');
    setGraphReviewTrace(null);
    setGraphTopics([]);
    setConflicts([]);
    setCoverageGaps([]);
    setCurrentIssues([]);
    setHumanGateState(null);
    setHumanGateData(null);
    setIsDegraded(false);
    setDegradedReason('');
    
    // Case 3: Clear guardrail state
    setCase3Active(false);
    setCase3BlockedDocId(null);
    setCase3Issue(null);
    
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'System',
      content: `🧹 Flow2 workspace cleared (${docCount} document(s) removed).`
    }]);
  };

  /**
   * Case 3: Handle Guardrail Resolution
   * 
   * Called when user fixes BR or replaces document.
   * Clears guardrail flags and allows review to proceed.
   */
  const handleCase3Resolve = (opts?: { mode: 'fix_br' | 'replace_doc'; patch?: Partial<Flow2Document> }) => {
    if (!case3BlockedDocId) return;

    setFlow2Documents(prev => prev.map(doc => {
      if (doc.doc_id !== case3BlockedDocId) return doc;

      // Apply patch if replacing document
      const patch = opts?.patch || {};
      const next: any = { ...doc, ...patch };
      
      // Always clear guardrail flags
      delete next.guardrailBlocked;
      delete next.guardrailIssue;
      
      return next;
    }));

    // Clear Case 3 state
    setCase3Active(false);
    setCase3BlockedDocId(null);
    setCase3Issue(null);

    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'System',
      content: '✅ Guardrail resolved. You can now start the review.'
    }]);
  };

  /**
   * Case 3: Handle Guardrail Cancel
   * 
   * User dismissed guardrail without resolving.
   * Keep blocked state but inform user.
   */
  const handleCase3Cancel = () => {
    setMessages(prev => [...prev, { 
      role: 'agent', 
      agent: 'System', 
      content: 'Guardrail remains active until resolved.' 
    }]);
  };

  /**
   * Flow2: Handle Graph KYC Review
   * 
   * STRICT: Uses flow2Documents ONLY, never reads sections in Flow2 mode.
   * Populates graphReviewTrace for UI visualization.
   * 
   * STRATEGIC: Branch to Case2 real review if Case2 is accepted
   */
  const handleGraphKycReview = async () => {
    // DEBUG: Log Case2 状态
    console.log('[DEBUG handleGraphKycReview] isFlow2:', isFlow2);
    console.log('[DEBUG handleGraphKycReview] case2State:', case2State);
    console.log('[DEBUG handleGraphKycReview] case2ProcessAccepted:', case2ProcessAccepted);
    console.log('[DEBUG handleGraphKycReview] isCase2Active:', isCase2Active);
    
    // STRATEGIC: Branch to Case2 real review if Case2 is accepted
    if (isCase2Active) {
      console.log('[DEBUG] Branching to handleCase2RealProcessReview');
      await handleCase2RealProcessReview();
      return;
    }
    
    // GUARD: Only works in Flow2 mode
    if (!isFlow2) {
      console.warn('[Flow2] handleGraphKycReview called but not in Flow2 mode');
      return;
    }
    
    // GUARD: Case 3 guardrail blocks review start
    if (case3Active) {
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: '🚨 Review blocked: Please resolve the guardrail alert first (see orange banner above).'
      }]);
      return;
    }
    
    // GUARD: Require flow2Documents
    if (flow2Documents.length === 0) {
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: '⚠️ Please load documents first.\n\nUpload files or paste content using the panels above, or load a demo scenario.'
      }]);
      return;
    }
    
    // ✅ CRITICAL: Clear previous review state before starting new Standard KYC review
    // NOTE: This only clears review results, not documents
    clearPreviousReviewState();
    
    setIsOrchestrating(true);
    setOrchestrationResult(null);
    setGraphReviewTrace(null);
    setIsDegraded(false); // MILESTONE C: Clear degraded state
    setDegradedReason('');
    
    // CRITICAL: Do NOT set flowMonitorStatus to 'running' here!
    // Flow Monitor should only show progress AFTER topic summaries are complete.
    // Keep it 'idle' until then.
    console.log('[Flow2] Flow Monitor kept idle until topic summaries complete');
    
    console.log('[Flow2] Starting Graph KYC review with', flow2Documents.length, 'documents');
    
    try {
      // ISOLATED: Use flow2Documents ONLY (never read sections in Flow2)
      const documents = flow2Documents.map(d => ({
        name: d.filename,
        content: d.text
      }));
      
      const requestBody: any = {
        mode: 'langgraph_kyc',
        documents,
        // runId will be generated server-side with proper UUID format
        // DO NOT pass runId from client to avoid format mismatch with checkpoint validation
      };
      
      // MILESTONE C: If humanGateState exists, we're resuming
      if (humanGateState) {
        requestBody.humanDecision = {
          gate: humanGateState.gateId,
          decision: 'approve_edd', // This will be set by handleHumanGateSubmit
          signer: 'Resume'
        };
        requestBody.resumeToken = humanGateState.resumeToken;
      }
      
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      // MILESTONE C: Check for non-2xx (proper error handling)
      if (!response.ok) {
        let errorMessage = `API returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // Ignore parse error, use status code message
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('[Flow2] Graph KYC review response:', data);
      
      // Phase 7-9: Check for HITL pause (new checkpoint-based HITL)
      if (data.status === 'waiting_human') {
        console.log('[Flow2/HITL] Workflow paused - awaiting human approval');
        
        // CRITICAL: Do NOT set flowMonitorStatus yet!
        // Must wait for topic summaries to complete first.
        
        // Store run metadata (but don't activate Flow Monitor yet)
        const runIdForTopics = data.run_id || `run-${Date.now()}`;
        
        // Update UI state to show issues/trace (but NOT approval controls)
        setCurrentIssues(data.issues || []);
        
        // ✅ STEP 4 + DEMO EVIDENCE INJECTION: Call topic summaries endpoint (waiting_human path)
        // DEMO-ONLY: Check if post-reject analysis data should be injected
        
        // Determine if this is Flow2 demo with evidence to inject
        const isFlow2Demo = !!(data.checkpoint_metadata?.demo_mode || data.checkpoint_metadata?.demo_evidence);
        
        // Build topic input documents
        let topicInputDocs = flow2Documents;
        
        if (isFlow2Demo && data.checkpoint_metadata) {
          // Try to fetch post-reject analysis if available
          try {
            const analysisResp = await fetch(`/api/flow2/demo/post-reject-analysis?run_id=${runIdForTopics}`);
            if (analysisResp.ok) {
              const analysisData = await analysisResp.json();
              if (analysisData.triggered && analysisData.evidence) {
                console.log('[Flow2Demo] Injecting evidence dashboard artifacts into topic summary input');
                const demoEvidenceDocs = buildFlow2DemoEvidencePseudoDocs(analysisData);
                if (demoEvidenceDocs.length > 0) {
                  topicInputDocs = [...flow2Documents, ...demoEvidenceDocs];
                  console.log(`[Flow2Demo] Added ${demoEvidenceDocs.length} evidence pseudo-doc(s), total input: ${topicInputDocs.length} docs`);
                }
              }
            }
          } catch (evidenceError: any) {
            console.warn('[Flow2Demo] Failed to fetch evidence for injection:', evidenceError.message);
            // Non-blocking: proceed with original documents
          }
        }
        
        // Call topic summaries with (potentially augmented) document set
        // CRITICAL: Await this call - Flow Monitor should not show until this completes
        console.log('[Flow2/HITL] Extracting topics before showing Flow Monitor...');
        const topicSuccess = await callGenericTopicSummariesEndpoint(
          '/api/flow2/topic-summaries',
          runIdForTopics,
          topicInputDocs,
          KYC_FLOW2_CONFIG.topic_ids,
          data.issues || [],
          setFlow2TopicSummaries,
          setIsLoadingTopicSummaries,
          setTopicSummariesRunId
        );
        
        // NOW set Flow Monitor status (after topics are extracted)
        console.log('[Flow2/HITL] Topics extracted, now showing Flow Monitor in waiting_human state');
        setFlowMonitorStatus('waiting_human');
        setFlowMonitorRunId(data.run_id || null);
        setFlowMonitorMetadata(data.checkpoint_metadata || null);
        
        // DEMO GATING: Block downstream EDD email/continuation if topic summary failed
        if (isFlow2Demo && !topicSuccess) {
          console.warn('[Flow2Demo] Topic summary failed; this would block downstream EDD reviewer email/continuation in real flow.');
          console.warn('[Flow2Demo] For demo, email was already sent by orchestrator, so this is informational only.');
        }
        
        setGraphReviewTrace(data.graphReviewTrace || null);
        setGraphTopics(data.topicSections || []);
        // setExtractedTopics(data.extracted_topics || []); // ✅ DISABLED: Use flow2TopicSummaries in Flow2
        setConflicts(data.conflicts || []);
        setCoverageGaps(data.coverageGaps || []);
        
        // DO NOT SET humanGateState - this prevents approval UI from showing on Document page
        // Approval is done via email only
        
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'KYC Risk Analyzer',
          content: `⏸️ **Workflow Paused for Human Review**\n\n${(data.issues || []).filter((i: any) => i.category === 'kyc_risk').length} KYC risk issue(s) detected.\n\nReview email sent to approver. Check Flow Monitor for status.`
        }]);
        
        setIsOrchestrating(false);
        return;
      }
      
      // MILESTONE C: Check if human gate required (legacy format)
      if (data.humanGate && data.humanGate.required) {
        // ISOLATED WRITE: Only Flow2 state
        setHumanGateState({
          gateId: data.humanGate.gateId || data.humanGate.prompt.substring(0, 20),
          prompt: data.humanGate.prompt,
          options: data.humanGate.options || ['approve_edd', 'request_docs', 'reject'],
          context: data.humanGate.context,
          resumeToken: data.resumeToken || ''
        });
        setGraphReviewTrace(data.graphReviewTrace || null);
        setGraphTopics(data.topicSections || []);
        // setExtractedTopics(data.extracted_topics || []); // ✅ DISABLED: Use flow2TopicSummaries in Flow2
        
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'Human Gate',
          content: `⏸️ Review paused: ${data.humanGate.prompt}\n\nPlease make a decision to continue.`
        }]);
        
        setIsOrchestrating(false);
        return;
      }
      
      // Normal completion path
      // CRITICAL: Do NOT set flowMonitorStatus to 'completed' yet!
      // Wait for topic summaries to complete first (Document Analysis includes topic extraction)
      
      // Update issues
      setCurrentIssues(data.issues || []);
      
      // ✅ STEP 4: Call topic summaries endpoint (Flow2 only, MUST await for Document Analysis)
      // Keep status='running' until topics are extracted
      console.log('[Flow2] Orchestration complete, now extracting topics for Document Analysis...');
      const runIdForTopics = data.run_id || data.graphReviewTrace?.summary?.runId || `run-${Date.now()}`;
      
      // AWAIT topic summaries - Document Analysis is not complete without topics!
      await callGenericTopicSummariesEndpoint(
        '/api/flow2/topic-summaries',
        runIdForTopics,
        flow2Documents,
        KYC_FLOW2_CONFIG.topic_ids,
        data.issues || [],
        setFlow2TopicSummaries,
        setIsLoadingTopicSummaries,
        setTopicSummariesRunId
      );
      
      // NOW set to completed (after topics are extracted)
      console.log('[Flow2] Topics extracted, Document Analysis complete');
      setFlowMonitorStatus('completed');
      setFlowMonitorRunId(data.run_id || data.graphReviewTrace?.summary?.runId || null);
      
      // Update graph trace
      setGraphReviewTrace(data.graphReviewTrace || null);
      
      // Update Flow2-specific state (ISOLATED WRITES)
      // ⚠️ DISABLE extractedTopics in Flow2 path (use flow2TopicSummaries instead)
      setGraphTopics(data.topicSections || []);
      // setExtractedTopics(data.extracted_topics || []); // ✅ DISABLED: Use flow2TopicSummaries in Flow2
      setConflicts(data.conflicts || []);
      setCoverageGaps(data.coverageGaps || []);
      
      // Clear human gate if it was set
      setHumanGateState(null);
      setHumanGateData(null);
      
      // Create orchestration result for UI compatibility
      const mockResult = {
        ok: true,
        parent_trace_id: data.graphReviewTrace?.summary?.runId || `graph-${Date.now()}`,
        mode: 'langgraph_kyc',
        artifacts: {
          review_issues: {
            issues: data.issues || [],
            total_count: (data.issues || []).length
          }
        },
        decision: {
          next_action: (data.issues || []).some((i: any) => i.severity === 'FAIL') ? 'rejected' : 'ready_to_send',
          reason: `Graph KYC review completed: ${(data.issues || []).length} issue(s) found.`
        },
        execution: {
          steps: []
        }
      };
      
      setOrchestrationResult(mockResult);
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'Graph KYC Agent',
        content: `✓ Graph KYC review completed.\n\nPath: ${data.graphReviewTrace?.summary?.path || 'unknown'}\nRisk Score: ${data.graphReviewTrace?.summary?.riskScore || 0}\nTotal issues: ${(data.issues || []).length}`
      }]);
      
    } catch (error: any) {
      console.error('[Flow2] Graph KYC review error:', error);
      
      // MILESTONE C: Enter degraded mode
      setIsDegraded(true);
      setDegradedReason(error.message || 'Unknown error');
      
      // Set minimal safe trace
      setGraphReviewTrace({
        events: [{
          node: 'error_handler',
          status: 'failed',
          reason: error.message,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString()
        }],
        summary: {
          path: 'fast',
          riskScore: 0,
          coverageMissingCount: 0,
          conflictCount: 0
        },
        degraded: true
      });
      
      // Flow Monitor: Set to error
      setFlowMonitorStatus('error');
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `❌ Graph KYC review failed: ${error.message}`
      }]);
    } finally {
      setIsOrchestrating(false);
    }
  };

  /**
   * ✅ Generic Topic Summaries Endpoint Call (KYC or IT)
   * 
   * Config-driven: can call any topic summaries endpoint.
   * Now returns Promise<boolean> for gating downstream actions.
   */
  const callGenericTopicSummariesEndpoint = async (
    endpoint: string,  // "/api/flow2/topic-summaries" or "/api/it-bulletin/topic-summaries"
    runId: string,
    documents: Flow2Document[],
    topicIds: readonly string[],
    risks: any[] | undefined,
    setSummaries: (data: GenericTopicSummary[]) => void,
    setLoading: (loading: boolean) => void,
    setRunId: (id: string) => void
  ): Promise<boolean> => {
    setLoading(true);
    
    try {
      console.log(`[TopicSummaries/${endpoint}] Calling: run_id=${runId}, docs=${documents.length}, risks=${risks?.length || 0}`);
      
      const requestBody: any = {
        run_id: runId,
        documents: documents.map(d => ({
          doc_id: d.doc_id,
          filename: d.filename,
          text: d.text,
        })),
        topics: [...topicIds],
      };
      
      // Add risks only if provided (KYC uses this, IT doesn't)
      if (risks && risks.length > 0) {
        const riskInputs = mapIssuesToRiskInputs(risks);
        requestBody.risks = riskInputs;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      // Branch on union response (Success | Error)
      if (data.ok === true && data.topic_summaries && data.topic_summaries.length > 0) {
        setSummaries(data.topic_summaries);
        setRunId(runId);
        console.log(`[TopicSummaries/${endpoint}] ✓ Loaded ${data.topic_summaries.length} summaries`);
        
        // NEW: If this is KYC endpoint, save topic summaries to checkpoint for email inclusion
        if (endpoint === '/api/flow2/topic-summaries' && isFlow2) {
          try {
            await fetch('/api/flow2/update-checkpoint-topics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                run_id: runId,
                topic_summaries: data.topic_summaries,
              }),
            });
            console.log(`[TopicSummaries] ✓ Saved ${data.topic_summaries.length} summaries to checkpoint for email`);
          } catch (error: any) {
            console.error('[TopicSummaries] Failed to save to checkpoint:', error.message);
            // Non-blocking: topic summaries still work in UI
          }
        }
        
        return true; // SUCCESS
      } else if (data.ok === false) {
        console.warn(`[TopicSummaries/${endpoint}] API returned error:`, data.error);
        return false; // FAILURE
      } else {
        console.error(`[TopicSummaries/${endpoint}] Invalid response shape:`, data);
        return false; // FAILURE
      }
    } catch (error: any) {
      console.error(`[TopicSummaries/${endpoint}] Request failed:`, error.message);
      return false; // FAILURE
    } finally {
      setLoading(false);
    }
  };

  /**
   * MILESTONE C: Handle human gate decision submission
   */
  const handleHumanGateSubmit = async (selectedOption: string, signer: string) => {
    if (!isFlow2 || !humanGateState) return; // GUARD
    
    setIsOrchestrating(true);
    setIsDegraded(false); // Clear degraded state
    
    try {
      const documents = flow2Documents.map(d => ({
        name: d.filename,
        content: d.text
      }));
      
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'langgraph_kyc',
          documents,
          humanDecision: {
            gate: humanGateState.gateId,
            decision: selectedOption,
            signer
          },
          resumeToken: humanGateState.resumeToken
        })
      });
      
      if (!response.ok) {
        let errorMessage = `API returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // Ignore
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Update Flow2 state (ISOLATED)
      setGraphReviewTrace(data.graphReviewTrace || null);
      setGraphTopics(data.topicSections || []);
      // setExtractedTopics(data.extracted_topics || []); // ✅ DISABLED: Use flow2TopicSummaries in Flow2
      setConflicts(data.conflicts || []);
      setCoverageGaps(data.coverageGaps || []);
      setCurrentIssues(data.issues || []);
      
      // Clear human gate
      setHumanGateState(null);
      setHumanGateData(null);
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'Human Gate',
        content: `✓ Decision recorded: ${selectedOption.replace(/_/g, ' ').toUpperCase()} (by ${signer})\n\nReview completed.`
      }]);
      
      // Create orchestration result
      const mockResult = {
        ok: true,
        parent_trace_id: data.graphReviewTrace?.summary?.runId || `graph-${Date.now()}`,
        mode: 'langgraph_kyc',
        artifacts: {
          review_issues: {
            issues: data.issues || [],
            total_count: (data.issues || []).length
          }
        },
        decision: {
          next_action: (data.issues || []).some((i: any) => i.severity === 'FAIL') ? 'rejected' : 'ready_to_send',
          reason: `Graph KYC review completed after human decision: ${(data.issues || []).length} issue(s) found.`
        },
        execution: {
          steps: []
        }
      };
      
      setOrchestrationResult(mockResult);
      
    } catch (error: any) {
      console.error('[Flow2] Human gate submit error:', error);
      setIsDegraded(true);
      setDegradedReason(error.message || 'Unknown error');
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `❌ Failed to submit decision: ${error.message}`
      }]);
    } finally {
      setIsOrchestrating(false);
    }
  };
  
  /**
   * MILESTONE C: Handle human gate cancellation (resets Flow2)
   */
  const handleHumanGateCancel = () => {
    if (!isFlow2) return; // GUARD
    
    // Clear ALL Flow2-only state (same as clear workspace)
    handleFlow2ClearWorkspace();
  };
  
  /**
   * Phase 4: Handle issue click (scroll to and highlight topic)
   */
  const handleIssueClick = (issue: any) => {
    if (!isFlow2) return;
    
    const topicKey = mapIssueToTopic(issue);
    setHighlightedTopicKey(topicKey);
    
    // Scroll to topic card
    const element = document.querySelector(`[data-testid="topic-card-${topicKey}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedTopicKey(null);
    }, 3000);
  };
  
  /**
   * MILESTONE C: Retry Flow2 review after degraded error
   */
  const handleFlow2Retry = () => {
    if (!isFlow2) return; // GUARD
    setIsDegraded(false);
    setDegradedReason('');
    handleGraphKycReview();
  };
  
  /**
   * Phase 5: Handle More Inputs click
   */
  const handleMoreInputsClick = (topicKey: string) => {
    const topic = derivedTopics.find(t => t.topic_key === topicKey);
    if (!topic) return;
    
    setMoreInputsModal({
      isOpen: true,
      topicKey: topicKey as TopicKey,
      topic
    });
  };
  
  /**
   * Phase 5: Submit More Inputs
   */
  const handleMoreInputsSubmit = async (topicKey: TopicKey, files: File[]) => {
    const topic = derivedTopics.find(t => t.topic_key === topicKey);
    if (!topic) throw new Error('Topic not found');
    
    // Read files
    const newDocs = await Promise.all(
      files.map(async (file) => {
        const text = await file.text();
        return {
          filename: file.name,
          text,
          doc_type_hint: 'user_upload'
        };
      })
    );
    
    // Phase 6: Support full rebuild if user uploaded more than 1 file
    const mode = files.length > 1 ? 'full_rebuild' : 'incremental';
    
    if (mode === 'full_rebuild') {
      // Full rebuild: pass all existing documents
      const response = await fetch('/api/flow2/topics/fuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full_rebuild',
          topic_key: topicKey,
          new_docs: newDocs,
          existing_docs: flow2Documents.map(d => ({
            filename: d.filename,
            text: d.text,
            doc_type_hint: d.doc_type_hint
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to rebuild topics');
      }
      
      const result = await response.json();
      if (!result.ok || !result.derived_topics) {
        throw new Error('Invalid full rebuild response');
      }
      
      // Replace all derived topics
      setDerivedTopics(result.derived_topics);
    } else {
      // Incremental: update single topic
      const response = await fetch('/api/flow2/topics/fuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'incremental',
          topic_key: topicKey,
          existing_topic: topic,
          new_docs: newDocs
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fuse topics');
      }
      
      const result = await response.json();
      if (!result.ok || !result.topic) {
        throw new Error('Invalid fusion response');
      }
      
      // Update single topic
      setDerivedTopics(prev => 
        prev.map(t => t.topic_key === topicKey ? result.topic : t)
      );
    }
  };

  // OLD: const canSubmit = sections.every(s => s.status === 'pass');
  // NOW: Using documentStatus.isSubmittable (includes sign-off requirement)

  /**
   * Jump to a specific section, scroll into view, and highlight it.
   * @param sectionIndex - 0-based index in the sections array
   */
  const jumpToSection = (sectionIndex: number) => {
    if (sectionIndex < 0 || sectionIndex >= sections.length) {
      console.warn(`[document] Invalid section index: ${sectionIndex}`);
      return;
    }
    
    const section = sections[sectionIndex];
    const anchorId = `sec-${sectionIndex + 1}`; // 1-based anchor IDs
    const element = document.getElementById(anchorId);
    
    if (!element) {
      console.warn(`[document] Section anchor not found: ${anchorId}`);
      return;
    }
    
    console.log(`[document] Jumping to section ${sectionIndex + 1}: "${section.title}"`);
    
    // Smooth scroll to section
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight the section temporarily
    setHighlightedSectionId(section.id);
    setTimeout(() => {
      setHighlightedSectionId(null);
    }, 1500);
    
    // Update URL hash without causing page jump
    history.replaceState(null, '', `#sec-${sectionIndex + 1}`);
  };

  /**
   * Phase 2-D: Group issues by section and determine section-level status
   */
  interface SectionBundle {
    sectionIndex: number;
    sectionId: number | null;
    sectionTitle: string;
    issues: any[];
    status: 'fail' | 'warning';
    proposedText: string | null;
    hasChecklist: boolean;
  }

  const groupIssuesBySection = (issues: any[]): SectionBundle[] => {
    if (!issues || issues.length === 0) return [];
    
    // AUDIT: Filter to only show ACTIVE (open) issues, not accepted warnings
    const activeIssues = issues.filter(issue => {
      const status = issue.status || 'open'; // default to 'open' for backward compatibility
      return status === 'open';
    });
    
    console.log('[groupIssuesBySection] Starting with', issues.length, 'total issues,', activeIssues.length, 'active');
    console.log('[groupIssuesBySection] Sections:', sections.map(s => ({ id: s.id, title: s.title })));
    
    // Group by sectionIndex - FIXED for real API Issue structure
    const grouped: Record<number, any[]> = {};
    activeIssues.forEach(issue => {
      // Real API returns sectionId as string like "section-3"
      let sectionIndex = -1;
      
      if (issue.sectionId && typeof issue.sectionId === 'string') {
        // Extract section ID from "section-3" format
        const match = issue.sectionId.match(/section-(\d+)/);
        if (match) {
          const sectionId = parseInt(match[1]);
          // Find section index by ID
          sectionIndex = sections.findIndex(s => s.id === sectionId);
          console.log(`[groupIssuesBySection] Issue sectionId="${issue.sectionId}" -> parsed ID=${sectionId} -> found at index=${sectionIndex}`);
        }
      } else if (issue.section_index !== undefined) {
        // Fallback for old demo format
        sectionIndex = issue.section_index;
        console.log(`[groupIssuesBySection] Issue has section_index=${sectionIndex} (direct)`);
      } else if (issue.section_id !== undefined) {
        // Fallback for old demo format
        sectionIndex = sections.findIndex(s => s.id === issue.section_id);
        console.log(`[groupIssuesBySection] Issue has section_id=${issue.section_id} -> found at index=${sectionIndex}`);
      }
      
      if (sectionIndex >= 0) {
        if (!grouped[sectionIndex]) {
          grouped[sectionIndex] = [];
        }
        grouped[sectionIndex].push(issue);
      } else {
        console.warn('[groupIssuesBySection] Could not find section for issue:', issue);
      }
    });
    
    // Convert to bundles
    const bundles: SectionBundle[] = Object.keys(grouped).map(key => {
      const sectionIndex = parseInt(key);
      const sectionIssues = grouped[sectionIndex];
      const section = sections[sectionIndex];
      
      // Determine bundle status - FIXED for real API severity values
      // Real API uses: "FAIL" | "WARNING" | "INFO"
      const hasFail = sectionIssues.some(issue => 
        issue.severity === 'FAIL' || issue.severity === 'critical' || issue.severity === 'high'
      );
      const status: 'fail' | 'warning' = hasFail ? 'fail' : 'warning';
      
      // Get proposed text from orchestrationResult remediations (real API) or fallback to demo templates
      let proposedText: string | null = null;
      
      // First try real API remediations
      if (orchestrationResult?.artifacts?.remediations) {
        const sectionKey = `section-${section?.id}`;
        const remediation = orchestrationResult.artifacts.remediations.find(
          (rem: any) => rem.sectionId === sectionKey
        );
        if (remediation?.proposedText) {
          proposedText = remediation.proposedText;
        }
      }
      
      // Fallback to demo templates if no real remediation found (for backward compatibility)
      if (!proposedText) {
      const policyViolationIssue = sectionIssues.find(issue => 
        issue.type === 'policy_violation'
      );
      if (policyViolationIssue) {
        proposedText = PROPOSED_FIX_TEMPLATES.policy_violation;
        }
      }
      
      // Check for checklist items (not used in real API currently)
      const hasChecklist = false;
      
      return {
        sectionIndex,
        sectionId: section?.id || null,
        sectionTitle: section?.title || `Section ${sectionIndex + 1}`,
        issues: sectionIssues,
        status,
        proposedText,
        hasChecklist
      };
    });
    
    // Sort by sectionIndex
    return bundles.sort((a, b) => a.sectionIndex - b.sectionIndex);
  };

  /**
   * Compute document status from REAL API issues and sign-off
   */
  const documentStatus = useMemo(() => {
    return computeRealDocumentStatus(currentIssues, signOff);
  }, [currentIssues, signOff, reviewRunId]);
  
  /**
   * Reset Case 1 attestation when evidence changes (new review run or status change)
   * User must re-attest to new evidence before submitting
   */
  useEffect(() => {
    // Only applies to Case 1 (non-Flow2 mode)
    if (!isFlow2) {
      setCase1Attested(false);
    }
  }, [reviewRunId, documentStatus.status, isFlow2]);
  
  /**
   * Compute participating agents from current review results
   */
  const agentParticipants = useMemo(() => {
    if (currentIssues.length === 0) {
      return [];
    }
    
    const bundles = groupIssuesBySection(currentIssues);
    return computeParticipants(currentIssues, bundles);
  }, [currentIssues, reviewRunId]);
  
  /**
   * FIX 2: Memoize grouped issues to ensure proper re-rendering when issues change
   * This fixes the bug where section turns green but right-side issues remain
   */
  const groupedIssuesBundles = useMemo(() => {
    console.log('[groupedIssuesBundles] Recomputing with currentIssues count:', currentIssues.length);
    const bundles = groupIssuesBySection(currentIssues);
    console.log('[groupedIssuesBundles] Computed', bundles.length, 'bundles');
    return bundles;
  }, [currentIssues, sections, orchestrationResult, reviewRunId]);

  /**
   * Phase 2-A: Generate a stable key for an issue (deterministic across renders)
   */
  const getIssueKey = (issue: any): string => {
    // Prefer explicit issue ID if present
    if (issue.id) return String(issue.id);
    
    // Build deterministic key from issue properties
    const parts = [
      issue.type || 'unknown',
      issue.severity || 'unknown',
      issue.section_id ? `sec${issue.section_id}` : '',
      issue.section_title ? issue.section_title.substring(0, 20) : '',
      issue.section_index !== undefined ? `idx${issue.section_index}` : ''
    ].filter(Boolean);
    
    // Add simple hash of description (first 50 chars)
    const descHash = issue.description 
      ? issue.description.substring(0, 50).replace(/\s+/g, '-').toLowerCase()
      : 'nodesc';
    
    return `issue-${parts.join('-')}-${descHash}`;
  };

  /**
   * Phase 2-A: Generate stable action ID
   */
  const makeActionId = (issueKey: string, actionType: string, templateId: string): string => {
    return `action-${issueKey}-${actionType}-${templateId}`;
  };

  /**
   * Phase 2-A: Generate recommended actions for an issue (hard-coded rules)
   */
  const generateActionsForIssue = (issue: any): IssueAction[] => {
    const actions: IssueAction[] = [];
    const issueKey = getIssueKey(issue);
    const desc = (issue.description || '').toLowerCase();
    const issueType = issue.type || '';
    
    // Rule 1: Missing Disclaimer (by type or keyword)
    if (issueType === 'missing_disclaimer' || desc.includes('disclaimer')) {
      actions.push({
        id: makeActionId(issueKey, 'ADD_SECTION', 'disclaimer'),
        type: 'ADD_SECTION',
        label: 'Add Disclaimer Section',
        description: 'Append standard risk disclaimer',
        payload: {
          sectionTitle: 'Risk Disclaimer',
          sectionContent: 'This document contains forward-looking statements and projections that involve risks and uncertainties. Past performance is not indicative of future results. The value of investments may go down as well as up, and investors may not get back the full amount invested. All investment decisions should be made in consultation with a qualified financial advisor and in accordance with your individual risk tolerance and investment objectives. This document does not constitute financial advice, investment recommendation, or an offer to buy or sell any securities.',
          insertPosition: 'end'
        } as AddSectionPayload
      });
    }
    
    // Rule 2: Missing Signature (by type or keyword)
    if (issueType === 'missing_signature' || desc.includes('signature')) {
      actions.push({
        id: makeActionId(issueKey, 'ADD_SECTION', 'signature'),
        type: 'ADD_SECTION',
        label: 'Add Signature Block',
        description: 'Append standard signature section',
        payload: {
          sectionTitle: 'Signatures & Authorization',
          sectionContent: 'By signing below, all parties acknowledge that they have read, understood, and agree to the terms and conditions outlined in this document.\n\nClient Signature: _____________________________\nDate: _____________________________\n\nAdvisor Signature: _____________________________\nDate: _____________________________\n\nCompliance Officer Signature: _____________________________\nDate: _____________________________',
          insertPosition: 'end'
        } as AddSectionPayload
      });
    }
    
    // Rule 3: Missing Evidence (by type or keyword)
    if (issueType === 'missing_evidence' || desc.includes('evidence') || desc.includes('supporting')) {
      actions.push({
        id: makeActionId(issueKey, 'REQUEST_INFO', 'evidence'),
        type: 'REQUEST_INFO',
        label: 'Request Evidence',
        description: 'Ask for supporting documents',
        payload: {
          chatMessage: '📋 Evidence Request: Supporting documentation is required for the claims made in this section. Please provide: (1) Financial statements or transaction records, (2) Third-party verification or attestations, (3) Regulatory filing references. Once submitted, we can proceed with review.',
          infoType: 'evidence'
        } as RequestInfoPayload
      });
    }
    
    // Rule 4: Policy Violation (non-critical)
    if (issueType === 'policy_violation' && issue.severity !== 'critical') {
      const targetSectionId = issue.section_id ? parseInt(issue.section_id) : undefined;
      actions.push({
        id: makeActionId(issueKey, 'DRAFT_FIX', 'policy-rewrite'),
        type: 'DRAFT_FIX',
        label: 'Draft Policy-Compliant Version',
        description: 'Generate alternative wording',
        payload: {
          chatMessage: `✏️ Policy Compliance Assistance: The current wording violates internal policy guidelines. Suggested approach: (1) Remove references to restricted investment types or prohibited terminology, (2) Replace with approved alternatives that convey similar intent, (3) Ensure compliance with regulatory disclosure requirements. ${targetSectionId ? `This affects Section ${targetSectionId}.` : ''} Would you like me to suggest specific revisions?`,
          targetSectionId
        } as DraftFixPayload
      });
    }
    
    // Rule 5: Unclear/Ambiguous Wording (by keyword)
    if (desc.includes('unclear') || desc.includes('ambiguous') || desc.includes('vague')) {
      actions.push({
        id: makeActionId(issueKey, 'REQUEST_INFO', 'clarification'),
        type: 'REQUEST_INFO',
        label: 'Request Clarification',
        description: 'Ask author to clarify intent',
        payload: {
          chatMessage: '❓ Clarification Required: The identified text is ambiguous and may lead to misinterpretation. Please provide: (1) The intended meaning or objective of this section, (2) Target audience and their expected level of knowledge, (3) Any legal, regulatory, or compliance constraints that must be considered. This will help us provide accurate guidance.',
          infoType: 'clarification'
        } as RequestInfoPayload
      });
    }
    
    // Rule 6: High/Critical Severity Fallback (escalation)
    if ((issue.severity === 'high' || issue.severity === 'critical') && actions.length === 0) {
      actions.push({
        id: makeActionId(issueKey, 'REQUEST_INFO', 'escalate'),
        type: 'REQUEST_INFO',
        label: 'Escalate to Compliance',
        description: 'Flag for senior review',
        payload: {
          chatMessage: `🚨 High-Severity Issue Flagged: This issue requires senior compliance review and management approval. Issue Details: ${issue.description || 'No description provided'}. Required Documentation: (1) Business justification for the flagged content, (2) Risk mitigation strategy and controls, (3) Written approval from department head or compliance officer. Please prepare these materials for review.`,
          infoType: 'documentation'
        } as RequestInfoPayload
      });
    }
    
    // Cap at 3 actions max
    return actions.slice(0, 3);
  };

  /**
   * Map issues from orchestration result to a specific section.
   * Only maps issues that have explicit section references.
   */
  const mapIssuesToSection = (sectionId: number, orchestrationResult: any): any[] => {
    if (!orchestrationResult?.artifacts?.review_issues?.issues) {
      return [];
    }
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) return [];
    
    const mappedIssues = [];
    
    for (const issue of orchestrationResult.artifacts.review_issues.issues) {
      let isMatch = false;
      
      // Check explicit references only
      if (issue.section_id !== undefined) {
        isMatch = (String(issue.section_id) === String(section.id));
      }
      
      if (!isMatch && issue.section_title !== undefined) {
        isMatch = (issue.section_title.toLowerCase() === section.title.toLowerCase());
      }
      
      if (!isMatch && issue.section_index !== undefined) {
        const sectionIndex = sections.findIndex(s => s.id === section.id);
        isMatch = (issue.section_index === sectionIndex);
      }
      
      if (isMatch) {
        mappedIssues.push(issue);
      }
    }
    
    return mappedIssues;
  };

  /**
   * Get document-level issues that don't reference any specific section.
   */
  const getDocumentLevelIssues = (orchestrationResult: any): any[] => {
    if (!orchestrationResult?.artifacts?.review_issues?.issues) {
      return [];
    }
    
    return orchestrationResult.artifacts.review_issues.issues.filter((issue: any) => {
      return !issue.section_id && !issue.section_title && issue.section_index === undefined;
    });
  };

  /**
   * Derive section status from orchestration result artifacts.
   * Only updates status for sections that were actually analyzed.
   */
  const deriveSectionStatus = (sectionId: number, orchestrationResult: any): SectionStatus => {
    if (!orchestrationResult || !orchestrationResult.ok) {
      return 'unreviewed';
    }

    const mappedIssues = mapIssuesToSection(sectionId, orchestrationResult);
    
    if (mappedIssues.length === 0) {
      // Section was reviewed and has no issues
      return 'pass';
    }

    // Check severity of mapped issues
    const hasCritical = mappedIssues.some((issue: any) => 
      issue.severity === 'critical' || issue.type === 'policy_violation'
    );
    
    if (hasCritical) {
      return 'fail';
    }

    const hasHigh = mappedIssues.some((issue: any) => 
      issue.severity === 'high'
    );

    if (hasHigh) {
      return 'fail';
    }

    // Has only medium or low issues
    return 'warning';
  };

  /**
   * Phase 2-A: Execute an action (ADD_SECTION, DRAFT_FIX, or REQUEST_INFO)
   */
  const executeAction = (action: IssueAction) => {
    try {
      switch (action.type) {
        case 'ADD_SECTION': {
          const payload = action.payload as AddSectionPayload;
          // Generate new section ID (max existing + 1)
          const maxId = sections.length > 0 ? Math.max(...sections.map(s => s.id)) : 0;
          const newSection: Section = {
            id: maxId + 1,
            title: payload.sectionTitle,
            content: payload.sectionContent,
            status: 'unreviewed',
            log: [{
              agent: 'System',
              action: 'Section created via issue action',
              timestamp: new Date()
            }]
          };
          
          setSections(prev => [...prev, newSection]);
          
          // Add confirmation to chat
          const confirmMsg: Message = {
            role: 'agent',
            agent: 'System',
            content: `✓ Section "${newSection.title}" has been added to the document. Status: NOT REVIEWED. You can review and modify it in the sections list.`
          };
          setMessages(prev => [...prev, confirmMsg]);
          
          // Scroll to new section after brief delay
          setTimeout(() => {
            const sectionEl = document.querySelector(`[data-section-id="${newSection.id}"]`);
            if (sectionEl) {
              sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 200);
          
          break;
        }
        
        case 'DRAFT_FIX': {
          const payload = action.payload as DraftFixPayload;
          const fixMsg: Message = {
            role: 'agent',
            agent: 'Policy Agent',
            content: payload.chatMessage
          };
          setMessages(prev => [...prev, fixMsg]);
          setHasNewChatMessage(true);
          // Auto-expand chat for DRAFT_FIX
          setIsChatExpanded(true);
          break;
        }
        
        case 'REQUEST_INFO': {
          const payload = action.payload as RequestInfoPayload;
          const requestMsg: Message = {
            role: 'agent',
            agent: 'System',
            content: payload.chatMessage
          };
          setMessages(prev => [...prev, requestMsg]);
          setHasNewChatMessage(true);
          // Auto-expand chat for REQUEST_INFO
          setIsChatExpanded(true);
          break;
        }
      }
    } catch (error) {
      console.error('Action execution error:', error);
      const errorMsg: Message = {
        role: 'agent',
        agent: 'System',
        content: `❌ Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  /**
   * Phase 2-A: Handle action button click
   */
  const handleActionClick = (action: IssueAction) => {
    // Check if already executed
    if (executedActionIds.has(action.id)) {
      return;
    }
    
    // Execute the action
    executeAction(action);
    
    // Mark as executed
    setExecutedActionIds(prev => {
      const newSet = new Set(prev);
      newSet.add(action.id);
      return newSet;
    });
  };

  /**
   * Phase 2-B: Get proposed fix text for an issue (hard-coded templates)
   */
  const getProposedFixForIssue = (issue: any): string | null => {
    const desc = (issue.description || '').toLowerCase();
    const issueType = issue.type || '';
    
    // Priority 1: Issue type
    if (issueType === 'policy_violation') {
      return PROPOSED_FIX_TEMPLATES.policy_violation;
    }
    
    if (issueType === 'missing_disclaimer') {
      return PROPOSED_FIX_TEMPLATES.missing_disclaimer;
    }
    
    if (issueType === 'missing_evidence') {
      return PROPOSED_FIX_TEMPLATES.missing_evidence;
    }
    
    if (issueType === 'missing_signature') {
      return PROPOSED_FIX_TEMPLATES.missing_signature;
    }
    
    // Priority 2: Keyword matching in description
    if (desc.includes('disclaimer')) {
      return PROPOSED_FIX_TEMPLATES.missing_disclaimer;
    }
    
    if (desc.includes('evidence') || desc.includes('supporting')) {
      return PROPOSED_FIX_TEMPLATES.missing_evidence;
    }
    
    if (desc.includes('unclear') || desc.includes('ambiguous') || desc.includes('vague')) {
      return PROPOSED_FIX_TEMPLATES.unclear_wording;
    }
    
    if (desc.includes('signature')) {
      return PROPOSED_FIX_TEMPLATES.missing_signature;
    }
    
    // Priority 3: Policy violation keyword fallback
    if (desc.includes('policy') || desc.includes('violation') || desc.includes('restricted')) {
      return PROPOSED_FIX_TEMPLATES.policy_violation;
    }
    
    // For high/critical without specific match, return generic
    if (issue.severity === 'high' || issue.severity === 'critical') {
      return PROPOSED_FIX_TEMPLATES.generic_fallback;
    }
    
    // No template available
    return null;
  };

  /**
   * Phase 2-B: Handle copy proposed fix to clipboard
   */
  const handleCopyProposedFix = (issueKey: string, text: string, targetSectionHint?: string) => {
    if (!navigator.clipboard) {
      // Fallback for browsers without clipboard API
      alert('Copy this text:\n\n' + text);
      return;
    }
    
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIssueKey(issueKey);
        setShowCopyToast(true);
        
        setTimeout(() => {
          setCopiedIssueKey(null);
          setShowCopyToast(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Copy failed:', err);
        // Fallback
        alert('Copy this text:\n\n' + text);
      });
  };

  /**
   * Phase 2-C: Apply proposed fix to a section immediately (with undo support)
   */
  const handleApplyProposedFix = (sectionId: number, proposedText: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Check if already applied (toggle to undo)
    if (appliedFixes[sectionId]) {
      // UNDO: Restore previous content
      const { previousContent } = appliedFixes[sectionId];
      
      setSections(prev => prev.map(s =>
        s.id === sectionId
          ? { 
              ...s, 
              content: previousContent,
              status: 'unreviewed' // Still needs re-review after undo
            }
          : s // Keep other sections unchanged
      ));
      
      // Remove from applied fixes
      setAppliedFixes(prev => {
        const updated = { ...prev };
        delete updated[sectionId];
        return updated;
      });
      
      // Persist to localStorage
      if (docKey) {
        const storageKey = `draft_sections::${docKey}`;
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.sections = sections.map(s =>
            s.id === sectionId ? { ...s, content: previousContent } : s
          );
          sessionStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      }
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `Undo complete. Section ${getSectionPosition(sectionId)} "${section.title}" has been restored to its previous content.`
      }]);
      setHasNewChatMessage(true);
      
    } else {
      // APPLY: Write proposed text immediately
      const previousContent = section.content;
      
      setSections(prev => prev.map(s =>
        s.id === sectionId
          ? { 
              ...s, 
              content: proposedText,
              status: 'unreviewed', // Mark as unreviewed after applying fix
              log: [
                ...s.log,
                {
                  agent: 'System',
                  action: 'Applied proposed compliant version - requires re-review',
                  timestamp: new Date()
                }
              ]
            }
          : s // Keep other sections unchanged
      ));
      
      // Store undo state
      setAppliedFixes(prev => ({
        ...prev,
        [sectionId]: { previousContent, appliedText: proposedText }
      }));
      
      // Persist to localStorage
      if (docKey) {
        const storageKey = `draft_sections::${docKey}`;
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.sections = sections.map(s =>
            s.id === sectionId ? { ...s, content: proposedText } : s
          );
          sessionStorage.setItem(storageKey, JSON.stringify(parsed));
        }
      }
      
      // Jump to section
      const sectionIndex = sections.findIndex(s => s.id === sectionId);
      if (sectionIndex >= 0) {
        setTimeout(() => {
          jumpToSection(sectionIndex);
        }, 100);
      }
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `Proposed compliant text applied to Section ${getSectionPosition(sectionId)} "${section.title}". Click "Undo Apply" if you want to revert.`
      }]);
      setHasNewChatMessage(true);
    }
  };

  // REMOVED: simulateSectionReview - all review logic now uses REAL LLM API

  /**
   * REAL LLM-BACKED RE-REVIEW - NO FAKE LOGIC
   * Calls /api/review with current section content
   */
  const handleReReviewSection = async (sectionId: number) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1 || reviewingSectionId !== null) return;
    
    const section = sections[sectionIndex];
    
    // Set reviewing state
    setReviewingSectionId(sectionId);
    
    // Add message that review is starting
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'System',
      content: `Reviewing Section ${sectionIndex + 1} "${section.title}" with AI agents...`
    }]);
    setHasNewChatMessage(true);
    
    try {
      // Prepare API request with CURRENT section content
      const reviewRequest: ReviewRequest = {
        documentId: docKey || `doc_${Date.now()}`,
        mode: 'section',
        sectionId: `section-${sectionId}`,
        sections: sections.map((s, idx) => toAPISection(s, idx + 1)),
        config: reviewConfig // Pass review configuration for governed agent selection
      };

      // Call REAL API
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewRequest)
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result: ReviewResult = await response.json();
      
      // Store result
      setLastReviewResult(result);
      
      // Compute new section status from REAL API issues
      const newStatus = computeSectionStatus(sectionId, result.issues);
      
      const logAction = `Re-reviewed by AI: ${newStatus.toUpperCase()} - ${result.issues.length} issue(s)`;
      
      // Update section status
      setSections(prev => prev.map(s => {
        if (s.id === sectionId) {
          return {
              ...s,
              status: newStatus,
            log: [...s.log, { agent: 'AI Review', action: logAction, timestamp: new Date() }]
          };
        }
        return s;
      }));

      // Update currentIssues with REAL API results
      const updatedIssues = (() => {
        // DEBUG: Log before filtering
        console.log(`[handleReReviewSection] Before filter - sectionId: ${sectionId}, currentIssues count: ${currentIssues.length}`);
        console.log('[handleReReviewSection] Current issues:', currentIssues.map(i => ({ 
          sectionId: i.sectionId, 
          section_id: (i as any).section_id,
          title: i.title 
        })));
        
        // Remove old issues for this section - ROBUST FILTERING
        const sectionKey = `section-${sectionId}`;
        const filtered = currentIssues.filter(issue => {
          // Check all possible sectionId formats
          if (issue.sectionId === sectionKey) return false; // String format "section-3"
          if ((issue as any).section_id === sectionId) return false; // Number format (legacy)
          if (issue.sectionId === sectionId.toString()) return false; // String number "3"
          
          // Also check if sectionId can be parsed to match
          if (typeof issue.sectionId === 'string' && issue.sectionId.includes('-')) {
            const match = issue.sectionId.match(/section-(\d+)/);
            if (match && parseInt(match[1]) === sectionId) return false;
          }
          
          return true; // Keep this issue (it's for a different section)
        });
        
        // DEBUG: Log after filtering
        console.log(`[handleReReviewSection] After filter - filtered count: ${filtered.length}, new issues from API: ${result.issues.length}`);
        console.log('[handleReReviewSection] New issues from API:', result.issues);
        
        // Add new REAL issues from API (should be empty if section passes)
        const final = [...filtered, ...result.issues];
        console.log(`[handleReReviewSection] Final updatedIssues count: ${final.length}`);
        return final;
      })();
      
      setCurrentIssues(updatedIssues);
      console.log('[handleReReviewSection] ✓ setCurrentIssues called with', updatedIssues.length, 'issues');
      
      // CRITICAL: Also update orchestrationResult so the two stay in sync
      setOrchestrationResult((prev: any) => {
        if (!prev) return prev;
        
        // Update remediations - remove old ones for this section, add new ones
        const sectionKey = `section-${sectionId}`;
        const otherRemediations = (prev.artifacts?.remediations || []).filter(
          (rem: any) => rem.sectionId !== sectionKey
        );
        const updatedRemediations = [...otherRemediations, ...(result.remediations || [])];
        
        return {
          ...prev,
          artifacts: {
            ...prev.artifacts,
            review_issues: {
              issues: updatedIssues,
              total_count: updatedIssues.length
            },
            remediations: updatedRemediations
          }
        };
      });
      
      // Invalidate sign-off if warnings changed
      if (signOff) {
        const newFingerprint = computeWarningsFingerprint(updatedIssues);
        if (newFingerprint !== signOff.warningsFingerprint) {
        setSignOff(null);
          // Remove from localStorage
          localStorage.removeItem(`doc:${docKey}:signoff`);
        }
      }
      
      // Increment review run ID to force recomputation
      setReviewRunId(prev => prev + 1);

      // Success message
      const failCount = result.issues.filter(i => i.severity === 'FAIL').length;
      const warnCount = result.issues.filter(i => i.severity === 'WARNING').length;
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: result.issues[0]?.agent.name || 'Review Agent',
        content: result.issues.length === 0
          ? `Section ${sectionIndex + 1} "${section.title}": ✓ No issues found. All compliance checks passed.`
          : `Section ${sectionIndex + 1} "${section.title}": ${failCount > 0 ? `✗ ${failCount} blocking` : ''}${failCount > 0 && warnCount > 0 ? ', ' : ''}${warnCount > 0 ? `⚠ ${warnCount} warning(s)` : ''}`
      }]);
      setHasNewChatMessage(true);
      
    } catch (error: any) {
      console.error('[document] Error calling review API:', error);
      
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: `❌ Review failed: ${error.message}. Please try again.`
      }]);
      setHasNewChatMessage(true);
    } finally {
      setReviewingSectionId(null);
    }
  };

  /**
   * Phase 2-B: Parse re-review command from chat
   */
  const parseReReviewCommand = (userInput: string): number | null => {
    const lower = userInput.toLowerCase();
    
    // Must contain review keyword
    if (!lower.includes('review') && !lower.includes('check')) {
      return null;
    }
    
    // Extract section number
    const sectionNumMatch = lower.match(/section\s*(\d+)/);
    if (sectionNumMatch) {
      const num = parseInt(sectionNumMatch[1]);
      // Validate index
      if (num >= 1 && num <= sections.length) {
        return sections[num - 1].id; // Convert 1-based to actual ID
      }
    }
    
    // Try matching by title keywords
    for (let i = 0; i < sections.length; i++) {
      const titleWords = sections[i].title.toLowerCase().split(/\s+/);
      if (titleWords.some(word => word.length > 3 && lower.includes(word))) {
        return sections[i].id;
      }
    }
    
    return null;
  };

  // Replaced by highlightComplianceKeywords and hasComplianceKeywords (defined at top)

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

  /**
   * FLOW-SPECIFIC CHAT ROUTING
   * Flow1 and Flow2 have completely separate chat logic
   */
  
  /**
   * Handle Flow1 chat commands (original behavior)
   * Commands: "global evaluate", "fix [section]", "modify [section]", AI optimization
   */
  const handleFlow1ChatSubmit = async (userInput: string, userMessage: Message) => {
    const lowerInput = userInput.toLowerCase();

    // Helper: Parse user-facing section reference (e.g., "section 2", "Section 3")
    // Returns the section object if found, null otherwise
    const findSectionByUserReference = (userRef: string): typeof sections[0] | null => {
      // Try to extract number from user input (e.g., "section 2" -> "2")
      const match = userRef.match(/section\s+(\d+)/i);
      if (!match) return null;
      
      const displayNumber = parseInt(match[1], 10);
      
      // Map display number (1-based position) to section
      // User sees "Section 1, Section 2, Section 3" based on visual order
      if (displayNumber < 1 || displayNumber > sections.length) return null;
      
      return sections[displayNumber - 1];
    };

    // NEW: Check for "delete section N" command
    const deleteSectionMatch = lowerInput.match(/delete\s+section\s+(\d+)/);
    if (deleteSectionMatch) {
      const displayNumber = parseInt(deleteSectionMatch[1], 10);
      
      // Find section by user-facing display number (position-based, 1-indexed)
      const sectionToDelete = findSectionByUserReference(lowerInput);
      
      if (!sectionToDelete) {
        const errorMessage: Message = {
          role: 'agent',
          agent: 'System',
          content: `⚠️ Section ${displayNumber} not found. Available sections: ${sections.map((s, idx) => `Section ${idx + 1}: ${s.title}`).join(', ')}.`
        };
        setMessages([...messages, userMessage, errorMessage]);
        setInputValue('');
        setHasNewChatMessage(true);
        return;
      }
      
      const sectionTitle = sectionToDelete.title;
      const sectionId = sectionToDelete.id;
      
      // Delete the section by ID
      setSections(prev => prev.filter(s => s.id !== sectionId));
      
      const confirmMessage: Message = {
        role: 'agent',
        agent: 'System',
        content: `✓ Section ${displayNumber} "${sectionTitle}" has been deleted.`
      };
      
      setMessages([...messages, userMessage, confirmMessage]);
      setInputValue('');
      setHasNewChatMessage(true);
      return;
    }

    // NEW: Check for "add section [name]" command
    const addSectionMatch = lowerInput.match(/add\s+section\s+(.+)/);
    if (addSectionMatch) {
      const newSectionName = addSectionMatch[1].trim();
      
      // Create new section
      const newSectionId = Math.max(...sections.map(s => s.id)) + 1;
      const newSection = {
        id: newSectionId,
        title: newSectionName,
        content: '',
        status: 'unreviewed' as SectionStatus,
        log: [{ 
          agent: 'User', 
          action: `Section created via chat command`, 
          timestamp: new Date() 
        }]
      };
      
      setSections(prev => [...prev, newSection]);
      
      const agentMessage: Message = {
        role: 'agent',
        agent: 'System',
        content: `✓ New section "${newSectionName}" has been added as Section ${newSectionId}. You can now edit its content.`
      };
      
      setMessages([...messages, userMessage, agentMessage]);
      setInputValue('');
      setHasNewChatMessage(true);
      return;
    }

    // NEW: Check for "fix section N" command - auto-optimize with LLM
    const fixSectionMatch = lowerInput.match(/fix\s+section\s+(\d+)/);
    if (fixSectionMatch) {
      const displayNumber = parseInt(fixSectionMatch[1], 10);
      
      // Find section by user-facing display number (position-based, 1-indexed)
      const targetSection = findSectionByUserReference(lowerInput);
      
      if (!targetSection) {
        const errorMessage: Message = {
          role: 'agent',
          agent: 'System',
          content: `⚠️ Section ${displayNumber} not found. Available sections: ${sections.map((s, idx) => `Section ${idx + 1}: ${s.title}`).join(', ')}.`
        };
        setMessages([...messages, userMessage, errorMessage]);
        setInputValue('');
        setHasNewChatMessage(true);
        return;
      }
      
      setMessages([...messages, userMessage]);
      
      const processingMessage: Message = {
        role: 'agent',
        agent: 'Optimize Agent',
        content: `Processing Section ${displayNumber} "${targetSection.title}"... AI is generating optimized content.`
      };
      setMessages(prev => [...prev, processingMessage]);

      try {
        // Call LLM to generate optimized content
        const optimizedContent = await callLLMForOptimization(
          targetSection.id, 
          `Please optimize and improve the content for this section. Make it professional and comprehensive.`
        );
        
        if (optimizedContent) {
          // COMPLIANCE CHECK: Validate AI-generated content
          if (optimizedContent.toLowerCase().includes('tobacco')) {
            const complianceWarning: Message = {
              role: 'agent',
              agent: 'Compliance Agent',
              content: `⚠️ COMPLIANCE VIOLATION: The AI-generated content contains "tobacco" which violates compliance rules. Section has been marked as FAILED and content has NOT been updated.`
            };
            setMessages(prev => [...prev, complianceWarning]);

            setSections(prevSections => prevSections.map(s => {
              if (s.id === targetSection.id) {
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

            setInputValue('');
            setHasNewChatMessage(true);
            return;
          }

          // No compliance issues - update content
          setSections(prevSections => prevSections.map(s => {
            if (s.id === targetSection.id) {
              return {
                ...s,
                content: optimizedContent,
                status: 'pass',
                log: [...s.log, { 
                  agent: 'Optimize', 
                  action: 'Content auto-generated by AI via "fix section" command, status updated to PASS', 
                  timestamp: new Date() 
                }]
              };
            }
            return s;
          }));

          const successMessage: Message = {
            role: 'agent',
            agent: 'Optimize Agent',
            content: `✓ Section ${displayNumber} "${targetSection.title}" has been automatically optimized with AI-generated content. Status updated to PASS.`
          };
          setMessages(prev => [...prev, successMessage]);
          
          // NEW: Scroll to the updated section
          setTimeout(() => {
            const sectionElement = document.getElementById(`sec-${targetSection.id}`);
            if (sectionElement) {
              sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              console.log(`[Flow1] Scrolled to section ${displayNumber} (ID: ${targetSection.id})`);
            }
          }, 300);
        } else {
          throw new Error('Failed to generate optimized content');
        }
      } catch (error) {
        const errorMessage: Message = {
          role: 'agent',
          agent: 'System',
          content: `⚠️ Failed to optimize Section ${displayNumber}: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or check your API configuration.`
        };
        setMessages(prev => [...prev, errorMessage]);
      }

      setInputValue('');
      setHasNewChatMessage(true);
      return;
    }

    // Phase 2-B: Check for re-review command
    const reReviewSectionId = parseReReviewCommand(lowerInput);
    if (reReviewSectionId !== null) {
      setMessages([...messages, userMessage]);
      setInputValue('');
      handleReReviewSection(reReviewSectionId);
      setHasNewChatMessage(true);
      return;
    }

    // Check if user is requesting AI optimization for a specific section (legacy "modify section" behavior)
    const mentionedSection = detectSectionForModify(lowerInput);
    
    if (mentionedSection && !lowerInput.includes('global evaluate')) {
      // User mentioned a section - use real LLM to optimize
      setMessages([...messages, userMessage]);
      
      const processingMessage: Message = {
        role: 'agent',
        agent: 'Optimize Agent',
        content: `Processing your request for Section ${getSectionPosition(mentionedSection)}... AI is analyzing and optimizing the content.`
      };
      setMessages(prev => [...prev, processingMessage]);

      try {
        const revisedContent = await callLLMForOptimization(mentionedSection, userInput);
        
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

    // Original Flow1 command logic
    let agentMessage: Message;
    
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
    } else {
      // Default Flow1 help message
      agentMessage = {
        role: 'agent',
        agent: 'System',
        content: '[System] Available commands:\n• "global evaluate" - Run full evaluation\n• "add section [name]" - Add a new section\n• "delete section N" - Delete section by display number (e.g., "delete section 2")\n• "fix section N" - Auto-optimize section by display number (e.g., "fix section 3")\n• Mention section name to request AI improvements\n\n💡 Tip: Use the section number as shown in the UI (e.g., "Section 2: Executive Summary" → use "section 2")'
      };
    }

    setMessages([...messages, userMessage, agentMessage]);
    setInputValue('');
    setHasNewChatMessage(true);
  };

  /**
   * Handle Flow2 chat commands (Case 2 trigger, Flow2-specific routing)
   * Flow2 does NOT support Flow1 commands
   */
  const handleFlow2ChatSubmit = async (userInput: string, userMessage: Message) => {
    const lowerInput = userInput.toLowerCase();

    // ========== PRIORITY 1: Impact Simulator Routing (GENERIC) ==========
    if (impactSimulatorActive) {
      console.log('[Chat] Routing to Impact Simulator');
      
      // Add user message
      setMessages([...messages, userMessage]);
      setInputValue('');
      
      // Parse command (parser decides what action to return)
      const parseResult = parseImpactChat(userInput, impactSimulatorState);
      
      if (parseResult.action) {
        // Valid action - dispatch it
        impactSimulatorDispatch(parseResult.action);
        
        // Special case: EXIT action also updates page state
        if (parseResult.action.type === 'EXIT') {
          handleExitImpactSimulator();
        }
        // Special case: RESET action stays active
        if (parseResult.action.type === 'RESET') {
          setMessages(prev => [...prev, {
            role: 'agent',
            agent: 'Impact Simulator',
            content: '🔄 Simulator reset.\n\n💬 Type **YES** to confirm and proceed.'
          }]);
        }
      } else if (parseResult.message) {
        // Invalid command - show help/error message (we know message is not null here)
        const errorMessage: Message = {
          role: 'agent',
          agent: 'Impact Simulator',
          content: parseResult.message
        };
        setMessages(prev => [...prev, errorMessage]);
      }
      
      setHasNewChatMessage(true);
      
      // IMPORTANT: Return early, do NOT process other flows
      return;
    }

    // ========== PRIORITY 2: Chat Mode Selection (Flow2 only) ==========
    if (chatMode === 'unselected') {
      // Add user message
      setMessages([...messages, userMessage]);
      setInputValue('');
      
      const trimmedInput = userInput.trim();
      
      if (trimmedInput === '1') {
        // Process Review Chat mode selected
        setChatMode('process_review');
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'System',
          content: '✅ **Process Review Chat Mode** activated.\n\n' +
                   'You can now:\n' +
                   '• Ask about CS Integration Exception reviews\n' +
                   '• Trigger Case 2 workflows\n' +
                   '• Upload documents for compliance review\n\n' +
                   '💬 Type your question or trigger phrase to begin.'
        }]);
      } else if (trimmedInput === '2') {
        // IT Impact Chat mode selected
        setChatMode('it_impact');
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'System',
          content: '✅ **IT Impact Chat Mode** activated.\n\n' +
                   'Ready to analyze mailbox decommissioning impact.\n\n' +
                   '💬 **To start the Impact Simulator, type:**\n' +
                   '👉 `"What is the impact of mailbox decommissioning?"`\n\n' +
                   'Or click the **🧩 Run Impact Simulator** button on the right.'
        }]);
      } else {
        // Invalid selection - ask again
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: 'System',
          content: '❌ Invalid selection.\n\n' +
                   'Please reply with:\n' +
                   '• **"1"** for Process Review Chat\n' +
                   '• **"2"** for IT Impact Chat'
        }]);
      }
      
      setHasNewChatMessage(true);
      return;
    }

    // GUARD: Block all chat input if review is in progress
    if (isOrchestrating || flowMonitorStatus === 'running') {
      setMessages([...messages, userMessage]);
      const blockMessage: Message = {
        role: 'agent',
        agent: 'System',
        content: '⚠️ Review in process, please finish the current review process.'
      };
      setMessages(prev => [...prev, blockMessage]);
      setInputValue('');
      setHasNewChatMessage(true);
      return;
    }

    // ========== IT IMPACT CHAT MODE: Trigger Impact Simulator ==========
    if (chatMode === 'it_impact') {
      const itImpactTrigger = lowerInput.includes('impact of mailbox decommissioning') ||
                              lowerInput.includes('mailbox decom') ||
                              lowerInput.includes('impact of decommissioning');
      
      if (itImpactTrigger) {
        // Trigger Impact Simulator
        setMessages([...messages, userMessage]);
        setInputValue('');
        
        handleEnterImpactSimulator();
        setHasNewChatMessage(true);
        return;
      }
      
      // If not a trigger, provide guidance
      setMessages([...messages, userMessage]);
      setMessages(prev => [...prev, {
        role: 'agent',
        agent: 'System',
        content: '💡 **IT Impact Chat Mode**\n\n' +
                 'To analyze mailbox decommissioning impact, type:\n' +
                 '👉 `"What is the impact of mailbox decommissioning?"`\n\n' +
                 'Or click the **🧩 Run Impact Simulator** button on the right.'
      }]);
      setInputValue('');
      setHasNewChatMessage(true);
      return;
    }

    // ========== PROCESS REVIEW CHAT MODE: Case 2 and other flows ==========
    // CASE 2: Check for CS Integration Exception trigger (Flow2 only)
    if (chatMode === 'process_review' && detectCase2Trigger(userInput)) {
      // If Case 2 is already active, inform user and return
      if (case2State !== 'idle') {
        setMessages([...messages, userMessage]);
        const alreadyActiveMessage: Message = {
          role: 'agent',
          agent: 'Case 2 Agent',
          content: '⚠️ A Case 2 review is already in progress. Please complete or close the current review before starting a new one.'
        };
        setMessages(prev => [...prev, alreadyActiveMessage]);
        setInputValue('');
        setHasNewChatMessage(true);
        return;
      }
      
      // ✅ CRITICAL: Clear previous review state before starting new case
      clearPreviousReviewState();
      
      // Trigger Case 2 flow
      setMessages([...messages, userMessage]);
      setInputValue('');
      
      // Store original query and initialize Case 2 state
      setCase2Query(userInput);
      setCase2State('triggered');
      setCase2Data(CASE2_DEMO_DATA);
      setCase2Id(`case2_${Date.now()}`);
      
      // Add agent acknowledgment message
      const ackMessage: Message = {
        role: 'agent',
        agent: 'Case 2 Agent',
        content: '🔍 Analyzing CS integration exception scenario... Retrieving relevant policies and guidelines.'
      };
      setMessages(prev => [...prev, ackMessage]);
      setHasNewChatMessage(true);
      
      // Transition to tracing state after brief delay
      setTimeout(() => setCase2State('tracing'), 100);
      
      return;
    }

    // Check if user is trying to use Flow1 commands in Flow2
    const isFlow1Command = lowerInput.includes('global evaluate') || 
                          lowerInput.startsWith('fix ') ||
                          lowerInput.startsWith('modify ');
    
    if (isFlow1Command) {
      setMessages([...messages, userMessage]);
      const flow2HintMessage: Message = {
        role: 'agent',
        agent: 'System',
        content: '⚠️ You are in Flow2 mode. Flow1 commands ("global evaluate", "fix [section]", "modify [section]") are disabled here. Switch to Flow1 to use these commands.'
      };
      setMessages(prev => [...prev, flow2HintMessage]);
      setInputValue('');
      setHasNewChatMessage(true);
      return;
    }

    // REAL LLM RESPONSE: Call Anthropic for general queries
    setMessages([...messages, userMessage]);
    setInputValue('');
    
    // Show thinking indicator
    const thinkingMessage: Message = {
      role: 'agent',
      agent: 'AI Assistant',
      content: '🤔 Thinking...'
    };
    setMessages(prev => [...prev, thinkingMessage]);
    setHasNewChatMessage(true);
    
    try {
      // Call LLM API
      const response = await fetch('/api/chat/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          context: 'flow2_kyc_review'
        })
      });
      
      const data = await response.json();
      
      // Remove thinking message and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== '🤔 Thinking...');
        return [...filtered, {
          role: 'agent',
          agent: 'AI Assistant',
          content: data.response || 'I apologize, but I encountered an error processing your request.'
        }];
      });
      setHasNewChatMessage(true);
      
    } catch (error: any) {
      console.error('[Flow2Chat] LLM call failed:', error);
      
      // Remove thinking message and show error
      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== '🤔 Thinking...');
        return [...filtered, {
          role: 'agent',
          agent: 'System',
          content: '❌ Failed to get AI response. Please try again.'
        }];
      });
      setHasNewChatMessage(true);
    }
  };

  /**
   * Main chat message handler - routes to flow-specific handler
   */
  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      const userMessage: Message = {
        role: 'user',
        content: inputValue
      };

      // Route by flow mode
      if (isFlow2) {
        await handleFlow2ChatSubmit(inputValue, userMessage);
      } else {
        await handleFlow1ChatSubmit(inputValue, userMessage);
      }
    }
  };

  // Case 2 Handlers
  // Case2: Accept recommended process (STRATEGIC: no docs, no LLM, just show stages)
  const handleCase2Accept = async () => {
    console.log('[Case2] Accept button clicked');
    console.log('[Case2] case2Id:', case2Id);
    console.log('[Case2] case2Data:', case2Data ? 'present' : 'null');
    
    if (!case2Id || !case2Data) {
      console.warn('[Case2] Cannot accept: missing case2Id or case2Data');
      return;
    }

    // STRATEGIC: No document validation, no LLM calls
    // Simply set acceptance flag and show stages in Flow Monitor
    
    // Update state
    setCase2ProcessAccepted(true);
    setCase2State('accepted');
    setCase2BannerCollapsed(true); // Auto-collapse banner
    
    // CRITICAL FIX: Set Flow Monitor to 'waiting_human' so stages become visible
    // This is needed because Flow Monitor only shows stages when status !== 'idle'
    setFlowMonitorStatus('waiting_human');

    // Success message
    const successMsg: Message = {
      role: 'agent',
      agent: 'Case 2 Agent',
      content: `✓ Recommended process accepted. The review stages are now visible in Flow Monitor.\n\nNext steps:\n1. Upload at least 3 documents\n2. Click "Run Process Review" to analyze documents and complete the review.`,
    };
    setMessages(prev => [...prev, successMsg]);
    setHasNewChatMessage(true);
    
    console.log('[Case2] Process accepted - stages now visible in Flow Monitor');
  };

  // Case2: REAL process review (Phase 4 -真实 LLM 调用 + 硬编码自动通过)
  const handleCase2RealProcessReview = async () => {
    console.log('[Case2] Starting REAL process review');
    console.log('[Case2] flow2Documents.length:', flow2Documents.length);
    
    // 1. Validate documents (至少 3 个)
    if (flow2Documents.length < 3) {
      console.warn('[Case2] Insufficient documents - aborting');
      const errorMsg: Message = {
        role: 'agent',
        agent: 'Case 2 Agent',
        content: '⚠️ Please upload at least 3 documents before running the process review.',
      };
      setMessages(prev => [...prev, errorMsg]);
      setHasNewChatMessage(true);
      return;
    }
    
    console.log('[Case2] ✓ Document validation passed, proceeding with review');
    
    // 2. Set orchestrating state + loading flag for UI
    setIsOrchestrating(true);
    setIsLoadingCase2TopicSummaries(true); // NEW: Trigger "Data Extraction In Progress" banner
    // CRITICAL: Do NOT set flowMonitorStatus to 'running' yet!
    // Must wait for topic summaries to complete first.
    console.log('[Case2] Flow Monitor kept idle until topic summaries complete');
    
    try {
      // 3. 真实调用 LLM - 生成 topic summaries
      console.log(`[Case2] Calling /api/case2/topic-summaries with ${flow2Documents.length} documents`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s frontend timeout
      
      const response = await fetch('/api/case2/topic-summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case2_id: case2Id,
          documents: flow2Documents,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to generate topic summaries');
      }

      console.log(`[Case2] ✓ Topic summaries generated: ${data.topic_summaries.length} topics`);

      // 4. 存储 topic summaries（会显示在左侧面板）
      setCase2TopicSummaries(data.topic_summaries);
      setIsLoadingCase2TopicSummaries(false); // NEW: Stop loading banner
      
      // NOW set flowMonitorStatus to 'running' (after topics are extracted)
      console.log('[Case2] Topics extracted, now showing Flow Monitor stages');
      setFlowMonitorStatus('running');
      
      // ✅ CRITICAL: Set runId and metadata for Case2 (needed for Finish button to work)
      // Even though Case2 doesn't call /api/orchestrate, it needs these for UI consistency
      const case2RunId = case2Id || `case2-${Date.now()}`;
      setFlowMonitorRunId(case2RunId);
      
      const case2Metadata: any = {
        run_id: case2RunId,
        status: 'active' as const,
        paused_at_node_id: '',
        paused_reason: '',
        document_count: flow2Documents.length,
        created_at: new Date().toISOString(),
        paused_at: new Date().toISOString(),
        reviewProcessStatus: 'RUNNING' as const, // Will be updated to COMPLETE after animation
      };
      setFlowMonitorMetadata(case2Metadata);
      console.log('[Case2] ✓ Flow Monitor runId and metadata set:', case2RunId);
      
      // 5. 动画：逐个标记 stages 为 completed (每个延迟 1 秒)
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      for (let i = 0; i < case2RecommendedStageStatuses.length; i++) {
        await sleep(1000);
        setCase2RecommendedStageStatuses((prev: ('pending' | 'completed')[]) => {
          const newStatuses = [...prev];
          newStatuses[i] = 'completed';
          return newStatuses;
        });
      }
      
      // 6. 设置最终状态
      await sleep(500);
      setFlowMonitorStatus('completed');
      setCase2State('started'); // Use existing state value
      
      // ✅ Update metadata to COMPLETE (for Finish button and UI consistency)
      setFlowMonitorMetadata(prev => prev ? {
        ...prev,
        reviewProcessStatus: 'COMPLETE',
      } : null);
      console.log('[Case2] ✓ Flow Monitor metadata updated to COMPLETE');
      
      // 7. 成功消息
      const successMsg: Message = {
        role: 'agent',
        agent: 'Case 2 Agent',
        content: `✓ CS Integration Exception review complete!\n\n${data.topic_summaries.length} topics analyzed. All ${case2RecommendedStageStatuses.length} review stages approved.\n\nThis is a demo path - no backend orchestration, emails, or checkpoints were created.`,
      };
      setMessages(prev => [...prev, successMsg]);
      setHasNewChatMessage(true);
      
      console.log('[Case2] ✓ Real process review complete');
      
    } catch (error: any) {
      console.error('[Case2] Process review failed:', error);
      
      // Stop loading banner
      setIsLoadingCase2TopicSummaries(false);
      
      // Keep stages grey on error
      setFlowMonitorStatus('error');
      
      // Determine error message based on error type
      let errorMessage = '⚠️ Process review failed.';
      
      if (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('timeout')) {
        errorMessage = '⚠️ Request timeout. The LLM is taking longer than expected.\n\nThis can happen when processing multiple large documents. Please try:\n1. Reducing document size\n2. Using fewer documents\n3. Trying again (the service may be experiencing high load)';
      } else if (error.message.includes('ANTHROPIC_API_KEY')) {
        errorMessage = '⚠️ LLM provider not configured.\n\nPlease set ANTHROPIC_API_KEY in your environment variables.';
      } else if (error.message) {
        errorMessage = `❌ Process review failed: ${error.message}\n\nStages remain pending. Please try again.`;
      }
      
      const errorMsg: Message = {
        role: 'agent',
        agent: 'Case 2 Agent',
        content: errorMessage,
      };
      setMessages(prev => [...prev, errorMsg]);
      setHasNewChatMessage(true);
    } finally {
      setIsOrchestrating(false);
    }
  };

  // Case2: Demo process review (Phase 4 - client-side animation, no backend)
  const handleCase2DemoProcessReview = async () => {
    console.log('[Case2] Starting demo process review (client-side only)');
    
    // Helper function for delays
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Set orchestrating state to disable button
    setIsOrchestrating(true);

    try {
      // Animate stages sequentially (1 second each)
      // Stage 1
      await sleep(1000);
      setCase2RecommendedStageStatuses(['completed', 'pending', 'pending', 'pending']);

      // Stage 2
      await sleep(1000);
      setCase2RecommendedStageStatuses(['completed', 'completed', 'pending', 'pending']);

      // Stage 3
      await sleep(1000);
      setCase2RecommendedStageStatuses(['completed', 'completed', 'completed', 'pending']);

      // Stage 4
      await sleep(1000);
      setCase2RecommendedStageStatuses(['completed', 'completed', 'completed', 'completed']);

      // Mark as started
      setCase2State('started');

      console.log('[Case2] Demo process review complete (all stages approved)');
    } finally {
      setIsOrchestrating(false);
    }
  };

  // Phase 5: Exit Case2 Mode (return to Standard KYC Review)
  const handleExitCase2Mode = () => {
    console.log('[Case2] Exiting Case2 mode, returning to Standard KYC Review');
    
    // Reset ONLY Case2-specific state
    setCase2ProcessAccepted(false);
    setCase2State('idle');
    setCase2BannerCollapsed(false);
    setCase2TopicSummaries([]);
    setCase2RecommendedStageStatuses(['pending', 'pending', 'pending', 'pending']);
    setCase2Data(null);
    setCase2Id(null);
    
    // CRITICAL: DO NOT clear flow2Documents (preserve uploaded files)
    // CRITICAL: DO NOT alter flowMonitorStatus/RunId/Metadata (preserve KYC review state if exists)
    
    // Optional: Add confirmation message
    const msg: Message = {
      role: 'agent',
      agent: 'System',
      content: '✓ Exited Case2 mode. You can now run a standard KYC review with your uploaded documents.',
    };
    setMessages(prev => [...prev, msg]);
    setHasNewChatMessage(true);
  };

  const handleCase2Start = async () => {
    if (case2State !== 'files_ready' || !case2Id) return;
    
    // Optional: Call backend API (currently not implemented)
    // For demo, we'll just update state and show success message
    
    setCase2State('started');
    const msg: Message = {
      role: 'agent',
      agent: 'Case 2 Agent',
      content: `✓ Exception approval flow initiated. Case ID: ${case2Id}. The Joint Steering Committee will be notified for review. All stakeholders will receive automated notifications.`
    };
    setMessages(prev => [...prev, msg]);
    setHasNewChatMessage(true);
  };

  // Case 4 Handlers
  const handleEnterITReview = () => {
    // ✅ CRITICAL: Clear previous review state before entering IT Review
    clearPreviousReviewState();
    
    setCase4Active(true);
    
    // Trigger IT topic summaries generation
    if (flow2Documents.length > 0) {
      const itRunId = `it-review-${Date.now()}`;
      setItTopicSummariesRunId(itRunId);
      
      callGenericTopicSummariesEndpoint(
        '/api/it-bulletin/topic-summaries',
        itRunId,
        flow2Documents,
        IT_BULLETIN_CONFIG.topic_ids,
        undefined, // IT doesn't use risk linking
        setItBulletinTopicSummaries,
        setIsLoadingItTopicSummaries,
        setItTopicSummariesRunId
      );
    }
  };
  
  /**
   * NEW: Mark animation as played in checkpoint
   */
  const handleAnimationPlayed = useCallback(async () => {
    if (!flowMonitorRunId) return;
    
    console.log('[Flow2] Marking animation as played for run:', flowMonitorRunId);
    
    // Update local state immediately
    setPostRejectAnalysisData((prev: any) => prev ? { ...prev, animation_played: true } : null);
    
    // Update checkpoint on server
    try {
      await fetch('/api/flow2/update-checkpoint-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: flowMonitorRunId,
          animation_played: true,
        }),
      });
      console.log('[Flow2] ✓ Animation played status saved to checkpoint');
    } catch (error: any) {
      console.error('[Flow2] Failed to update animation played status:', error);
    }
  }, [flowMonitorRunId]);

  /**
   * NEW: Handle Start New Review (reset Flow2 workspace)
   */
  const handleStartNewReview = useCallback(() => {
    if (!isFlow2) return; // GUARD
    
    console.log('[Flow2] Starting new review - resetting workspace');
    
    // Clear all Flow2 state
    setFlow2Documents([]);
    setOrchestrationResult(null);
    setGraphReviewTrace(null);
    setGraphTopics([]);
    setCurrentIssues([]);
    setConflicts([]);
    setCoverageGaps([]);
    setFlow2TopicSummaries([]);
    setTopicSummariesRunId(null);
    setItBulletinTopicSummaries([]);
    setItTopicSummariesRunId(null);
    setHumanGateState(null);
    setHumanGateData(null);
    setIsDegraded(false);
    setDegradedReason('');
    
    // ✅ Reset ALL case active flags (complete fresh state)
    setCase3Active(false);
    setCase4Active(false);
    setImpactSimulatorActive(false); // ✅ Added: Impact Simulator
    
    // Reset Case2 state (COMPLETE)
    setCase2ProcessAccepted(false);
    setCase2State('idle');
    setCase2BannerCollapsed(false);
    setCase2TopicSummaries([]);
    setCase2Data(null);
    setCase2Id(null);
    setCase2Query('');
    setIsLoadingCase2TopicSummaries(false);
    setCase2RecommendedStageStatuses(['pending', 'pending', 'pending', 'pending', 'pending']);
    
    // ✅ Reset Impact Simulator state (use RESET action)
    impactSimulatorDispatch({ type: 'RESET' });
    
    // Reset Flow Monitor
    setFlowMonitorStatus('idle');
    setFlowMonitorRunId(null);
    setFlowMonitorMetadata(null);
    
    // Reset Post-Reject Analysis
    setPostRejectAnalysisData(null);
    
    // Reset chat mode selection
    setChatMode('unselected');
    
    // Reset all loading states (defensive)
    setIsLoadingTopicSummaries(false);
    setIsLoadingItTopicSummaries(false);
    setIsOrchestrating(false);
    
    // Reset messages FIRST (so user sees immediate feedback) with mode selection prompt
    setMessages([{
      role: 'agent',
      agent: 'System',
      content: '🔄 Workspace cleared. Ready for a new review.\n\n' +
               'Please choose your chat mode using the buttons below:'
    }]);
    
    console.log('[Flow2] ✓ Workspace reset complete - ALL case flags cleared');
    
    // CRITICAL FIX: Use window.location.href for hard navigation
    // This forces a complete page reload, ensuring all state is truly reset
    // router.push() doesn't work reliably when URL is already similar
    window.location.href = '/document?flow=2';
  }, [isFlow2, router]);

  const handleExitITReview = () => {
    setCase4Active(false);
  };

  // Impact Simulator Handlers
  const handleEnterImpactSimulator = useCallback(() => {
    console.log('[ImpactSim] Entering simulator');
    
    // ✅ CRITICAL: Clear previous review state before starting Impact Simulator
    clearPreviousReviewState();
    
    setImpactSimulatorActive(true);
    impactSimulatorDispatch({ type: 'START' });
    
    // Add initial message
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'Impact Simulator',
      content: '📡 **Impact Simulator Initialized**\n\n' +
               'This is a deterministic mailbox decommissioning what-if analysis.\n\n' +
               '💬 Type **YES** to confirm and proceed.'
    }]);
  }, []);

  const handleExitImpactSimulator = useCallback(() => {
    console.log('[ImpactSim] Exiting simulator');
    setImpactSimulatorActive(false);
    impactSimulatorDispatch({ type: 'EXIT' });
    
    // Add exit message - prompt for mode selection again
    setMessages(prev => [...prev, {
      role: 'agent',
      agent: 'System',
      content: '👋 Impact Simulator exited.\n\n' +
               'Please choose your next action using the buttons below:'
    }]);
    
    // Reset chat mode so user must re-select
    setChatMode('unselected');
  }, []);
  
  // NEW: Phase 8 - Append findings to topic summaries when animation completes
  // Use ref to prevent duplicate calls
  const phase8CompleteHandledRef = useRef(false);
  const phase8SaveInProgressRef = useRef(false);
  
  const handlePhase8Complete = useCallback(async () => {
    // GUARD: Prevent duplicate execution for same run
    if (phase8CompleteHandledRef.current) {
      console.log('[Phase8] Already handled for this run, skipping');
      return;
    }
    
    if (!postRejectAnalysisData || !postRejectAnalysisData.findings) {
      return;
    }
    
    // GUARD: Prevent concurrent saves
    if (phase8SaveInProgressRef.current) {
      console.log('[Phase8] Save already in progress, skipping');
      return;
    }
    
    // Mark as handled immediately
    phase8CompleteHandledRef.current = true;
    
    console.log('[Phase8] Appending', postRejectAnalysisData.findings.length, 'findings to topic summaries');
    
    // Map findings to topic IDs based on content
    const findingsToTopicMap: Record<string, string> = {
      'Source of Funds': 'source_of_funds',
      'source': 'source_of_funds',
      'funds': 'source_of_funds',
      'wealth': 'source_of_wealth',
      'Offshore': 'ownership_ubo_control',
      'UBO': 'ownership_ubo_control',
      'ownership': 'ownership_ubo_control',
      'Policy': 'sanctions_pep_adverse_media',
      'regulation': 'sanctions_pep_adverse_media',
      'jurisdiction': 'geography_jurisdiction_risk',
    };
    
    // Create a copy of current summaries - read from state at call time
    const currentSummaries = flow2TopicSummaries;
    const updatedSummaries = [...currentSummaries];
    
    // For each finding, append to relevant topic
    postRejectAnalysisData.findings.forEach((finding: any) => {
      // Find matching topic based on keywords
      let targetTopicId: string | null = null;
      for (const [keyword, topicId] of Object.entries(findingsToTopicMap)) {
        if (finding.title.includes(keyword) || finding.detail.includes(keyword)) {
          targetTopicId = topicId;
          break;
        }
      }
      
      if (targetTopicId) {
        const topicIndex = updatedSummaries.findIndex(t => t.topic_id === targetTopicId);
        if (topicIndex !== -1) {
          // Append finding as a bullet point with severity indicator
          const severityIcon = finding.severity === 'high' ? '🔴' : finding.severity === 'medium' ? '🟠' : 'ℹ️';
          const newBullet = `${severityIcon} [EDD Finding] ${finding.detail}`;
          
          updatedSummaries[topicIndex] = {
            ...updatedSummaries[topicIndex],
            bullets: [...updatedSummaries[topicIndex].bullets, newBullet],
            coverage: finding.severity === 'high' ? 'WEAK' : updatedSummaries[topicIndex].coverage, // Downgrade if high severity
          };
          
          console.log(`[Phase8] Appended finding to topic: ${targetTopicId}`);
        }
      }
    });
    
    // Update state
    setFlow2TopicSummaries(updatedSummaries);
    
    // Save to checkpoint with deduplication
    const currentRunId = flowMonitorRunId; // Capture at call time
    if (currentRunId && !phase8SaveInProgressRef.current) {
      phase8SaveInProgressRef.current = true;
      
      try {
        const response = await fetch('/api/flow2/update-checkpoint-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            run_id: currentRunId,
            topic_summaries: updatedSummaries,
          }),
        });
        
        if (response.ok) {
          console.log('[Phase8] ✓ Saved updated summaries to checkpoint');
        } else {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('[Phase8] Failed to save updated summaries:', error);
        }
      } catch (error: any) {
        console.error('[Phase8] Failed to save updated summaries:', error.message);
      } finally {
        phase8SaveInProgressRef.current = false;
      }
    }
  }, [postRejectAnalysisData, flowMonitorRunId]); // REMOVED flow2TopicSummaries from deps to prevent loop
  
  // Reset phase8 handled flag when run_id changes
  useEffect(() => {
    phase8CompleteHandledRef.current = false;
  }, [flowMonitorRunId]);

  const getSectionColor = (status: SectionStatus) => {
    switch (status) {
      case 'pass':
        return 'border-green-400 bg-green-100'; // Phase 2-B: Softer green
      case 'fail':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'unreviewed':
      default:
        return 'border-slate-300 bg-white';
    }
  };

  const getStatusBadge = (status: SectionStatus) => {
    switch (status) {
      case 'pass':
        // Phase 2-B: No "approval" language, just detection
        return (
          <span 
            className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-md inline-flex flex-col items-start"
            title="Automated AI review completed. Human approval still required."
          >
            <span className="font-semibold">No issues identified</span>
            <span className="text-[10px] opacity-80 mt-0.5">(AI review)</span>
          </span>
        );
      case 'fail':
        return <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">✗ FAIL</span>;
      case 'warning':
        return <span className="px-3 py-1 bg-yellow-600 text-white text-sm font-semibold rounded-full">⚠ WARNING</span>;
      case 'unreviewed':
      default:
        return <span className="px-3 py-1 bg-slate-300 text-slate-600 text-sm font-semibold rounded-full">NOT REVIEWED</span>;
    }
  };

  // MILESTONE C: Clear human gate state when switching away from Flow2
  useEffect(() => {
    if (!isFlow2 && humanGateState) {
      setHumanGateState(null);
    }
  }, [isFlow2, humanGateState]);

  // Case 4: Early return if IT Review Mode is active
  if (case4Active) {
    return <Case4Container onExit={handleExitITReview} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">
          {isSubmitted 
            ? 'Deterministic Review Process' 
            : isFlow2 
            ? 'Agentic Review Process' 
            : 'Agentic Frameworks for Proactive Governance'}
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
                onClick={handleDownloadPDF}
                className="px-8 py-4 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold text-lg shadow-sm"
              >
                📥 Download
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[42%_58%] gap-6 pb-[450px]">
              {/* Left Column: Sections */}
              <div className="space-y-4">
              
              {/* MILESTONE C: Flow2 Workspace (Upload + Paste + Docs List) */}
              {isFlow2 && (
                <div className="mb-6 space-y-4">
                  {/* IT Review Button */}
                  <Flow2UploadPanel 
                    onDocumentsLoaded={handleFlow2Upload}
                    disabled={flow2Documents.length >= MAX_FLOW2_DOCUMENTS || isOrchestrating}
                  />
                  
                  <Flow2PastePanel
                    onDocumentAdded={handleFlow2PasteAdd}
                    disabled={flow2Documents.length >= MAX_FLOW2_DOCUMENTS || isOrchestrating}
                  />
                  
                  {flow2Documents.length > 0 && (
                    <Flow2DocumentsList
                      documents={flow2Documents}
                      onRemove={handleFlow2RemoveDocument}
                      onClearAll={handleFlow2ClearWorkspace}
                    />
                  )}
                  
                  {/* Derived Topics (Phase 3) */}
                  {derivedTopics.length > 0 && (
                    <Flow2DerivedTopics
                      topics={derivedTopics}
                      highlightedTopicKey={highlightedTopicKey}
                      onMoreInputsClick={handleMoreInputsClick}
                    />
                  )}
                </div>
              )}
              
              {/* Case 3: Guardrail Alert Banner (renders ABOVE Case 2 banner) */}
              {isFlow2 && case3Active && case3BlockedDocId && case3Issue && (() => {
                const blockedDoc = flow2Documents.find(d => d.doc_id === case3BlockedDocId);
                if (!blockedDoc) {
                  // Document was removed - auto-clear guardrail state
                  setCase3Active(false);
                  setCase3BlockedDocId(null);
                  setCase3Issue(null);
                  return null;
                }
                return (
                  <Case3GuardrailBanner
                    blockedDocId={case3BlockedDocId}
                    blockedDocument={blockedDoc}
                    issue={case3Issue}
                    onResolve={handleCase3Resolve}
                    onCancel={handleCase3Cancel}
                  />
                );
              })()}
              
              {/* Case 2 Demo Flow Banner */}
              {isFlow2 && case2State !== 'idle' && case2Data && (
                <Case2ProcessBanner
                  state={case2State}
                  data={case2Data}
                  collapsed={case2BannerCollapsed}
                  onToggleCollapse={() => setCase2BannerCollapsed(!case2BannerCollapsed)}
                  onAccept={handleCase2Accept}
                  isAcceptLoading={false}
                  onStart={handleCase2Start}
                  onTraceComplete={() => setCase2State('synthesized')}
                />
              )}
              
              {/* REMOVED: Flow2 Human Gate Panel - approval is done via email only, not on Document page */}
              {/* Initiator must NEVER see approve/reject controls (C1 constraint) */}

              {/* MILESTONE C: Flow2 Degraded Mode Banner */}
              {isFlow2 && isDegraded && (
                <div className="mb-4 bg-red-50 border-2 border-red-400 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">❌</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-800 mb-1">
                        Review Failed
                      </h3>
                      <p className="text-sm text-red-700 mb-2">
                        Graph execution encountered an error.
                      </p>
                      {degradedReason && (
                        <p className="text-xs text-red-600 mb-3 font-mono bg-red-100 p-2 rounded">
                          {degradedReason}
                        </p>
                      )}
                      <button
                        onClick={handleFlow2Retry}
                        disabled={isOrchestrating}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm disabled:opacity-50"
                      >
                        🔄 Retry Review
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Flow2: Topic Summary Panel - ALWAYS VISIBLE, switches mode by config */}
              {isFlow2 && (
                <TopicSummariesPanel
                  panelTitle={
                    case2ProcessAccepted
                      ? CASE2_CS_INTEGRATION_CONFIG.panel_title
                      : (case4Active ? IT_BULLETIN_CONFIG.panel_title : KYC_FLOW2_CONFIG.panel_title)
                  }
                  panelSubtitle={
                    case2ProcessAccepted
                      ? CASE2_CS_INTEGRATION_CONFIG.panel_subtitle
                      : (case4Active ? IT_BULLETIN_CONFIG.panel_subtitle : KYC_FLOW2_CONFIG.panel_subtitle)
                  }
                  topicSummaries={
                    case2ProcessAccepted
                      ? case2TopicSummaries
                      : (case4Active ? itBulletinTopicSummaries : flow2TopicSummaries)
                  }
                  isLoading={
                    case2ProcessAccepted
                      ? isLoadingCase2TopicSummaries
                      : (case4Active ? isLoadingItTopicSummaries : isLoadingTopicSummaries)
                  }
                  documents={flow2Documents}
                />
              )}
              
              {/* Flow2: Risk Details Panel */}
              {isFlow2 && currentIssues.length > 0 && (
                <Flow2RiskDetailsPanel
                  riskLevel={computeRiskLevel(currentIssues, coverageGaps)}
                  riskSignals={currentIssues.filter((i: any) => i.category === 'kyc_risk')}
                  coverageGaps={coverageGaps}
                  conflicts={conflicts}
                  riskScore={graphReviewTrace?.summary?.riskScore}
                  visible={true}
                />
              )}
              
              {/* Phase 4: Case2 Recommended Stages - NOW INTEGRATED INTO FLOW MONITOR */}
              {/* Case2 stages now appear in Flow Monitor (right panel) when case2ProcessAccepted=true */}
              
              {/* Flow1 ONLY: Render document sections */}
              {!isFlow2 && (
                sections.map((section, index) => (
                <div
                  key={section.id}
                  id={`sec-${index + 1}`}
                  data-section-id={section.id}
                  data-section-title={section.title}
                  className={`scroll-mt-24 border-4 rounded-xl p-6 transition-all ${getSectionColor(section.status)} ${
                    reviewingSectionId === section.id ? 'animate-pulse' : ''
                  } ${
                    highlightedSectionId === section.id ? 'ring-4 ring-blue-500 ring-offset-2' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">
                        Section {index + 1}: {section.title}
                      </h2>
                      <div className="flex items-center gap-2">
                      {getStatusBadge(section.status)}
                        {/* AUDIT: Show accepted warnings count (non-blocking marker) */}
                        {(() => {
                          const acceptedWarningsInSection = currentIssues.filter(issue => {
                            if (!issue.sectionId || typeof issue.sectionId !== 'string') return false;
                            const issueSecId = issue.sectionId.match(/section-(\d+)/);
                            const issueSectionId = issueSecId ? parseInt(issueSecId[1]) : null;
                            return issueSectionId === section.id && 
                                   issue.status === 'accepted' && 
                                   issue.severity === 'WARNING';
                          }).length;
                          
                          if (acceptedWarningsInSection === 0) return null;
                          
                          return (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              ⚠️ {acceptedWarningsInSection} warning{acceptedWarningsInSection > 1 ? 's' : ''} accepted
                            </span>
                          );
                        })()}
                      </div>
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
                          hasComplianceIssue && hasComplianceKeywords(editContent)
                            ? 'border-4 border-red-600 bg-red-50 focus:ring-red-500'
                            : 'border-2 border-blue-400 focus:ring-blue-500'
                        }`}
                      />
                      {hasComplianceIssue && hasComplianceKeywords(editContent) && (
                        <div className="mb-2 p-3 bg-red-100 border-2 border-red-500 rounded-lg">
                          <div className="text-red-800 text-sm font-bold mb-2">
                            ⚠️ Compliance Violation Detected:
                          </div>
                          <div className="text-red-700 text-sm leading-relaxed">
                            {highlightComplianceKeywords(editContent)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Highlight compliance keywords if section has FAIL status */}
                      {section.status === 'fail' && hasComplianceKeywords(section.content) ? (
                        <div className="mb-4">
                          <div className="mb-2 p-2 bg-red-100 border-2 border-red-500 rounded text-red-800 text-sm font-bold">
                            ⚠️ Compliance Violation: Prohibited terms detected
                          </div>
                          <p className="text-slate-700 leading-relaxed">
                            {highlightComplianceKeywords(section.content)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-700 mb-4 leading-relaxed">
                          {section.content}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => handleReReviewSection(section.id)}
                      disabled={reviewingSectionId === section.id}
                      className={`px-6 py-2 text-white rounded-lg transition-colors font-semibold ${
                        reviewingSectionId === section.id
                          ? 'bg-slate-400 cursor-wait'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {reviewingSectionId === section.id ? '⏳ Reviewing...' : '🔄 Re-review Section'}
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
              ))
              )}
              </div>

              {/* Right Column: Review Results Panel */}
              {isFlow2 ? (
                impactSimulatorActive ? (
                  // Impact Simulator Panel (replaces right panel when active)
                  <div className="lg:col-span-1">
                    <div className="sticky top-6">
                      <ImpactSimulatorPanel
                        state={impactSimulatorState}
                        dispatch={impactSimulatorDispatch}
                        onExit={handleExitImpactSimulator}
                      />
                    </div>
                  </div>
                ) : (
                  // FLOW2: Clean, minimal right panel with Flow Monitor
                  <Flow2RightPanel
                    flow2Documents={flow2Documents}
                    isOrchestrating={isOrchestrating}
                    orchestrationResult={orchestrationResult}
                    isDegraded={isDegraded}
                    degradedReason={degradedReason}
                    onRunReview={handleGraphKycReview}
                    onRetry={handleFlow2Retry}
                    onOpenAgents={() => setShowAgentsDrawer(true)}
                    agentParticipants={agentParticipants}
                    onEnterITReview={handleEnterITReview}
                    flowMonitorRunId={flowMonitorRunId}
                    flowMonitorStatus={flowMonitorStatus}
                    flowMonitorMetadata={flowMonitorMetadata}
                    onFlowStatusChange={setFlowMonitorStatus}
                    postRejectAnalysisData={postRejectAnalysisData}
                    onPhase8Complete={handlePhase8Complete}
                    onAnimationPlayed={handleAnimationPlayed}
                    case3Active={case3Active}
                    case4Active={case4Active}
                    riskData={{
                      riskLevel: computeRiskLevel(currentIssues, coverageGaps),
                      hasHighRisk: currentIssues.some((i: any) => (i.severity === 'high' || i.severity === 'critical') && i.category === 'kyc_risk'),
                      warningsCount: currentIssues.filter((i: any) => i.severity === 'medium').length,
                      riskSignals: currentIssues.filter((i: any) => i.category === 'kyc_risk')
                    }}
                    onStartNewReview={handleStartNewReview}
                    case2CustomStages={getCase2FlowMonitorStages()}
                    case2CurrentStageIndex={getCase2CurrentStageIndex()}
                    isDataExtracting={dataExtractionState.isExtracting}
                    dataExtractionContext={dataExtractionState.context}
                    onEnterImpactSimulator={handleEnterImpactSimulator}
                    impactSimulatorActive={impactSimulatorActive}
                  />
                )
              ) : (
                // FLOW1: Original right panel with all features
              <div className="sticky top-6 h-[calc(100vh-4rem)] overflow-y-auto">
                <div className="bg-white border-2 border-slate-300 rounded-xl p-6">
                  
                  {/* Document Status Dock - Sticky merged component */}
                  <div className="sticky top-0 -mt-6 -mx-6 mb-6 bg-white border-b-2 border-slate-300 p-4 z-10">
                    {/* Status Badge Row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase ${
                          documentStatus.status === 'READY_TO_SUBMIT'
                            ? 'bg-green-600 text-white'
                            : documentStatus.status === 'REQUIRES_SIGN_OFF'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}>
                          {documentStatus.status.replace(/_/g, ' ')}
                        </span>
                        {orchestrationResult && (
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                          (orchestrationResult.metadata?.flow_version || selectedFlowId) === 'compliance-review-v1'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                        }`}>
                          {orchestrationResult.metadata?.flow_version || selectedFlowId}
                          </span>
                        )}
                        </div>
                          </div>

                    {/* Compact Metrics Row */}
                    {orchestrationResult && (
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-slate-50 px-2 py-1 rounded">
                          <span className="font-semibold">Sections:</span> {sections.length}
                          </div>
                        <div className="bg-slate-50 px-2 py-1 rounded">
                          <span className="font-semibold">Issues:</span> {currentIssues.length}
                        </div>
                        {documentStatus.counts.totalFails > 0 && (
                          <div className="bg-red-50 px-2 py-1 rounded text-red-700">
                            <span className="font-semibold">Blocking:</span> {documentStatus.counts.totalFails}
                            </div>
                          )}
                        {documentStatus.counts.totalWarnings > 0 && (
                          <div className="bg-yellow-50 px-2 py-1 rounded text-yellow-700">
                            <span className="font-semibold">Warnings:</span> {documentStatus.counts.totalWarnings}
                        </div>
                        )}
                      </div>
                    )}

                    {/* Status Explanation */}
                    <p className="text-xs text-slate-700 mb-3 leading-relaxed">
                      {documentStatus.explanation}
                    </p>

                    {/* AUDIT: Accepted Warnings Summary - MUST show after Pass with Signature */}
                    {currentIssues.filter(i => i.status === 'accepted' && i.severity === 'WARNING').length > 0 && (
                      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-purple-900 mb-1.5">
                          <span className="text-base">⚠️</span>
                          <span className="font-bold text-sm">
                            {currentIssues.filter(i => i.status === 'accepted' && i.severity === 'WARNING').length} warning{currentIssues.filter(i => i.status === 'accepted' && i.severity === 'WARNING').length > 1 ? 's' : ''} accepted with signature
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-purple-800">
                          <span className="text-sm">✍️</span>
                          <span className="text-sm font-semibold">
                            [{Array.from(new Set(currentIssues.filter(i => i.status === 'accepted' && i.severity === 'WARNING' && i.acceptedBy).map(i => i.acceptedBy!))).join(', ') || 'Victoria'}] Warning accepted with signature
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Trace ID (secondary) */}
                    {orchestrationResult && (
                      <div className="text-xs text-slate-500 font-mono mb-3">
                        Trace: {orchestrationResult.parent_trace_id}
                      </div>
                    )}

                    {/* Actions Row - Enhanced for better prominence */}
                    <div className="flex flex-col gap-2">
                      {/* Phase 4: 3-State Mode Indicator (Flow2 only) */}
                      {isFlow2 && (
                        <div className="mb-1 flex flex-col items-center gap-1">
                          <div className="text-center">
                            {case2ProcessAccepted ? (
                              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                ⚙️ Mode: CS Integration Exception Process
                              </span>
                            ) : case2State !== 'idle' && case2State !== 'started' ? (
                              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold italic">
                                ⚠️ Mode: Case2 Triggered (Pending Acceptance)
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">
                                ⚙️ Mode: Standard KYC Review
                              </span>
                            )}
                          </div>
                          
                          {/* Phase 5: Exit Case2 button (only show when Case2 is active) */}
                          {(case2State !== 'idle' || case2ProcessAccepted) && (
                            <button
                              onClick={handleExitCase2Mode}
                              className="text-xs text-slate-500 hover:text-slate-700 underline"
                            >
                              ← Exit Case2 / Switch to Standard Review
                            </button>
                          )}
                        </div>
                      )}
                      
                      <button
                        onClick={isFlow2 ? handleGraphKycReview : handleFullComplianceReview}
                        disabled={
                          isOrchestrating || 
                          isSubmitted || 
                          (reviewConfig.validationStatus === 'required' || reviewConfig.validationStatus === 'failed')
                        }
                        data-testid={isFlow2 ? "flow2-run-graph-review" : "flow1-run-review"}
                        className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                          isOrchestrating || 
                          isSubmitted || 
                          (reviewConfig.validationStatus === 'required' || reviewConfig.validationStatus === 'failed')
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : isFlow2
                            ? 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                        }`}
                        title={
                          reviewConfig.validationStatus === 'required' 
                            ? 'Validate agent feasibility first' 
                            : reviewConfig.validationStatus === 'failed'
                            ? 'Fix validation errors first'
                            : ''
                        }
                      >
                        {isOrchestrating ? '🔄 Running Review...' : isFlow2 ? '🕹️ Run Process Review' : '🔍 Run Full Review'}
                      </button>
                      
                      {documentStatus.status === 'REQUIRES_SIGN_OFF' && !signOff && (
                        <button
                          onClick={() => {
                            const newSignOff = createSignOff(currentIssues, `run-${reviewRunId}`);
                            setSignOff(newSignOff);
                            saveSignOff(docKey || 'default', newSignOff);
                            setMessages(prev => [...prev, {
                              role: 'agent',
                              agent: 'System',
                              content: `✓ Warning sign-off recorded by ${newSignOff.signerName}. Document is now ready for submission.`
                            }]);
                          }}
                          className="w-full px-5 py-3 bg-yellow-600 text-white rounded-lg text-sm font-bold hover:bg-yellow-700 transition-all shadow-md hover:shadow-lg"
                        >
                          ✍️ Sign Off on Warnings
                        </button>
                      )}
                      
                      {/* Case 1: Approval Evidence Attestation (only when ready to submit) */}
                      {!isFlow2 && documentStatus.isSubmittable && !isSubmitted && (
                        <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={case1Attested}
                              onChange={(e) => setCase1Attested(e.target.checked)}
                              className="mt-0.5 w-5 h-5 text-blue-600 border-2 border-blue-400 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-blue-900 group-hover:text-blue-700">
                                I have reviewed the Approval Evidence
                              </span>
                              <p className="text-xs text-blue-600 mt-1">
                                Submission requires confirmation that the audit trail has been reviewed.
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                      
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitted || !documentStatus.isSubmittable || (!isFlow2 && !case1Attested)}
                        className={`w-full px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-md ${
                          isSubmitted || !documentStatus.isSubmittable || (!isFlow2 && !case1Attested)
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 text-white hover:bg-slate-800 hover:shadow-lg'
                        }`}
                        title={
                          !isFlow2 && !case1Attested && documentStatus.isSubmittable && !isSubmitted
                            ? 'Please review the Approval Evidence and confirm before submitting.'
                            : ''
                        }
                      >
                        {isSubmitted ? '✓ Submitted' : '📤 Submit Document'}
                      </button>
                      
                      {/* Disabled state helper text */}
                      {!documentStatus.isSubmittable && !isSubmitted && (
                        <p className="text-xs text-red-600 text-center font-semibold">
                          {documentStatus.status === 'NOT_READY' 
                            ? '⚠️ Resolve all blocking issues before submission'
                            : '⚠️ Sign off on warnings before submission'
                          }
                        </p>
                      )}
                    </div>

                    {/* Sign-Off Status */}
                    {signOff && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <span className="font-semibold text-blue-900">✍️ Signed by {signOff.signerName}</span>
                        <span className="text-blue-600 ml-2">({new Date(signOff.signedAt).toLocaleDateString()})</span>
                      </div>
                    )}
                  </div>

                  {!orchestrationResult ? (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-3">🔍</div>
                      <p className="text-slate-600 text-sm">
                        Click "Run Review" above to analyze this document.
                      </p>
                    </div>
                  ) : (
                    <>

                      {/* Phase 2-D: Issues Grouped by Section */}
                      {currentIssues.length > 0 && (() => {
                        // FIX 2: Use memoized bundles for proper reactivity
                        const bundles = groupedIssuesBundles;
                        
                        // Auto-expand FAIL bundles on first render
                        if (bundles.length > 0 && expandedBundles.size === 0) {
                          const failBundles = bundles.filter(b => b.status === 'fail').map(b => b.sectionIndex);
                          setExpandedBundles(new Set(failBundles));
                        }
                        
                        if (bundles.length === 0) return null;
                        
                        return (
                          <div className="mb-6">
                            <h4 className="font-bold text-sm text-slate-800 mb-3">
                              Issues by Section ({bundles.length} section{bundles.length > 1 ? 's' : ''})
                            </h4>
                            <div className="space-y-3">
                              {bundles.filter(bundle => !signedOffWarnings.has(bundle.sectionIndex)).map(bundle => {
                                const isExpanded = expandedBundles.has(bundle.sectionIndex);
                                const toggleExpansion = () => {
                                  setExpandedBundles(prev => {
                                    const updated = new Set(prev);
                                    if (updated.has(bundle.sectionIndex)) {
                                      updated.delete(bundle.sectionIndex);
                                    } else {
                                      updated.add(bundle.sectionIndex);
                                    }
                                    return updated;
                                  });
                                };
                                
                                return (
                                  <div 
                                    key={bundle.sectionIndex}
                                    className={`border-2 rounded-lg overflow-hidden ${
                                      bundle.status === 'fail' 
                                        ? 'border-red-500 bg-red-50' 
                                        : 'border-yellow-500 bg-yellow-50'
                                    }`}
                                  >
                                    {/* Bundle Header */}
                                    <div className="p-3 bg-white border-b-2 border-slate-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={toggleExpansion}
                                            className="text-slate-600 hover:text-slate-800 font-bold"
                                            aria-expanded={isExpanded}
                                          >
                                            {isExpanded ? '▼' : '▶'}
                                          </button>
                                          <h5 className="font-bold text-sm text-slate-800">
                                            Section {bundle.sectionIndex + 1} — {bundle.sectionTitle}
                                          </h5>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            bundle.status === 'fail' 
                                              ? 'bg-red-600 text-white' 
                                              : 'bg-yellow-600 text-white'
                                          }`}>
                                            {bundle.status === 'fail' ? '✗ FAIL' : '⚠ WARNING'}
                                          </span>
                                          <span className="text-xs text-slate-600">
                                            ({bundle.issues.length} issue{bundle.issues.length > 1 ? 's' : ''})
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {/* Action Buttons */}
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => jumpToSection(bundle.sectionIndex)}
                                          className="px-2 py-1 text-[11px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-all"
                                        >
                                          🔍 Jump to section
                                        </button>
                                        {bundle.status === 'warning' && !signedOffWarnings.has(bundle.sectionIndex) && (
                                          <button
                                            onClick={() => {
                                              // Mark this section's warnings as signed off
                                              setSignedOffWarnings(prev => new Set(prev).add(bundle.sectionIndex));
                                              
                                              // AUDIT: Mark warnings as 'accepted' instead of deleting
                                              const sectionKey = `section-${bundle.sectionId}`;
                                              const now = new Date().toISOString();
                                              
                                              const updatedIssues = currentIssues.map(issue => {
                                                // Match warnings for this section
                                                if (issue.sectionId === sectionKey && issue.severity === 'WARNING') {
                                                  console.log('[Pass with signature] Marking issue as accepted:', issue.id);
                                                  return {
                                                    ...issue,
                                                    status: 'accepted' as const,
                                                    acceptedBy: 'Victoria',
                                                    acceptedAt: now
                                                  };
                                                }
                                                return issue;
                                              });
                                              
                                              console.log('[Pass with signature] Updated issues:', updatedIssues.filter(i => i.status === 'accepted'));
                                              setCurrentIssues(updatedIssues);
                                              
                                              // Force recomputation by incrementing review run ID
                                              setReviewRunId(prev => prev + 1);
                                              
                                              // Update section to pass status
                                              setSections(prev => prev.map(s => 
                                                s.id === bundle.sectionId
                                                  ? {
                                                      ...s,
                                                      status: 'pass' as SectionStatus,
                                                      log: [
                                                        ...s.log,
                                                        {
                                                          agent: 'Victoria',
                                                          action: 'Warning accepted with signature',
                                                          timestamp: new Date()
                                                        }
                                                      ]
                                                    }
                                                  : s
                                              ));
                                              
                                              // Add message
                                              setMessages(prev => [...prev, {
                                                role: 'agent',
                                                agent: 'Victoria',
                                                content: `✓ Warning for Section ${bundle.sectionIndex + 1} "${bundle.sectionTitle}" has been accepted with signature.`
                                              }]);
                                              setHasNewChatMessage(true);
                                            }}
                                            className="px-2 py-1 text-[11px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 rounded transition-all"
                                          >
                                            ✍️ Pass with signature
                                          </button>
                                        )}
                                        {signedOffWarnings.has(bundle.sectionIndex) && (
                                          <span className="px-2 py-1 text-[11px] font-medium bg-purple-50 text-purple-700 rounded">
                                            ✓ Warning accepted by Victoria
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Bundle Body (collapsible) */}
                                    {isExpanded && (
                                      <div className="p-3 space-y-3">
                                        {/* Issue Bullets (compact, clickable) */}
                                        <div className="bg-white rounded p-3 border border-slate-300">
                                          <div className="font-semibold text-[10px] text-slate-600 mb-2 uppercase">Issues (click to jump)</div>
                                          <ul className="space-y-1">
                                            {bundle.issues.map((issue: any, idx: number) => {
                                              // Determine agent for attribution
                                              const agentId = issue.agentId || normalizeAgentId(issue.agent);
                                              const agentMeta = agentId ? getAgentMetadata(agentId) : null;
                                              
                                              return (
                                                <li 
                                                  key={idx} 
                                                  onClick={() => jumpToSection(bundle.sectionIndex)}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                      e.preventDefault();
                                                      jumpToSection(bundle.sectionIndex);
                                                    }
                                                  }}
                                                  role="button"
                                                  tabIndex={0}
                                                  className="text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-all hover:scale-[1.01]"
                                                >
                                                  <span className={`font-semibold uppercase text-[10px] mr-1 ${
                                                    issue.severity === 'critical' ? 'text-red-700' :
                                                    issue.severity === 'high' ? 'text-orange-700' :
                                                    issue.severity === 'medium' ? 'text-yellow-700' :
                                                    'text-blue-700'
                                                  }`}>
                                                    [{issue.severity}]
                                                  </span>
                                                  {issue.description}
                                                  {agentMeta && (
                                                    <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] rounded font-medium">
                                                      by {agentMeta.displayName}
                                                    </span>
                                                  )}
                                                  <span className="ml-1 text-blue-600 text-[10px]">→</span>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                        
                                        {/* Remediation Area (shown once per section) */}
                                        {bundle.proposedText && (
                                          <div className="bg-white rounded p-3 border border-slate-300">
                                            <div className="flex items-center gap-1.5 mb-2">
                                              <span className="text-sm">📄</span>
                                              <span className="font-semibold text-[11px] text-slate-700 uppercase tracking-wide">
                                                Proposed Compliant Version
                                              </span>
                                            </div>
                                            <textarea
                                              readOnly
                                              value={bundle.proposedText}
                                              rows={8}
                                              className="w-full text-[11px] font-mono bg-slate-50 border border-slate-300 rounded p-2 text-slate-700 resize-none leading-relaxed"
                                            />
                                            <div className="flex gap-2 mt-2">
                                              <button
                                                onClick={() => handleCopyProposedFix(
                                                  `bundle-${bundle.sectionIndex}`, 
                                                  bundle.proposedText!,
                                                  `Section ${bundle.sectionIndex + 1}`
                                                )}
                                                className={`flex-1 px-2 py-1.5 rounded text-[11px] font-medium transition-all ${
                                                  copiedIssueKey === `bundle-${bundle.sectionIndex}`
                                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                                }`}
                                              >
                                                {copiedIssueKey === `bundle-${bundle.sectionIndex}` ? '✓ Copied!' : '📋 Copy'}
                                              </button>
                                              {bundle.sectionId && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleApplyProposedFix(bundle.sectionId!, bundle.proposedText!);
                                                  }}
                                                  className={`px-3 py-1.5 rounded text-[11px] font-semibold transition-all ${
                                                    appliedFixes[bundle.sectionId]
                                                      ? 'bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200'
                                                      : 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'
                                                  }`}
                                                  title={appliedFixes[bundle.sectionId] ? 'Restore previous content' : 'Write proposed text into section'}
                                                >
                                                  {appliedFixes[bundle.sectionId] ? '↩️ Undo Apply' : `✓ Apply to Section ${bundle.sectionIndex + 1}`}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Checklist (if applicable) */}
                                        {bundle.hasChecklist && (
                                          <div className="bg-white rounded p-3 border border-slate-300">
                                            <div className="flex items-center gap-1.5 mb-2">
                                              <span className="text-sm">📋</span>
                                              <span className="font-semibold text-[11px] text-slate-700 uppercase tracking-wide">
                                                Checklist / Next Steps
                                              </span>
                                            </div>
                                            <ul className="space-y-1 list-disc list-inside text-xs text-slate-700">
                                              <li>Gather supporting evidence documentation</li>
                                              <li>Clarify wording and ensure consistency</li>
                                              <li>Confirm compliance with internal guidelines</li>
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* AUDIT: Accepted Warnings Section (collapsible, bottom of issues panel) */}
                      {(() => {
                        const acceptedWarnings = currentIssues.filter(issue => 
                          issue.status === 'accepted' && issue.severity === 'WARNING'
                        );
                        
                        if (acceptedWarnings.length === 0) return null;
                        
                        return (
                          <div className="mb-6 border-2 border-purple-200 bg-purple-50 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setShowAcceptedWarnings(!showAcceptedWarnings)}
                              className="w-full p-3 flex items-center justify-between hover:bg-purple-100 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-purple-700 font-bold">{showAcceptedWarnings ? '▼' : '▶'}</span>
                                <h4 className="font-bold text-sm text-purple-800">
                                  Accepted Warnings ({acceptedWarnings.length})
                                </h4>
                                <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded uppercase">
                                  AUDIT
                                </span>
                              </div>
                              <span className="text-xs text-purple-600">
                                {showAcceptedWarnings ? 'Click to collapse' : 'Click to expand'}
                              </span>
                            </button>
                            
                            {showAcceptedWarnings && (
                              <div className="p-4 bg-white border-t-2 border-purple-200 space-y-3">
                                {acceptedWarnings.map((warning, idx) => {
                                  // Find section for this warning (with null safety)
                                  const sectionMatch = warning.sectionId && typeof warning.sectionId === 'string' 
                                    ? warning.sectionId.match(/section-(\d+)/) 
                                    : null;
                                  const sectionId = sectionMatch ? parseInt(sectionMatch[1]) : null;
                                  const section = sectionId ? sections.find(s => s.id === sectionId) : null;
                                  const sectionIndex = section ? sections.findIndex(s => s.id === sectionId) : -1;
                                  
                                  return (
                                    <div key={warning.id || idx} className="p-3 bg-purple-50 border border-purple-200 rounded">
                                      <div className="flex items-start gap-2 mb-2">
                                        <span className="text-purple-600 text-xs font-bold">⚠</span>
                                        <div className="flex-1">
                                          <div className="text-xs font-bold text-purple-800 mb-1">
                                            {section && `Section ${sectionIndex + 1} — ${section.title}`}
                                          </div>
                                          <div className="text-xs text-slate-700">
                                            <span className="font-semibold">{warning.title || 'Warning'}:</span> {warning.message}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-purple-700 border-t border-purple-200 pt-2 mt-2">
                                        <span className="font-bold">✍ Signed by {warning.acceptedBy || '—'}</span>
                                        <span>•</span>
                                        <span>{warning.acceptedAt ? new Date(warning.acceptedAt).toISOString().split('T')[0] : '—'}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Document-Level Issues (if any) */}
                      {getDocumentLevelIssues(orchestrationResult).length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-bold text-sm text-slate-800 mb-3">Document-Level Issues ({getDocumentLevelIssues(orchestrationResult).length})</h4>
                          <div className="space-y-2">
                            {getDocumentLevelIssues(orchestrationResult).map((issue: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg bg-slate-50 border-l-4 border-slate-400 text-xs">
                                <div className="font-bold mb-1 uppercase text-[10px] text-slate-600">{issue.severity}</div>
                                <div className="text-slate-700">{issue.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evidence Requests (Collapsible) */}
                      {orchestrationResult.artifacts?.evidence_requests?.requests && orchestrationResult.artifacts.evidence_requests.requests.length > 0 && (
                        <details className="mb-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <summary className="p-3 cursor-pointer font-semibold text-sm text-slate-800 hover:bg-slate-100">
                            Evidence Requests ({orchestrationResult.artifacts.evidence_requests.requests.length})
                          </summary>
                          <div className="p-3 space-y-2 border-t border-slate-200">
                            {orchestrationResult.artifacts.evidence_requests.requests.map((req: any, idx: number) => (
                              <div key={idx} className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                                <div className="font-bold mb-1">{req.priority || 'Medium'} Priority</div>
                                <div>{req.request_text}</div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Client Communication (Collapsible) */}
                      {orchestrationResult.artifacts?.client_communication && (
                        <details className="mb-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <summary className="p-3 cursor-pointer font-semibold text-sm text-slate-800 hover:bg-slate-100">
                            Client Communication Preview
                          </summary>
                          <div className="p-3 border-t border-slate-200">
                            <div className="text-xs">
                              <div className="font-bold mb-1 text-slate-800">{orchestrationResult.artifacts.client_communication.subject}</div>
                              <div className="text-slate-600">
                                {orchestrationResult.artifacts.client_communication.body}
                              </div>
                            </div>
                          </div>
                        </details>
                      )}

                      {/* Agent Timeline */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-slate-800 mb-2">Agent Timeline ({orchestrationResult.execution?.steps?.length || 0} steps)</h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {orchestrationResult.execution?.steps?.map((step: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded border border-slate-200">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                step.status === 'completed' || step.status === 'success' ? 'bg-green-500' : 
                                step.status === 'failed' || step.status === 'error' ? 'bg-red-500' : 
                                'bg-slate-400'
                              }`}></span>
                              <span className="font-mono text-slate-600 flex-1 truncate">{step.agent_id}</span>
                              <span className="text-slate-500 flex-shrink-0">{step.latency_ms}ms</span>
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

                      {/* Audit Log */}
                      {orchestrationResult.artifacts?.audit_log && (
                        <div className="text-xs text-slate-600 bg-white px-3 py-2 rounded border border-slate-200">
                          <span className="font-semibold">Audit:</span> {orchestrationResult.artifacts.audit_log.audit_id} @ {new Date(orchestrationResult.artifacts.audit_log.timestamp).toLocaleString()}
                        </div>
                      )}
                    </>
                  )}

                  {/* Control Buttons */}
                  <div className="mt-6 space-y-3">
                    {/* Agents Button with Badge */}
                    <button
                      onClick={() => setShowAgentsDrawer(true)}
                      data-testid="agent-panel-button"
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>🤖 Agents</span>
                      {agentParticipants.length > 0 && (
                        <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-bold rounded-full">
                          {agentParticipants.length}
                        </span>
                      )}
                    </button>

                    {/* Flow Selector */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Review Type:
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="flow"
                            value="compliance-review-v1"
                            checked={selectedFlowId === 'compliance-review-v1'}
                            onChange={(e) => setSelectedFlowId(e.target.value)}
                            disabled={isOrchestrating || isSubmitted}
                            className="w-3 h-3 text-blue-600 focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                          />
                          <span className="ml-2 text-xs text-slate-700">
                            Compliance Review
                          </span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="flow"
                            value="contract-risk-review-v1"
                            checked={selectedFlowId === 'contract-risk-review-v1'}
                            onChange={(e) => setSelectedFlowId(e.target.value)}
                            disabled={isOrchestrating || isSubmitted}
                            className="w-3 h-3 text-purple-600 focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                          />
                          <span className="ml-2 text-xs text-slate-700">
                            Contract Risk Review
                          </span>
                        </label>
                      </div>
                    </div>
                      </div>
                        </div>
              </div>
              )}
            </div>

            {/* Sticky Chat Panel at Bottom - Resizable */}
            <div 
              style={{
                height: isChatExpanded ? `${chatHeight}px` : '50px',
                minHeight: '50px',
                maxHeight: '80vh'
              }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] transition-none"
            >
              {/* Resize Handle (only visible when expanded) */}
              {isChatExpanded && (
                <div
                  className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize bg-slate-300 hover:bg-blue-400 transition-colors flex items-center justify-center group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startY = e.clientY;
                    const startHeight = chatHeight;
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const deltaY = startY - moveEvent.clientY;
                      const newHeight = Math.min(
                        Math.max(startHeight + deltaY, 200), // Min 200px
                        window.innerHeight * 0.8 // Max 80vh
                      );
                      setChatHeight(newHeight);
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  title="Drag to resize chat window"
                >
                  <div className="w-12 h-1 bg-slate-400 rounded-full group-hover:bg-blue-500" />
                </div>
              )}
              
              <div className="flex flex-col h-full max-w-7xl mx-auto px-6 pt-2">
                {/* Message History (only when expanded) */}
                {isChatExpanded && (
                  <div className="flex-1 overflow-y-auto bg-slate-50 p-4 -mx-6">
                    <div className="max-w-7xl mx-auto px-6">
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
                              
                              {/* Voice Button */}
                              {msg.role === 'agent' && isSupported && (
                                <button
                                  onClick={() => {
                                    if (speakingMessageIndex === idx && isSpeaking) {
                                      stop();
                                      setSpeakingMessageIndex(null);
                                    } else {
                                      stop();
                                      speak(msg.content, 'english');
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
                  </div>
                )}
                
                {/* Input Bar (always visible) */}
                <div className="flex flex-col">
                  {/* Quick Action Buttons - Mode Selection */}
                  {isChatExpanded && chatMode === 'unselected' && !impactSimulatorActive && (
                    <div className="mb-3 px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Choose Chat Mode:</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setChatMode('process_review');
                            setMessages(prev => [...prev, 
                              {
                                role: 'user',
                                content: '1'
                              },
                              {
                                role: 'agent',
                                agent: 'System',
                                content: '✅ **Process Review Chat Mode** activated.\n\n' +
                                         'You can now:\n' +
                                         '• Ask about CS Integration Exception reviews\n' +
                                         '• Trigger Case 2 workflows\n' +
                                         '• Upload documents for compliance review\n\n' +
                                         '💬 Type your question or trigger phrase to begin.'
                              }
                            ]);
                            setHasNewChatMessage(true);
                          }}
                          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm shadow-md flex items-center justify-center gap-2"
                        >
                          <span>🤖</span>
                          <span>Process Review</span>
                        </button>
                        <button
                          onClick={() => {
                            setChatMode('it_impact');
                            setMessages(prev => [...prev,
                              {
                                role: 'user',
                                content: '2'
                              },
                              {
                                role: 'agent',
                                agent: 'System',
                                content: '✅ **IT Impact Chat Mode** activated.\n\n' +
                                         'Ready to analyze mailbox decommissioning impact.\n\n' +
                                         '💬 **To start the Impact Simulator, type:**\n' +
                                         '👉 `"What is the impact of mailbox decommissioning?"`\n\n' +
                                         'Or click the **🧩 Run Impact Simulator** button on the right.'
                              }
                            ]);
                            setHasNewChatMessage(true);
                          }}
                          className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold text-sm shadow-md flex items-center justify-center gap-2"
                        >
                          <span>📊</span>
                          <span>IT Impact</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Impact Simulator Mode Indicator (ONLY show when expanded) */}
                  {impactSimulatorActive && isChatExpanded && (
                    <div className="mb-2 px-3 py-2 bg-purple-100 border border-purple-300 rounded-lg">
                      <p className="text-xs font-bold text-purple-800">
                        🧩 MODE: Impact Simulator Active
                      </p>
                      <p className="text-xs text-purple-600">
                        Chat commands are routed to the simulator. Type <span className="font-mono font-semibold">EXIT</span> to return to normal mode.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 py-2 bg-white border-t border-slate-200">
                    {/* Toggle Button */}
                    <button
                      onClick={() => setIsChatExpanded(!isChatExpanded)}
                      aria-label={isChatExpanded ? "Collapse chat" : "Expand chat"}
                      aria-expanded={isChatExpanded}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-600 font-bold relative"
                    >
                      {isChatExpanded ? '▼' : '▲'}
                      {!isChatExpanded && hasNewChatMessage && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full animate-pulse"></span>
                      )}
                    </button>
                    
                    {/* Collapsed State Helper Text */}
                    {!isChatExpanded && chatMode === 'unselected' && !impactSimulatorActive && (
                      <div className="flex-1 flex items-center justify-center gap-2">
                        <span className="text-sm font-semibold text-slate-600">👆 Open chat to choose mode</span>
                      </div>
                    )}
                    {!isChatExpanded && impactSimulatorActive && impactSimulatorState.phase === 'await_confirm' && (
                      <div className="flex-1 flex items-center justify-center gap-2">
                        <span className="text-sm font-semibold text-blue-600">👆 Open chat - Simulator ready to start</span>
                      </div>
                    )}
                    {!isChatExpanded && impactSimulatorActive && impactSimulatorState.phase === 'await_choice' && (
                      <div className="flex-1 flex items-center justify-center gap-2">
                        <span className="text-sm font-semibold text-purple-600">👆 Open chat to select scenario</span>
                      </div>
                    )}
                    
                    {/* Input Field (only visible when expanded) */}
                    {isChatExpanded && (
                      <>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isAIProcessing && !isListening && handleSendMessage()}
                      placeholder={isListening ? "Listening..." : "Type your message or ask a question..."}
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
                      className={`px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${
                        isListening
                          ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                          : isAIProcessing
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-600 text-white hover:bg-slate-700'
                      }`}
                      title={isListening ? 'Stop listening' : 'Start voice input'}
                    >
                      {isListening ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1"/>
                            <rect x="14" y="4" width="4" height="16" rx="1"/>
                          </svg>
                          <span className="hidden sm:inline">Stop</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                          </svg>
                          <span className="hidden sm:inline">Talk</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={isAIProcessing || isListening}
                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                      isAIProcessing || isListening
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-white hover:bg-slate-800'
                    }`}
                  >
                    {isAIProcessing ? 'AI...' : 'Send'}
                  </button>
                  </>
                    )}
                </div>
                </div>
                
                {isAIProcessing && (
                  <div className="text-xs text-blue-600 text-center pb-1">
                    🤖 Claude is optimizing your content...
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Phase 2-B: Copy Toast Notification */}
      {showCopyToast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl border-2 border-green-700 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span className="font-semibold">Copied to clipboard</span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            Paste into the target section
          </div>
        </div>
      )}

      {/* Agent Dashboard Modal */}
      {/* Review Configuration & Agents Drawer (Governed Selection) */}
      {isFlow2 ? (
        <Flow2ReviewConfigDrawer
          isOpen={showAgentsDrawer}
          onClose={() => setShowAgentsDrawer(false)}
          graphReviewTrace={graphReviewTrace}
          skillCatalog={[]}
          onIssueClick={handleIssueClick}
          demoTrace={(flowMonitorMetadata as any)?.demo_trace || null}
          demoRunId={flowMonitorRunId}
          checkpointMetadata={flowMonitorMetadata}
          isFlow2Demo={isFlow2 && !!(flowMonitorMetadata?.demo_mode || flowMonitorMetadata?.edd_stage)}
        />
      ) : (
        <ReviewConfigDrawer
          open={showAgentsDrawer}
          onOpenChange={setShowAgentsDrawer}
          participants={agentParticipants}
          reviewConfig={reviewConfig}
          onConfigChange={setReviewConfig}
          onRunReview={handleFullComplianceReview}
          batchReviewTrace={batchReviewTrace}
          currentSections={sections}
          graphReviewTrace={graphReviewTrace}
          conflicts={conflicts.length > 0 ? conflicts : null}
          coverageGaps={coverageGaps.length > 0 ? coverageGaps : null}
        />
      )}
      
      {/* Flow2: More Inputs Modal (Phase 5) */}
      {isFlow2 && moreInputsModal.isOpen && moreInputsModal.topic && (
        <Flow2TopicMoreInputs
          isOpen={moreInputsModal.isOpen}
          onClose={() => setMoreInputsModal({ isOpen: false, topicKey: null, topic: null })}
          topicKey={moreInputsModal.topicKey!}
          topicTitle={moreInputsModal.topic.title}
          existingTopic={moreInputsModal.topic}
          onSubmit={handleMoreInputsSubmit}
        />
      )}
      
      {/* Flow2: Mode Switch Confirmation Modal (Phase 1.2) */}
      {isFlow2 && modeSwitchModal.isOpen && modeSwitchModal.targetMode && (
        <Flow2ModeSwitchModal
          isOpen={modeSwitchModal.isOpen}
          currentMode={flow2InputMode}
          targetMode={modeSwitchModal.targetMode}
          documentCount={flow2Documents.length}
          onConfirm={() => {
            if (modeSwitchModal.onConfirmAction) {
              modeSwitchModal.onConfirmAction();
            }
            setModeSwitchModal({ isOpen: false, targetMode: null, onConfirmAction: null });
          }}
          onCancel={() => {
            setModeSwitchModal({ isOpen: false, targetMode: null, onConfirmAction: null });
          }}
        />
      )}
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function DocumentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DocumentPageContent />
    </Suspense>
  );
}

