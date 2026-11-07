export type WorkspaceTab =
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

