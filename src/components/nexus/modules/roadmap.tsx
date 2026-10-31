'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays, Clock, ExternalLink, Flag, FolderKanban, Github, Map, Pencil, Plus, Target, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EChartsOption } from 'echarts';
import type { Project, Skill } from '@/lib/nexus/types';
import { useNexus } from '@/lib/nexus/store';
import {
  addDays, dateKey, eachDayKeys, fmtDayFull, fmtDayNum, round1, startOfWeek, sum, todayKey,
} from '@/lib/nexus/utils';
import { baseTooltip, ChartCard, ModuleHeader, RingProgress, useChartTheme } from '../ui-bits';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SKILL_STATUS: Record<Skill['status'], { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'border-foreground/30 bg-foreground/[0.08] text-foreground' },
  paused: { label: 'Paused', cls: 'border-foreground/20 bg-foreground/[0.04] text-foreground/75' },
  completed: { label: 'Completed', cls: 'border-primary/30 bg-primary/10 text-primary' },
};

const PROJECT_STATUS: Record<Project['status'], { label: string; cls: string }> = {
  idea: { label: 'Idea', cls: 'border-border/60 bg-muted/50 text-muted-foreground' },
  planning: { label: 'Planning', cls: 'border-foreground/20 bg-foreground/[0.04] text-foreground/75' },
  'in-progress': { label: 'In progress', cls: 'border-primary/30 bg-primary/10 text-primary' },
  shipped: { label: 'Shipped', cls: 'border-foreground/30 bg-foreground/[0.08] text-foreground' },
};

const hostOf = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/+$/, '');

