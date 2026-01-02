/**
 * Case 4: IT Review – Demo Data
 * 
 * Deterministic hardcoded data for cross-bulletin impact simulation.
 * No real integrations, no randomness.
 */

export interface ITBulletin {
  id: string;
  title: string;
  category: 'Infrastructure' | 'Cyber' | 'Cloud';
  severity: 'high' | 'medium' | 'low';
  affected_layer: string;
  latency_impact: string;
  availability_impact: string;
  time_window: string;
  description: string;
  technical_detail: string;
  completion_time_ms: number; // When this bulletin completes loading
}

export interface RiskNode {
  id: string;
  label: string;
  baseline_latency_ms: number;
  impact_ms: number;
  risk_level: 'green' | 'yellow' | 'orange' | 'red';
  explanation: string; // Why this risk level?
  x: number; // SVG position
  y: number;
}

export interface ActionItem {
  action: string;
  rationale: string;
  risk_reduction?: string;
  impact?: string;
  details?: string;
}

export interface StakeholderBriefing {
  role: 'Technical Architect' | 'Operations Manager' | 'Business Continuity Lead';
  title: string;
  priority: 'high' | 'medium' | 'low';
  actions: ActionItem[];
}

// 3 IT Bulletins
export const DEMO_IT_BULLETINS: ITBulletin[] = [
  {
    id: 'ITB-2026-001',
    title: 'Oracle Database 19c Kernel Upgrade (Critical Patch)',
    category: 'Infrastructure',
    severity: 'high',
    affected_layer: 'Database Layer',
    latency_impact: '+50ms average query time',
    availability_impact: '4-hour maintenance window',
    time_window: '2026-01-15 02:00-06:00 UTC',
    description: 'Mandatory security patch for CVE-2025-12345 requiring Oracle 19c kernel upgrade. Impacts all database connections during maintenance window.',
    technical_detail: 'Kernel patch addresses buffer overflow vulnerability in SQL parser. Upgrade process requires database restart and index rebuild.',
    completion_time_ms: 800
  },
  {
    id: 'ITB-2026-002',
    title: 'TLS 1.0/1.1 Disablement + Mutual TLS Enforcement',
    category: 'Cyber',
    severity: 'medium',
    affected_layer: 'TLS/SSL Layer',
    latency_impact: '+15ms TLS handshake (mutual auth)',
    availability_impact: 'Legacy clients will fail and retry (3x amplification)',
    time_window: '2026-01-15 00:00 UTC (immediate)',
    description: 'Deprecated TLS versions disabled per security policy. Mutual TLS authentication now required for all API connections.',
    technical_detail: 'Affects ~2% of legacy API clients. Clients without valid certificates will fail handshake and retry, amplifying latency impact.',
    completion_time_ms: 1600
  },
  {
    id: 'ITB-2026-003',
    title: 'Azure Regional Async Delay (West Europe → East US)',
    category: 'Cloud',
    severity: 'medium',
    affected_layer: 'Network Infrastructure',
    latency_impact: '+300ms cross-region sync calls',
    availability_impact: 'No downtime, degraded performance',
    time_window: '2026-01-14 22:00 - 2026-01-16 06:00 UTC',
    description: 'Azure platform update introduces async queue for cross-region traffic management. Affects West Europe to East US routes.',
    technical_detail: 'Platform-level change to optimize long-distance traffic. Cannot be mitigated at application layer.',
    completion_time_ms: 2400
  }
];

// 7 Risk Nodes (Business Flow)
export const DEMO_RISK_NODES: RiskNode[] = [
  {
    id: 'client_request',
    label: 'Client Request',
    baseline_latency_ms: 5,
    impact_ms: 0,
    risk_level: 'green',
    explanation: 'Entry point, no impact from bulletins.',
    x: 50,
    y: 200
  },
  {
    id: 'api_gateway',
    label: 'API Gateway',
    baseline_latency_ms: 20,
    impact_ms: 15, // TLS mutual auth
    risk_level: 'yellow', // Updated at t=3000ms
    explanation: 'TLS mutual auth adds +15ms handshake time. Legacy client retries amplify load.',
    x: 200,
    y: 200
  },
  {
    id: 'authentication',
    label: 'Authentication',
    baseline_latency_ms: 30,
    impact_ms: 0,
    risk_level: 'green',
    explanation: 'Token validation unaffected by bulletins.',
    x: 350,
    y: 200
  },
  {
    id: 'app_logic',
    label: 'Application Logic',
    baseline_latency_ms: 40,
    impact_ms: 0,
    risk_level: 'green',
    explanation: 'Business rules processing unaffected.',
    x: 500,
    y: 200
  },
  {
    id: 'database',
    label: 'Database Query',
    baseline_latency_ms: 60,
    impact_ms: 50, // Oracle upgrade
    risk_level: 'orange', // Updated at t=3800ms
    explanation: 'Oracle kernel upgrade adds +50ms average query latency during and after maintenance.',
    x: 650,
    y: 200
  },
  {
    id: 'mail_sync',
    label: 'Mail_Sync_Service',
    baseline_latency_ms: 150,
    impact_ms: 300, // Azure delay
    risk_level: 'red', // Updated at t=5400ms
    explanation: 'CRITICAL: Combined latency (515ms) exceeds timeout threshold (500ms). Cross-region sync delayed by Azure platform update. Retry storms from TLS failures amplify risk. SLA breach probability: 85%.',
    x: 500,
    y: 350
  },
  {
    id: 'response',
    label: 'Response',
    baseline_latency_ms: 10,
    impact_ms: 0,
    risk_level: 'green',
    explanation: 'Response assembly unaffected.',
    x: 650,
    y: 350
  }
];

