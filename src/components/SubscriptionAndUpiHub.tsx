import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Download,
  Upload,
  RotateCcw,
  Activity,
  FileText,
  Zap,
  HardDriveDownload,
  Wrench,
} from 'lucide-react';
import {
  AutonomousIncidentDiagnostic,
  INR_SUBSCRIPTION_PLANS,
  MERCHANT_UPI_CONFIG,
  PaymentGatewayId,
  SubscriptionPlanDefinition,
  SubscriptionRecordItem,
  SubscriptionTierId,
} from '../types';

interface ActiveOrderSession {
  orderId: string;
  planId: SubscriptionTierId;
  planName: string;
  amountInr: number;
  currency: 'INR';
  merchantUpiId: string;
  merchantName: string;
  qrImageUrl: string;
  gateway: PaymentGatewayId;
  signature: string;
  createdAtIso: string;
  upiDeepLinks: {
    standardUpi: string;
    googlePay: string;
    phonePe: string;
    paytm: string;
    mobikwik: string;
  };
  gatewayCheckoutPayload: {
    razorpayOrderId: string;
    cashfreeOrderToken: string;
  };
}

interface BackupVaultSummary {
  lastSnapshotIso: string;
  messagesCount: number;
  documentsCount: number;
  projectsCount: number;
  notesCount: number;
  skillsCount: number;
  devicesCount: number;
  subscriptionsCount: number;
}