// ─── Skill edit dialog ────────────────────────────────────────────────────────
function SkillDialog({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const updateSkill = useNexus((s) => s.updateSkill);
  const [name, setName] = useState(skill.name);
  const [status, setStatus] = useState<Skill['status']>(skill.status);
  const [current, setCurrent] = useState(skill.currentLevel);
  const [target, setTarget] = useState(skill.targetLevel);
  const [weeklyGoal, setWeeklyGoal] = useState(String(skill.weeklyHoursGoal));
  const [milestone, setMilestone] = useState(skill.nextMilestone);
  const [resources, setResources] = useState(skill.resources);
  const [notes, setNotes] = useState(skill.notes);
  const [targetDate, setTargetDate] = useState(skill.targetDate ?? '');

  const save = () => {
    const finalName = name.trim() || skill.name;
    updateSkill(skill.id, {
      name: finalName,
      status,
      currentLevel: current,
      targetLevel: target,
      weeklyHoursGoal: Math.max(0, Number(weeklyGoal) || 0),
      nextMilestone: milestone.trim(),
      resources: resources.trim(),
      notes,
      targetDate: targetDate || null,
    });
    toast.success(`Skill "${finalName}" updated`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="slim-scroll max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit skill — {skill.name}</DialogTitle>
          <DialogDescription>Progress, weekly goal and learning resources.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="skill-name" className="text-xs">Name</Label>
              <Input id="skill-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skill-status" className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Skill['status'])}>
                <SelectTrigger id="skill-status" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['active', 'paused', 'completed'] as const).map((st) => (
                    <SelectItem key={st} value={st} className="text-xs">{SKILL_STATUS[st].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="skill-current" className="text-xs">Current level</Label>
              <span className="font-mono text-xs text-primary">{current}%</span>
            </div>
            <Slider id="skill-current" min={0} max={100} step={1} value={[current]} onValueChange={(v) => setCurrent(v[0] ?? current)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="skill-target" className="text-xs">Target level</Label>
              <span className="font-mono text-xs text-primary">{target}%</span>
            </div>
            <Slider id="skill-target" min={0} max={100} step={1} value={[target]} onValueChange={(v) => setTarget(v[0] ?? target)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="skill-goal" className="text-xs">Weekly hours goal</Label>
              <Input id="skill-goal" type="number" min={0} step={0.5} value={weeklyGoal} onChange={(e) => setWeeklyGoal(e.target.value)} className="h-9 font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skill-date" className="text-xs">Target date</Label>
              <Input id="skill-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-milestone" className="text-xs">Next milestone</Label>
            <Input id="skill-milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="e.g. Build a responsive layout" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-resources" className="text-xs">Resources (one URL per line)</Label>
            <Textarea id="skill-resources" rows={3} value={resources} onChange={(e) => setResources(e.target.value)} placeholder={'https://developer.mozilla.org\nhttps://javascript.info'} className="resize-none font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-notes" className="text-xs">Notes</Label>
            <Textarea id="skill-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" className="resize-none text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skill card ───────────────────────────────────────────────────────────────
function SkillCard({ skill, weekMinutes, onEdit }: { skill: Skill; weekMinutes: number; onEdit: () => void }) {
  const pctToward = skill.targetLevel > 0 ? Math.round((skill.currentLevel / skill.targetLevel) * 100) : 0;
  const actualHours = round1(weekMinutes / 60);
  const resources = skill.resources.split('\n').map((r) => r.trim()).filter(Boolean);
  const meta = SKILL_STATUS[skill.status];

  return (
    <div className="glass min-w-0 space-y-3 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:glow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{skill.name}</h3>
          <Badge variant="outline" className={cn('mt-1 text-[10px]', meta.cls)}>{meta.label}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="touch-expand h-7 w-7 shrink-0" onClick={onEdit} aria-label={`Edit ${skill.name}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <RingProgress value={pctToward} size={76} stroke={7} color={skill.color} label={`${skill.name} progress to target`}>
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: skill.color }}>
            {skill.currentLevel}%
          </span>
        </RingProgress>
        <div className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
          <p className="flex justify-between"><span>Target</span><span className="font-mono text-foreground">{skill.targetLevel}%</span></p>
          <p className="flex justify-between gap-2">
            <span className="shrink-0">Weekly goal</span>
            <span className="truncate font-mono text-foreground">
              {skill.weeklyHoursGoal}h · <span className={cn(actualHours >= skill.weeklyHoursGoal && skill.weeklyHoursGoal > 0 ? 'text-foreground' : '')}>{actualHours}h</span> this week
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border/50 pt-2.5">
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Flag className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span className="line-clamp-1">{skill.nextMilestone || 'No milestone set'}</span>
        </p>
        {skill.targetDate && (
          <p className="flex items-center gap-1.5 pl-[18px] text-[11px] text-muted-foreground/80">
            <CalendarDays className="h-3 w-3 shrink-0" /> by {fmtDayFull(skill.targetDate)}
          </p>
        )}
      </div>

      {resources.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resources.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{hostOf(url).slice(0, 30)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Project add / edit dialog ────────────────────────────────────────────────
function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const addProject = useNexus((s) => s.addProject);
  const updateProject = useNexus((s) => s.updateProject);
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [repoUrl, setRepoUrl] = useState(project?.repoUrl ?? '');
  const [liveUrl, setLiveUrl] = useState(project?.liveUrl ?? '');
  const [tech, setTech] = useState(project?.techStack.join(', ') ?? '');
  const [status, setStatus] = useState<Project['status']>(project?.status ?? 'idea');
  const [hours, setHours] = useState(String(project?.hoursLogged ?? 0));
  const [dueDate, setDueDate] = useState(project?.dueDate ?? '');

  const save = () => {
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      repoUrl: repoUrl.trim(),
      liveUrl: liveUrl.trim(),
      techStack: tech.split(',').map((t) => t.trim()).filter(Boolean),
      status,
      hoursLogged: Math.max(0, Number(hours) || 0),
      dueDate: dueDate || null,
    };
    if (project) {
      updateProject(project.id, payload);
      toast.success('Project updated');
    } else {
      addProject(payload);
      toast.success(`Project "${payload.name}" added`);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="slim-scroll max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit project' : 'Add project'}</DialogTitle>
          <DialogDescription>Track the builds you ship alongside coursework.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name" className="text-xs">Name *</Label>
            <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Portfolio site" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc" className="text-xs">Description</Label>
            <Textarea id="proj-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does it do?" className="resize-none text-xs" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="proj-repo" className="text-xs">Repo URL</Label>
              <Input id="proj-repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/…" className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-live" className="text-xs">Live URL</Label>
              <Input id="proj-live" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://…" className="h-9 font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proj-tech" className="text-xs">Tech stack (comma separated)</Label>
            <Input id="proj-tech" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="React, Tailwind, Vite" className="h-9 text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-status" className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Project['status'])}>
                <SelectTrigger id="proj-status" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['idea', 'planning', 'in-progress', 'shipped'] as const).map((st) => (
                    <SelectItem key={st} value={st} className="text-xs">{PROJECT_STATUS[st].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-hours" className="text-xs">Hours logged</Label>
              <Input id="proj-hours" type="number" min={0} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} className="h-9 font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-due" className="text-xs">Due date</Label>
              <Input id="proj-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{project ? 'Save changes' : 'Add project'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project, onEdit, onDelete,
}: { project: Project; onEdit: () => void; onDelete: () => void }) {
  const overdue = !!project.dueDate && project.dueDate < todayKey() && project.status !== 'shipped';
  const meta = PROJECT_STATUS[project.status];
  return (
    <div className="glass space-y-3 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:glow-soft">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold">{project.name}</h3>
        <Badge variant="outline" className={cn('shrink-0 text-[10px]', meta.cls)}>{meta.label}</Badge>
      </div>
      {project.description && <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>}
      {project.techStack.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.techStack.map((t) => (
            <span key={t} className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-foreground')}>
          <CalendarDays className="h-3 w-3 shrink-0" />
          {project.dueDate ? fmtDayFull(project.dueDate) : 'No due date'}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Clock className="h-3 w-3 shrink-0" />
          {project.hoursLogged}h logged
        </span>
      </div>
      <div className="flex items-center gap-1 border-t border-border/50 pt-2">
        {project.repoUrl && (
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-muted-foreground">
            <a href={project.repoUrl} target="_blank" rel="noreferrer">
              <Github className="h-3 w-3" /> Repo
            </a>
          </Button>
        )}
        {project.liveUrl && (
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-muted-foreground">
            <a href={project.liveUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" /> Live
            </a>
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} aria-label={`Edit ${project.name}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground hover:bg-foreground/[0.06] hover:text-foreground" onClick={onDelete} aria-label={`Delete ${project.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Module ───────────────────────────────────────────────────────────────────
export default function RoadmapModule() {
  const skills = useNexus((s) => s.skills);
  const subjects = useNexus((s) => s.subjects);
  const dailyLogs = useNexus((s) => s.dailyLogs);
  const projects = useNexus((s) => s.projects);
  const deleteProject = useNexus((s) => s.deleteProject);
  const theme = useChartTheme();

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null });
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // minutes this Mon-start week per subject id
  const weekKeys = useMemo(() => eachDayKeys(startOfWeek(new Date()), new Date()), []);
  const weeklyMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of weekKeys) {
      const log = dailyLogs[k];
      if (!log) continue;
      for (const [sid, m] of Object.entries(log.minutes)) map[sid] = (map[sid] ?? 0) + m;
    }
    return map;
  }, [weekKeys, dailyLogs]);

  // stacked bar: coding hours per skill over last 8 weeks
  const chart = useMemo(() => {
    const weekStarts = Array.from({ length: 8 }, (_, i) => addDays(startOfWeek(new Date()), i - 7));
    const labels = weekStarts.map((w) => fmtDayNum(dateKey(w)));
    const codingSkills = skills.filter((sk) => subjects.find((su) => su.id === sk.id)?.category === 'coding');
    const hours = codingSkills.map((sk) =>
      weekStarts.map((w) =>
        round1(sum(eachDayKeys(w, addDays(w, 6)).map((k) => dailyLogs[k]?.minutes?.[sk.id] ?? 0)) / 60),
      ),
    );
    const rows = codingSkills.flatMap((sk, si) =>
      labels.map((week, wi) => ({ week, skill: sk.name, hours: hours[si][wi] })),
    );
    const option: EChartsOption = {
      color: theme.palette,
      tooltip: { ...baseTooltip(theme), trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: theme.subtext, fontSize: 10 } },
      grid: { left: 4, right: 8, top: 32, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category', data: labels,
        axisLabel: { color: theme.subtext, fontSize: 10 },
        axisLine: { lineStyle: { color: theme.split } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: theme.split } },
        axisLabel: { color: theme.subtext, fontSize: 10, formatter: '{value}h' },
      },
      series: codingSkills.map((sk, si) => ({
        name: sk.name,
        type: 'bar' as const,
        stack: 'hours',
        barMaxWidth: 26,
        itemStyle: { borderRadius: si === codingSkills.length - 1 ? [4, 4, 0, 0] : 0 },
        emphasis: { focus: 'series' as const },
        data: hours[si],
      })),
    };
    return { option, rows, count: codingSkills.length };
  }, [skills, subjects, dailyLogs, theme]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={Map} title="Coding Roadmap" subtitle="Skills & projects tracking" />

      {/* Skills */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Target className="h-4 w-4 text-primary" /> Skills
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{skills.length}</span>
        </h2>
        {skills.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">No skills yet — edit them into existence once seeded.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {skills.map((sk) => (
              <SkillCard key={sk.id} skill={sk} weekMinutes={weeklyMinutes[sk.id] ?? 0} onEdit={() => setEditingSkill(sk)} />
            ))}
          </div>
        )}
      </section>

      {/* Weekly coding hours chart */}
      <ChartCard
        title="Weekly coding hours by skill"
        subtitle={chart.count > 0 ? 'Last 8 weeks · stacked hours per coding skill' : 'Add coding skills to populate this chart'}
        option={chart.option}
        height={300}
        csv={{ name: 'nexusos-weekly-coding-hours', rows: chart.rows }}
      />

      {/* Projects */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <FolderKanban className="h-4 w-4 text-primary" /> Projects
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{projects.length}</span>
          </h2>
          <Button size="sm" onClick={() => setProjectDialog({ open: true, project: null })}>
            <Plus className="h-3.5 w-3.5" /> Add project
          </Button>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">No projects yet — add your first build to start tracking hours.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => setProjectDialog({ open: true, project: p })}
                onDelete={() => setDeletingProject(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Dialogs */}
      {editingSkill && <SkillDialog skill={editingSkill} onClose={() => setEditingSkill(null)} />}
      {projectDialog.open && (
        <ProjectDialog key={projectDialog.project?.id ?? 'new'} project={projectDialog.project} onClose={() => setProjectDialog({ open: false, project: null })} />
      )}
      {deletingProject && (
        <AlertDialog open onOpenChange={(o) => !o && setDeletingProject(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{deletingProject.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the project card, its tech list and logged hours. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  deleteProject(deletingProject.id);
                  toast.success('Project deleted');
                  setDeletingProject(null);
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