// 3 Stakeholder Briefings
export const DEMO_BRIEFINGS: StakeholderBriefing[] = [
  {
    role: 'Technical Architect',
    title: 'Configuration Change Recommendation',
    priority: 'high',
    actions: [
      {
        action: 'Enable database connection pooling with increased timeout',
        rationale: 'Mitigate cumulative 365ms latency from DB upgrade (50ms) + Azure delay (300ms) + TLS overhead (15ms)',
        risk_reduction: '40%',
        details: 'Config: db.pool.timeout: 5000ms → 8000ms'
      },
      {
        action: 'Deploy circuit breaker for Mail_Sync_Service',
        rationale: 'Prevent retry storms when timeout threshold (500ms) is breached',
        risk_reduction: '35%',
        details: 'Config: circuitbreaker.threshold: 50% failure rate, half-open after 60s'
      },
      {
        action: 'Implement request timeout budget with per-layer tracking',
        rationale: 'Fail fast instead of cascading delays across service layers',
        risk_reduction: '20%',
        details: 'Config: timeout_budget.enabled: true, max_layer_timeout: 200ms'
      },
      {
        action: 'Upgrade legacy TLS clients or whitelist temporarily',
        rationale: 'Avoid hard cutoff for 2% of API clients, prevent retry amplification',
        risk_reduction: '15%',
        details: 'Config: tls.legacy_grace_period: 48 hours, monitor migration'
      },
      {
        action: 'Enable query result caching for Mail_Sync_Service reads',
        rationale: 'Reduce database query load during maintenance window',
        risk_reduction: '10%',
        details: 'Config: cache.mail_sync.ttl: 300s, eviction_policy: LRU'
      },
      {
        action: 'Provision backup cross-region route (West Europe → UK South)',
        rationale: 'Bypass Azure East US delay with alternative route',
        risk_reduction: '25%',
        details: 'Infrastructure: Deploy traffic manager, health probe every 30s'
      },
      {
        action: 'Implement request queueing with priority levels',
        rationale: 'Ensure critical mail sync requests are processed first',
        risk_reduction: '12%',
        details: 'Config: queue.priority.enabled: true, critical_threshold: 3'
      }
    ]
  },
  {
    role: 'Operations Manager',
    title: 'Monitoring & Incident Response Plan',
    priority: 'high',
    actions: [
      {
        action: 'Extended monitoring window: Jan 14 22:00 - Jan 16 08:00 UTC',
        rationale: 'Cover all bulletin time windows plus 24-hour buffer for rollback if needed',
        details: 'On-call engineer with escalation path to Group Head'
      },
      {
        action: 'Pre-deploy rollback scripts for Oracle DB',
        rationale: 'Enable rapid rollback (estimated 20 minutes) if SLA breaches 98%',
        details: 'Tested rollback procedure, backup verified, runbook updated'
      },
      {
        action: 'Alert threshold adjustments (temporary)',
        rationale: 'Reduce noise from expected latency spikes during maintenance',
        details: 'p99 latency: 200ms → 600ms during window; p50: 100ms → 300ms'
      },
      {
        action: 'Customer communications: proactive notification',
        rationale: 'Inform high-value clients of potential degradation',
        details: 'Email template ready, FAQ published, support team briefed'
      },
      {
        action: 'Standby database replica for read traffic',
        rationale: 'Offload read queries during primary database maintenance',
        details: 'Configure read replica with 30s lag tolerance'
      }
    ]
  },
  {
    role: 'Business Continuity Lead',
    title: 'Traffic Shaping & Risk Mitigation Strategy',
    priority: 'medium',
    actions: [
      {
        action: 'Implement rate limiting for non-critical API endpoints',
        rationale: 'Prioritize critical mail sync transactions during maintenance window',
        impact: '10% reduction in total traffic'
      },
      {
        action: 'Defer batch jobs scheduled in maintenance window',
        rationale: 'Reduce database load during Oracle kernel upgrade',
        impact: 'Shift 200 batch jobs to Jan 16 08:00 UTC'
      },
      {
        action: 'Enable premium CDN routing for static assets',
        rationale: 'Offload non-dynamic content from affected backend layers',
        impact: '15% reduction in backend requests'
      },
      {
        action: 'Negotiate SLA credit pre-approval with top 10 clients',
        rationale: 'Proactive risk management for potential SLA breach (85% probability)',
        impact: 'Estimated $50k credit exposure, approved by Finance'
      }
    ]
  }
];


