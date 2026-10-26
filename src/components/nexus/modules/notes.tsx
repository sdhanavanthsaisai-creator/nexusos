'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink, Link2, NotebookPen, Pin, Plus, Search, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Note, Resource } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';
import { ModuleHeader, EmptyState } from '../ui-bits';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const timeAgo = (iso: string): string => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const PREVIEW_CLASS =
  '[&_a]:text-primary [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 ' +
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:text-xl [&_h2]:text-lg [&_p]:my-2 ' +
  '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 text-sm';

// ─── Note editor (right pane) ─────────────────────────────────────────────────
function NoteEditor({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const updateNote = useNexus((s) => s.updateNote);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [tagsDraft, setTagsDraft] = useState(note.tags.join(', '));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={note.title}
          onChange={(e) => updateNote(note.id, { title: e.target.value })}
          placeholder="Note title"
          aria-label="Note title"
          className="h-9 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 md:text-lg"
        />
        <Button
          variant="ghost" size="icon"
          className={cn('h-8 w-8 shrink-0', note.pinned && 'text-primary')}
          onClick={() => updateNote(note.id, { pinned: !note.pinned })}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
        >
          <Pin className={cn('h-4 w-4', note.pinned && 'fill-current')} />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={tagsDraft}
          onChange={(e) => {
            setTagsDraft(e.target.value);
            updateNote(note.id, {
              tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
            });
          }}
          placeholder="tags, comma separated"
          aria-label="Note tags"
          className="h-7 w-52 text-[11px]"
        />
        <div className="ml-auto">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'write' | 'preview')}>
            <TabsList className="h-7">
              <TabsTrigger value="write" className="px-2.5 text-[11px]">Write</TabsTrigger>
              <TabsTrigger value="preview" className="px-2.5 text-[11px]">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {mode === 'write' ? (
        <Textarea
          value={note.content}
          onChange={(e) => updateNote(note.id, { content: e.target.value })}
          placeholder="Write in Markdown — headings, lists, code blocks, tables…"
          aria-label="Note content"
          className="slim-scroll min-h-[420px] font-mono text-sm"
        />
      ) : (
        <div className={cn('slim-scroll max-h-[560px] min-h-[420px] overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-4', PREVIEW_CLASS)}>
          {note.content.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
          ) : (
            <p className="text-xs text-muted-foreground">Nothing to preview yet — switch to Write and start typing.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/50 pt-3">
        <p className="text-[11px] text-muted-foreground">Edited {timeAgo(note.updatedAt)}</p>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-rose-400 hover:bg-rose-400/10 hover:text-rose-400" onClick={onDelete}>
          <Trash2 className="h-3 w-3" /> Delete note
        </Button>
      </div>
    </div>
  );
}

// ─── Resource add dialog ──────────────────────────────────────────────────────
function ResourceDialog({ onClose }: { onClose: () => void }) {
  const addResource = useNexus((s) => s.addResource);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  const save = () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL are required');
      return;
    }
    addResource({ title: title.trim(), url: url.trim(), category: category.trim() || 'General', notes: notes.trim() });
    toast.success('Resource saved');
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
          <DialogDescription>Save tutorials, docs and courses worth revisiting.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <label htmlFor="res-title" className="text-xs font-medium">Title *</label>
            <Input id="res-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="MDN — CSS Grid guide" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="res-url" className="text-xs font-medium">URL *</label>
            <Input id="res-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-9 font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="res-cat" className="text-xs font-medium">Category</label>
            <Input id="res-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Docs, course, video…" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="res-notes" className="text-xs font-medium">Notes</label>
            <Textarea id="res-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this worth your time?" className="resize-none text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save resource</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Module ───────────────────────────────────────────────────────────────────
export default function NotesModule() {
  const notes = useNexus((s) => s.notes);
  const resources = useNexus((s) => s.resources);
  const addNote = useNexus((s) => s.addNote);
  const deleteNote = useNexus((s) => s.deleteNote);
  const deleteResource = useNexus((s) => s.deleteResource);

  const [tab, setTab] = useState<'notes' | 'resources'>('notes');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...notes]
      .filter((n) =>
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) =>
        a.pinned === b.pinned
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.pinned ? -1 : 1);
  }, [notes, search]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  // keep a valid selection: auto-select the first note when none is picked (render-time adjustment)
  const selectionValid = selectedId != null && notes.some((n) => n.id === selectedId);
  if (sorted.length > 0 && !selectionValid && sorted[0].id !== selectedId) {
    setSelectedId(sorted[0].id);
  }

  const handleNewNote = () => {
    const note = addNote({ title: 'Untitled note' });
    setSelectedId(note.id);
    setTab('notes');
    setSearch('');
    toast.success('New note created');
  };

  const handleDeleteNote = () => {
    if (!selected) return;
    const idx = sorted.findIndex((n) => n.id === selected.id);
    const rest = sorted.filter((n) => n.id !== selected.id);
    deleteNote(selected.id);
    setSelectedId(rest[Math.min(idx, rest.length - 1)]?.id ?? null);
    setConfirmDeleteNote(false);
    toast.success('Note deleted');
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        icon={NotebookPen}
        title="Notes & Resources"
        subtitle="Markdown knowledge base & learning links"
        actions={
          <Button size="sm" onClick={handleNewNote}>
            <Plus className="h-3.5 w-3.5" /> New Note
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'notes' | 'resources')}>
        <TabsList>
          <TabsTrigger value="notes" className="gap-1.5 text-xs">
            Notes <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{notes.length}</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5 text-xs">
            Resources <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{resources.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Notes pane ── */}
        <TabsContent value="notes" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="glass h-fit space-y-2 self-start rounded-2xl p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes…"
                  aria-label="Search notes"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleNewNote}>
                <Plus className="h-3.5 w-3.5" /> New Note
              </Button>
              <div className="slim-scroll max-h-[520px] space-y-1 overflow-y-auto pr-1">
                {sorted.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                    {notes.length === 0 ? 'No notes yet — create your first one.' : 'Nothing matches that search.'}
                  </p>
                ) : (
                  sorted.map((n) => {
                    const isActive = n.id === selected?.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => setSelectedId(n.id)}
                        className={cn(
                          'w-full rounded-xl p-2.5 text-left transition-colors',
                          isActive ? 'bg-primary/10' : 'hover:bg-muted/60',
                        )}
                        aria-current={isActive ? 'true' : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          <Pin
                            className={cn('h-3 w-3 shrink-0', n.pinned ? 'fill-current text-primary' : 'text-muted-foreground/40')}
                            aria-hidden="true"
                          />
                          <span className="truncate text-xs font-medium">{n.title || 'Untitled'}</span>
                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.updatedAt)}</span>
                        </div>
                        {n.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1 pl-[18px]">
                            {n.tags.slice(0, 2).map((t) => (
                              <span key={t} className="rounded bg-muted/70 px-1 text-[9px] text-muted-foreground">#{t}</span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="glass rounded-2xl p-4 md:p-5">
              {selected ? (
                <>
                  <NoteEditor key={selected.id} note={selected} onDelete={() => setConfirmDeleteNote(true)} />
                  {confirmDeleteNote && (
                    <AlertDialog open onOpenChange={(o) => !o && setConfirmDeleteNote(false)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete “{selected.title || 'Untitled'}”?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the note and its markdown content. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-rose-500/90 text-white hover:bg-rose-500"
                            onClick={handleDeleteNote}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={NotebookPen}
                  title="No note selected"
                  hint="Pick a note from the list or create a new one to start writing."
                />
              )}
            </section>
          </div>
        </TabsContent>

        {/* ── Resources pane ── */}
        <TabsContent value="resources" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{resources.length} saved link{resources.length === 1 ? '' : 's'}</p>
              <Button size="sm" onClick={() => setResourceOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Resource
              </Button>
            </div>
            {resources.length === 0 ? (
              <EmptyState
                icon={Link2}
                title="No resources yet"
                hint="Save tutorials, docs and courses you want to revisit — they'll live here."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {resources.map((r) => (
                  <div key={r.id} className="glass space-y-2 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 truncate text-sm font-semibold">{r.title}</h3>
                      {r.category && (
                        <Badge variant="outline" className="shrink-0 border-border/60 bg-muted/50 text-[10px] text-muted-foreground">
                          {r.category}
                        </Badge>
                      )}
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{r.url.replace(/^https?:\/\//, '')}</span>
                    </a>
                    {r.notes && <p className="line-clamp-2 text-[11px] text-muted-foreground">{r.notes}</p>}
                    <div className="flex justify-end border-t border-border/50 pt-2">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:bg-rose-400/10 hover:text-rose-400"
                        onClick={() => setDeletingResource(r)}
                        aria-label={`Delete ${r.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {resourceOpen && <ResourceDialog onClose={() => setResourceOpen(false)} />}
      {deletingResource && (
        <AlertDialog open onOpenChange={(o) => !o && setDeletingResource(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{deletingResource.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                The link {deletingResource.url.replace(/^https?:\/\//, '')} will be removed from your library.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-500/90 text-white hover:bg-rose-500"
                onClick={() => {
                  deleteResource(deletingResource.id);
                  toast.success('Resource deleted');
                  setDeletingResource(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
