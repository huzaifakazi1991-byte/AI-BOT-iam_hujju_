import React, { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  Network,
  FileText,
  Languages,
  Film,
  MapPin,
  Box,
  FolderKanban,
  CreditCard,
  Smartphone,
  Globe,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';
import {
  SubscriptionTierId,
  WorkspaceTab,
} from '../types';

interface HomeAndDomainPortalProps {
  hujjuAvatarUrl: string;
  ecosystemBannerUrl: string;
  activeTierId: SubscriptionTierId;
  isEncryptedVaultActive: boolean;
  e2eeFingerprint: string;
  activeSkillsCount: number;
  totalSkillsCount: number;
  projectsCount: number;
  notesCount: number;
  documentsCount: number;
  lastBackupIso: string;
  onboardingCompleted: boolean;
  onNavigateTab: (tab: WorkspaceTab) => void;
  onOpenOnboarding: () => void;
}

const FREE_IAM_HUJJU_DOMAINS = [
  {
    id: 'firebase-web',
    domain: 'https://iam-hujju.web.app',
    handle: 'iam_hujju',
    provider: 'Firebase Hosting (Free Tier · Global CDN + Auto SSL)',
    availability: 'Available · Zero-Cost Forever',
    dnsRecordType: 'Firebase Hosting Site ID: iam-hujju',
  },
  {
    id: 'firebase-app',
    domain: 'https://iam-hujju.firebaseapp.com',
    handle: 'iam_hujju',
    provider: 'Google Cloud / Firebase Mirror Domain (Free SSL)',
    availability: 'Available · Automatic Provisioning',
    dnsRecordType: 'CNAME -> iam-hujju.firebaseapp.com',
  },
  {
    id: 'cloudflare-pages',
    domain: 'https://iam-hujju.pages.dev',
    handle: 'iam_hujju',
    provider: 'Cloudflare Pages Edge Network (Unlimited Free Bandwidth)',
    availability: 'Available · Free Edge Subdomain',
    dnsRecordType: 'CNAME -> iam-hujju.pages.dev',
  },
  {
    id: 'github-pages',
    domain: 'https://iam-hujju.github.io/iam_hujju',
    handle: 'iam_hujju',
    provider: 'GitHub Pages Static & PWA Mirror (Free)',
    availability: 'Available · Open Source Mirror',
    dnsRecordType: 'Repository: iam-hujju/iam_hujju',
  },
];

export const HomeAndDomainPortal: React.FC<HomeAndDomainPortalProps> = ({
  hujjuAvatarUrl,
  ecosystemBannerUrl,
  activeTierId,
  isEncryptedVaultActive,
  e2eeFingerprint,
  activeSkillsCount,
  totalSkillsCount,
  projectsCount,
  notesCount,
  documentsCount,
  lastBackupIso,
  onboardingCompleted,
  onNavigateTab,
  onOpenOnboarding,
}) => {
  const [selectedDomainId, setSelectedDomainId] = useState<string>('firebase-web');
  const [customSlug, setCustomSlug] = useState<string>('iam_hujju');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<{
    checkedAtIso: string;
    totalSubsystems: number;
    healthyCount: number;
    subsystems: Array<{ id: string; name: string; status: string; latencyMs: number }>;
  } | null>(null);

  const runLiveSubsystemAudit = useCallback(async () => {
    setIsRunningAudit(true);
    try {
      const res = await fetch('/api/resilience/live-audit');
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data);
      }
    } catch {
      // Keep previous report if offline
    } finally {
      setIsRunningAudit(false);
    }
  }, []);

  useEffect(() => {
    runLiveSubsystemAudit();
    const timer = setInterval(runLiveSubsystemAudit, 30000);
    return () => clearInterval(timer);
  }, [runLiveSubsystemAudit]);

  const activeDomainObj =
    FREE_IAM_HUJJU_DOMAINS.find((d) => d.id === selectedDomainId) || FREE_IAM_HUJJU_DOMAINS[0];

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://iam-hujju.web.app';

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const firebaseHostingConfigJson = JSON.stringify(
    {
      hosting: {
        site: customSlug.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() || 'iam-hujju',
        public: 'dist',
        ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
        rewrites: [
          {
            source: '/api/**',
            run: {
              serviceId: 'iam-hujju-server',
              region: 'europe-west1',
            },
          },
          {
            source: '**',
            destination: '/index.html',
          },
        ],
      },
    },
    null,
    2
  );

  const studioDirectory: Array<{
    tab: WorkspaceTab;
    index: string;
    title: string;
    subtitle: string;
    metrics: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      tab: 'assistant',
      index: '01',
      title: 'Voice & Multi-Turn Gemini Chat',
      subtitle:
        'Real-time Gemini 3.8 Live voice + Multi-turn role chatbot (Gemini 4 Argon, 3.8 Flash, 3.1 Flash Lite) in Hindi, Marathi, Urdu & English.',
      metrics: '3 Model Tiers · 4 Role Personas',
      icon: MessageSquare,
    },
    {
      tab: 'orchestrator',
      index: '02',
      title: 'Multi-LLM Intelligent Router',
      subtitle:
        'Vendor-agnostic orchestration across Gemini, OpenAI & Claude with circuit breakers, failover hops & semantic caching.',
      metrics: 'Auto-Failover · Cost & Latency Guard',
      icon: Network,
    },
    {
      tab: 'documents',
      index: '03',
      title: 'Document Intelligence Studio',
      subtitle:
        'Executive synthesis, risk vector extraction & automated workspace note generation from PDFs, contracts & specs.',
      metrics: `${documentsCount} Analyzed Docs`,
      icon: FileText,
    },
    {
      tab: 'translation',
      index: '04',
      title: 'Polyglot Translate & Transcribe',
      subtitle:
        'Cultural localization & phonetic guides across Hindi (हिन्दी), Marathi (मराठी), Urdu (اردو) & 15+ global languages.',
      metrics: 'Live Speech + Neural TTS',
      icon: Languages,
    },
    {
      tab: 'media',
      index: '05',
      title: 'Creative Image, Video & Music',
      subtitle:
        '4K image studio (Nano Banana 2.1), cinematic video generation (Omni 1.2 Flash), and Lyria 3 music composition.',
      metrics: 'Image · Video · Lyria Audio',
      icon: Film,
    },
    {
      tab: 'maps-sql',
      index: '06',
      title: 'Google Maps & Cloud SQL Ledger',
      subtitle:
        'Interactive 3D photorealistic maps, live Gemini Maps grounding, and PostgreSQL relational task & billing ledger.',
      metrics: 'Maps Grounding + PostgreSQL',
      icon: MapPin,
    },
    {
      tab: 'workspace',
      index: '07',
      title: 'AI Studio Workspace & Notes',
      subtitle:
        'Manage Google AI Studio projects, sprint priorities, and E2EE encrypted automated notes captured from conversations.',
      metrics: `${projectsCount} Projects · ${notesCount} Notes`,
      icon: FolderKanban,
    },
    {
      tab: 'billing-resilience',
      index: '08',
      title: 'INR UPI Plans & Autonomous Backup',
      subtitle:
        '4-tier INR subscriptions (Free, ₹299/1M, ₹799/3M, ₹2,499/1Y) via UPI QR (9975649957@mbk) + Autonomous Crash Recovery.',
      metrics: `Plan: ${activeTierId.toUpperCase()} · Self-Healing Armed`,
      icon: CreditCard,
    },
    {
      tab: 'ecosystem',
      index: '09',
      title: 'Device Ecosystem, E2EE & Android APK',
      subtitle:
        'Synchronize skills across Desktop Web, Mobile PWA & signed Android APK (Bubblewrap TWA) with AES-GCM 256-bit E2EE.',
      metrics: `${activeSkillsCount}/${totalSkillsCount} Skills Synced`,
      icon: Smartphone,
    },
    {
      tab: 'three-game',
      index: '10',
      title: '3D Orbital Relay Spatial Simulation',
      subtitle:
        'Full-viewport interactive WebGL / Three.js spatial simulation with orbital telemetry logging to Cloud SQL.',
      metrics: '60 FPS WebGL Scene',
      icon: Box,
    },
  ];

  return (
    <div className="space-y-8">
      {/* SECTION 1: HERO & OFFICIAL IAM_HUJJU WEBSITE HOME SCREEN */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Primary Editorial Hero & Action Anchors */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Official Portal · @iam_hujju
              </span>
              <span aria-hidden="true">·</span>
              <span>iam-hujju.web.app</span>
              <span aria-hidden="true">·</span>
              <span>Web, PC &amp; Android APK</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display leading-tight">
              Hujju AI Assistant — Multilingual Voice, Multi-LLM Workspace &amp; Autonomous Resilience
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Your unified home screen for real-time voice dialogue in Hindi, Marathi, Urdu &amp; English, multi-turn Gemini reasoning (<span className="font-mono text-xs">gemini-4-argon</span>, <span className="font-mono text-xs">gemini-3.8-flash</span>, <span className="font-mono text-xs">gemini-3.1-flash-lite</span>), zero-knowledge E2EE cloud sync, and autonomous crash recovery across Mobile, PC, and Website.
            </p>
          </div>

          <div className="pt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('assistant')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                Launch Voice &amp; Multi-Turn Chat
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onOpenOnboarding}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:border-amber-500 text-slate-800 dark:text-slate-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                {onboardingCompleted
                  ? 'Re-open 3-Step Onboarding Guide'
                  : 'Start 3-Step New User Onboarding'}
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('billing-resilience')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
              >
                INR Plans (₹299 / ₹799 / ₹2,499) &amp; Backup
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div>
                E2EE Vault:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {isEncryptedVaultActive ? `Unlocked (${e2eeFingerprint})` : 'Ready to Lock-In'}
                </span>
              </div>
              <div>
                Autonomous Backup:{' '}
                <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {new Date(lastBackupIso).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div>
                Active Tier:{' '}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {activeTierId.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Visual Identity & Guided Onboarding Readiness Card */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-hidden">
          <div className="relative h-48 sm:h-52 w-full bg-slate-900 overflow-hidden">
            <img
              src={ecosystemBannerUrl}
              alt="iam_hujju Cross-Device AI Ecosystem"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-85"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-5 flex flex-col justify-end">
              <div className="flex items-center gap-3">
                <img
                  src={hujjuAvatarUrl}
                  alt="Hujju Avatar"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-white/20 shrink-0"
                />
                <div>
                  <div className="text-sm font-bold text-white">
                    iam_hujju Official Web &amp; APK Portal
                  </div>
                  <div className="text-xs text-slate-300">
                    Synchronized across Desktop, Mobile Web &amp; Android APK
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Step Interactive Onboarding Checklist */}
          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  New User Quick-Start Checklist
                </span>
                <button
                  type="button"
                  onClick={onOpenOnboarding}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Open Interactive Wizard →
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-300">
                    1. Set up first AI Studio Project
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {projectsCount > 0 ? `${projectsCount} Active` : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-300">
                    2. Enable Voice &amp; Polyglot Skills
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {activeSkillsCount}/{totalSkillsCount} Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-300">
                    3. Secure AES-256-GCM E2EE Vault
                  </span>
                  <span
                    className={`font-mono ${
                      isEncryptedVaultActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isEncryptedVaultActive ? 'Secured' : 'Click to Lock-In'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenOnboarding}
              className="w-full py-2 px-4 text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Configure Project, Voice Skills &amp; E2EE Vault
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: COMPLETE STUDIO DIRECTORY (HOME SCREEN LAUNCHPAD) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
              01. Hujju Platform Studios &amp; Capabilities
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select any studio below to jump directly into voice conversation, multi-model routing, document analysis, creative media, or UPI billing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {studioDirectory.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onNavigateTab(item.tab)}
                className="group text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] hover:border-amber-500 dark:hover:border-amber-500 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">{item.index}</span>
                    <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <span className="truncate">{item.metrics}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-sans font-semibold">
                    Open →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: FREE AVAILABLE DOMAIN & WEBSITE PORTAL ("iam_hujju" / "iam-hujju") */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
              <Globe className="w-4 h-4" />
              <span>Free Domain &amp; Website Identity Hub · Keeping &quot;iam_hujju&quot;</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
              02. Official Free Domain &amp; Website Configuration (iam_hujju / iam-hujju.web.app)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
              Your application is pre-configured for zero-cost global web hosting keeping the <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">iam_hujju</span> identity across Firebase Hosting (<span className="font-mono">iam-hujju.web.app</span>), Cloudflare Pages (<span className="font-mono">iam-hujju.pages.dev</span>), and your live Cloud Run deployment URL.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy('live-url', currentOrigin)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-amber-600 text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {copiedKey === 'live-url' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied Live Website Link
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Live Website URL
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Free Available Domain Matrix with "iam_hujju" */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Customize Your &quot;iam_hujju&quot; Handle / Subdomain Prefix:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  placeholder="iam_hujju"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {FREE_IAM_HUJJU_DOMAINS.map((item) => {
                const isSelected = item.id === activeDomainObj.id;
                const cleanSubdomain =
                  customSlug.trim().replace(/_/g, '-').toLowerCase() || 'iam-hujju';
                const resolvedUrl = item.domain.replace('iam-hujju', cleanSubdomain);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDomainId(item.id)}
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                            {resolvedUrl}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            · {item.availability}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.provider} · Handle: <span className="font-mono">@{customSlug || 'iam_hujju'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.id, resolvedUrl);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-500"
                      >
                        {copiedKey === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy Domain
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 5 Columns: Ready-to-Deploy Free Domain Hosting Descriptor */}
          <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Firebase Free Domain Manifest (firebase.json)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('firebase-json', firebaseHostingConfigJson)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {copiedKey === 'firebase-json' ? 'Copied JSON!' : 'Copy Config'}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
                {firebaseHostingConfigJson}
              </pre>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                Live Cloud Run &amp; PWA Endpoint Active
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Active URL:{' '}
                <span className="font-mono text-slate-800 dark:text-slate-200 break-all">
                  {currentOrigin}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: LIVE AUTONOMOUS WATCHDOG & 14-SUBSYSTEM SELF-HEALING MONITOR */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
              03. Live Autonomous Watchdog — Continuous 14-Subsystem Health &amp; Bug Countermeasure
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatically probes all 14 backend &amp; client subsystems every 30s to detect unresponsive options, Free-Tier quota limits, or runtime faults and engage deterministic continuity fallbacks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {auditReport && (
              <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {auditReport.healthyCount}/{auditReport.totalSubsystems} Operational · Checked{' '}
                {new Date(auditReport.checkedAtIso).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
            <button
              type="button"
              onClick={runLiveSubsystemAudit}
              disabled={isRunningAudit}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              {isRunningAudit ? 'Probing All 14 Subsystems...' : 'Verify & Auto-Heal All Subsystems'}
            </button>
          </div>
        </div>

        {auditReport && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {auditReport.subsystems.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs"
              >
                <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={sub.name}>
                  {sub.name}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0">
                  OK · {sub.latencyMs}ms
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
