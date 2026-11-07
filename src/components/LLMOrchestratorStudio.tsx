import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Network,
  ShieldCheck,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  Code2,
  Layers,
  Activity,
  FilePlus2,
  ArrowRight,
  Lock,
} from 'lucide-react';

type VendorProviderId = 'google' | 'openai' | 'anthropic';
type TaskCapabilityType =
  | 'general'
  | 'coding-stem'
  | 'multilingual'
  | 'long-context'
  | 'fast-extraction';
type LatencyProfile = 'ultra-low' | 'balanced' | 'deep-reasoning';

interface FailoverHopRecord {
  stepIndex: number;
  provider: VendorProviderId;
  modelId: string;
  status: 'succeeded' | 'failed-over' | 'circuit-open';
  reason?: string;
  latencyMs: number;
}

interface UnifiedLLMResponse {
  requestId: string;
  traceId: string;
  createdAtIso: string;
  selectedProvider: VendorProviderId;
  selectedModel: string;
  executionMode: 'live-vendor-sdk' | 'failover-recovered' | 'gateway-cache-hit';
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  latencyMs: number;
  cacheHit: boolean;
  cacheKeyHash: string;
  routingScoreBreakdown: {
    candidateModel: string;
    provider: VendorProviderId;
    compositeScore: number;
    rationale: string;
  }[];
  failoverChain: FailoverHopRecord[];
  vendorWirePreview: {
    openaiChatCompletionsPayload: Record<string, unknown>;
    anthropicMessagesPayload: Record<string, unknown>;
    googleGeminiGenerateContentPayload: Record<string, unknown>;
  };
}

interface TelemetrySummary {
  totalRequests: number;
  cacheHits: number;
  cacheHitRatio: number;
  failoverRecoveries: number;
  totalTokensProcessed: number;
  totalSpendUsd: number;
  activeCacheEntries: number;
  providersVaultStatus: {
    provider: VendorProviderId;
    displayName: string;
    envVarName: string;
    configuredInVault: boolean;
    kmsProtectionMode: string;
    supportedModels: string[];
  }[];
  recentAuditLogs: {
    requestId: string;
    traceId: string;
    timestampIso: string;
    taskCapability: string;
    latencyProfile: string;
    selectedProvider: VendorProviderId;
    selectedModel: string;
    executionMode: string;
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
    cacheHit: boolean;
    failoverHops: number;
  }[];
}

interface LLMOrchestratorStudioProps {
  onSaveArchitectureNote: (title: string, content: string) => void;
  onSaveSqlAuditRecord: (
    title: string,
    category: string,
    modality: string,
    summary: string
  ) => Promise<void>;
}

const ARCHITECTURE_DIAGRAM_ASCII = `┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT & MICROSERVICES APPLICATION LAYER                          │
│         (Web SPA / Mobile PWA / Android APK / Internal Backend Services)                  │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ POST /api/orchestrator/route
                                              │ Canonical Schema: UnifiedLLMRequest
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                     1. UNIFIED API GATEWAY & OBSERVABILITY MIDDLEWARE                     │
│  ┌────────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────────┐  │
│  │ L1/L2 Gateway Cache        │  │ Token Counter & Cost      │  │ OpenTelemetry Audit  │  │
│  │ • L1: SHA-256 Exact Match  │  │ Ledger                    │  │ Logger               │  │
│  │ • L2: pgvector Cosine >0.96│  │ • Real-time USD/1M calc   │  │ • traceId / requestId│  │
│  └────────────────────────────┘  └───────────────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Cache Miss -> Evaluate Routing Policy
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                   2. INTELLIGENT ROUTER, SCORER & CIRCUIT BREAKER ENGINE                  │
│  • Composite Scoring: W_lat(Latency SLA) + W_cost(Budget) + W_ctx(Context Window)         │
│  • Context Gate: >128K tokens automatically promotes Gemini 1M-2M context models          │
│  • Circuit Breaker State Machine: CLOSED ──(5xx / 429 / Timeout)──► OPEN ──► HALF-OPEN    │
│  • Ordered Candidate Plan: [Primary Candidate] ──(Failover)──► [Secondary] ──► [Tertiary] │
└───────────────┬─────────────────────────────┼─────────────────────────────┬───────────────┘
                │                             │                             │
                ▼                             ▼                             ▼
┌───────────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
│    GoogleGeminiAdapter        │ │     OpenAIGptAdapter      │ │  AnthropicClaudeAdapter   │
│  (@google/genai SDK)          │ │ (Chat Completions REST)   │ │   (Messages API v1)       │
│  • gemini-3.1-flash-lite      │ │ • gpt-4o                  │ │ • claude-3-7-sonnet       │
│  • gemini-3.8-flash           │ │ • gpt-4o-mini             │ │ • claude-3-5-haiku        │
│  • gemini-4-argon             │ │                           │ │                           │
│  Normalizes: contents/parts,  │ │ Normalizes: messages[],   │ │ Normalizes: top-level     │
│  config.systemInstruction     │ │ choices[0].message        │ │ system, content[0].text   │
└───────────────┬───────────────┘ └─────────────┬─────────────┘ └─────────────┬─────────────┘
                │                               │                             │
                └───────────────────────────────┼─────────────────────────────┘
                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                 5. ZERO-TRUST KMS & SECRET MANAGER VAULT (SERVER-SIDE ONLY)               │
│  • Envelope Encryption via Cloud KMS + Secret Manager Automatic Rotation                  │
│  • Ephemeral Memory Injection (process.env.GEMINI_API_KEY / OPENAI / ANTHROPIC)           │
└───────────────────────────────────────────────────────────────────────────────────────────┘`;

