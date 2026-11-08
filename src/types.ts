export type WorkspaceTab =
  | 'home'
  | 'assistant'
  | 'orchestrator'
  | 'documents'
  | 'translation'
  | 'media'
  | 'maps-sql'
  | 'three-game'
  | 'workspace'
  | 'billing-resilience'
  | 'ecosystem';

export type GeminiChatModelTier =
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.8-flash'
  | 'gemini-4-argon';

export interface GeminiChatModelOption {
  id: GeminiChatModelTier;
  label: string;
  taskCategory: string;
  badge: string;
  description: string;
}

export const GEMINI_CHAT_MODELS: GeminiChatModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    taskCategory: 'Fast Tasks',
    badge: 'Ultra-Low Latency',
    description: 'Optimized for tasks that should happen fast, instant lookups, and quick multi-turn replies.',
  },
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    taskCategory: 'General Tasks',
    badge: 'Balanced Default',
    description: 'Ideal for general tasks, multilingual synthesis, workspace planning, and automated note-taking.',
  },
  {
    id: 'gemini-4-argon',
    label: 'Gemini 4 Argon',
    taskCategory: 'Complex Tasks',
    badge: 'Frontier Reasoning',
    description: 'Engineered for particularly complex tasks, deep system architecture, STEM reasoning, and code synthesis.',
  },
];

export interface ChatbotRolePersona {
  id: string;
  name: string;
  tagline: string;
  recommendedModel: GeminiChatModelTier;
  systemInstruction: string;
}

export const CHATBOT_ROLE_PERSONAS: ChatbotRolePersona[] = [
  {
    id: 'executive-architect',
    name: 'Hujju Core Workspace Architect',
    tagline: 'Balanced multilingual assistant & automated note-taker',
    recommendedModel: 'gemini-3.8-flash',
    systemInstruction:
      'Act as an Executive AI Studio Workspace Architect. Deliver structured answers, highlight key decisions, and extract actionable project notes.',
  },
  {
    id: 'frontier-engineer',
    name: 'Principal Systems & STEM Engineer',
    tagline: 'Deep technical reasoning, code architecture & debugging',
    recommendedModel: 'gemini-4-argon',
    systemInstruction:
      'Act as a Principal Distributed Systems & Full-Stack Engineer. Provide rigorous first-principles analysis, production-ready code patterns, security invariants, and mathematical precision.',
  },
  {
    id: 'rapid-concierge',
    name: 'Rapid Action & Triage Concierge',
    tagline: 'Instant, ultra-concise answers for fast tasks',
    recommendedModel: 'gemini-3.1-flash-lite',
    systemInstruction:
      'Act as a high-speed executive triage concierge. Respond with immediate, crisp bullet points and zero fluff for maximum speed.',
  },
  {
    id: 'indic-polyglot-mentor',
    name: 'Indic & Global Polyglot Mentor',
    tagline: 'Cultural nuance & fluent Hindi, Marathi, Urdu & English mentor',
    recommendedModel: 'gemini-3.8-flash',
    systemInstruction:
      'Act as an expert multilingual communication mentor fluent in Hindi (हिन्दी), Marathi (मराठी), Urdu (اردو), and English. Explain concepts clearly with culturally natural phrasing.',
  },
];

export type SubscriptionTierId = 'free' | '1m' | '3m' | '1y';
export type PaymentGatewayId = 'upi_qr_intent' | 'razorpay' | 'cashfree' | 'free_tier';

export interface SubscriptionRecordItem {
  id: string;
  planId: SubscriptionTierId;
  planName: string;
  amountInr: number;
  currency: 'INR';
  merchantUpiId: string;
  gateway: PaymentGatewayId;
  utrNumber: string;
  orderId: string;
  invoiceId: string;
  status: 'active' | 'expired';
  expiresAtIso: string;
  ownerId: string;
  createdAt: Date;
}

export interface SubscriptionPlanDefinition {
  id: SubscriptionTierId;
  name: string;
  audienceTag: string;
  durationLabel: string;
  durationDays: number;
  amountInr: number;
  effectiveMonthlyInr: number;
  savingsBadge?: string;
  dailyAiLimit: number | 'Unlimited';
  dailyDocLimit: number | 'Unlimited';
  features: string[];
}

export const MERCHANT_UPI_CONFIG = {
  upiId: '9975649957@mbk',
  merchantName: 'Hujju AI Platform',
  qrImageUrl: '/assets/aistudio/6303194498267288848_b8e510aa.jpg',
  currency: 'INR' as const,
};

