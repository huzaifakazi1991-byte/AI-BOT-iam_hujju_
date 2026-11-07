import React, { useRef, useState } from 'react';
import { Languages, Volume2, ArrowLeftRight, Mic, Square, Upload, Save, Copy, Check } from 'lucide-react';
import { PRIMARY_INDIC_LANGUAGES, SUPPORTED_LANGUAGES } from '../types';

interface MultilingualTranslatorProps {
  onSpeakText: (text: string) => Promise<void>;
  isSpeaking: boolean;
  onSaveTranslationNote: (title: string, content: string) => Promise<void>;
}

export const MultilingualTranslator: React.FC<MultilingualTranslatorProps> = ({
  onSpeakText,
  isSpeaking,
  onSaveTranslationNote,
}) => {
  const [sourceLang, setSourceLang] = useState('Auto-detect');
  const [targetLang, setTargetLang] = useState('Hindi (हिन्दी)');
  const [tone, setTone] = useState('Executive & Natural');
  const [inputText, setInputText] = useState(
    'Welcome to the Hujju cross-platform ecosystem. All project specifications, voice transcripts, and document insights are synchronized with end-to-end encryption.'
  );
  const [result, setResult] = useState<{
    translatedText: string;
    detectedSourceLanguage: string;
    pronunciationGuide: string;
    culturalNuanceNotes: string;
  } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsTranslating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/hujju/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Translation request failed.');
      }
      setResult(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const transcribeBlob = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMsg(null);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const str = String(reader.result || '');
          resolve(str.includes(',') ? str.split(',')[1] : str);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch('/api/hujju/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Audio,
          mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Audio transcription failed.');
      }
      if (data.transcript) {
        setInputText(data.transcript);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Audio transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAudioFileTranscribe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await transcribeBlob(file, file.type || 'audio/mp3');
  };

  const handleToggleMicRecording = async () => {
    if (isRecordingMic) {
      mediaRecorderRef.current?.stop();
      setIsRecordingMic(false);
      return;
    }

    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          await transcribeBlob(audioBlob, mimeType);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingMic(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Microphone permission denied.');
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang !== 'Auto-detect') {
      const prevSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(prevSource);
    } else {
      setSourceLang(targetLang);
      setTargetLang('English');
    }
    if (result?.translatedText) {
      setInputText(result.translatedText);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Multilingual Neural Translation & Audio Transcription
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Native support for Hindi (हिन्दी), Marathi (मराठी), Urdu (اردو), English & global languages with phonetic guides and neural TTS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleMicRecording}
            disabled={isTranscribing}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isRecordingMic
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {isRecordingMic ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Stop & Transcribe Mic</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>{isTranscribing ? 'Transcribing...' : 'Record Mic Audio'}</span>
              </>
            )}
          </button>

          <label className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0">
            <Upload className="w-3.5 h-3.5 text-amber-500" />
            <span>Upload Audio File</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioFileTranscribe}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Quick Target Language Switcher for Hindi, Marathi, Urdu & English */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
          Quick Target Language:
        </span>
        {PRIMARY_INDIC_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setTargetLang(lang.name)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              targetLang === lang.name
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-500'
            }`}
          >
            {lang.shortLabel}
          </button>
        ))}
      </div>

      <form onSubmit={handleTranslate} className="space-y-4">
        {/* Language & Register Bar */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Source Language
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="Auto-detect">Auto-detect Language</option>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1 flex justify-center pt-4">
            <button
              type="button"
              onClick={handleSwapLanguages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Swap Languages"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Target Language
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Register & Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="Executive & Natural">Executive & Natural</option>
              <option value="Technical & Precise">Technical & Precise</option>
              <option value="Conversational & Warm">Conversational & Warm</option>
              <option value="Formal Diplomatic">Formal Diplomatic</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Dual Pane Source & Target */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Source Text ({sourceLang})
                </span>
                <span className="font-mono tabular-nums">{inputText.length} chars</span>
              </div>
              <textarea
                rows={7}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text or record microphone audio to transcribe and translate..."
                className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => onSpeakText(inputText)}
                disabled={isSpeaking || !inputText.trim()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                Speak Source
              </button>

              <button
                type="submit"
                disabled={isTranslating || !inputText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Languages className="w-4 h-4" />
                {isTranslating ? 'Translating...' : 'Translate with Hujju'}
              </button>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between space-y-4">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <Languages className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Translation Output & Localization Guide
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1">
                  Click &ldquo;Translate with Hujju&rdquo; to generate the target translation, phonetic pronunciation guide, and cultural nuance notes.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <span>
                      Detected: <strong className="text-slate-800 dark:text-slate-200">{result.detectedSourceLanguage}</strong> → <strong className="text-amber-600 dark:text-amber-400">{targetLang}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(result.translatedText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:underline"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                    {result.translatedText}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Phonetic Pronunciation Guide:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                        {result.pronunciationGuide}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Cultural & Terminological Nuances:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                        {result.culturalNuanceNotes}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSpeakText(result.translatedText)}
                    disabled={isSpeaking}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    {isSpeaking ? 'Speaking...' : 'Speak Translated Audio'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSaveTranslationNote(
                        `Translation (${result.detectedSourceLanguage} → ${targetLang})`,
                        `Source: ${inputText}\n\nTranslated (${targetLang}): ${result.translatedText}\n\nPronunciation: ${result.pronunciationGuide}\nNotes: ${result.culturalNuanceNotes}`
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-500" />
                    Save to Workspace Notes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