const ROUTER_PSEUDOCODE = `// ============================================================================
// Vendor-Agnostic Multi-LLM Orchestration Engine — Core Architecture
// ============================================================================

export interface ILLMProviderAdapter {
  readonly providerId: 'google' | 'openai' | 'anthropic';
  isConfigured(): boolean;
  executeCompletion(
    modelId: string,
    request: UnifiedLLMRequest,
    signal?: AbortSignal
  ): Promise<ProviderAdapterOutput>;
}

export class IntelligentLLMRouter {
  private adapters = new Map<VendorProviderId, ILLMProviderAdapter>();
  private circuitBreaker = new Map<string, CircuitState>();
  private gatewayCache = new TieredGatewayCache();

  public async routeAndExecute(req: UnifiedLLMRequest): Promise<UnifiedLLMResponse> {
    // 1. Check API Gateway Cache (Deterministic SHA-256 + Semantic Embedding Match)
    const cacheKey = this.gatewayCache.computeKey(req);
    const cached = await this.gatewayCache.get(cacheKey);
    if (cached && !req.routing.bypassGatewayCache) {
      return this.enrichCacheHit(cached, req);
    }

    // 2. Score & Rank Candidate Models by Task Metadata (Latency, Cost, Context, Capability)
    const candidates = this.rankCandidateModels(req)
      .filter((c) => this.circuitBreaker.isHealthy(c.entry.modelId));

    // 3. Execute Primary with Automatic Multi-Provider Failover
    const failoverChain: FailoverHopRecord[] = [];
    for (const candidate of candidates.slice(0, 3)) {
      const adapter = this.adapters.get(candidate.entry.provider)!;
      try {
        const rawOutput = await this.executeWithTimeout(adapter, candidate.entry.modelId, req);
        this.circuitBreaker.recordSuccess(candidate.entry.modelId);

        const normalized = this.normalizeResponse(req, candidate.entry, rawOutput, failoverChain);
        await this.gatewayCache.set(cacheKey, normalized);
        await this.auditLogger.record(normalized);
        return normalized;
      } catch (err) {
        // Trip circuit breaker on 429 Rate Limit / 503 Service Unavailable / Timeout
        this.circuitBreaker.recordFailure(candidate.entry.modelId, err);
        failoverChain.push({
          provider: candidate.entry.provider,
          modelId: candidate.entry.modelId,
          status: 'failed-over',
          reason: err instanceof Error ? err.message : 'Upstream provider degradation',
        });
      }
    }
    throw new AllProvidersExhaustedError(failoverChain);
  }
}`;