export const INR_SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: 'free',
    name: 'Free Starter',
    audienceTag: 'For personal exploration & evaluation',
    durationLabel: 'Forever Free',
    durationDays: 3650,
    amountInr: 0,
    effectiveMonthlyInr: 0,
    dailyAiLimit: 15,
    dailyDocLimit: 3,
    features: [
      '15 Daily Voice & Chat Assistant turns',
      '3 Daily Document Intelligence analyses',
      'Hindi, Marathi, Urdu & 15+ languages',
      'Basic Local & Cloud Workspace Notes',
      'Autonomous Local Crash Backup',
    ],
  },
  {
    id: '1m',
    name: '1 Month Pro',
    audienceTag: 'For active creators & mobile professionals',
    durationLabel: '1 Month (30 Days)',
    durationDays: 30,
    amountInr: 299,
    effectiveMonthlyInr: 299,
    dailyAiLimit: 'Unlimited',
    dailyDocLimit: 'Unlimited',
    features: [
      'Unlimited Gemini 3.8 Live Voice & Interpreter',
      'Unlimited Document Intelligence & Auto-Notes',
      'Full Multi-LLM Router & Creative Media Studio',
      'AES-GCM 256-bit E2EE Cross-Device Sync',
      'Autonomous Self-Healing & Cloud Backup Vault',
    ],
  },
  {
    id: '3m',
    name: '3 Months Pro',
    audienceTag: 'For power users & cross-device workflows',
    durationLabel: '3 Months (90 Days)',
    durationDays: 90,
    amountInr: 799,
    effectiveMonthlyInr: 266,
    savingsBadge: 'Save 11%',
    dailyAiLimit: 'Unlimited',
    dailyDocLimit: 'Unlimited',
    features: [
      'Everything in 1 Month Pro (Unlimited AI & Sync)',
      'Priority Multi-LLM Failover & Gateway Caching',
      'Full Android APK + Desktop + Mobile PWA Sync',
      'Cloud SQL Relational Billing & Audit Ledger',
      'Autonomous Point-in-Time Multi-Device Restore',
    ],
  },
  {
    id: '1y',
    name: '1 Year Annual Pro',
    audienceTag: 'Best value for full-year enterprise continuity',
    durationLabel: '1 Year (365 Days)',
    durationDays: 365,
    amountInr: 2499,
    effectiveMonthlyInr: 208,
    savingsBadge: 'Save 30% · Best Value',
    dailyAiLimit: 'Unlimited',
    dailyDocLimit: 'Unlimited',
    features: [
      'Everything in 3 Months Pro for 365 full days',
      'Unlimited Frontier Reasoning (Gemini 4 Argon)',
      'Unlimited 4K Image, Omni Video & Lyria Music',
      'Zero-Downtime Autonomous Crash Countermeasures',
      'GST/INR Tax Invoice & Priority Support',
    ],
  },
];

export interface AutonomousIncidentDiagnostic {
  incidentId: string;
  timestampIso: string;
  platformTarget: 'Android APK / Mobile' | 'PC / Desktop Workstation' | 'Website / PWA Runtime';
  faultType: string;
  rootCauseAnalysis: string;
  countermeasureApplied: string;
  status: 'resolved-autonomously' | 'restored-from-backup';
  recoveryLatencyMs: number;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  decryptedContent?: string;
  iv: string;
  isEncrypted: boolean;
  language: string;
  skillUsed: string;
  deviceOrigin: string;
  ownerId: string;
  createdAt: Date;
}

export interface DocumentRecordItem {
  id: string;
  fileName: string;
  mimeType: string;
  summary: string;
  insights: string;
  suggestions: string;
  decryptedSummary?: string;
  decryptedInsights?: string;
  decryptedSuggestions?: string;
  iv: string;
  isEncrypted: boolean;
  ownerId: string;
  createdAt: Date;
}

