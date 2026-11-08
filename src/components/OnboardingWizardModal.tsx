import React, { useState } from 'react';
import {
  FolderKanban,
  Mic,
  Lock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  GEMINI_CHAT_MODELS,
  PRIMARY_INDIC_LANGUAGES,
  ProjectItemRecord,
  SkillConfigItem,
} from '../types';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: SkillConfigItem[];
  isEncryptedVaultActive: boolean;
  e2eeFingerprint: string;
  onCreateProject: (
    title: string,
    description: string,
    status: ProjectItemRecord['status'],
    priority: ProjectItemRecord['priority'],
    modelTarget: string
  ) => Promise<void>;
  onToggleSkill: (skill: SkillConfigItem) => Promise<void>;
  onUnlockOrUpdateVault: (passphrase: string) => Promise<void>;
  onSelectPreferredLanguage: (languageName: string) => void;
  onCompleteOnboarding: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  skills,
  isEncryptedVaultActive,
  e2eeFingerprint,
  onCreateProject,
  onToggleSkill,
  onUnlockOrUpdateVault,
  onSelectPreferredLanguage,
  onCompleteOnboarding,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: First Project Setup State
  const [projTitle, setProjTitle] = useState('iam_hujju Cross-Device AI Workspace');
  const [projDesc, setProjDesc] = useState(
    'Multilingual voice assistant, automated document intelligence, and E2EE cloud sync across Web & Android APK.'
  );
  const [projPriority, setProjPriority] = useState<ProjectItemRecord['priority']>('high');
  const [projModel, setProjModel] = useState<string>('gemini-3.8-flash');
  const [step1Saved, setStep1Saved] = useState(false);
  const [isSavingProj, setIsSavingProj] = useState(false);

  // Step 2: Voice & Multilingual Skills State
  const [selectedLang, setSelectedLang] = useState('English');

  // Step 3: E2EE Vault State
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [isSecuringVault, setIsSecuringVault] = useState(false);

  if (!isOpen) return null;

  const handleSaveStep1Project = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || isSavingProj) return;
    setIsSavingProj(true);
    try {
      await onCreateProject(
        projTitle.trim(),
        projDesc.trim(),
        'active',
        projPriority,
        projModel
      );
      setStep1Saved(true);
      setStep(2);
    } finally {
      setIsSavingProj(false);
    }
  };

  const handleSecureVaultStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    if (passphrase.trim().length < 6) {
      setVaultError('Please enter a passphrase of at least 6 characters to derive your 256-bit key.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setVaultError('Passphrases do not match. Please verify both fields.');
      return;
    }
    setIsSecuringVault(true);
    try {
      await onUnlockOrUpdateVault(passphrase.trim());
    } finally {
      setIsSecuringVault(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 shadow-xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Interactive Setup · Step {step} of 3
            </p>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Welcome to Hujju (iam_hujju) — Guided Workspace Onboarding
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Close Onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Progress Stepper */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2.5 px-4 py-3 text-left border-r border-slate-200 dark:border-slate-800 transition-colors ${
              step === 1
                ? 'bg-white dark:bg-[#0F172A] font-semibold text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FolderKanban className="w-4 h-4 shrink-0" />
            <div className="truncate">
              <div>01. First Project</div>
              <div className="text-[11px] opacity-75">
                {step1Saved ? 'Configured' : 'AI Studio Setup'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2.5 px-4 py-3 text-left border-r border-slate-200 dark:border-slate-800 transition-colors ${
              step === 2
                ? 'bg-white dark:bg-[#0F172A] font-semibold text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Mic className="w-4 h-4 shrink-0" />
            <div className="truncate">
              <div>02. Voice &amp; Skills</div>
              <div className="text-[11px] opacity-75">
                {skills.filter((s) => s.enabled).length} Active Skills
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2.5 px-4 py-3 text-left transition-colors ${
              step === 3
                ? 'bg-white dark:bg-[#0F172A] font-semibold text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <div className="truncate">
              <div>03. E2EE Vault</div>
              <div className="text-[11px] opacity-75">
                {isEncryptedVaultActive ? 'Vault Secured' : 'AES-256-GCM'}
              </div>
            </div>
          </button>
        </div>

        {/* Step Content Area */}
        <div className="p-6">
          {/* STEP 1: FIRST PROJECT SETUP */}
          {step === 1 && (
            <form onSubmit={handleSaveStep1Project} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  01. Configure Your First Google AI Studio Project
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hujju organizes your voice sessions, document analyses, and automated notes around active workspace projects. Create your initial project below or customize its default Gemini model target.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    required
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    placeholder="e.g., iam_hujju Autonomous AI Platform"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Project Scope &amp; Objectives
                  </label>
                  <textarea
                    rows={3}
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Gemini Model Tier
                    </label>
                    <select
                      value={projModel}
                      onChange={(e) => setProjModel(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {GEMINI_CHAT_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} ({m.taskCategory})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={projPriority}
                      onChange={(e) =>
                        setProjPriority(e.target.value as ProjectItemRecord['priority'])
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Launch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Skip to Voice Skills
                </button>
                <button
                  type="submit"
                  disabled={isSavingProj}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  {isSavingProj ? 'Saving Project...' : 'Create Project & Continue'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VOICE & MULTILINGUAL SKILLS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  02. Enable Voice Concierge &amp; Synchronized Device Skills
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Choose your primary voice &amp; chat language (including Hindi, Marathi, Urdu, and English) and toggle the synchronized skills that guide Hujju across your browser, mobile PWA, and Android APK.
                </p>
              </div>

              {/* Preferred Language Selector */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Primary Spoken &amp; Chat Language
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_INDIC_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLang(lang.name);
                        onSelectPreferredLanguage(lang.name);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedLang === lang.name
                          ? 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {lang.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill Toggles */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {skill.name}{' '}
                        <span className="text-[11px] font-normal text-slate-400">
                          · {skill.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                        skill.enabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {skill.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  Next: Secure E2EE Vault
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SECURE E2EE VAULT */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  03. Secure Your Zero-Knowledge AES-GCM 256-Bit E2EE Vault
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your passphrase derives a client-side 256-bit cryptographic key using PBKDF2-SHA256 (120,000 iterations). Your raw passphrase never leaves your device.
                </p>
              </div>

              {isEncryptedVaultActive ? (
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    Zero-Knowledge E2EE Vault Active &amp; Verified
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Key Fingerprint:{' '}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {e2eeFingerprint}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All new chat messages, document summaries, projects, and workspace notes are encrypted prior to cloud persistence.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSecureVaultStep3} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Create Vault Passphrase (min. 6 characters)
                    </label>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter secret E2EE vault passphrase..."
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Vault Passphrase
                    </label>
                    <input
                      type="password"
                      value={confirmPassphrase}
                      onChange={(e) => setConfirmPassphrase(e.target.value)}
                      placeholder="Re-enter passphrase to verify..."
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {vaultError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{vaultError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSecuringVault}
                    className="w-full py-2.5 px-4 text-xs font-semibold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    {isSecuringVault
                      ? 'Deriving PBKDF2 256-Bit Key...'
                      : 'Derive Key & Lock-In E2EE Vault'}
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCompleteOnboarding();
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Finish Onboarding &amp; Launch Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