export const LLMOrchestratorStudio: React.FC<LLMOrchestratorStudioProps> = ({
  onSaveArchitectureNote,
  onSaveSqlAuditRecord,
}) => {
  const [subView, setSubView] = useState<'simulator' | 'architecture' | 'code'>('simulator');

  // Simulator Input States
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an enterprise cloud architect. Provide concise, actionable engineering recommendations.'
  );
  const [userPrompt, setUserPrompt] = useState(
    'Design a zero-downtime blue/green failover strategy for a multi-region AI inference gateway.'
  );
  const [taskCapability, setTaskCapability] = useState<TaskCapabilityType>('coding-stem');
  const [latencyProfile, setLatencyProfile] = useState<LatencyProfile>('balanced');
  const [requiredContextTokens, setRequiredContextTokens] = useState<number>(16000);
  const [maxCostPerRequestUsd, setMaxCostPerRequestUsd] = useState<number>(0.015);
  const [preferredProvider, setPreferredProvider] = useState<'auto' | VendorProviderId>('auto');
  const [simulatePrimaryDegradation, setSimulatePrimaryDegradation] = useState<boolean>(false);
  const [bypassGatewayCache, setBypassGatewayCache] = useState<boolean>(false);

  // Execution & Telemetry State
  const [isRouting, setIsRouting] = useState(false);
  const [lastResult, setLastResult] = useState<UnifiedLLMResponse | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [activeWireTab, setActiveWireTab] = useState<'google' | 'openai' | 'anthropic'>('google');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/orchestrator/telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch {
      // Ignore transient errors
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleRunOrchestrator = async () => {
    if (!userPrompt.trim() || isRouting) return;
    setIsRouting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/orchestrator/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...(systemPrompt.trim()
              ? [{ role: 'system', content: systemPrompt.trim() }]
              : []),
            { role: 'user', content: userPrompt.trim() },
          ],
          routing: {
            taskCapability,
            latencyProfile,
            maxCostPerRequestUsd,
            requiredContextTokens,
            preferredProvider,
            simulatePrimaryDegradation,
            bypassGatewayCache,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Orchestrator request failed.');
      }
      setLastResult(data.result);
      if (data.telemetry) {
        setTelemetry(data.telemetry);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to route LLM request.');
    } finally {
      setIsRouting(false);
    }
  };

  const applyPresetScenario = (preset: 'ultra-low' | 'long-context' | 'failover') => {
    if (preset === 'ultra-low') {
      setTaskCapability('fast-extraction');
      setLatencyProfile('ultra-low');
      setRequiredContextTokens(4000);
      setMaxCostPerRequestUsd(0.002);
      setPreferredProvider('auto');
      setSimulatePrimaryDegradation(false);
      setUserPrompt(
        'Extract 3 key SLA metrics (TTFT, P99 latency, token throughput) for a real-time voice gateway.'
      );
    } else if (preset === 'long-context') {
      setTaskCapability('long-context');
      setLatencyProfile('balanced');
      setRequiredContextTokens(500000); // > 200k forces 1M+ Gemini window
      setMaxCostPerRequestUsd(0.05);
      setPreferredProvider('auto');
      setSimulatePrimaryDegradation(false);
      setUserPrompt(
        'Explain how a 500,000-token repository context window is routed when OpenAI (128K) and Claude (200K) limits are exceeded.'
      );
    } else if (preset === 'failover') {
      setTaskCapability('coding-stem');
      setLatencyProfile('balanced');
      setRequiredContextTokens(16000);
      setMaxCostPerRequestUsd(0.025);
      setPreferredProvider('openai');
      setSimulatePrimaryDegradation(true);
      setUserPrompt(
        'Demonstrate automatic circuit-breaker failover when the primary OpenAI GPT-4o endpoint experiences HTTP 503 degradation.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Vendor-Agnostic Multi-LLM Orchestration Engine & Intelligent Router
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unified Adapter Layer for Google (Gemini Series), OpenAI (GPT Series), and Anthropic (Claude Series) with Circuit-Breaker Failover, Gateway Caching & Cost Telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubView('simulator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subView === 'simulator'
                  ? 'bg-slate-900 dark:bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Live Router & Failover Lab
            </button>
            <button
              type="button"
              onClick={() => setSubView('architecture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subView === 'architecture'
                  ? 'bg-slate-900 dark:bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              System Blueprint & Schema
            </button>
            <button
              type="button"
              onClick={() => setSubView('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                subView === 'code'
                  ? 'bg-slate-900 dark:bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Router Reference Code
            </button>
          </div>
        </div>

        {/* Real-time Gateway Telemetry Strip */}
        {telemetry && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Routed Requests</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {telemetry.totalRequests}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Gateway Cache Hit Ratio</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {telemetry.cacheHitRatio}% ({telemetry.cacheHits} hits)
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Failover Recoveries</div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {telemetry.failoverRecoveries} auto-healed
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Tokens Metered</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {telemetry.totalTokensProcessed.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative Spend</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                ${telemetry.totalSpendUsd.toFixed(5)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUBVIEW 1: LIVE ROUTER & FAILOVER SIMULATOR */}
      {subView === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Routing Policy Controls & Prompt Composer */}
          <div className="lg:col-span-5 space-y-5">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-500" />
                  Task Metadata & Routing Constraints
                </h3>
              </div>

              {/* Preset Architectural Scenarios */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Quick Architectural Test Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetScenario('ultra-low')}
                    className="px-2.5 py-2 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-left"
                  >
                    <div className="font-semibold text-amber-600 dark:text-amber-400">Ultra-Low Latency</div>
                    <div className="text-[10px] text-slate-500">Routes Flash-Lite</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetScenario('long-context')}
                    className="px-2.5 py-2 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-left"
                  >
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">500K Long Context</div>
                    <div className="text-[10px] text-slate-500">Exceeds 128K/200K</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetScenario('failover')}
                    className="px-2.5 py-2 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-left"
                  >
                    <div className="font-semibold text-rose-600 dark:text-rose-400">503 Failover Test</div>
                    <div className="text-[10px] text-slate-500">Primary &rarr; Backup</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Task Capability
                  </label>
                  <select
                    value={taskCapability}
                    onChange={(e) => setTaskCapability(e.target.value as TaskCapabilityType)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="general">General Reasoning</option>
                    <option value="coding-stem">Coding / Architecture / STEM</option>
                    <option value="multilingual">Multilingual Localization</option>
                    <option value="long-context">Long-Context Document (&gt;128K)</option>
                    <option value="fast-extraction">High-Speed JSON Extraction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Latency SLA Profile
                  </label>
                  <select
                    value={latencyProfile}
                    onChange={(e) => setLatencyProfile(e.target.value as LatencyProfile)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ultra-low">Ultra-Low Latency (&lt;400ms target)</option>
                    <option value="balanced">Balanced Cost / Performance</option>
                    <option value="deep-reasoning">Deep Frontier Reasoning</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Required Context Window
                  </label>
                  <select
                    value={requiredContextTokens}
                    onChange={(e) => setRequiredContextTokens(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value={4000}>4,000 tokens (Standard)</option>
                    <option value={32000}>32,000 tokens (Medium)</option>
                    <option value={150000}>150,000 tokens (Exceeds GPT-4o 128K)</option>
                    <option value={500000}>500,000 tokens (Requires Gemini 1M+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Preferred Vendor Target
                  </label>
                  <select
                    value={preferredProvider}
                    onChange={(e) =>
                      setPreferredProvider(e.target.value as 'auto' | VendorProviderId)
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="auto">Auto-Select Optimal Provider</option>
                    <option value="google">Google (Gemini Series)</option>
                    <option value="openai">OpenAI (GPT Series + Auto-Failover)</option>
                    <option value="anthropic">Anthropic (Claude Series + Auto-Failover)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span>Max Cost Ceiling per Request</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    ${maxCostPerRequestUsd.toFixed(4)} USD
                  </span>
                </div>
                <input
                  type="range"
                  min={0.0005}
                  max={0.05}
                  step={0.0005}
                  value={maxCostPerRequestUsd}
                  onChange={(e) => setMaxCostPerRequestUsd(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Fault Injection & Cache Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulatePrimaryDegradation}
                    onChange={(e) => setSimulatePrimaryDegradation(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    Simulate Primary Model Degradation (HTTP 503 / Circuit-Breaker Failover)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bypassGatewayCache}
                    onChange={(e) => setBypassGatewayCache(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Bypass API Gateway SHA-256 Cache (Force Fresh Upstream Call)</span>
                </label>
              </div>

              {/* Unified Request Payload Input */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Unified System Instruction
                  </label>
                  <input
                    type="text"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Unified User Message Payload
                  </label>
                  <textarea
                    rows={3}
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRunOrchestrator}
                  disabled={isRouting || !userPrompt.trim()}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isRouting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Routing & Normalizing Across Vendor Adapters...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Dispatch Unified Request Through Intelligent Router
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* KMS & Secret Manager Readiness Status (Zero-Credential UI) */}
            {telemetry && (
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Server-Side Secret Manager & KMS Envelope Status
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Zero hard-coded credentials. Provider keys are resolved exclusively inside the Node.js server boundary via runtime Secret Manager injection.
                </p>
                <div className="space-y-2">
                  {telemetry.providersVaultStatus.map((p) => (
                    <div
                      key={p.provider}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Env Ref: {p.envVarName} · {p.kmsProtectionMode}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.configuredInVault
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {p.configuredInVault ? 'LIVE KMS KEY' : 'AUTO-FAILOVER STANDBY'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Router Decision Trace, Failover Hops, Wire Normalization & Response */}
          <div className="lg:col-span-7 space-y-5">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!lastResult ? (
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-8 text-center space-y-3">
                <Layers className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Ready to Route Unified Multi-LLM Requests
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click <strong>Dispatch Unified Request Through Intelligent Router</strong> or choose one of the quick presets on the left to inspect real-time model scoring, automatic circuit-breaker failover, token cost accounting, and cross-provider JSON schema normalization.
                </p>
              </div>
            ) : (
              <>
                {/* Execution Summary Card */}
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Served By: {lastResult.selectedProvider.toUpperCase()} / {lastResult.selectedModel}
                        </span>
                        {lastResult.cacheHit && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                            GATEWAY CACHE HIT ($0.00 COST)
                          </span>
                        )}
                        {lastResult.executionMode === 'failover-recovered' && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                            AUTO-FAILOVER RECOVERED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        requestId: {lastResult.requestId} · traceId: {lastResult.traceId} · cacheKey: {lastResult.cacheKeyHash}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSaveArchitectureNote(
                            `Router Execution: ${lastResult.selectedModel} (${lastResult.traceId})`,
                            `Provider: ${lastResult.selectedProvider}\nModel: ${lastResult.selectedModel}\nMode: ${lastResult.executionMode}\nTokens: ${lastResult.usage.totalTokens} ($${lastResult.usage.estimatedCostUsd})\n\nResponse:\n${lastResult.content}`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" />
                        Save to E2EE Notes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onSaveSqlAuditRecord(
                            `LLM Router: ${lastResult.selectedModel}`,
                            'Multi-LLM Orchestrator',
                            `${lastResult.selectedProvider.toUpperCase()} (${lastResult.executionMode})`,
                            `Trace ${lastResult.traceId} | ${lastResult.usage.totalTokens} tokens | Cost $${lastResult.usage.estimatedCostUsd} | Latency ${lastResult.latencyMs}ms`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5"
                      >
                        <Database className="w-3.5 h-3.5" />
                        Log to Cloud SQL
                      </button>
                    </div>
                  </div>

                  {/* Token & Latency Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                      <div className="text-[10px] text-slate-500">End-to-End Latency</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {lastResult.latencyMs} ms
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                      <div className="text-[10px] text-slate-500">Prompt / Input Tokens</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {lastResult.usage.promptTokens.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                      <div className="text-[10px] text-slate-500">Completion / Output Tokens</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {lastResult.usage.completionTokens.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
                      <div className="text-[10px] text-slate-500">Metered Request Cost</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${lastResult.usage.estimatedCostUsd.toFixed(6)}
                      </div>
                    </div>
                  </div>

                  {/* Failover Hop Chain Visualization */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                      Execution & Circuit-Breaker Failover Chain
                    </div>
                    <div className="space-y-1.5">
                      {lastResult.failoverChain.map((hop) => (
                        <div
                          key={hop.stepIndex}
                          className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                            hop.status === 'succeeded'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {hop.status === 'succeeded' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-semibold">
                                Hop #{hop.stepIndex}: {hop.provider.toUpperCase()} / {hop.modelId} —{' '}
                                {hop.status.toUpperCase()}
                              </div>
                              {hop.reason && (
                                <div className="text-[11px] opacity-90 mt-0.5">{hop.reason}</div>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-[11px] shrink-0">{hop.latencyMs}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Unified Assistant Output */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Normalized UnifiedLLMResponse.content
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto">
                      {lastResult.content}
                    </div>
                  </div>
                </div>

                {/* Candidate Scoring Matrix & Wire Normalization Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Router Candidate Scoring Ranking
                    </h4>
                    <div className="space-y-2">
                      {lastResult.routingScoreBreakdown.map((item, idx) => (
                        <div
                          key={item.candidateModel}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                            <span>
                              #{idx + 1} {item.candidateModel} ({item.provider})
                            </span>
                            <span className="font-mono text-amber-600 dark:text-amber-400">
                              Score: {item.compositeScore}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.rationale}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Vendor Wire Schema Translation
                      </h4>
                      <div className="flex gap-1">
                        {(['google', 'openai', 'anthropic'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setActiveWireTab(v)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              activeWireTab === v
                                ? 'bg-slate-900 dark:bg-amber-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 text-[10px] font-mono overflow-x-auto max-h-64">
                      {JSON.stringify(
                        activeWireTab === 'google'
                          ? lastResult.vendorWirePreview.googleGeminiGenerateContentPayload
                          : activeWireTab === 'openai'
                          ? lastResult.vendorWirePreview.openaiChatCompletionsPayload
                          : lastResult.vendorWirePreview.anthropicMessagesPayload,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: SYSTEM ARCHITECTURE DIAGRAM & SCHEMA NORMALIZATION MATRIX */}
      {subView === 'architecture' && (
        <div className="space-y-6">
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                High-Availability Multi-LLM Orchestration Architecture Diagram
              </h3>
              <button
                type="button"
                onClick={() =>
                  onSaveArchitectureNote(
                    'Multi-LLM Orchestration Architecture Blueprint',
                    ARCHITECTURE_DIAGRAM_ASCII
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Save Diagram to Workspace Notes
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 text-[11px] font-mono overflow-x-auto leading-snug">
              {ARCHITECTURE_DIAGRAM_ASCII}
            </pre>
          </div>

          {/* Provider Normalization Matrix */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              3. Unified API Standard — Cross-Vendor Normalization Matrix
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Canonical Concept</th>
                    <th className="py-2.5 px-3">Internal Unified Schema</th>
                    <th className="py-2.5 px-3">OpenAI (Chat Completions)</th>
                    <th className="py-2.5 px-3">Anthropic (Messages API)</th>
                    <th className="py-2.5 px-3">Google (@google/genai)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold">System Prompt</td>
                    <td className="py-2.5 px-3">messages[role=&quot;system&quot;]</td>
                    <td className="py-2.5 px-3">messages: [&#123;role: &quot;system&quot;&#125;]</td>
                    <td className="py-2.5 px-3">Top-level system: &quot;...&quot;</td>
                    <td className="py-2.5 px-3">config.systemInstruction</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold">Assistant Role</td>
                    <td className="py-2.5 px-3">role: &quot;assistant&quot;</td>
                    <td className="py-2.5 px-3">role: &quot;assistant&quot;</td>
                    <td className="py-2.5 px-3">role: &quot;assistant&quot;</td>
                    <td className="py-2.5 px-3">role: &quot;model&quot; (parts[])</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold">JSON Output Mode</td>
                    <td className="py-2.5 px-3">responseFormat: &quot;json&quot;</td>
                    <td className="py-2.5 px-3">response_format: &#123;type:&quot;json_object&quot;&#125;</td>
                    <td className="py-2.5 px-3">Tool schema / JSON prefill</td>
                    <td className="py-2.5 px-3">config.responseMimeType</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold">Response Text</td>
                    <td className="py-2.5 px-3">response.content</td>
                    <td className="py-2.5 px-3">choices[0].message.content</td>
                    <td className="py-2.5 px-3">content[0].text</td>
                    <td className="py-2.5 px-3">response.text</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-semibold">Token Accounting</td>
                    <td className="py-2.5 px-3">usage.promptTokens / completionTokens</td>
                    <td className="py-2.5 px-3">usage.prompt_tokens / completion_tokens</td>
                    <td className="py-2.5 px-3">usage.input_tokens / output_tokens</td>
                    <td className="py-2.5 px-3">usageMetadata.promptTokenCount / candidatesTokenCount</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: REFERENCE ROUTER PSEUDO-CODE & IMPLEMENTATION */}
      {subView === 'code' && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-500" />
              Central IntelligentLLMRouter & Adapter Pattern Implementation
            </h3>
            <button
              type="button"
              onClick={() =>
                onSaveArchitectureNote(
                  'IntelligentLLMRouter TypeScript Reference Implementation',
                  ROUTER_PSEUDOCODE
                )
              }
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              Save Code to Workspace Notes
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
            {ROUTER_PSEUDOCODE}
          </pre>
        </div>
      )}
    </div>
  );
};
