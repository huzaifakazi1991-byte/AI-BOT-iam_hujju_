import React, { useState } from 'react';
import { FolderKanban, Plus, FileCheck2, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { ProjectItemRecord, WorkspaceNoteItem } from '../types';

interface WorkspaceManagerProps {
  projects: ProjectItemRecord[];
  notes: WorkspaceNoteItem[];
  isEncryptedVaultActive: boolean;
  onCreateProject: (
    title: string,
    description: string,
    status: ProjectItemRecord['status'],
    priority: ProjectItemRecord['priority'],
    modelTarget: string
  ) => Promise<void>;
  onUpdateProjectStatus: (project: ProjectItemRecord, nextStatus: ProjectItemRecord['status']) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onCreateManualNote: (title: string, content: string, projectTitle: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  projects,
  notes,
  isEncryptedVaultActive,
  onCreateProject,
  onUpdateProjectStatus,
  onDeleteProject,
  onCreateManualNote,
  onDeleteNote,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectItemRecord['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Project State
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectPriority, setProjectPriority] = useState<ProjectItemRecord['priority']>('high');
  const [projectModel, setProjectModel] = useState('gemini-3.8-flash');
  const [creatingProject, setCreatingProject] = useState(false);

  // New Manual Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteProject, setNoteProject] = useState('General AI Studio Workspace');
  const [creatingNote, setCreatingNote] = useState(false);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDesc.trim()) return;
    setCreatingProject(true);
    try {
      await onCreateProject(
        projectTitle.trim().slice(0, 160),
        projectDesc.trim().slice(0, 4000),
        'active',
        projectPriority,
        projectModel
      );
      setProjectTitle('');
      setProjectDesc('');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setCreatingNote(true);
    try {
      await onCreateManualNote(
        noteTitle.trim().slice(0, 200),
        noteContent.trim().slice(0, 12000),
        noteProject.trim().slice(0, 160) || 'General AI Studio Workspace'
      );
      setNoteTitle('');
      setNoteContent('');
    } finally {
      setCreatingNote(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const desc = p.decryptedDescription ?? p.description;
    const matchesQuery =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const filteredNotes = notes.filter((n) => {
    const body = n.decryptedContent ?? n.content;
    return (
      !searchQuery.trim() ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.projectTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Workspace Header & Search Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Google AI Studio Project Management & Automated Note-Taking
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Unified workspace for AI Studio model pipelines, milestone tracking, and notes automatically captured by Hujju
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter projects & notes..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['all', 'planning', 'active', 'review', 'completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Split: Projects (7 cols) + Automated & Manual Notes (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: AI Studio Projects */}
        <div className="lg:col-span-7 space-y-5">
          <form
            onSubmit={handleAddProject}
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                01. Create AI Studio Workspace Project
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isEncryptedVaultActive ? 'Encrypted Description' : 'Cloud Synchronized'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Project title (e.g., Multilingual Voice Agent Deployment)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <select
                  value={projectPriority}
                  onChange={(e) => setProjectPriority(e.target.value as ProjectItemRecord['priority'])}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="critical">Priority: Critical</option>
                  <option value="high">Priority: High</option>
                  <option value="medium">Priority: Medium</option>
                  <option value="low">Priority: Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Objective, milestones, and target deliverables..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <select
                  value={projectModel}
                  onChange={(e) => setProjectModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                  <option value="gemini-3.8-live">gemini-3.8-live</option>
                  <option value="gemini-3.5-live-translate-preview">gemini-3.5-live-translate</option>
                  <option value="gemini-3.8-flash-lite-tts">gemini-3.8-flash-lite-tts</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingProject}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {creatingProject ? 'Creating...' : 'Create Workspace Project'}
              </button>
            </div>
          </form>

          {/* Projects Table / List */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                02. Active AI Studio Projects ({filteredProjects.length})
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Completed projects lock automatically
              </span>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <FolderKanban className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  No matching projects in this view
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add a project above to synchronize milestones across your mobile and desktop ecosystem.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredProjects.map((proj) => (
                  <div key={proj.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {proj.title}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="capitalize">Status: {proj.status}</span>
                          <span className="mx-1.5">·</span>
                          <span className="capitalize">Priority: {proj.priority}</span>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono">{proj.modelTarget}</span>
                          <span className="mx-1.5">·</span>
                          <span>{proj.isEncrypted ? 'E2EE Vault' : 'Standard Sync'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {proj.status !== 'completed' ? (
                          <select
                            aria-label={`Change status for ${proj.title}`}
                            value={proj.status}
                            onChange={(e) =>
                              onUpdateProjectStatus(proj, e.target.value as ProjectItemRecord['status'])
                            }
                            className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                          >
                            <option value="planning">Stage: Planning</option>
                            <option value="active">Stage: Active</option>
                            <option value="review">Stage: Review</option>
                            <option value="completed">Stage: Completed (Lock)</option>
                          </select>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed & Locked
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {proj.decryptedDescription ?? proj.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Automated & Manual Workspace Notes */}
        <div className="lg:col-span-5 space-y-5">
          <form
            onSubmit={handleAddNote}
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              03. Quick Workspace Note
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note heading..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={noteProject}
                onChange={(e) => setNoteProject(e.target.value)}
                placeholder="Project name..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <textarea
              rows={3}
              required
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write a technical note or let Hujju auto-capture notes from voice, chat, and document analysis..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingNote}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {creatingNote ? 'Saving Note...' : 'Save Note'}
              </button>
            </div>
          </form>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                04. Automated & Synced Notes ({filteredNotes.length})
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Voice · Docs · Chat
              </span>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <FileCheck2 className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  No workspace notes recorded yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hujju automatically captures structured notes when you discuss project plans in chat, analyze documents, or save live voice sessions.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[460px] overflow-y-auto pr-1">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {note.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{note.projectTitle}</span>
                          <span className="mx-1.5">·</span>
                          <span>Source: {note.source}</span>
                          <span className="mx-1.5">·</span>
                          <span>{note.isEncrypted ? 'E2EE' : 'Cloud'}</span>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono tabular-nums">
                            {note.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {note.decryptedContent ?? note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
