'use client';

import {
  Settings2, Hexagon, PanelLeftClose, PanelLeftOpen, Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNexus, useUI } from '@/lib/nexus/store';
import { MODULE_GROUPS, NAV_MODULES, moduleMeta, type ModuleNavEntry } from '@/lib/nexus/constants';
import { NAV_ICONS } from './nav-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavRowProps {
  entry: ModuleNavEntry;
  collapsed: boolean;
  active: boolean;
  badge?: number | null;
  locked?: boolean;
  onSelect: () => void;
}

function NavRow({ entry, collapsed, active: isActive, badge, locked, onSelect }: NavRowProps) {
  const Icon = NAV_ICONS[entry.id];

  const btn = (
    <motion.button
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm will-change-transform',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-primary/10 font-medium text-primary glow-soft'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {isActive && (
        <motion.span
          layoutId="nav-active-glow"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
      <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110')} aria-hidden="true" />
      {!collapsed && <span className="flex-1 truncate text-left">{entry.label}</span>}
      {!collapsed && locked && <Lock className="h-3 w-3 text-muted-foreground/70" aria-hidden="true" />}
      {!collapsed && badge ? (
        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
          {badge}
        </span>
      ) : null}
    </motion.button>
  );

  return (
    <li>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="glass-strong max-w-56">
            <p className="text-xs font-medium">{entry.label}</p>
            <p className="text-[10px] leading-relaxed text-muted-foreground">{entry.blurb}</p>
          </TooltipContent>
        </Tooltip>
      ) : btn}
    </li>
  );
}

export function NavList({
  collapsed,
  onNavigate,
  showSettings = false,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  showSettings?: boolean;
}) {
  const active = useUI((s) => s.activeModule);
  const setActive = useUI((s) => s.setActiveModule);
  const dsaActive = useNexus((s) => s.dsaActive);
  const pendingTasks = useNexus((s) => s.tasks.filter((t) => t.status !== 'done').length);

  const rowFor = (entry: ModuleNavEntry) => (
    <NavRow
      key={entry.id}
      entry={entry}
      collapsed={collapsed}
      active={active === entry.id}
      badge={entry.id === 'tasks' && pendingTasks > 0 ? pendingTasks : null}
      locked={entry.id === 'dsa' && !dsaActive}
      onSelect={() => { setActive(entry.id); onNavigate?.(); }}
    />
  );

  return (
    <TooltipProvider delayDuration={200}>
      <nav aria-label="Study Hall modules" className="flex-1 space-y-4 overflow-y-auto px-2 py-3 slim-scroll">
        {MODULE_GROUPS.map((g) => {
          const rows = NAV_MODULES.filter((m) => m.group === g.key);
          if (rows.length === 0) return null;
          return (
            <div key={g.key}>
              {!collapsed && (
                <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                  {g.label}
                </p>
              )}
              <ul className="space-y-0.5">{rows.map(rowFor)}</ul>
            </div>
          );
        })}

        {showSettings && (
          <div>
            {!collapsed && (
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                Account
              </p>
            )}
            <ul className="space-y-0.5">{rowFor(moduleMeta('settings'))}</ul>
          </div>
        )}
      </nav>
    </TooltipProvider>
  );
}

export default function Sidebar() {
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggle = useUI((s) => s.toggleSidebar);
  const active = useUI((s) => s.activeModule);
  const setActive = useUI((s) => s.setActiveModule);
  const profile = useNexus((s) => s.profile);
  const semester = profile.semester;
  const settings = moduleMeta('settings');
  const settingsActive = active === 'settings';

  return (
    <aside
      className={cn(
        'glass hidden shrink-0 flex-col border-y-0 border-l-0 lg:flex',
        collapsed ? 'w-[4.25rem]' : 'w-60',
        'transition-[width] duration-300 ease-out',
      )}
      aria-label="Primary sidebar"
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-2.5 px-4 pb-2 pt-4', collapsed && 'justify-center px-0')}>
        <motion.div
          className="relative flex h-8 w-8 items-center justify-center"
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Hexagon className="h-8 w-8 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <span className="absolute text-[11px] font-black text-primary">S</span>
        </motion.div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-gradient">STUDY HALL</p>
            <p className="truncate text-[10px] text-muted-foreground">Student Productivity OS</p>
          </div>
        )}
      </div>

      <NavList collapsed={collapsed} />

      {/* Settings — its own entry, never buried inside a group */}
      <div className={cn('border-t border-border/60 px-2 py-2', collapsed && 'px-1')}>
        <motion.button
          onClick={() => setActive('settings')}
          aria-current={settingsActive ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm',
            collapsed && 'justify-center px-0',
            settingsActive
              ? 'bg-primary/10 font-medium text-primary glow-soft'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Settings2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="flex-1 truncate text-left">{settings.label}</span>}
        </motion.button>
      </div>

      {/* Footer profile + collapse */}
      <div className={cn('flex items-center gap-2 border-t border-border/60 p-3', collapsed && 'flex-col')}>
        <div className={cn('flex min-w-0 flex-1 items-center gap-2', collapsed && 'flex-none')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-foreground/15 to-foreground/[0.05] text-xs font-bold text-foreground">
            {profile.name.slice(0, 1).toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{profile.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{profile.degree} · Sem {semester}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <motion.button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            whileHover={{ rotate: 6 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </motion.button>
        )}
      </div>
      {collapsed && (
        <motion.button
          onClick={toggle}
          aria-label="Expand sidebar"
          className="mx-auto mb-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          whileHover={{ rotate: 6 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
        </motion.button>
      )}
    </aside>
  );
}
