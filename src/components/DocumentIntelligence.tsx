import React, { useState } from 'react';
import { FileText, Upload, Volume2, ArrowRight, Trash2, Sparkles, Check } from 'lucide-react';
import { DocumentRecordItem, SkillConfigItem, SUPPORTED_LANGUAGES } from '../types';

interface DocumentIntelligenceProps {
  documents: DocumentRecordItem[];
  activeSkills: SkillConfigItem[];
  isEncryptedVaultActive: boolean;
  onSaveAnalyzedDocument: (
    fileName: string,
    mimeType: string,
    summary: string,
    insights: string,
    suggestions: string,
    autoNoteTitle: string,
    autoNoteContent: string
  ) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onAttachToChat: (docSummaryContext: string) => void;
  onSpeakText: (text: string) => Promise<void>;
  isSpeaking: boolean;
}

const SAMPLE_SPEC_DOCUMENT = {
  fileName: 'Q4-AI-Studio-Cross-Platform-Architecture.md',
  mimeType: 'text/markdown',
  textContent: `# Hujju Unified Cross-Platform & E2EE Sync Specification
1. Objective: Deliver <180ms voice round-trip latency across Android APK, Mobile PWA, and Desktop Web workstations.
2. Security Architecture: Client-side PBKDF2-SHA256 (120,000 iterations) + AES-GCM 256-bit zero-knowledge encryption prior to Firestore cloud persistence.
3. Workspace Integration: Automatically extract project tasks and structured technical notes from live voice briefings and uploaded PDF/Markdown specifications.
4. Offline Continuity: Maintain full local IndexedDB read/write access and Workbox service worker precaching when devices transition through offline network zones.`,
};

export const DocumentIntelligence: React.FC<DocumentIntelligenceProps> = ({
  documents,
  activeSkills,
  isEncryptedVaultActive,
  onSaveAnalyzedDocument,
  onDeleteDocument,
  onAttachToChat,
  onSpeakText,
  isSpeaking,
}) => {
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('text/plain');
  const [base64Data, setBase64Data] = useState('');
  const [textContent, setTextContent] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [attachedBannerId, setAttachedBannerId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMimeType(file.type || 'text/plain');
    setErrorMsg(null);

    if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.tsx')
    ) {
      const reader = new FileReader();
      reader.onload = () => {
        setTextContent(String(reader.result || ''));
        setBase64Data('');
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const base64Clean = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
        setBase64Data(base64Clean);
        setTextContent('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadSampleSpec = () => {
    setFileName(SAMPLE_SPEC_DOCUMENT.fileName);
    setMimeType(SAMPLE_SPEC_DOCUMENT.mimeType);
    setTextContent(SAMPLE_SPEC_DOCUMENT.textContent);
    setBase64Data('');
    setErrorMsg(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim() && !base64Data) {
      setErrorMsg('Upload a file (PDF, image, Markdown, CSV, TXT) or paste document content first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/hujju/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName || 'Workspace-Document-Analysis.txt',
          mimeType,
          base64Data,
          textContent,
          targetLanguage,
          activeSkills: activeSkills.filter((s) => s.enabled),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze document.');
      }

      await onSaveAnalyzedDocument(
        fileName || 'Workspace-Document-Analysis.txt',
        mimeType,
        data.summary,
        data.insights,
        data.suggestions,
        data.autoNoteTitle,
        data.autoNoteContent
      );

      setFileName('');
      setTextContent('');
      setBase64Data('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Document analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeDoc =
    documents.find((d) => d.id === selectedDocId) || (documents.length > 0 ? documents[0] : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Real-Time Document Intelligence & Suggestion Engine
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Analyze PDFs, technical specs, images, and spreadsheets with Gemini 3.8 Flash · Auto-generates E2EE Workspace Notes
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSampleSpec}
          className="px-3.5 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          Load Sample Architecture Spec
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Document Ingestion Form */}
        <form
          onSubmit={handleAnalyze}
          className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              01. Document Source & Analysis Parameters
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isEncryptedVaultActive ? 'AES-GCM 256-bit Active' : 'Standard Cloud Sync'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Enforced Document &amp; Security Skills ({activeSkills.filter((s) => s.enabled && (s.category === 'document' || s.category === 'security')).length}):
            </span>{' '}
            {activeSkills
              .filter((s) => s.enabled && (s.category === 'document' || s.category === 'security'))
              .map((s) => s.name)
              .join(' · ') || 'Default Synthesis'}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Upload Document (PDF, PNG/JPG, Markdown, CSV, TXT)
            </label>
            <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs text-slate-600 dark:text-slate-300">
              <Upload className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">
                {fileName ? `Selected: ${fileName}` : 'Choose file from device...'}
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., Q4-System-Spec.pdf"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Analysis Output Language
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Or Paste Document Text / Technical Specification
            </label>
            <textarea
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste contract clauses, engineering RFCs, meeting notes, or research excerpts for real-time analysis..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            {isAnalyzing
              ? 'Analyzing Document & Generating Workspace Note...'
              : 'Analyze Document & Auto-Capture Note'}
          </button>
        </form>

        {/* Right 7 Columns: Analyzed Document Vault & Deep Inspection */}
        <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              02. Synchronized Document Intelligence Reports ({documents.length})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Model: gemini-3.8-flash
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="max-w-sm mx-auto">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  No documents analyzed yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Upload a PDF, image, or text specification—or click &ldquo;Load Sample Architecture Spec&rdquo; above—to extract executive summaries, risk insights, and automated workspace notes.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Document Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {documents.map((docItem) => (
                  <button
                    key={docItem.id}
                    type="button"
                    onClick={() => setSelectedDocId(docItem.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      activeDoc?.id === docItem.id
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-600 dark:border-amber-600'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {docItem.fileName}
                  </button>
                ))}
              </div>

              {activeDoc && (
                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {activeDoc.fileName}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span>{activeDoc.mimeType}</span>
                      <span className="mx-1.5">·</span>
                      <span>{activeDoc.isEncrypted ? 'E2EE Encrypted' : 'Plaintext Sync'}</span>
                      <span className="mx-1.5">·</span>
                      <span className="font-mono tabular-nums">
                        {activeDoc.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSpeakText(
                            `${activeDoc.decryptedSummary ?? activeDoc.summary}. Key suggestions: ${
                              activeDoc.decryptedSuggestions ?? activeDoc.suggestions
                            }`
                          )
                        }
                        disabled={isSpeaking}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                        {isSpeaking ? 'Speaking...' : 'Read Aloud'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onAttachToChat(
                            `Document "${activeDoc.fileName}":\nSummary: ${
                              activeDoc.decryptedSummary ?? activeDoc.summary
                            }\nInsights: ${activeDoc.decryptedInsights ?? activeDoc.insights}`
                          );
                          setAttachedBannerId(activeDoc.id);
                          setTimeout(() => setAttachedBannerId(null), 2500);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                      >
                        {attachedBannerId === activeDoc.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Attached to Hujju Chat
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-3.5 h-3.5" />
                            Use in Chat
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteDocument(activeDoc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete Document Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        Executive Summary
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                        {activeDoc.decryptedSummary ?? activeDoc.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        Key Insights & Structural Findings
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                        {activeDoc.decryptedInsights ?? activeDoc.insights}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
                        Hujju Intelligent Action Suggestions
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                        {activeDoc.decryptedSuggestions ?? activeDoc.suggestions}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
