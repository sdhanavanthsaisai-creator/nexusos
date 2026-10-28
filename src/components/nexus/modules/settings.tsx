'use client';

import { useMemo, useState } from 'react';
import {
  Braces, Eye, EyeOff, GraduationCap, Loader2, Palette, Pencil, PlugZap, Plus, RotateCcw,
  Settings2, SlidersHorizontal, Sparkles, Trash2, TriangleAlert, User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Settings, Subject, SubjectCategory, ThemeId } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';
import { CATEGORY_META, INK_VARS } from '@/lib/nexus/constants';
import { buildAiStats } from '@/lib/nexus/ai-context';
import { clamp } from '@/lib/nexus/utils';
import { ModuleHeader } from '../ui-bits';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Theme previews (swatch hexes hardcoded per spec) ─────────────────────────
const THEME_PREVIEWS: { id: ThemeId; label: string; swatches: string[] }[] = [
  { id: 'dark', label: 'Obsidian Cyber Glass', swatches: ['#000000', '#FFFFFF', '#C9C9C9'] },
  { id: 'light', label: 'Frost Light', swatches: ['#F1F1F1', '#000000', '#C9C9C9'] },
  { id: 'oled', label: 'OLED Void', swatches: ['#000000', '#FFFFFF', '#C9C9C9'] },
  { id: 'cyberpunk', label: 'Graphite Fog', swatches: ['#000000', '#C9C9C9', '#FFFFFF'] },
];