export interface ProjectItemRecord {
  id: string;
  title: string;
  description: string;
  decryptedDescription?: string;
  status: 'planning' | 'active' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  modelTarget: string;
  iv: string;
  isEncrypted: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceNoteItem {
  id: string;
  title: string;
  content: string;
  decryptedContent?: string;
  source: 'voice-auto' | 'document-auto' | 'chat-auto' | 'manual';
  projectTitle: string;
  iv: string;
  isEncrypted: boolean;
  ownerId: string;
  createdAt: Date;
}

export interface SkillConfigItem {
  id: string;
  name: string;
  category: 'voice' | 'document' | 'translation' | 'workspace' | 'security';
  description: string;
  instructionDirective: string;
  enabled: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceNodeItem {
  id: string;
  deviceName: string;
  platform: 'Android APK' | 'Desktop Web' | 'Mobile PWA' | 'Tablet OS';
  syncState: 'synchronized' | 'offline-cached' | 'paused';
  skillHash: string;
  e2eeReady: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SqlTaskLogRecord {
  id: number;
  userUid: string;
  title: string;
  category: string;
  modality: string;
  summary: string;
  createdAt: string;
}

export interface MapsGroundingPlaceLink {
  title: string;
  uri: string;
  reviewSnippets?: string[];
}

export interface SkillLiveTestResult {
  skillId: string;
  skillName: string;
  category: SkillConfigItem['category'];
  enabled: boolean;
  status: 'passed' | 'remediated-and-passed';
  latencyMs: number;
  testInputSample: string;
  verifiedOutputSample: string;
  directiveEnforced: string;
  syncedEndpoints: string[];
}

export const DEFAULT_HUJJU_SKILLS: Omit<SkillConfigItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Executive Document Synthesizer',
    category: 'document',
    description: 'Extracts structured decisions, risks, and quantitative metrics from technical PDFs, contracts, and spreadsheets.',
    instructionDirective: 'Synthesize complex documents into clear executive summaries, concrete risk vectors, and prioritized next steps.',
    enabled: true,
  },
  {
    name: 'AI Studio Workspace Architect',
    category: 'workspace',
    description: 'Automatically detects project milestones and action items in conversation to generate structured workspace notes.',
    instructionDirective: 'Proactively identify project tasks, architecture decisions, and sprint milestones for automated note-taking.',
    enabled: true,
  },
  {
    name: 'Polyglot Cultural Localization',
    category: 'translation',
    description: 'Preserves domain terminology, idiomatic nuance, and formal/informal register across 30+ global languages.',
    instructionDirective: 'Ensure translations preserve technical accuracy while adapting naturally to local cultural and professional norms.',
    enabled: true,
  },
  {
    name: 'Zero-Latency Voice Concierge',
    category: 'voice',
    description: 'Optimizes spoken responses for natural cadence, concise clarity, and hands-free mobile/desktop multitasking.',
    instructionDirective: 'Deliver spoken responses with crisp, conversational pacing suitable for real-time voice dialogue.',
    enabled: true,
  },
  {
    name: 'Privacy & E2EE Guardrail',
    category: 'security',
    description: 'Redacts sensitive credentials or PII in summaries before cloud persistence and enforces zero-knowledge vault hygiene.',
    instructionDirective: 'Never echo raw secret keys in plaintext summaries; prioritize zero-knowledge privacy best practices.',
    enabled: true,
  },
  {
    name: 'Indic Polyglot Cultural Interpreter',
    category: 'translation',
    description: 'Provides native, high-nuance translation across Hindi (हिंदी), Marathi (मराठी), Urdu (اردو), and English with polite regional honorifics.',
    instructionDirective: "You are Hujju's Indic Multilingual Specialist. Deliver fluent translations and interpretation across Hindi, Marathi, Urdu, and English. Respect regional honorifics (Aap/Tumhi/Aap), Devanagari and Nastaliq script rules, and preserve technical accuracy while adapting to local cultural idioms.",
    enabled: true,
  },
  {
    name: 'Executive Strategic & Financial Analyst',
    category: 'workspace',
    description: 'Converts raw earnings reports, financial models, and strategic briefs into executive key performance metrics, risk maps, and decision memos.',
    instructionDirective: "You are Hujju's Executive Partner & Chief Financial Strategist. Transform raw datasets, spreadsheets, and business updates into structured executive memos containing: 1) Executive Summary, 2) KPI Breakdown & Revenue Vectors, 3) Strategic Risks & Tradeoffs, 4) Prioritized Action Items with Timelines.",
    enabled: true,
  },
  {
    name: 'Zero-Trust Security & API Guardrail',
    category: 'security',
    description: 'Enforces zero-trust data hygiene, sanitizes PII/credentials before persistence, and audits external endpoints for unauthorized exposure.',
    instructionDirective: "You are Hujju's Defensive Cybersecurity Guardrail. Actively scan all prompts, inputs, and documents to prevent secret leakage (API keys, JWTs, private keys). Redact sensitive PII prior to cloud persistence. Mandate zero-knowledge privacy standards, proper encryption protocols, and least-privilege endpoint access.",
    enabled: true,
  },
  {
    name: 'Legal & Contract Risk Auditor',
    category: 'document',
    description: 'Scans uploaded contracts, NDAs, and SLAs to flag high-risk liabilities, missing termination clauses, and adverse indemnification obligations.',
    instructionDirective: "You are Hujju's Legal Risk & Compliance Specialist. Synthesize contracts and legal documents to highlight: 1) Critical Financial Liabilities & Payment Terms, 2) Indemnification & Termination Exposure, 3) High-Risk Ambiguities, and 4) Actionable Negotiation Playbook. Maintain objective precision and clear risk vectors.",
    enabled: true,
  },
  {
    name: 'Full-Stack Code & Architecture Auditor',
    category: 'workspace',
    description: 'Inspects codebases, identifies OWASP security flaws, diagnoses runtime memory leaks, and refactors logic into production-grade modular architectures.',
    instructionDirective: "You are Hujju's Senior Code & Systems Architect. Audit code for correctness, security vulnerabilities (OWASP Top 10, SQLi, XSS, secret leaks), and memory/performance bottlenecks. Provide clean, modular, strongly-typed solutions without stubs or placeholders. Explain root causes succinctly with clear refactoring directives.",
    enabled: true,
  },
];

export const PRIMARY_INDIC_LANGUAGES = [
  { code: 'en', name: 'English', shortLabel: 'English' },
  { code: 'hi', name: 'Hindi (हिन्दी)', shortLabel: 'हिन्दी (Hindi)' },
  { code: 'mr', name: 'Marathi (मराठी)', shortLabel: 'मराठी (Marathi)' },
  { code: 'ur', name: 'Urdu (اردو)', shortLabel: 'اردو (Urdu)' },
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'zh', name: 'Mandarin Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
];