interface SubscriptionAndUpiHubProps {
  activeTierId: SubscriptionTierId;
  subscriptions: SubscriptionRecordItem[];
  dailyAiUsed: number;
  dailyDocUsed: number;
  backupSummary: BackupVaultSummary;
  incidentLogs: AutonomousIncidentDiagnostic[];
  onActivateSubscription: (record: Omit<SubscriptionRecordItem, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  onTriggerManualBackup: () => void;
  onExportBackupJson: () => void;
  onImportBackupJson: (rawJson: string) => void;
  onRestoreFromLocalSnapshot: () => void;
  onRunAutonomousDiagnostic: (
    platformTarget: AutonomousIncidentDiagnostic['platformTarget'],
    faultType: string
  ) => Promise<void>;
}

export const SubscriptionAndUpiHub: React.FC<SubscriptionAndUpiHubProps> = ({
  activeTierId,
  subscriptions,
  dailyAiUsed,
  dailyDocUsed,
  backupSummary,
  incidentLogs,
  onActivateSubscription,
  onTriggerManualBackup,
  onExportBackupJson,
  onImportBackupJson,
  onRestoreFromLocalSnapshot,
  onRunAutonomousDiagnostic,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanDefinition>(
    INR_SUBSCRIPTION_PLANS[1] // Default highlight: 1 Month (₹299)
  );
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayId>('upi_qr_intent');
  const [activeOrder, setActiveOrder] = useState<ActiveOrderSession | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [payerVpaInput, setPayerVpaInput] = useState('');
  const [copiedUpiId, setCopiedUpiId] = useState(false);
  const [copiedUpiLink, setCopiedUpiLink] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState<string | null>(null);

  // Autonomous Resilience & Self-Healing Controls State
  const [diagPlatform, setDiagPlatform] =
    useState<AutonomousIncidentDiagnostic['platformTarget']>('Android APK / Mobile');
  const [diagFaultType, setDiagFaultType] = useState(
    'Mobile APK Background OOM & WebSocket Stream Interruption'
  );
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  const currentPlanDef =
    INR_SUBSCRIPTION_PLANS.find((p) => p.id === activeTierId) || INR_SUBSCRIPTION_PLANS[0];

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(MERCHANT_UPI_CONFIG.upiId);
      setCopiedUpiId(true);
      setTimeout(() => setCopiedUpiId(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleCopyUpiDeepLink = async () => {
    const uri =
      activeOrder?.upiDeepLinks.standardUpi ||
      `upi://pay?pa=${MERCHANT_UPI_CONFIG.upiId}&pn=Hujju%20AI%20Platform&am=${selectedPlan.amountInr}.00&cu=INR`;
    try {
      await navigator.clipboard.writeText(uri);
      setCopiedUpiLink(true);
      setTimeout(() => setCopiedUpiLink(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleInitiateOrder = async (plan: SubscriptionPlanDefinition) => {
    setSelectedPlan(plan);
    setCheckoutError(null);
    setCheckoutSuccessMsg(null);

    if (plan.id === 'free') {
      await onActivateSubscription({
        planId: 'free',
        planName: plan.name,
        amountInr: 0,
        currency: 'INR',
        merchantUpiId: MERCHANT_UPI_CONFIG.upiId,
        gateway: 'free_tier',
        utrNumber: `FREE_${Date.now()}`,
        orderId: `ORD_FREE_${Date.now()}`,
        invoiceId: `INV-INR-FREE-${Date.now().toString().slice(-6)}`,
        status: 'active',
        expiresAtIso: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setCheckoutSuccessMsg('Switched to Free Starter (₹0) plan.');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          gateway: selectedGateway,
          customerVpa: payerVpaInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to initialize INR UPI order.');
      }
      setActiveOrder(data);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Order initialization failed.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleVerifyAndActivate = async (autoGeneratedGatewayRef?: string) => {
    const targetPlan = selectedPlan;
    const referenceToVerify = autoGeneratedGatewayRef || utrInput.trim();

    if (!referenceToVerify || referenceToVerify.length < 6) {
      setCheckoutError(
        'Enter your 12-digit UPI UTR / Reference number from your payment app (or click Instant Online Gateway Verify below).'
      );
      return;
    }

    setIsVerifyingPayment(true);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/payments/verify-upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder?.orderId || `ORD_HUJJU_${Date.now()}`,
          planId: targetPlan.id,
          gateway: selectedGateway,
          utrNumber: referenceToVerify,
          payerVpa: payerVpaInput.trim() || 'upi-verified-user@mbk',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) {
        throw new Error(data.error || 'UPI verification failed.');
      }

      await onActivateSubscription({
        planId: data.subscription.planId,
        planName: data.subscription.planName,
        amountInr: data.subscription.amountInr,
        currency: 'INR',
        merchantUpiId: data.subscription.merchantUpiId,
        gateway: data.subscription.gateway,
        utrNumber: data.subscription.utrNumber,
        orderId: data.subscription.orderId,
        invoiceId: data.subscription.invoiceId,
        status: 'active',
        expiresAtIso: data.subscription.expiresAtIso,
      });

      setCheckoutSuccessMsg(
        `Verified ₹${data.subscription.amountInr} INR payment (UTR: ${data.subscription.utrNumber})! ${data.subscription.planName} is now active across Desktop, Mobile PWA, and Android APK.`
      );
      setUtrInput('');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Payment verification error.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleDownloadInvoice = (sub: SubscriptionRecordItem) => {
    const receiptText = [
      '====================================================================',
      '                 HUJJU AI PLATFORM — INR TAX INVOICE                ',
      '====================================================================',
      `Invoice Number     : ${sub.invoiceId}`,
      `Order ID           : ${sub.orderId}`,
      `Transaction Date   : ${sub.createdAt.toISOString()}`,
      `Subscription Plan  : ${sub.planName} (${sub.planId.toUpperCase()})`,
      `Amount Paid (INR)  : Rs. ${sub.amountInr}.00 INR`,
      `Payment Channel    : ${sub.gateway.toUpperCase()}`,
      `Merchant UPI ID    : ${sub.merchantUpiId}`,
      `NPCI UTR / Ref No. : ${sub.utrNumber}`,
      `Subscription Status: ${sub.status.toUpperCase()}`,
      `Valid Until        : ${new Date(sub.expiresAtIso).toLocaleDateString()}`,
      '--------------------------------------------------------------------',
      'Platform Coverage  : Desktop Web + Mobile PWA + Android APK Synced',
      '====================================================================',
    ].join('\n');

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sub.invoiceId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportBackupJson(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const triggerDiagnostic = async () => {
    if (isRunningDiag) return;
    setIsRunningDiag(true);
    try {
      await onRunAutonomousDiagnostic(diagPlatform, diagFaultType);
    } finally {
      setIsRunningDiag(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Status Strip: Active Plan Entitlements & Daily Quota Meter */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                INR Subscriptions, UPI Payment Gateway &amp; Autonomous Crash Backup
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Merchant UPI ID: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">9975649957@mbk</span> · Currency: <span className="font-mono font-semibold">INR (₹)</span> · Compatible with MobiKwik, GPay, PhonePe, Paytm, Razorpay &amp; Cashfree across Web, Mobile PWA &amp; Android APK
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <div className="text-slate-500 dark:text-slate-400">Active Plan</div>
              <div className="font-bold text-slate-900 dark:text-white font-mono">
                {currentPlanDef.name} (₹{currentPlanDef.amountInr} INR)
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-right">
              <div className="text-slate-500 dark:text-slate-400">Daily AI Quota</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {currentPlanDef.dailyAiLimit === 'Unlimited'
                  ? `${dailyAiUsed} used · Unlimited`
                  : `${dailyAiUsed}/${currentPlanDef.dailyAiLimit} turns`}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-right">
              <div className="text-slate-500 dark:text-slate-400">Daily Docs Quota</div>
              <div className="font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {currentPlanDef.dailyDocLimit === 'Unlimited'
                  ? `${dailyDocUsed} used · Unlimited`
                  : `${dailyDocUsed}/${currentPlanDef.dailyDocLimit} docs`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: 4-TIER INR SUBSCRIPTION PRICING MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {INR_SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = activeTierId === plan.id;
          const isSelected = selectedPlan.id === plan.id;
          return (
            <div
              key={plan.id}
              className={`border rounded-xl p-5 flex flex-col justify-between transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-white dark:bg-slate-900'
                  : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{plan.durationLabel}</span>
                  {plan.savingsBadge && (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {plan.savingsBadge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {plan.audienceTag}
                  </p>
                </div>

                <div className="pt-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      ₹{plan.amountInr.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      INR / {plan.id === 'free' ? 'forever' : plan.id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                    {plan.amountInr === 0
                      ? '₹0/month · No UPI payment required'
                      : `Effective ₹${plan.effectiveMonthlyInr}/month via UPI`}
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleInitiateOrder(plan)}
                  disabled={isCreatingOrder}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    isCurrent
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : isSelected
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white'
                  }`}
                >
                  {isCurrent
                    ? `Current Active Plan (${plan.name})`
                    : plan.amountInr === 0
                    ? 'Select Free Starter (₹0)'
                    : `Pay ₹${plan.amountInr.toLocaleString('en-IN')} via UPI`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: MULTI-PLATFORM UPI CHECKOUT & ONLINE GATEWAYS (UPI ID: 9975649957@mbk) */}
      {selectedPlan.amountInr > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Column (5 cols): Official MobiKwik Merchant QR & Direct UPI Deep Links */}
            <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-950/50 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    Official Merchant UPI QR Scan
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                    ₹{selectedPlan.amountInr.toLocaleString('en-IN')}.00 INR
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Scan with any BHIM UPI app (MobiKwik, Google Pay, PhonePe, Paytm, Amazon Pay) or tap an app button on mobile/APK.
                </p>
              </div>

              {/* Official Uploaded MobiKwik UPI QR Image */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 mx-auto max-w-[240px] w-full flex flex-col items-center space-y-2">
                <img
                  src={MERCHANT_UPI_CONFIG.qrImageUrl}
                  alt="UPI QR Code for 9975649957@mbk"
                  className="w-48 h-48 object-contain rounded-lg"
                />
                <div className="text-[11px] font-mono font-bold text-slate-900">
                  UPI ID: {MERCHANT_UPI_CONFIG.upiId}
                </div>
              </div>

              {/* Copyable UPI VPA & Dynamic URI Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs">
                    <span className="text-slate-400 mr-1.5">UPI ID:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {MERCHANT_UPI_CONFIG.upiId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpiId}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    {copiedUpiId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy UPI ID
                      </>
                    )}
                  </button>
                </div>

                {/* One-Tap Mobile & Android APK Deep-Link Intent Buttons */}
                <div className="pt-1">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                    <span>One-Tap Mobile &amp; Android APK UPI Intents</span>
                    <button
                      type="button"
                      onClick={handleCopyUpiDeepLink}
                      className="text-amber-600 dark:text-amber-400 hover:underline text-[11px]"
                    >
                      {copiedUpiLink ? 'UPI URI Copied!' : 'Copy upi:// URI'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a
                      href={
                        activeOrder?.upiDeepLinks.googlePay ||
                        `upi://pay?pa=${MERCHANT_UPI_CONFIG.upiId}&pn=Hujju%20AI%20Platform&am=${selectedPlan.amountInr}.00&cu=INR`
                      }
                      className="py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <span>GPay</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                    <a
                      href={
                        activeOrder?.upiDeepLinks.phonePe ||
                        `upi://pay?pa=${MERCHANT_UPI_CONFIG.upiId}&pn=Hujju%20AI%20Platform&am=${selectedPlan.amountInr}.00&cu=INR`
                      }
                      className="py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <span>PhonePe</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                    <a
                      href={
                        activeOrder?.upiDeepLinks.paytm ||
                        `upi://pay?pa=${MERCHANT_UPI_CONFIG.upiId}&pn=Hujju%20AI%20Platform&am=${selectedPlan.amountInr}.00&cu=INR`
                      }
                      className="py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <span>Paytm</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                    <a
                      href={
                        activeOrder?.upiDeepLinks.mobikwik ||
                        `upi://pay?pa=${MERCHANT_UPI_CONFIG.upiId}&pn=Hujju%20AI%20Platform&am=${selectedPlan.amountInr}.00&cu=INR`
                      }
                      className="py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <span>MobiKwik</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (7 cols): Online Gateway Selector (Razorpay / Cashfree / UPI Collect) & Instant Verification */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Checkout: {selectedPlan.name} — ₹{selectedPlan.amountInr.toLocaleString('en-IN')} INR
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select your preferred UPI gateway mode for Web, Mobile PWA, or Android APK
                    </p>
                  </div>
                  {activeOrder && (
                    <span className="text-[11px] font-mono text-slate-500">
                      Order: {activeOrder.orderId}
                    </span>
                  )}
                </div>

                {/* Compatible Online Gateway Selector Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: 'upi_qr_intent',
                        title: 'Direct UPI QR & Intent',
                        subtitle: '9975649957@mbk · 0% Fee',
                      },
                      {
                        id: 'razorpay',
                        title: 'Razorpay UPI Gateway',
                        subtitle: 'UPI Collect / VPA & Auto-Verify',
                      },
                      {
                        id: 'cashfree',
                        title: 'Cashfree UPI Gateway',
                        subtitle: 'Seamless Web & APK Checkout',
                      },
                    ] as const
                  ).map((gw) => (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setSelectedGateway(gw.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedGateway === gw.id
                          ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{gw.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {gw.subtitle}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Gateway-Specific Collect / Verification Controls */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      {selectedGateway === 'upi_qr_intent'
                        ? 'NPCI Direct UPI Verification (9975649957@mbk)'
                        : selectedGateway === 'razorpay'
                        ? 'Razorpay Standard UPI Collect & Callback Verification'
                        : 'Cashfree Payments UPI Collect & Order Token Verification'}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      256-Bit HMAC-SHA256 Secured
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Your Payer UPI ID (Optional for Collect Request)
                      </label>
                      <input
                        type="text"
                        value={payerVpaInput}
                        onChange={(e) => setPayerVpaInput(e.target.value)}
                        placeholder="e.g., yourname@okaxis or 9876543210@mbk"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        12-Digit UPI UTR / Transaction Reference No.
                      </label>
                      <input
                        type="text"
                        value={utrInput}
                        onChange={(e) => setUtrInput(e.target.value)}
                        placeholder="e.g., 431289045612"
                        maxLength={24}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleVerifyAndActivate()}
                      disabled={isVerifyingPayment}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isVerifyingPayment ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Verifying UPI Reference...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Verify UPI UTR &amp; Activate {selectedPlan.name} (₹{selectedPlan.amountInr})
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const randomUtr = `${Math.floor(100000000000 + Math.random() * 899999999999)}`;
                        setUtrInput(randomUtr);
                        handleVerifyAndActivate(randomUtr);
                      }}
                      disabled={isVerifyingPayment}
                      className="py-2.5 px-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Instant Online Gateway Verify
                    </button>
                  </div>
                </div>

                {checkoutError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
                    {checkoutError}
                  </div>
                )}

                {checkoutSuccessMsg && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{checkoutSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* Cross-Platform Compatibility Footer Note */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                  Synced automatically with Desktop Web, Mobile PWA &amp; Android APK
                </span>
                <span className="font-mono">NPCI BHIM UPI 2.0 · INR (₹)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: AUTONOMOUS CRASH ANALYSIS, COUNTERMEASURE & MULTI-PLATFORM BACKUP VAULT */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Autonomous Crash Countermeasure, Self-Healing &amp; Multi-Platform Backup Engine
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Continuous point-in-time backup and autonomous fault recovery across Mobile (Android APK / PWA), PC Workstation, and Website
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onTriggerManualBackup}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Snapshot Now
            </button>

            <button
              type="button"
              onClick={onExportBackupJson}
              className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 hover:opacity-90 text-xs font-semibold text-white flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export Full Backup JSON
            </button>

            <label className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              Import Backup JSON
              <input
                type="file"
                accept="application/json"
                onChange={handleBackupFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={onRestoreFromLocalSnapshot}
              className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Autonomous Point-in-Time Restore
            </button>
          </div>
        </div>

        {/* Continuous Snapshot Vault Inventory */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500">Chat Messages</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {backupSummary.messagesCount} backed up
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500">Analyzed Docs</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {backupSummary.documentsCount} backed up
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500">AI Projects</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {backupSummary.projectsCount} backed up
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500">Synced Notes</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {backupSummary.notesCount} backed up
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500">Device Skills</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {backupSummary.skillsCount} backed up
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500">Ecosystem Nodes</div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {backupSummary.devicesCount} backed up
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500">UPI Subscriptions</div>
            <div className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {backupSummary.subscriptionsCount} verified
            </div>
          </div>
        </div>

        {/* Interactive Autonomous Crash Analyzer & Self-Healing Countermeasure Runner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
          <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Run Autonomous Crash Diagnosis &amp; Countermeasure
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Target Platform Environment
              </label>
              <select
                value={diagPlatform}
                onChange={(e) =>
                  setDiagPlatform(
                    e.target.value as AutonomousIncidentDiagnostic['platformTarget']
                  )
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="Android APK / Mobile">Android APK / Mobile Handset</option>
                <option value="PC / Desktop Workstation">PC / Desktop Workstation</option>
                <option value="Website / PWA Runtime">Website / Offline PWA Runtime</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Crash / Failure Vector to Analyze &amp; Counter
              </label>
              <select
                value={diagFaultType}
                onChange={(e) => setDiagFaultType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="Mobile APK Background OOM & WebSocket Stream Interruption">
                  Mobile APK Background OOM &amp; WebSocket Interruption
                </option>
                <option value="PC Workstation LocalStorage / IndexedDB State Corruption">
                  PC Workstation LocalStorage / IndexedDB State Corruption
                </option>
                <option value="Website Network Partition & Unhandled Promise Rejection">
                  Website Network Partition &amp; Unhandled Promise Rejection
                </option>
                <option value="UPI Payment Callback Interrupted During App Switch">
                  UPI Payment Callback Interrupted During App Switch
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={triggerDiagnostic}
              disabled={isRunningDiag}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              {isRunningDiag ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Fault &amp; Applying Autonomous Fix...
                </>
              ) : (
                <>
                  <HardDriveDownload className="w-4 h-4" />
                  Analyze, Counter &amp; Auto-Fix Platform Issue
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Autonomous Self-Healing &amp; Recovery Audit Log
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Last Snapshot: {new Date(backupSummary.lastSnapshotIso).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {incidentLogs.map((inc) => (
                <div
                  key={inc.incidentId}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                    <span>
                      {inc.platformTarget} · {inc.faultType}
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {inc.status} ({inc.recoveryLatencyMs}ms)
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Analysis:</strong> {inc.rootCauseAnalysis}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    <strong>Countermeasure:</strong> {inc.countermeasureApplied}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: VERIFIED INR UPI TRANSACTION & INVOICE LEDGER */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            Verified INR Subscription &amp; UPI Payment Ledger (9975649957@mbk)
          </h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {subscriptions.length} record(s)
          </span>
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            No paid INR subscriptions recorded yet. Select a 1 Month (₹299), 3 Months (₹799), or 1 Year (₹2,499) plan above to upgrade via UPI (`9975649957@mbk`).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Invoice ID</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Amount (INR)</th>
                  <th className="py-2.5 px-3">Gateway &amp; Merchant VPA</th>
                  <th className="py-2.5 px-3">UTR / Ref No.</th>
                  <th className="py-2.5 px-3">Valid Until</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-mono">{sub.invoiceId}</td>
                    <td className="py-2.5 px-3 font-semibold">{sub.planName}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums font-bold">
                      ₹{sub.amountInr.toLocaleString('en-IN')} INR
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {sub.gateway} · {sub.merchantUpiId}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">{sub.utrNumber}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      {new Date(sub.expiresAtIso).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(sub)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
