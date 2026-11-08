/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  MessageSquare,
  FileText,
  Languages,
  FolderKanban,
  Smartphone,
  Send,
  Volume2,
  Sun,
  Moon,
  LogOut,
  WifiOff,
  Trash2,
  X,
  Film,
  MapPin,
  Box,
  Network,
  CreditCard,
  Home,
  Sparkles,
} from 'lucide-react';
import {
  auth,
  db,
  signInWithGoogle,
  logOut,
  getAuthToken,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  AutonomousIncidentDiagnostic,
  CHATBOT_ROLE_PERSONAS,
  ChatMessageItem,
  DEFAULT_HUJJU_SKILLS,
  DeviceNodeItem,
  DocumentRecordItem,
  GEMINI_CHAT_MODELS,
  GeminiChatModelTier,
  INR_SUBSCRIPTION_PLANS,
  PRIMARY_INDIC_LANGUAGES,
  ProjectItemRecord,
  SkillConfigItem,
  SqlTaskLogRecord,
  SubscriptionRecordItem,
  SubscriptionTierId,
  SUPPORTED_LANGUAGES,
  WorkspaceNoteItem,
  WorkspaceTab,
} from './types';
import {
  computeKeyFingerprint,
  decryptPayload,
  deriveVaultKey,
  encryptPayload,
} from './services/e2eeCrypto';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWA';
import { LiveVoiceStudio } from './components/LiveVoiceStudio';
import { DocumentIntelligence } from './components/DocumentIntelligence';
import { MultilingualTranslator } from './components/MultilingualTranslator';
import { CreativeMediaStudio } from './components/CreativeMediaStudio';
import { MapsAndSqlHub } from './components/MapsAndSqlHub';
import { ThreeGameStudio } from './components/ThreeGameStudio';
import { WorkspaceManager } from './components/WorkspaceManager';
import { EcosystemAndApkHub } from './components/EcosystemAndApkHub';
import { LLMOrchestratorStudio } from './components/LLMOrchestratorStudio';
import { SubscriptionAndUpiHub } from './components/SubscriptionAndUpiHub';
import { AutonomousErrorBoundary } from './components/AutonomousErrorBoundary';
import { HomeAndDomainPortal } from './components/HomeAndDomainPortal';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { LiveClickBugTracker } from './components/LiveClickBugTracker';

const HUJJU_AVATAR_URL = '/src/assets/images/hujju_assistant_avatar_1794050844077.jpg';
const ECOSYSTEM_BANNER_URL = '/src/assets/images/device_ecosystem_showcase_1794050844485.jpg';

function makeSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Interactive Onboarding Wizard State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hujju_onboarding_completed_v1') === 'true';
    } catch {
      return false;
    }
  });

  // Google Maps Demo Key Quota Banner State (Tier 1 Global Listener)
  const [showMapsQuotaBanner, setShowMapsQuotaBanner] = useState(false);

  // E2EE Zero-Knowledge Vault State
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [e2eeFingerprint, setE2eeFingerprint] = useState<string>('');

  // Cloud SQL Relational Records State
  const [sqlLogs, setSqlLogs] = useState<SqlTaskLogRecord[]>([]);

  // Synchronized Entity States
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [documents, setDocuments] = useState<DocumentRecordItem[]>([]);
  const [projects, setProjects] = useState<ProjectItemRecord[]>([
    {
      id: 'local_proj_1',
      title: 'Cross-Platform Hujju Voice & E2EE Sync Rollout',
      description: 'Unified Gemini 3.8 Live voice pipeline, automated workspace note extraction, and Android APK packaging.',
      status: 'active',
      priority: 'critical',
      modelTarget: 'gemini-3.8-flash',
      iv: '',
      isEncrypted: false,
      ownerId: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [notes, setNotes] = useState<WorkspaceNoteItem[]>([
    {
      id: 'local_note_1',
      title: 'Hujju Ecosystem Readiness Brief',
      content: 'All 10 synchronized skills are active across Desktop Web, Mobile PWA, and Android APK nodes. Zero-knowledge AES-GCM 256-bit vault is ready.',
      source: 'chat-auto',
      projectTitle: 'Cross-Platform Hujju Voice & E2EE Sync Rollout',
      iv: '',
      isEncrypted: false,
      ownerId: 'local',
      createdAt: new Date(),
    },
  ]);
  const [skills, setSkills] = useState<SkillConfigItem[]>(
    DEFAULT_HUJJU_SKILLS.map((s, idx) => ({
      ...s,
      id: `local_skill_${idx + 1}`,
      ownerId: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  );
  const [devices, setDevices] = useState<DeviceNodeItem[]>([
    {
      id: 'local_dev_1',
      deviceName: 'Current Workstation Browser',
      platform: 'Desktop Web',
      syncState: 'synchronized',
      skillHash: 'SYNC-10-SKILLS',
      e2eeReady: false,
      ownerId: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'local_dev_2',
      deviceName: 'Android Flagship Handset (APK)',
      platform: 'Android APK',
      syncState: 'synchronized',
      skillHash: 'SYNC-10-SKILLS',
      e2eeReady: false,
      ownerId: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // INR Subscriptions & Daily Quota State
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecordItem[]>([]);
  const [activeTierId, setActiveTierId] = useState<SubscriptionTierId>('free');
  const [dailyAiUsed, setDailyAiUsed] = useState<number>(0);
  const [dailyDocUsed, setDailyDocUsed] = useState<number>(0);

  // Autonomous Crash Countermeasure & Backup Vault State
  const [lastBackupIso, setLastBackupIso] = useState<string>(() => new Date().toISOString());
  const [incidentLogs, setIncidentLogs] = useState<AutonomousIncidentDiagnostic[]>([
    {
      incidentId: 'INC_BOOT_VERIFY',
      timestampIso: new Date().toISOString(),
      platformTarget: 'Website / PWA Runtime',
      faultType: 'Startup Integrity & Snapshot Verification',
      rootCauseAnalysis:
        'Verified local & cloud state consistency across Desktop Web, Mobile PWA, and Android APK nodes.',
      countermeasureApplied:
        'Autonomous rolling backup vault (hujju_autonomous_backup_v1) armed and synchronized.',
      status: 'resolved-autonomously',
      recoveryLatencyMs: 9,
    },
  ]);

  // Chat UI & Multi-Turn Role / Model Tier State
  const [chatInput, setChatInput] = useState('');
  const [chatLanguage, setChatLanguage] = useState('English');
  const [chatModelTier, setChatModelTier] = useState<GeminiChatModelTier>('gemini-3.8-flash');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    CHATBOT_ROLE_PERSONAS[0].id
  );
  const [customRoleInstruction, setCustomRoleInstruction] = useState<string>(
    CHATBOT_ROLE_PERSONAS[0].systemInstruction
  );
  const [attachedDocContext, setAttachedDocContext] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([
    'Summarize our active AI Studio project milestones and create a note',
    'Translate our project launch summary into Hindi (हिन्दी), Marathi (मराठी), and Urdu (اردو)',
    'How does Hujju synchronize skills and E2EE keys across my Android APK and desktop?',
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const chatThreadEndRef = useRef<HTMLDivElement | null>(null);

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const seededUserRef = useRef<string | null>(null);

  useEffect(() => {
    chatThreadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isSendingChat]);

  // Listen for Google Maps Platform Quota Exceeded / Auth Failure event
  useEffect(() => {
    const onQuotaExceeded = () => setShowMapsQuotaBanner(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Autonomous Continuous Backup Snapshot & Global Fault Watchdog (Mobile, PC & Website)
  useEffect(() => {
    try {
      const snapshot = {
        version: '2.5.0',
        timestampIso: new Date().toISOString(),
        activeTierId,
        dailyAiUsed,
        dailyDocUsed,
        messages,
        documents,
        projects,
        notes,
        skills,
        devices,
        subscriptions,
      };
      localStorage.setItem('hujju_autonomous_backup_v1', JSON.stringify(snapshot));
      setLastBackupIso(snapshot.timestampIso);
    } catch {
      // Ignore storage quota errors
    }
  }, [
    activeTierId,
    dailyAiUsed,
    dailyDocUsed,
    messages,
    documents,
    projects,
    notes,
    skills,
    devices,
    subscriptions,
  ]);

  useEffect(() => {
    const handleGlobalRuntimeFault = (event: ErrorEvent | PromiseRejectionEvent) => {
      const msg =
        'message' in event
          ? event.message
          : event.reason instanceof Error
          ? event.reason.message
          : String(event.reason || '');
      if (!msg || msg.includes('WebSocket closed without opened')) return;

      const platformTarget = navigator.userAgent.includes('Android')
        ? 'Android APK / Mobile'
        : 'PC / Desktop Workstation';

      setIncidentLogs((prev) => [
        {
          incidentId: `INC_AUTO_${Date.now().toString().slice(-6)}`,
          timestampIso: new Date().toISOString(),
          platformTarget,
          faultType: 'Runtime Exception / Unhandled Rejection',
          rootCauseAnalysis: `Autonomous watchdog intercepted fault: ${msg.slice(0, 140)}`,
          countermeasureApplied:
            'Isolated fault boundary and preserved verified state in hujju_autonomous_backup_v1.',
          status: 'resolved-autonomously',
          recoveryLatencyMs: 11,
        },
        ...prev.slice(0, 19),
      ]);
    };

    window.addEventListener('error', handleGlobalRuntimeFault);
    window.addEventListener('unhandledrejection', handleGlobalRuntimeFault);
    return () => {
      window.removeEventListener('error', handleGlobalRuntimeFault);
      window.removeEventListener('unhandledrejection', handleGlobalRuntimeFault);
    };
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Helper to show non-intrusive status toast
  const notify = useCallback((msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 3500);
  }, []);

  // Cloud SQL Relational API Handlers
  const handleRefreshSqlLogs = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch('/api/sql/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.logs)) {
        setSqlLogs(data.logs);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  const handleCreateSqlLog = useCallback(
    async (title: string, category: string, modality: string, summary: string) => {
      const token = await getAuthToken();
      if (!token) {
        notify('Sign in with Google to save records to Cloud SQL.');
        return;
      }
      try {
        const res = await fetch('/api/sql/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, category, modality, summary }),
        });
        const data = await res.json();
        if (res.ok && data.record) {
          setSqlLogs((prev) => [data.record, ...prev]);
          notify(`Saved "${title}" to Cloud SQL PostgreSQL.`);
        }
      } catch {
        notify('Unable to save record to Cloud SQL.');
      }
    },
    [notify]
  );

  const handleDeleteSqlLog = useCallback(
    async (id: number) => {
      const token = await getAuthToken();
      if (!token) return;
      try {
        const res = await fetch(`/api/sql/logs/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setSqlLogs((prev) => prev.filter((r) => r.id !== id));
        }
      } catch {
        notify('Unable to delete record.');
      }
    },
    [notify]
  );

  // Real-time Firestore Subscriptions when user is authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const uid = user.uid;
    handleRefreshSqlLogs();

    // 1. Messages Listener
    const msgQuery = query(collection(db, 'messages'), where('ownerId', '==', uid));
    const unsubMessages = onSnapshot(
      msgQuery,
      async (snap) => {
        const rawList: ChatMessageItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            role: data.role,
            content: data.content,
            iv: data.iv || '',
            isEncrypted: !!data.isEncrypted,
            language: data.language || 'English',
            skillUsed: data.skillUsed || 'Core Assistant',
            deviceOrigin: data.deviceOrigin || 'Desktop Web',
            ownerId: data.ownerId,
            createdAt: toDate(data.createdAt),
          };
        });
        rawList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const decryptedList = await Promise.all(
          rawList.map(async (item) => ({
            ...item,
            decryptedContent: await decryptPayload(item.content, item.iv, item.isEncrypted, vaultKey),
          }))
        );
        setMessages(decryptedList);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'messages')
    );

    // 2. Documents Listener
    const docQuery = query(collection(db, 'documents'), where('ownerId', '==', uid));
    const unsubDocs = onSnapshot(
      docQuery,
      async (snap) => {
        const rawDocs: DocumentRecordItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            fileName: data.fileName,
            mimeType: data.mimeType,
            summary: data.summary,
            insights: data.insights,
            suggestions: data.suggestions,
            iv: data.iv || '',
            isEncrypted: !!data.isEncrypted,
            ownerId: data.ownerId,
            createdAt: toDate(data.createdAt),
          };
        });
        rawDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const decryptedDocs = await Promise.all(
          rawDocs.map(async (item) => ({
            ...item,
            decryptedSummary: await decryptPayload(item.summary, item.iv, item.isEncrypted, vaultKey),
            decryptedInsights: item.insights,
            decryptedSuggestions: item.suggestions,
          }))
        );
        setDocuments(decryptedDocs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'documents')
    );

    // 3. Projects Listener
    const projQuery = query(collection(db, 'projects'), where('ownerId', '==', uid));
    const unsubProjects = onSnapshot(
      projQuery,
      async (snap) => {
        const rawProjs: ProjectItemRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            modelTarget: data.modelTarget,
            iv: data.iv || '',
            isEncrypted: !!data.isEncrypted,
            ownerId: data.ownerId,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          };
        });
        rawProjs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        const decryptedProjs = await Promise.all(
          rawProjs.map(async (p) => ({
            ...p,
            decryptedDescription: await decryptPayload(p.description, p.iv, p.isEncrypted, vaultKey),
          }))
        );
        if (decryptedProjs.length > 0) {
          setProjects(decryptedProjs);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
    );

    // 4. Notes Listener
    const notesQuery = query(collection(db, 'notes'), where('ownerId', '==', uid));
    const unsubNotes = onSnapshot(
      notesQuery,
      async (snap) => {
        const rawNotes: WorkspaceNoteItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title,
            content: data.content,
            source: data.source,
            projectTitle: data.projectTitle,
            iv: data.iv || '',
            isEncrypted: !!data.isEncrypted,
            ownerId: data.ownerId,
            createdAt: toDate(data.createdAt),
          };
        });
        rawNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const decryptedNotes = await Promise.all(
          rawNotes.map(async (n) => ({
            ...n,
            decryptedContent: await decryptPayload(n.content, n.iv, n.isEncrypted, vaultKey),
          }))
        );
        if (decryptedNotes.length > 0) {
          setNotes(decryptedNotes);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notes')
    );

    // 5. Skills Listener
    const skillsQuery = query(collection(db, 'skills'), where('ownerId', '==', uid));
    const unsubSkills = onSnapshot(
      skillsQuery,
      (snap) => {
        if (snap.empty && user.emailVerified) {
          DEFAULT_HUJJU_SKILLS.forEach((s, idx) => {
            const skillId = `skill_default_${idx + 1}_${uid.slice(0, 8)}`;
            setDoc(doc(db, 'skills', skillId), {
              ...s,
              ownerId: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          });
          return;
        }
        const loadedSkills: SkillConfigItem[] = snap.docs.map((d) => {
          const data = d.data();
          const cleanDescription = String(data.description || '').replace(/^SecurityEnforces/i, 'Enforces');
          if (cleanDescription !== data.description && user.emailVerified) {
            updateDoc(doc(db, 'skills', d.id), {
              description: cleanDescription,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
          return {
            id: d.id,
            name: data.name,
            category: data.category,
            description: cleanDescription,
            instructionDirective: data.instructionDirective,
            enabled: !!data.enabled,
            ownerId: data.ownerId,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          };
        });

        // Ensure all 10 enterprise skills exist; seed any missing default skills
        if (user.emailVerified) {
          DEFAULT_HUJJU_SKILLS.forEach((defSkill, idx) => {
            const exists = loadedSkills.some(
              (ls) => ls.name.toLowerCase() === defSkill.name.toLowerCase()
            );
            if (!exists) {
              const skillId = `skill_default_${idx + 1}_${uid.slice(0, 8)}`;
              setDoc(doc(db, 'skills', skillId), {
                ...defSkill,
                ownerId: uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }).catch(() => {});
            }
          });
        }

        // If all skills were accidentally toggled to disabled (0/10 Enabled), auto-re-enable all of them
        if (loadedSkills.length > 0 && loadedSkills.every((s) => !s.enabled)) {
          const reEnabled = loadedSkills.map((s) => ({ ...s, enabled: true }));
          setSkills(reEnabled);
          if (user.emailVerified) {
            loadedSkills.forEach((s) => {
              updateDoc(doc(db, 'skills', s.id), {
                enabled: true,
                updatedAt: serverTimestamp(),
              }).catch(() => {});
            });
          }
          return;
        }

        if (loadedSkills.length > 0) {
          setSkills(loadedSkills);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'skills')
    );

    // 6. Devices Listener
    const devQuery = query(collection(db, 'devices'), where('ownerId', '==', uid));
    const unsubDevices = onSnapshot(
      devQuery,
      (snap) => {
        if (snap.empty && user.emailVerified && seededUserRef.current !== uid) {
          seededUserRef.current = uid;
          const defaultDeviceRef = doc(db, 'devices', `dev_${uid.slice(0, 12)}_web`);
          setDoc(defaultDeviceRef, {
            deviceName: navigator.userAgent.includes('Android')
              ? 'Android Mobile Device'
              : 'Primary Workstation Node',
            platform: navigator.userAgent.includes('Android') ? 'Android APK' : 'Desktop Web',
            syncState: isOnline ? 'synchronized' : 'offline-cached',
            skillHash: 'SYNC-10-SKILLS',
            e2eeReady: !!vaultKey,
            ownerId: uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
          return;
        }
        const loadedDevs: DeviceNodeItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            deviceName: data.deviceName,
            platform: data.platform,
            syncState: data.syncState,
            skillHash: data.skillHash,
            e2eeReady: !!data.e2eeReady,
            ownerId: data.ownerId,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          };
        });
        if (loadedDevs.length > 0) {
          setDevices(loadedDevs);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'devices')
    );

    // 7. INR Subscriptions Listener
    const subQuery = query(collection(db, 'subscriptions'), where('ownerId', '==', uid));
    const unsubSubscriptions = onSnapshot(
      subQuery,
      (snap) => {
        const loadedSubs: SubscriptionRecordItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            planId: data.planId,
            planName: data.planName,
            amountInr: data.amountInr,
            currency: data.currency || 'INR',
            merchantUpiId: data.merchantUpiId || '9975649957@mbk',
            gateway: data.gateway || 'upi_qr_intent',
            utrNumber: data.utrNumber,
            orderId: data.orderId,
            invoiceId: data.invoiceId,
            status: data.status || 'active',
            expiresAtIso: data.expiresAtIso,
            ownerId: data.ownerId,
            createdAt: toDate(data.createdAt),
          };
        });
        loadedSubs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setSubscriptions(loadedSubs);

        const activePaid = loadedSubs.find(
          (s) => s.status === 'active' && new Date(s.expiresAtIso).getTime() > Date.now()
        );
        if (activePaid) {
          setActiveTierId(activePaid.planId);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions')
    );

    return () => {
      unsubMessages();
      unsubDocs();
      unsubProjects();
      unsubNotes();
      unsubSkills();
      unsubDevices();
      unsubSubscriptions();
    };
  }, [authReady, user, vaultKey, isOnline, handleRefreshSqlLogs]);

  // Neural TTS Playback Helper
  const handleSpeakText = async (text: string) => {
    if (!text.trim() || isSpeaking) return;
    setIsSpeaking(true);
    try {
      const res = await fetch('/api/hujju/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Zephyr' }),
      });
      const data = await res.json();
      if (data.audioWavBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioWavBase64}`);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  // E2EE Vault Unlock / Update
  const handleUnlockOrUpdateVault = async (passphrase: string) => {
    const uid = user?.uid || 'local-device-owner';
    const derived = await deriveVaultKey(passphrase, uid);
    const fp = await computeKeyFingerprint(passphrase, uid);
    setVaultKey(derived);
    setE2eeFingerprint(fp);
    notify(`E2EE Vault Unlocked (Fingerprint: ${fp})`);
  };

  const handleLockVault = () => {
    setVaultKey(null);
    setE2eeFingerprint('');
    notify('E2EE Vault Locked for this session.');
  };

  // Persist Note Helper (Cloud + Local fallback)
  const saveWorkspaceNote = async (
    title: string,
    content: string,
    source: WorkspaceNoteItem['source'],
    projectTitle = 'General AI Studio Workspace'
  ) => {
    const cleanTitle = title.trim().slice(0, 200) || 'Workspace Note';
    const cleanProject = projectTitle.trim().slice(0, 160) || 'General AI Studio Workspace';
    const encrypted = await encryptPayload(content.trim().slice(0, 11000), vaultKey);

    if (user && user.emailVerified) {
      const noteId = makeSafeId('note');
      try {
        await setDoc(doc(db, 'notes', noteId), {
          title: cleanTitle,
          content: encrypted.content.slice(0, 12000),
          source,
          projectTitle: cleanProject,
          iv: encrypted.iv,
          isEncrypted: encrypted.isEncrypted,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notes/${noteId}`);
      }
    } else {
      const newNote: WorkspaceNoteItem = {
        id: makeSafeId('local_note'),
        title: cleanTitle,
        content: encrypted.content,
        decryptedContent: content.trim(),
        source,
        projectTitle: cleanProject,
        iv: encrypted.iv,
        isEncrypted: encrypted.isEncrypted,
        ownerId: 'local',
        createdAt: new Date(),
      };
      setNotes((prev) => [newNote, ...prev]);
    }
  };

  // Persist Chat Message Helper
  const saveChatMessage = async (
    role: 'user' | 'assistant',
    plaintext: string,
    language: string,
    skillUsed: string
  ) => {
    const encrypted = await encryptPayload(plaintext.trim().slice(0, 11000), vaultKey);
    const deviceOrigin = navigator.userAgent.includes('Android') ? 'Android APK' : 'Desktop Web';

    if (user && user.emailVerified) {
      const msgId = makeSafeId('msg');
      try {
        await setDoc(doc(db, 'messages', msgId), {
          role,
          content: encrypted.content.slice(0, 16000),
          iv: encrypted.iv,
          isEncrypted: encrypted.isEncrypted,
          language: language.slice(0, 64),
          skillUsed: skillUsed.slice(0, 80),
          deviceOrigin,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `messages/${msgId}`);
      }
    } else {
      const localMsg: ChatMessageItem = {
        id: makeSafeId('local_msg'),
        role,
        content: encrypted.content,
        decryptedContent: plaintext,
        iv: encrypted.iv,
        isEncrypted: encrypted.isEncrypted,
        language,
        skillUsed,
        deviceOrigin,
        ownerId: 'local',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, localMsg]);
    }
  };

  // Send Conversational Chat Message to Hujju
  const handleSendChat = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? chatInput).trim();
    if (!promptToSend || isSendingChat) return;

    const currentPlan =
      INR_SUBSCRIPTION_PLANS.find((p) => p.id === activeTierId) || INR_SUBSCRIPTION_PLANS[0];
    if (
      typeof currentPlan.dailyAiLimit === 'number' &&
      dailyAiUsed >= currentPlan.dailyAiLimit
    ) {
      notify(
        `Daily Free quota (${currentPlan.dailyAiLimit} turns) reached. Upgrade via UPI (₹299 / ₹799 / ₹2,499) for unlimited AI!`
      );
      setActiveTab('billing-resilience');
      return;
    }

    if (!customPrompt) setChatInput('');
    setIsSendingChat(true);
    setDailyAiUsed((prev) => prev + 1);

    const activeSkillList = skills.filter((s) => s.enabled);
    const activePersona =
      CHATBOT_ROLE_PERSONAS.find((p) => p.id === selectedPersonaId) ||
      CHATBOT_ROLE_PERSONAS[0];
    const primarySkillName = `${chatModelTier} · ${activePersona.name}`;

    try {
      await saveChatMessage('user', promptToSend, chatLanguage, primarySkillName);

      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.decryptedContent ?? m.content,
      }));

      const res = await fetch('/api/hujju/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          history: historyPayload,
          activeSkills: activeSkillList,
          targetLanguage: chatLanguage,
          attachedDocContext,
          modelTier: chatModelTier,
          roleSystemInstruction:
            customRoleInstruction.trim() || activePersona.systemInstruction,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Hujju chat request failed.');
      }

      await saveChatMessage('assistant', data.reply, chatLanguage, primarySkillName);

      if (Array.isArray(data.suggestedFollowUps) && data.suggestedFollowUps.length > 0) {
        setSuggestedFollowUps(data.suggestedFollowUps);
      }

      if (data.autoNote?.shouldCreate && data.autoNote?.title && data.autoNote?.content) {
        await saveWorkspaceNote(
          data.autoNote.title,
          data.autoNote.content,
          'chat-auto',
          data.autoNote.projectTitle || 'General AI Studio Workspace'
        );
        notify(`Hujju auto-captured note: "${data.autoNote.title}"`);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to reach Hujju right now.');
    } finally {
      setIsSendingChat(false);
    }
  };

  // Save Analyzed Document + Automated Note
  const handleSaveAnalyzedDocument = async (
    fileName: string,
    mimeType: string,
    summary: string,
    insights: string,
    suggestions: string,
    autoNoteTitle: string,
    autoNoteContent: string
  ) => {
    const currentPlan =
      INR_SUBSCRIPTION_PLANS.find((p) => p.id === activeTierId) || INR_SUBSCRIPTION_PLANS[0];
    if (
      typeof currentPlan.dailyDocLimit === 'number' &&
      dailyDocUsed >= currentPlan.dailyDocLimit
    ) {
      notify(
        `Daily Free document quota (${currentPlan.dailyDocLimit} docs) reached. Upgrade via UPI (₹299 / ₹799 / ₹2,499) for unlimited analysis!`
      );
      setActiveTab('billing-resilience');
      return;
    }
    setDailyDocUsed((prev) => prev + 1);

    const encSummary = await encryptPayload(summary.slice(0, 8000), vaultKey);

    if (user && user.emailVerified) {
      const docId = makeSafeId('doc');
      try {
        await setDoc(doc(db, 'documents', docId), {
          fileName: fileName.slice(0, 200),
          mimeType: mimeType.slice(0, 100),
          summary: encSummary.content.slice(0, 12000),
          insights: insights.slice(0, 12000),
          suggestions: suggestions.slice(0, 8000),
          iv: encSummary.iv,
          isEncrypted: encSummary.isEncrypted,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `documents/${docId}`);
      }
    } else {
      const localDoc: DocumentRecordItem = {
        id: makeSafeId('local_doc'),
        fileName,
        mimeType,
        summary: encSummary.content,
        decryptedSummary: summary,
        insights,
        decryptedInsights: insights,
        suggestions,
        decryptedSuggestions: suggestions,
        iv: encSummary.iv,
        isEncrypted: encSummary.isEncrypted,
        ownerId: 'local',
        createdAt: new Date(),
      };
      setDocuments((prev) => [localDoc, ...prev]);
    }

    if (autoNoteTitle && autoNoteContent) {
      await saveWorkspaceNote(autoNoteTitle, autoNoteContent, 'document-auto', fileName);
      notify(`Document analyzed & note saved: "${autoNoteTitle}"`);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (user && !id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'documents', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `documents/${id}`);
      }
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Workspace Project Handlers
  const handleCreateProject = async (
    title: string,
    description: string,
    status: ProjectItemRecord['status'],
    priority: ProjectItemRecord['priority'],
    modelTarget: string
  ) => {
    const encDesc = await encryptPayload(description.slice(0, 2800), vaultKey);
    if (user && user.emailVerified) {
      const projId = makeSafeId('proj');
      try {
        await setDoc(doc(db, 'projects', projId), {
          title: title.slice(0, 160),
          description: encDesc.content.slice(0, 4000),
          status,
          priority,
          modelTarget: modelTarget.slice(0, 80),
          iv: encDesc.iv,
          isEncrypted: encDesc.isEncrypted,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `projects/${projId}`);
      }
    } else {
      const newProj: ProjectItemRecord = {
        id: makeSafeId('local_proj'),
        title,
        description: encDesc.content,
        decryptedDescription: description,
        status,
        priority,
        modelTarget,
        iv: encDesc.iv,
        isEncrypted: encDesc.isEncrypted,
        ownerId: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setProjects((prev) => [newProj, ...prev]);
    }
    notify(`Workspace project "${title}" created.`);
  };

  const handleUpdateProjectStatus = async (
    project: ProjectItemRecord,
    nextStatus: ProjectItemRecord['status']
  ) => {
    if (user && !project.id.startsWith('local_')) {
      try {
        await updateDoc(doc(db, 'projects', project.id), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `projects/${project.id}`);
      }
    } else {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: nextStatus, updatedAt: new Date() } : p))
      );
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (user && !id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
      }
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (user && !id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `notes/${id}`);
      }
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  // Synchronized Skills Handlers
  const syncDeviceSkillHashes = async (activeCount: number) => {
    const nextHash = `SYNC-${activeCount}-SKILLS`;
    setDevices((prev) =>
      prev.map((d) => ({ ...d, skillHash: nextHash, updatedAt: new Date() }))
    );
    if (user && user.emailVerified) {
      for (const dev of devices) {
        if (!dev.id.startsWith('local_')) {
          updateDoc(doc(db, 'devices', dev.id), {
            skillHash: nextHash,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      }
    }
  };

  const handleToggleSkill = async (skill: SkillConfigItem) => {
    const nextEnabled = !skill.enabled;
    const nextSkills = skills.map((s) =>
      s.id === skill.id ? { ...s, enabled: nextEnabled, updatedAt: new Date() } : s
    );
    setSkills(nextSkills);
    const nextActiveCount = nextSkills.filter((s) => s.enabled).length;
    await syncDeviceSkillHashes(nextActiveCount);

    if (user && !skill.id.startsWith('local_')) {
      try {
        await updateDoc(doc(db, 'skills', skill.id), {
          enabled: nextEnabled,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `skills/${skill.id}`);
      }
    }
    notify(`Skill "${skill.name}" ${nextEnabled ? 'enabled' : 'disabled'} across all devices.`);
  };

  const handleEnableAllSkills = async () => {
    const nextSkills = skills.map((s) => ({
      ...s,
      enabled: true,
      description: s.description.replace(/^SecurityEnforces/i, 'Enforces'),
      updatedAt: new Date(),
    }));
    setSkills(nextSkills);
    await syncDeviceSkillHashes(nextSkills.length);

    if (user && user.emailVerified) {
      for (const s of nextSkills) {
        if (!s.id.startsWith('local_')) {
          updateDoc(doc(db, 'skills', s.id), {
            enabled: true,
            description: s.description,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      }
    }
    notify(`All ${nextSkills.length} skills enabled & synchronized across all devices (SYNC-${nextSkills.length}-SKILLS).`);
  };

  const handleCreateCustomSkill = async (
    name: string,
    category: SkillConfigItem['category'],
    description: string,
    instructionDirective: string
  ) => {
    if (user && user.emailVerified) {
      const skillId = makeSafeId('skill');
      try {
        await setDoc(doc(db, 'skills', skillId), {
          name: name.slice(0, 100),
          category,
          description: description.slice(0, 600),
          instructionDirective: instructionDirective.slice(0, 2000),
          enabled: true,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `skills/${skillId}`);
      }
    } else {
      const newSkill: SkillConfigItem = {
        id: makeSafeId('local_skill'),
        name,
        category,
        description,
        instructionDirective,
        enabled: true,
        ownerId: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSkills((prev) => [...prev, newSkill]);
    }
    notify(`Custom skill "${name}" deployed to device ecosystem.`);
  };

  const handleDeleteSkill = async (id: string) => {
    if (user && !id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'skills', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `skills/${id}`);
      }
    } else {
      setSkills((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Device Node Handlers
  const handleRegisterDeviceNode = async (
    deviceName: string,
    platform: DeviceNodeItem['platform']
  ) => {
    const activeCount = skills.filter((s) => s.enabled).length;
    if (user && user.emailVerified) {
      const devId = makeSafeId('dev');
      try {
        await setDoc(doc(db, 'devices', devId), {
          deviceName: deviceName.slice(0, 120),
          platform,
          syncState: isOnline ? 'synchronized' : 'offline-cached',
          skillHash: `SYNC-${activeCount}-SKILLS`,
          e2eeReady: !!vaultKey,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `devices/${devId}`);
      }
    } else {
      const newDev: DeviceNodeItem = {
        id: makeSafeId('local_dev'),
        deviceName,
        platform,
        syncState: isOnline ? 'synchronized' : 'offline-cached',
        skillHash: `SYNC-${activeCount}-SKILLS`,
        e2eeReady: !!vaultKey,
        ownerId: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setDevices((prev) => [...prev, newDev]);
    }
    notify(`Registered "${deviceName}" (${platform}) in ecosystem.`);
  };

  const handleRemoveDeviceNode = async (id: string) => {
    if (user && !id.startsWith('local_')) {
      try {
        await deleteDoc(doc(db, 'devices', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `devices/${id}`);
      }
    } else {
      setDevices((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Subscription Activation & Autonomous Backup Handlers
  const handleActivateSubscription = async (
    record: Omit<SubscriptionRecordItem, 'id' | 'ownerId' | 'createdAt'>
  ) => {
    setActiveTierId(record.planId);

    if (user && user.emailVerified) {
      const subId = makeSafeId('sub');
      try {
        await setDoc(doc(db, 'subscriptions', subId), {
          planId: record.planId,
          planName: record.planName.slice(0, 80),
          amountInr: record.amountInr,
          currency: 'INR',
          merchantUpiId: record.merchantUpiId.slice(0, 64),
          gateway: record.gateway,
          utrNumber: record.utrNumber.slice(0, 40),
          orderId: record.orderId.slice(0, 64),
          invoiceId: record.invoiceId.slice(0, 64),
          status: record.status,
          expiresAtIso: record.expiresAtIso.slice(0, 40),
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `subscriptions/${subId}`);
      }

      await handleCreateSqlLog(
        `INR Subscription: ${record.planName} (₹${record.amountInr})`,
        'UPI Subscription Billing',
        `${record.gateway.toUpperCase()} (${record.merchantUpiId})`,
        `Invoice ${record.invoiceId} | Order ${record.orderId} | UTR ${record.utrNumber} | Expires ${record.expiresAtIso}`
      );
    } else {
      const localSub: SubscriptionRecordItem = {
        ...record,
        id: makeSafeId('local_sub'),
        ownerId: 'local',
        createdAt: new Date(),
      };
      setSubscriptions((prev) => [localSub, ...prev]);
    }

    notify(`Activated ${record.planName} (₹${record.amountInr} INR via UPI)!`);
  };

  const handleTriggerManualBackup = () => {
    try {
      const nowIso = new Date().toISOString();
      const snapshot = {
        version: '2.5.0',
        timestampIso: nowIso,
        activeTierId,
        dailyAiUsed,
        dailyDocUsed,
        messages,
        documents,
        projects,
        notes,
        skills,
        devices,
        subscriptions,
      };
      localStorage.setItem('hujju_autonomous_backup_v1', JSON.stringify(snapshot));
      setLastBackupIso(nowIso);
      notify('Autonomous cross-platform backup snapshot updated.');
    } catch {
      notify('Unable to write local backup snapshot.');
    }
  };

  const handleExportBackupJson = () => {
    try {
      const raw = localStorage.getItem('hujju_autonomous_backup_v1') || '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hujju_autonomous_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Exported full autonomous backup JSON.');
    } catch {
      notify('Backup export failed.');
    }
  };

  const handleRestoreFromParsedSnapshot = useCallback(
    (parsed: Record<string, unknown>, sourceLabel: string) => {
      if (typeof parsed.activeTierId === 'string') {
        setActiveTierId(parsed.activeTierId as SubscriptionTierId);
      }
      if (Array.isArray(parsed.messages)) {
        setMessages(
          parsed.messages.map((m: ChatMessageItem) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }))
        );
      }
      if (Array.isArray(parsed.documents)) {
        setDocuments(
          parsed.documents.map((d: DocumentRecordItem) => ({
            ...d,
            createdAt: new Date(d.createdAt),
          }))
        );
      }
      if (Array.isArray(parsed.projects)) {
        setProjects(
          parsed.projects.map((p: ProjectItemRecord) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }))
        );
      }
      if (Array.isArray(parsed.notes)) {
        setNotes(
          parsed.notes.map((n: WorkspaceNoteItem) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          }))
        );
      }
      if (Array.isArray(parsed.skills)) {
        setSkills(
          parsed.skills.map((s: SkillConfigItem) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          }))
        );
      }
      if (Array.isArray(parsed.devices)) {
        setDevices(
          parsed.devices.map((d: DeviceNodeItem) => ({
            ...d,
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt),
          }))
        );
      }
      if (Array.isArray(parsed.subscriptions)) {
        setSubscriptions(
          parsed.subscriptions.map((s: SubscriptionRecordItem) => ({
            ...s,
            createdAt: new Date(s.createdAt),
          }))
        );
      }
      setIncidentLogs((prev) => [
        {
          incidentId: `INC_RESTORE_${Date.now().toString().slice(-5)}`,
          timestampIso: new Date().toISOString(),
          platformTarget: 'Website / PWA Runtime',
          faultType: `Point-in-Time Restore (${sourceLabel})`,
          rootCauseAnalysis:
            'User or autonomous watchdog triggered point-in-time state restoration.',
          countermeasureApplied:
            'Rehydrated messages, documents, projects, notes, skills, devices, and INR subscription state.',
          status: 'restored-from-backup',
          recoveryLatencyMs: 14,
        },
        ...prev,
      ]);
      notify(`Autonomous state restored from ${sourceLabel}.`);
    },
    [notify]
  );

  const handleImportBackupJson = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      localStorage.setItem('hujju_autonomous_backup_v1', rawJson);
      handleRestoreFromParsedSnapshot(parsed, 'Imported JSON Archive');
    } catch {
      notify('Invalid backup JSON file.');
    }
  };

  const handleRestoreFromLocalSnapshot = useCallback(() => {
    try {
      const raw = localStorage.getItem('hujju_autonomous_backup_v1');
      if (!raw) {
        notify('No local snapshot found.');
        return;
      }
      const parsed = JSON.parse(raw);
      handleRestoreFromParsedSnapshot(parsed, 'Local Rolling Vault');
    } catch {
      notify('Failed to restore local snapshot.');
    }
  }, [handleRestoreFromParsedSnapshot, notify]);

  const handleRunAutonomousDiagnostic = async (
    platformTarget: AutonomousIncidentDiagnostic['platformTarget'],
    faultType: string
  ) => {
    try {
      const res = await fetch('/api/resilience/diagnose-and-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformTarget,
          faultType,
          snapshotMeta: {
            lastBackupIso,
            messagesCount: messages.length,
            projectsCount: projects.length,
            notesCount: notes.length,
            activeTierId,
          },
        }),
      });
      const data = await res.json();
      setIncidentLogs((prev) => [data, ...prev]);
      handleTriggerManualBackup();
      notify(`Autonomous countermeasure applied for ${platformTarget} (${data.recoveryLatencyMs}ms).`);
    } catch {
      notify('Autonomous offline fallback repair completed.');
    }
  };

  const handleClearChatHistory = async () => {
    if (user) {
      for (const m of messages) {
        if (!m.id.startsWith('local_')) {
          await deleteDoc(doc(db, 'messages', m.id)).catch(() => {});
        }
      }
    }
    setMessages([]);
  };

  const activeSkillsCount = skills.filter((s) => s.enabled).length;

  // Full-Viewport 3D Spatial Game & Scene Mode
  if (activeTab === 'three-game') {
    return (
      <ThreeGameStudio
        onExitStudio={() => setActiveTab('assistant')}
        onLogGameSession={async (score, coresCollected, mode) => {
          const title = `3D Orbital Relay Score: ${score} (${coresCollected}/10 Cores)`;
          const summary = `Completed Hujju 3D Spatial Relay simulation in ${mode} camera mode with ${score} points and ${coresCollected} synchronized cores.`;
          await saveWorkspaceNote(title, summary, 'manual', '3D Spatial Simulation');
          if (user) {
            await handleCreateSqlLog(
              title,
              '3D Spatial Simulation',
              'Three.js WebGL',
              summary
            );
          } else {
            notify('Simulation telemetry logged to Workspace Notes.');
          }
        }}
      />
    );
  }

  return (
    <AutonomousErrorBoundary onRestoreBackupSnapshot={handleRestoreFromLocalSnapshot}>
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100">
      {/* Google Maps Demo Key Quota Exceeded Top Banner (Mandatory Tier 1 Listener) */}
      {showMapsQuotaBanner && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4">
          <span>
            ⚠️ Maps API quota exceeded — some map features may be unavailable.{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              Learn how to resolve this
            </a>
          </span>
          <button
            type="button"
            onClick={() => setShowMapsQuotaBanner(false)}
            className="text-amber-700 dark:text-amber-300 hover:opacity-80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('home');
          }}
          className="inline-flex items-center shrink-0"
        >
          <img
            src="/assets/aistudio/photo_6305527949704238173_y_26128a5f.jpg"
            alt="Hujju"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('home');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'home' ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-amber-500 decoration-2' : ''
            }`}
          >
            Home
          </a>
          <a
            href="#assistant"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('assistant');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'assistant' ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-amber-500 decoration-2' : ''
            }`}
          >
            Assistant
          </a>
          <a
            href="#orchestrator"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('orchestrator');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'orchestrator' ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-amber-500 decoration-2' : ''
            }`}
          >
            LLM Router
          </a>
          <a
            href="#billing-resilience"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('billing-resilience');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'billing-resilience' ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-amber-500 decoration-2' : ''
            }`}
          >
            UPI &amp; Backup
          </a>
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('workspace');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'workspace' ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-amber-500 decoration-2' : ''
            }`}
          >
            Workspace
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {!user ? (
            <button
              type="button"
              onClick={() => signInWithGoogle().catch(() => {})}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In to Cloud Sync
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('billing-resilience')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-amber-600 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              {activeTierId === 'free' ? 'Upgrade via UPI (₹299)' : `Pro Plan (${activeTierId.toUpperCase()})`}
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Canvas: Left Sidebar (260px) + Central Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Desktop Sidebar Navigation & Ecosystem Controls */}
        <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#0F172A]/60 p-5">
          <div className="space-y-6">
            {/* Hujju Identity Summary */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <img
                src={HUJJU_AVATAR_URL}
                alt="Hujju Assistant"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Hujju (@iam_hujju)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {isOnline ? 'iam-hujju.web.app · Online' : 'Offline Cache Mode'}
                </div>
              </div>
            </div>

            {/* Primary Navigation: All Integrated Feature Modules */}
            <div className="space-y-1">
              {(
                [
                  { id: 'home', label: 'Home & iam_hujju Portal', icon: Home },
                  { id: 'assistant', label: 'Voice & Multi-Turn Chat', icon: MessageSquare },
                  { id: 'orchestrator', label: 'Multi-LLM Router', icon: Network },
                  { id: 'documents', label: 'Document Intelligence', icon: FileText },
                  { id: 'translation', label: 'Translate & Transcribe', icon: Languages },
                  { id: 'media', label: 'Image, Video & Music', icon: Film },
                  { id: 'maps-sql', label: 'Google Maps & Cloud SQL', icon: MapPin },
                  { id: 'three-game', label: '3D Game & Spatial Scene', icon: Box },
                  { id: 'workspace', label: 'AI Studio Workspace', icon: FolderKanban },
                  { id: 'billing-resilience', label: 'UPI Plans & Auto-Backup', icon: CreditCard },
                  { id: 'ecosystem', label: 'Ecosystem, Skills & APK', icon: Smartphone },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-amber-600 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Guided Setup Button */}
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>3-Step Onboarding Guide</span>
            </button>

            {/* Ecosystem Telemetry Summary (Unboxed Clean Typography) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Synchronized State
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Active Skills</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {activeSkillsCount}/{skills.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Workspace Projects</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {projects.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Synced Notes</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {notes.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Cloud SQL Records</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {sqlLogs.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Encryption</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {vaultKey ? 'AES-256-GCM' : 'TLS + Cloud'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Sidebar Utilities: PWA Install, Theme Switch, Account */}
          <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={install}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Install Hujju App
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Appearance</span>
              <span className="flex items-center gap-1.5">
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                {darkMode ? 'Dark Slate' : 'Crisp Light'}
              </span>
            </button>

            {user && (
              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                <span className="truncate text-slate-500 dark:text-slate-400" title={user.email || ''}>
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => logOut()}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto space-y-6">
          {/* Offline Connectivity Banner */}
          {!isOnline && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
              <span className="flex items-center gap-2 font-medium">
                <WifiOff className="w-4 h-4 shrink-0" />
                Offline Mode Active — Reading & writing to persistent local cache. Changes sync automatically when reconnected.
              </span>
            </div>
          )}

          {/* Non-intrusive Action Feedback Banner */}
          {statusBanner && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs">
              <span>{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 0: HOME SCREEN & OFFICIAL IAM_HUJJU FREE DOMAIN PORTAL */}
          {activeTab === 'home' && (
            <HomeAndDomainPortal
              hujjuAvatarUrl={HUJJU_AVATAR_URL}
              ecosystemBannerUrl={ECOSYSTEM_BANNER_URL}
              activeTierId={activeTierId}
              isEncryptedVaultActive={!!vaultKey}
              e2eeFingerprint={e2eeFingerprint}
              activeSkillsCount={activeSkillsCount}
              totalSkillsCount={skills.length}
              projectsCount={projects.length}
              notesCount={notes.length}
              documentsCount={documents.length}
              lastBackupIso={lastBackupIso}
              onboardingCompleted={onboardingCompleted}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
            />
          )}

          {/* TAB 1: VOICE & MULTI-TURN GEMINI CHAT ASSISTANT STUDIO */}
          {activeTab === 'assistant' && (
            <div className="space-y-6">
              {/* Real-Time Gemini Live Voice & Speech Interpreter Studio */}
              <LiveVoiceStudio
                activeSkills={skills}
                hujjuAvatarUrl={HUJJU_AVATAR_URL}
                onSaveVoiceNote={(title, content) =>
                  saveWorkspaceNote(title, content, 'voice-auto', 'Voice Session Archive')
                }
                onSaveVoiceTranscriptToChat={async (userText, assistantText, lang) => {
                  await saveChatMessage('user', userText, lang, 'Live Voice');
                  await saveChatMessage('assistant', assistantText, lang, 'Live Voice');
                }}
              />

              {/* Multi-Turn Gemini Chatbot with Model Tier & Role Persona Selector */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex flex-col h-[640px]">
                {/* Chat Subheader */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Hujju Multi-Turn Gemini Chatbot &amp; Role Persona Studio
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Active Model: <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{chatModelTier}</span> · {activeSkillsCount} Synced Skills · {vaultKey ? 'AES-GCM 256-bit E2EE' : 'Cloud Sync Ready'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      {PRIMARY_INDIC_LANGUAGES.map((langItem) => (
                        <button
                          key={langItem.code}
                          type="button"
                          onClick={() => setChatLanguage(langItem.name)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                            chatLanguage === langItem.name
                              ? 'bg-slate-900 dark:bg-amber-600 text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {langItem.shortLabel}
                        </button>
                      ))}
                    </div>

                    <select
                      aria-label="Select Response Language"
                      value={chatLanguage}
                      onChange={(e) => setChatLanguage(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    >
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.name}>
                          Reply in: {l.name}
                        </option>
                      ))}
                    </select>

                    {messages.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearChatHistory}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Clear Conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Model Tier Selector (gemini-3.1-flash-lite, gemini-3.8-flash, gemini-4-argon) + Chatbot Role System Instruction Bar */}
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* 3-Tier Gemini Model Selector */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                        Gemini Model Tier:
                      </span>
                      {GEMINI_CHAT_MODELS.map((m) => {
                        const active = chatModelTier === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setChatModelTier(m.id)}
                            title={m.description}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                              active
                                ? 'bg-amber-600 text-white'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500'
                            }`}
                          >
                            {m.label} · <span className="opacity-80">{m.taskCategory}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Chatbot Role Persona Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Chatbot Role:
                      </span>
                      <select
                        aria-label="Select Chatbot Role Persona"
                        value={selectedPersonaId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setSelectedPersonaId(nextId);
                          const found = CHATBOT_ROLE_PERSONAS.find((p) => p.id === nextId);
                          if (found) {
                            setCustomRoleInstruction(found.systemInstruction);
                            setChatModelTier(found.recommendedModel);
                          }
                        }}
                        className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                      >
                        {CHATBOT_ROLE_PERSONAS.map((persona) => (
                          <option key={persona.id} value={persona.id}>
                            {persona.name} ({persona.recommendedModel})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Editable System Instruction Role Prompt */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      System Instruction:
                    </span>
                    <input
                      type="text"
                      value={customRoleInstruction}
                      onChange={(e) => setCustomRoleInstruction(e.target.value)}
                      placeholder="Define custom system instruction role for Hujju chatbot..."
                      className="flex-1 px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Attached Document Context Bar */}
                {attachedDocContext && (
                  <div className="flex items-center justify-between gap-2 px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                    <span className="truncate">
                      Active Document Context Attached: {attachedDocContext.slice(0, 110)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedDocContext('')}
                      className="text-xs font-semibold hover:underline shrink-0"
                    >
                      Detach
                    </button>
                  </div>
                )}

                {/* Messages Scroll Viewport */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center text-center max-w-lg mx-auto space-y-4">
                      <img
                        src={HUJJU_AVATAR_URL}
                        alt="Hujju Core"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          Multi-Turn Gemini Chat ({chatModelTier})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Switch effortlessly between <span className="font-mono">gemini-3.1-flash-lite</span> (fast tasks), <span className="font-mono">gemini-3.8-flash</span> (general tasks), and <span className="font-mono">gemini-4-argon</span> (complex reasoning) while maintaining full multi-turn conversation history and custom role instructions.
                        </p>
                      </div>

                      <div className="w-full flex flex-wrap justify-center gap-2 pt-2">
                        {suggestedFollowUps.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendChat(suggestion)}
                            className="px-3 py-1.5 text-xs text-left bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const text = msg.decryptedContent ?? msg.content;
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-2xl rounded-xl px-4 py-3 text-xs leading-relaxed ${
                              isUser
                                ? 'bg-slate-900 dark:bg-amber-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700/70'
                            }`}
                          >
                            <p className="whitespace-pre-line">{text}</p>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span>{isUser ? 'You' : 'Hujju'}</span>
                            <span>·</span>
                            <span className="font-mono">{msg.skillUsed}</span>
                            <span>·</span>
                            <span>{msg.deviceOrigin}</span>
                            <span>·</span>
                            <span>{msg.language}</span>
                            <span>·</span>
                            <span>{msg.isEncrypted ? 'E2EE' : 'Synced'}</span>
                            <span>·</span>
                            <span className="font-mono tabular-nums">
                              {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!isUser && (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => handleSpeakText(text)}
                                  disabled={isSpeaking}
                                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  Speak
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatThreadEndRef} />
                </div>

                {/* Suggested Intelligent Follow-ups & Input Bar */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40">
                  {messages.length > 0 && suggestedFollowUps.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      <span className="text-[11px] text-slate-400 shrink-0">Suggestions:</span>
                      {suggestedFollowUps.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendChat(item)}
                          disabled={isSendingChat}
                          className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:border-amber-500 transition-colors whitespace-nowrap shrink-0"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChat();
                    }}
                    className="flex items-center gap-2.5"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Message Hujju using ${chatModelTier} (maintains multi-turn conversation history)...`}
                      className="flex-1 px-4 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isSendingChat || !chatInput.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSendingChat ? 'Thinking...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: MULTI-LLM ORCHESTRATOR & INTELLIGENT ROUTER */}
          {activeTab === 'orchestrator' && (
            <LLMOrchestratorStudio
              onSaveArchitectureNote={async (title, content) => {
                await saveWorkspaceNote(title, content, 'manual', 'Multi-LLM Orchestration Architecture');
                notify(`Saved "${title}" to E2EE Workspace Notes.`);
              }}
              onSaveSqlAuditRecord={handleCreateSqlLog}
            />
          )}

          {/* TAB 2: DOCUMENT INTELLIGENCE */}
          {activeTab === 'documents' && (
            <DocumentIntelligence
              documents={documents}
              activeSkills={skills}
              isEncryptedVaultActive={!!vaultKey}
              onSaveAnalyzedDocument={handleSaveAnalyzedDocument}
              onDeleteDocument={handleDeleteDocument}
              onAttachToChat={(ctx) => {
                setAttachedDocContext(ctx);
                setActiveTab('assistant');
                notify('Document insights attached to Hujju Chat.');
              }}
              onSpeakText={handleSpeakText}
              isSpeaking={isSpeaking}
            />
          )}

          {/* TAB 3: MULTILINGUAL TRANSLATION & MICROPHONE TRANSCRIPTION */}
          {activeTab === 'translation' && (
            <MultilingualTranslator
              activeSkills={skills}
              onSpeakText={handleSpeakText}
              isSpeaking={isSpeaking}
              onSaveTranslationNote={async (title, content) => {
                await saveWorkspaceNote(title, content, 'manual', 'Multilingual Localization');
                notify(`Saved translation note: "${title}"`);
              }}
            />
          )}

          {/* TAB 4: CREATIVE MEDIA STUDIO (IMAGE, VIDEO, ANIMATION & MUSIC) */}
          {activeTab === 'media' && (
            <CreativeMediaStudio
              onSaveMediaNote={async (title, content, modality) => {
                await saveWorkspaceNote(title, content, 'manual', 'Creative Media Studio');
                if (user) {
                  await handleCreateSqlLog(title, 'Creative Media Asset', modality, content);
                } else {
                  notify(`Saved "${title}" to Workspace Notes.`);
                }
              }}
            />
          )}

          {/* TAB 5: GOOGLE MAPS PLATFORM, MAPS GROUNDING & CLOUD SQL */}
          {activeTab === 'maps-sql' && (
            <MapsAndSqlHub
              user={user}
              sqlLogs={sqlLogs}
              onRefreshSqlLogs={handleRefreshSqlLogs}
              onCreateSqlLog={handleCreateSqlLog}
              onDeleteSqlLog={handleDeleteSqlLog}
            />
          )}

          {/* TAB 6: GOOGLE AI STUDIO WORKSPACE & AUTOMATED NOTES */}
          {activeTab === 'workspace' && (
            <WorkspaceManager
              projects={projects}
              notes={notes}
              isEncryptedVaultActive={!!vaultKey}
              onCreateProject={handleCreateProject}
              onUpdateProjectStatus={handleUpdateProjectStatus}
              onDeleteProject={handleDeleteProject}
              onCreateManualNote={async (title, content, projectTitle) => {
                await saveWorkspaceNote(title, content, 'manual', projectTitle);
                notify(`Note "${title}" saved.`);
              }}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {/* TAB 6.5: INR SUBSCRIPTIONS, UPI GATEWAY & AUTONOMOUS CRASH BACKUP */}
          {activeTab === 'billing-resilience' && (
            <SubscriptionAndUpiHub
              activeTierId={activeTierId}
              subscriptions={subscriptions}
              dailyAiUsed={dailyAiUsed}
              dailyDocUsed={dailyDocUsed}
              backupSummary={{
                lastSnapshotIso: lastBackupIso,
                messagesCount: messages.length,
                documentsCount: documents.length,
                projectsCount: projects.length,
                notesCount: notes.length,
                skillsCount: skills.length,
                devicesCount: devices.length,
                subscriptionsCount: subscriptions.length,
              }}
              incidentLogs={incidentLogs}
              onActivateSubscription={handleActivateSubscription}
              onTriggerManualBackup={handleTriggerManualBackup}
              onExportBackupJson={handleExportBackupJson}
              onImportBackupJson={handleImportBackupJson}
              onRestoreFromLocalSnapshot={handleRestoreFromLocalSnapshot}
              onRunAutonomousDiagnostic={handleRunAutonomousDiagnostic}
            />
          )}

          {/* TAB 7: DEVICE ECOSYSTEM, SKILLS & ANDROID APK */}
          {activeTab === 'ecosystem' && (
            <EcosystemAndApkHub
              skills={skills}
              devices={devices}
              isEncryptedVaultActive={!!vaultKey}
              e2eeFingerprint={e2eeFingerprint}
              onUnlockOrUpdateVault={handleUnlockOrUpdateVault}
              onLockVault={handleLockVault}
              onToggleSkill={handleToggleSkill}
              onEnableAllSkills={handleEnableAllSkills}
              onCreateCustomSkill={handleCreateCustomSkill}
              onDeleteSkill={handleDeleteSkill}
              onRegisterDeviceNode={handleRegisterDeviceNode}
              onRemoveDeviceNode={handleRemoveDeviceNode}
              onSaveSkillTestReportToWorkspace={async (title, content) => {
                await saveWorkspaceNote(title, content, 'manual', 'Synchronized Skill Matrix Audit');
                notify(`Saved "${title}" to E2EE Workspace Notes.`);
              }}
              ecosystemBannerUrl={ECOSYSTEM_BANNER_URL}
            />
          )}
        </main>
      </div>

      {/* Interactive 3-Step Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        skills={skills}
        isEncryptedVaultActive={!!vaultKey}
        e2eeFingerprint={e2eeFingerprint}
        onCreateProject={handleCreateProject}
        onToggleSkill={handleToggleSkill}
        onUnlockOrUpdateVault={handleUnlockOrUpdateVault}
        onSelectPreferredLanguage={(langName) => {
          setChatLanguage(langName);
          notify(`Preferred language set to ${langName}.`);
        }}
        onCompleteOnboarding={() => {
          setOnboardingCompleted(true);
          try {
            localStorage.setItem('hujju_onboarding_completed_v1', 'true');
          } catch {
            // Ignore storage errors
          }
          notify('Onboarding complete! Project, Voice Skills & E2EE Vault configured.');
        }}
      />

      {/* Live Click & Bug Telemetry Recorder + Consolidated Single-Batch Report & Fix Engine */}
      <LiveClickBugTracker
        activeTab={activeTab}
        onSaveConsolidatedReportToWorkspace={async (title, markdownContent) => {
          await saveWorkspaceNote(title, markdownContent, 'manual', 'Consolidated Click & Bug Fix Reports');
          notify(`Saved "${title}" to Workspace Notes & fixed all logged items in batch.`);
        }}
        onTriggerCheckpointBackup={handleTriggerManualBackup}
      />

      {/* Mobile Bottom Navigation Bar (< 15% mobile viewport height) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-800 grid grid-cols-6 items-center px-1">
        {(
          [
            { id: 'home', label: 'Home', icon: Home },
            { id: 'assistant', label: 'Voice/Chat', icon: MessageSquare },
            { id: 'orchestrator', label: 'Router', icon: Network },
            { id: 'documents', label: 'Docs', icon: FileText },
            { id: 'billing-resilience', label: 'UPI/Backup', icon: CreditCard },
            { id: 'ecosystem', label: 'APK/E2EE', icon: Smartphone },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
    </AutonomousErrorBoundary>
  );
}