function CardShell({ icon: Icon, title, hint, children, className }: {
  icon: typeof User;
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('glass space-y-4 rounded-2xl p-5', className)}>
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function ProfileCard() {
  const profile = useNexus((s) => s.profile);
  const setProfile = useNexus((s) => s.setProfile);

  return (
    <CardShell icon={User} title="Profile" hint="Auto-saves as you type">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pf-name" className="text-xs">Name</Label>
          <Input id="pf-name" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-sem" className="text-xs">Semester (1–8)</Label>
          <Input
            id="pf-sem" type="number" min={1} max={8} value={profile.semester}
            onChange={(e) => setProfile({ semester: clamp(Math.round(Number(e.target.value) || 1), 1, 8) })}
            className="h-9 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pf-uni" className="text-xs">University</Label>
          <Input id="pf-uni" value={profile.university} onChange={(e) => setProfile({ university: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pf-degree" className="text-xs">Degree</Label>
          <Input id="pf-degree" value={profile.degree} onChange={(e) => setProfile({ degree: e.target.value })} className="h-9 text-sm" />
        </div>
      </div>

      <div className="space-y-4 pt-1">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Daily study target</span>
            <span className="font-mono text-xs text-primary">{profile.dailyTargetHours}h / day</span>
          </div>
          <Slider
            min={1} max={10} step={0.5}
            value={[profile.dailyTargetHours]}
            onValueChange={(v) => setProfile({ dailyTargetHours: v[0] ?? profile.dailyTargetHours })}
            aria-label="Daily study target hours"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Weekly coding target</span>
            <span className="font-mono text-xs text-primary">{profile.weeklyCodingTargetHours}h / week</span>
          </div>
          <Slider
            min={5} max={40} step={1}
            value={[profile.weeklyCodingTargetHours]}
            onValueChange={(v) => setProfile({ weeklyCodingTargetHours: v[0] ?? profile.weeklyCodingTargetHours })}
            aria-label="Weekly coding target hours"
          />
        </div>
      </div>
    </CardShell>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────
function AppearanceCard() {
  const theme = useNexus((s) => s.settings.theme);
  const setSetting = useNexus((s) => s.setSetting);

  return (
    <CardShell icon={Palette} title="Appearance" hint="Four hand-tuned themes">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {THEME_PREVIEWS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSetting({ theme: t.id })}
            aria-pressed={theme === t.id}
            className={cn(
              'rounded-xl border p-3 text-left transition-all',
              theme === t.id
                ? 'border-primary/60 ring-2 ring-primary'
                : 'border-border/60 hover:border-primary/30',
            )}
          >
            <div className="flex gap-1.5">
              {t.swatches.map((c) => (
                <span key={c} className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: c }} aria-hidden="true" />
              ))}
            </div>
            <p className="mt-2 text-[11px] font-medium leading-tight">{t.label}</p>
          </button>
        ))}
      </div>
    </CardShell>
  );
}

// ─── Preferences ──────────────────────────────────────────────────────────────
function PreferencesCard() {
  const settings = useNexus((s) => s.settings);
  const setSetting = useNexus((s) => s.setSetting);

  return (
    <CardShell icon={SlidersHorizontal} title="Preferences" hint="Small delights & battery savings">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium">Celebrate milestones with confetti</p>
          <p className="text-[11px] text-muted-foreground">Canvas confetti on streak milestones & perfect days.</p>
        </div>
        <Switch
          checked={settings.confettiEnabled}
          onCheckedChange={(v) => setSetting({ confettiEnabled: v })}
          aria-label="Toggle confetti"
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium">Reduce 3D motion (saves battery)</p>
          <p className="text-[11px] text-muted-foreground">Tones down the dashboard&apos;s 3D hero animations.</p>
        </div>
        <Switch
          checked={settings.reduce3d}
          onCheckedChange={(v) => setSetting({ reduce3d: v })}
          aria-label="Toggle reduced 3D motion"
        />
      </div>
    </CardShell>
  );
}

// ─── AI provider ──────────────────────────────────────────────────────────────
function AiCard() {
  const settings = useNexus((s) => s.settings);
  const setSetting = useNexus((s) => s.setSetting);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say READY' }],
          context: buildAiStats(useNexus.getState()),
          provider: 'gemini',
          apiKey: settings.geminiKey,
          model: settings.geminiModel,
        }),
      });
      if (!res.ok) {
        toast.error('Route unavailable yet');
        return;
      }
      const json: unknown = await res.json();
      const text =
        typeof json === 'object' && json !== null && 'text' in json
          ? String((json as { text: unknown }).text)
          : '';
      if (!text) {
        toast.error('Empty response — check key & model');
        return;
      }
      setTestResult(text);
      toast.success('Gemini responded — connection OK');
    } catch {
      toast.error('Connection failed — check network & key');
    } finally {
      setTesting(false);
    }
  };

  return (
    <CardShell icon={Sparkles} title="AI Coach" hint="Provider & credentials">
      <RadioGroup
        value={settings.aiProvider}
        onValueChange={(v) => setSetting({ aiProvider: v as Settings['aiProvider'] })}
        className="grid gap-2 sm:grid-cols-2"
      >
        <div
          className={cn(
            'rounded-xl border p-3 transition-colors',
            settings.aiProvider === 'nexus' ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-primary/30',
          )}
        >
          <div className="flex items-start gap-2.5">
            <RadioGroupItem value="nexus" id="ai-nexus" className="mt-0.5" />
            <div>
              <Label htmlFor="ai-nexus" className="text-xs font-medium">Nexus AI (built-in)</Label>
              <p className="text-[11px] text-muted-foreground">Offline coach, zero setup</p>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl border p-3 transition-colors',
            settings.aiProvider === 'gemini' ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-primary/30',
          )}
        >
          <div className="flex items-start gap-2.5">
            <RadioGroupItem value="gemini" id="ai-gemini" className="mt-0.5" />
            <div>
              <Label htmlFor="ai-gemini" className="text-xs font-medium">Gemini (bring your own key)</Label>
              <p className="text-[11px] text-muted-foreground">Your key stays in this browser</p>
            </div>
          </div>
        </div>
      </RadioGroup>

      {settings.aiProvider === 'gemini' && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="ai-key" className="text-xs">Gemini API key</Label>
            <div className="relative">
              <Input
                id="ai-key"
                type={showKey ? 'text' : 'password'}
                value={settings.geminiKey}
                onChange={(e) => setSetting({ geminiKey: e.target.value })}
                placeholder="AIza…"
                autoComplete="off"
                className="h-9 pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-model" className="text-xs">Model</Label>
            <Input
              id="ai-model"
              value={settings.geminiModel}
              onChange={(e) => setSetting({ geminiModel: e.target.value })}
              placeholder="gemini-2.0-flash"
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={testing || !settings.geminiKey.trim()} onClick={testConnection}>
              {testing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                : <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />}
              Test connection
            </Button>
          </div>
          {testResult && (
            <div className="slim-scroll max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/40 p-2.5 text-xs">
              {testResult}
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
}

// ─── Subject add / edit dialog ────────────────────────────────────────────────
function SubjectDialog({ initial, onClose }: { initial: Subject | null; onClose: () => void }) {
  const addSubject = useNexus((s) => s.addSubject);
  const updateSubject = useNexus((s) => s.updateSubject);
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<SubjectCategory>(initial?.category ?? 'college');
  const [color, setColor] = useState(initial?.color ?? INK_VARS[0]);

  const save = () => {
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }
    if (initial) {
      updateSubject(initial.id, { name: name.trim(), category, color });
      toast.success(`Subject "${name.trim()}" updated`);
    } else {
      addSubject(name.trim(), category, color);
      toast.success(`Subject "${name.trim()}" added`);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit subject' : 'Add subject'}</DialogTitle>
          <DialogDescription>Subjects power the daily tracker, analytics and sessions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sub-name" className="text-xs">Name</Label>
            <Input id="sub-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operating Systems" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-category" className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SubjectCategory)}>
              <SelectTrigger id="sub-category" className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_META) as [SubjectCategory, { label: string; color: string }][]).map(([cat, meta]) => (
                  <SelectItem key={cat} value={cat} className="text-xs">{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Color</span>
            <div className="flex flex-wrap gap-1.5">
              {INK_VARS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={color === c}
                  className={cn('h-7 w-7 rounded-full transition-transform hover:scale-110', color === c && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{initial ? 'Save changes' : 'Add subject'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Subjects manager ─────────────────────────────────────────────────────────
function SubjectsCard() {
  const subjects = useNexus((s) => s.subjects);
  const deleteSubject = useNexus((s) => s.deleteSubject);
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; subject: Subject } | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  return (
    <CardShell icon={GraduationCap} title="Subjects manager" hint={`${subjects.length} subjects across college, coding & life`}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => {
          const meta = CATEGORY_META[s.category];
          return (
            <div key={s.id} className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{s.name}</span>
              <Badge variant="outline" className="shrink-0 text-[9px]" style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 33%, transparent)` }}>
                {meta.label}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setDialog({ mode: 'edit', subject: s })} aria-label={`Edit ${s.name}`}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-foreground font-medium hover:bg-foreground/[0.08]" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
      <div>
        <Button size="sm" onClick={() => setDialog({ mode: 'add' })}>
          <Plus className="h-3.5 w-3.5" /> Add Subject
        </Button>
      </div>

      {dialog && (
        <SubjectDialog
          key={dialog.mode === 'edit' ? dialog.subject.id : 'new'}
          initial={dialog.mode === 'edit' ? dialog.subject : null}
          onClose={() => setDialog(null)}
        />
      )}
      {deleting && (
        <AlertDialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{deleting.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                Daily logs using this subject will be cleaned, and its sessions will be removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  deleteSubject(deleting.id);
                  toast.success(`Subject "${deleting.name}" removed`);
                  setDeleting(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </CardShell>
  );
}

// ─── DSA ──────────────────────────────────────────────────────────────────────
function DsaCard() {
  const dsaActive = useNexus((s) => s.dsaActive);
  const toggleDsa = useNexus((s) => s.toggleDsa);

  return (
    <CardShell icon={Braces} title="DSA tracking" hint="Problem grind module">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-medium">Unlock DSA tracking mode</p>
          <p className="text-[11px] text-muted-foreground">
            Adds the 13-topic curriculum with problem counters, difficulty split and mastery bars. Recommended after Semester 1.
          </p>
        </div>
        <Switch checked={dsaActive} onCheckedChange={toggleDsa} aria-label="Toggle DSA mode" />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {dsaActive
          ? 'DSA module is live — manage topics from the DSA Plan module.'
          : 'The DSA Plan module stays locked while this is off.'}
      </p>
    </CardShell>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────
function DangerCard() {
  const state = useNexus();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const kb = useMemo(() => {
    const { _hydrated: _h, setHydrated: _sh, ...rest } = state;
    void _h;
    void _sh;
    return (JSON.stringify(rest).length / 1024).toFixed(1);
  }, [state]);

  return (
    <section className="space-y-4 rounded-2xl border border-foreground/25 bg-foreground/[0.04] p-5">
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.08] text-foreground">
          <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Danger zone</h2>
          <p className="text-[11px] text-muted-foreground">Irreversible data operations — handle with care.</p>
        </div>
      </header>

      <p className="text-[11px] text-muted-foreground">
        ~{kb} KB stored locally (browser localStorage on this device — nothing ever leaves it).
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset to sample data
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setConfirmWipe(true)}>
          <Trash2 className="h-3.5 w-3.5" /> Wipe all data
        </Button>
      </div>

      {confirmReset && (
        <AlertDialog open onOpenChange={(o) => !o && setConfirmReset(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to sample data?</AlertDialogTitle>
              <AlertDialogDescription>
                This replaces your current workspace with the built-in demo dataset — 56 days of logs, tasks, habits, skills and more. Your current data will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  state.resetToSeed();
                  toast.success('Sample data restored');
                  setConfirmReset(false);
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {confirmWipe && (
        <AlertDialog open onOpenChange={(o) => !o && setConfirmWipe(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Wipe all data?</AlertDialogTitle>
              <AlertDialogDescription>
                Every log, session, task, habit, note and project will be erased and replaced with an empty workspace. Consider downloading a JSON backup first (Reports → JSON backup).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  state.clearAllData();
                  toast.success('All data wiped — fresh start');
                  setConfirmWipe(false);
                }}
              >
                Wipe everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}

// ─── Module ───────────────────────────────────────────────────────────────────
export default function SettingsModule() {
  return (
    <div className="space-y-6">
      <ModuleHeader icon={Settings2} title="Settings" subtitle="Profile · appearance · AI · data" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard />
        <AppearanceCard />
        <PreferencesCard />
        <AiCard />
        <DsaCard />
      </div>
      <SubjectsCard />
      <DangerCard />
    </div>
  );
}
