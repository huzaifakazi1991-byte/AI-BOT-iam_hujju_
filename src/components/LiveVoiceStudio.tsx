import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Radio, Save, Languages, Sparkles } from 'lucide-react';
import { SkillConfigItem, SUPPORTED_LANGUAGES } from '../types';

interface LiveVoiceStudioProps {
  activeSkills: SkillConfigItem[];
  onSaveVoiceNote: (title: string, content: string) => Promise<void>;
  onSaveVoiceTranscriptToChat: (userText: string, assistantText: string, lang: string) => Promise<void>;
  hujjuAvatarUrl: string;
}

function floatTo16BitPCMBase64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const LiveVoiceStudio: React.FC<LiveVoiceStudioProps> = ({
  activeSkills,
  onSaveVoiceNote,
  onSaveVoiceTranscriptToChat,
  hujjuAvatarUrl,
}) => {
  const [mode, setMode] = useState<'conversation' | 'interpreter'>('conversation');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [voiceName, setVoiceName] = useState<'Zephyr' | 'Puck' | 'Kore' | 'Fenrir' | 'Charon'>('Zephyr');
  const [spokenLangName, setSpokenLangName] = useState('English');
  const [targetLangCode, setTargetLangCode] = useState('hi');
  const [inputTranscript, setInputTranscript] = useState('');
  const [outputTranscript, setOutputTranscript] = useState('');
  const [sessionLog, setSessionLog] = useState<Array<{ speaker: 'You' | 'Hujju'; text: string; time: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [savingNote, setSavingNote] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const latestInputRef = useRef<string>('');
  const latestOutputRef = useRef<string>('');

  const stopSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const playPcmChunk24k = (base64Data: string) => {
    const outCtx = outputAudioCtxRef.current;
    if (!outCtx) return;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = outCtx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.02;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    activeSourcesRef.current.push(source);
  };

  const startSession = async () => {
    setErrorMsg(null);
    setIsConnecting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const skillsParam = encodeURIComponent(
        activeSkills
          .filter((s) => s.enabled)
          .map((s) => s.name)
          .join(', ')
      );
      const endpoint =
        mode === 'interpreter'
          ? `${protocol}//${window.location.host}/live-translate?lang=${targetLangCode}`
          : `${protocol}//${window.location.host}/live?voice=${voiceName}&spokenLang=${encodeURIComponent(spokenLangName)}&skills=${skillsParam}`;

      const ws = new WebSocket(endpoint);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const channelData = e.inputBuffer.getChannelData(0);

          let sum = 0;
          for (let i = 0; i < channelData.length; i += 16) {
            sum += Math.abs(channelData[i]);
          }
          const avg = Math.min(100, Math.round((sum / (channelData.length / 16)) * 450));
          setAudioLevel(avg);

          const base64Audio = floatTo16BitPCMBase64(channelData);
          wsRef.current.send(JSON.stringify({ audio: base64Audio }));
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setErrorMsg(msg.error);
            return;
          }
          if (msg.inputTranscript) {
            latestInputRef.current = msg.inputTranscript;
            setInputTranscript(msg.inputTranscript);
            setSessionLog((prev) => [
              ...prev.slice(-19),
              {
                speaker: 'You',
                text: msg.inputTranscript,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              },
            ]);
          }
          if (msg.outputTranscript) {
            latestOutputRef.current = msg.outputTranscript;
            setOutputTranscript(msg.outputTranscript);
            setSessionLog((prev) => [
              ...prev.slice(-19),
              {
                speaker: 'Hujju',
                text: msg.outputTranscript,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              },
            ]);
          }
          if (msg.audio) {
            playPcmChunk24k(msg.audio);
          }
          if (msg.interrupted) {
            activeSourcesRef.current.forEach((src) => {
              try {
                src.stop();
              } catch {
                // ignore already stopped
              }
            });
            activeSourcesRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
          }
        } catch (err) {
          console.error('Live WS parse error:', err);
        }
      };

      ws.onerror = () => {
        setErrorMsg('Real-time audio stream encountered a connection error.');
        stopSession();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err) {
      setIsConnecting(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Microphone access is required for real-time voice interaction.'
      );
    }
  };

  const handleCaptureSessionNote = async () => {
    if (sessionLog.length === 0 && !inputTranscript && !outputTranscript) return;
    setSavingNote(true);
    try {
      const compiled =
        sessionLog.length > 0
          ? sessionLog.map((entry) => `[${entry.time}] ${entry.speaker}: ${entry.text}`).join('\n')
          : `You: ${inputTranscript}\nHujju: ${outputTranscript}`;
      await onSaveVoiceNote(
        `Hujju Live Voice Session (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        compiled
      );
      if (latestInputRef.current || latestOutputRef.current) {
        await onSaveVoiceTranscriptToChat(
          latestInputRef.current || 'Live Voice Session Input',
          latestOutputRef.current || compiled,
          mode === 'interpreter' ? targetLangCode : spokenLangName
        );
      }
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shrink-0">
            <img
              src={hujjuAvatarUrl}
              alt="Hujju Acoustic Core"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Hujju Real-Time Voice & Live Interpreter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fluent in English, Hindi (हिन्दी), Marathi (मराठी), Urdu (اردو) & 15+ Languages · {activeSkills.filter((s) => s.enabled).length} Active Skills Synced
            </p>
          </div>
        </div>

        {/* Mode Segmented Filter Control */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                if (isConnected) stopSession();
                setMode('conversation');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'conversation'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Voice Assistant
            </button>
            <button
              type="button"
              onClick={() => {
                if (isConnected) stopSession();
                setMode('interpreter');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                mode === 'interpreter'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Live Speech Interpreter
            </button>
          </div>

          {mode === 'conversation' ? (
            <>
              <select
                aria-label="Select Spoken Conversation Language"
                value={spokenLangName}
                onChange={(e) => setSpokenLangName(e.target.value)}
                disabled={isConnected}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.name}>
                    Speak: {l.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select Hujju Voice Persona"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value as typeof voiceName)}
                disabled={isConnected}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="Zephyr">Voice: Zephyr (Balanced)</option>
                <option value="Puck">Voice: Puck (Dynamic)</option>
                <option value="Kore">Voice: Kore (Articulate)</option>
                <option value="Fenrir">Voice: Fenrir (Deep)</option>
                <option value="Charon">Voice: Charon (Calm)</option>
              </select>
            </>
          ) : (
            <select
              aria-label="Select Target Interpreter Language"
              value={targetLangCode}
              onChange={(e) => setTargetLangCode(e.target.value)}
              disabled={isConnected}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  Interpret to: {l.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={isConnected ? stopSession : startSession}
            disabled={isConnecting}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isConnected
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {isConnected ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                End Voice Stream
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                {isConnecting ? 'Connecting Audio...' : 'Start Live Voice'}
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Live Acoustic Level & Transcript Feed */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Radio className="w-3.5 h-3.5 text-amber-500" />
              {isConnected ? 'Live Duplex Stream Active' : 'Standby Acoustic Channel'}
            </span>
            <span className="font-mono tabular-nums">{audioLevel}% gain</span>
          </div>

          <div className="my-3 h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-transform duration-150 origin-left"
              style={{ transform: `scaleX(${Math.max(0.04, audioLevel / 100)})` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'conversation'
                ? 'Model: gemini-3.8-live'
                : `Interpreter: gemini-3.5-live-translate-preview (${targetLangCode.toUpperCase()})`}
            </span>
            {sessionLog.length > 0 && (
              <button
                type="button"
                onClick={handleCaptureSessionNote}
                disabled={savingNote}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                {savingNote ? 'Saving...' : 'Save Note to Workspace'}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 max-h-36 overflow-y-auto">
          {sessionLog.length === 0 ? (
            <div className="h-full flex flex-col justify-center text-xs text-slate-500 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Real-Time Voice Transcript & Automated Note Buffer
              </p>
              <p className="mt-1">
                Click &ldquo;Start Live Voice&rdquo; to speak with Hujju in real time or interpret live speech across languages. Spoken turns appear here automatically and can be saved as E2EE Workspace Notes.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs">
              {sessionLog.map((item, idx) => (
                <div key={idx} className="flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-slate-400 shrink-0">{item.time}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                    {item.speaker}:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
