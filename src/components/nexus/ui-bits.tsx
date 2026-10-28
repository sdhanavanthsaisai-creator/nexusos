'use client';

import { type ReactNode, type ComponentType } from 'react';
import { Download, type LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EChart, baseTooltip, useChartTheme } from './echarts-wrapper';
import { RANGE_KEYS, RANGE_LABELS, downloadCSV, type RangeKey, clamp } from '@/lib/nexus/utils';
import type { EChartsOption } from 'echarts';

// ─── Module header ────────────────────────────────────────────────────────────
export function ModuleHeader({
  icon: Icon, title, subtitle, actions,
}: {
  icon?: ComponentType<LucideProps>;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary glow-soft">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
const TONES: Record<string, { text: string; bg: string; ring: string }> = {
  cyan: { text: 'text-foreground', bg: 'bg-foreground/[0.08]', ring: 'ring-foreground/25' },
  violet: { text: 'text-foreground/85', bg: 'bg-foreground/[0.06]', ring: 'ring-foreground/20' },
  emerald: { text: 'text-foreground', bg: 'bg-foreground/[0.10]', ring: 'ring-foreground/30' },
  pink: { text: 'text-foreground/80', bg: 'bg-foreground/[0.05]', ring: 'ring-foreground/15' },
  amber: { text: 'text-foreground/75', bg: 'bg-foreground/[0.05]', ring: 'ring-foreground/15' },
  rose: { text: 'text-foreground', bg: 'bg-foreground/[0.12]', ring: 'ring-foreground/40' },
  slate: { text: 'text-foreground/70', bg: 'bg-foreground/[0.04]', ring: 'ring-foreground/10' },
};

export function KpiCard({
  icon: Icon, label, value, sub, tone = 'cyan', progress,
}: {
  icon?: ComponentType<LucideProps>;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: keyof typeof TONES;
  progress?: number; // 0-100
}) {
  const t = TONES[tone] ?? TONES.cyan;
  return (
    <div className="glass group rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:glow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', t.bg, t.text)}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn('h-full rounded-full transition-all duration-700', t.text.replace('text-', 'bg-'))}
            style={{ width: `${clamp(progress, 0, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Chart card (title + CSV export + EChart) ─────────────────────────────────
export function ChartCard({
  title, subtitle, option, height = 280, csv, csvName, className, actions,
}: {
  title: string;
  subtitle?: string;
  option: EChartsOption;
  height?: number | string;
  csv?: { name: string; rows: Record<string, unknown>[] };
  csvName?: string;
  className?: string;
  actions?: ReactNode;
}) {
  const theme = useChartTheme();
  const merged = {
    ...option,
    toolbox: (option.toolbox as object) ?? {
      show: true,
      right: 6,
      top: -6,
      feature: { saveAsImage: { backgroundColor: theme.bg, name: csvName ?? title, pixelRatio: 2 } },
    },
  };
  return (
    <div className={cn('glass rounded-2xl p-4', className)}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2 pr-8">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {actions}
          {csv && csv.rows.length > 0 && (
            <Button
              variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => downloadCSV(csv.name, csv.rows)}
              aria-label={`Export ${title} as CSV`}
            >
              <Download className="h-3 w-3" aria-hidden="true" /> CSV
            </Button>
          )}
        </div>
      </div>
      <EChart option={{ ...merged, color: (option.color as string[]) ?? theme.palette }} height={height} />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon, title, hint, children,
}: {
  icon?: ComponentType<LucideProps>;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 p-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />}
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options, value, onChange, className, size = 'default',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'default';
}) {
  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1 rounded-xl bg-muted/70 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-2.5 font-medium transition-all',
            size === 'sm' ? 'py-1 text-[11px]' : 'py-1.5 text-xs',
            value === o.value ? 'bg-background text-foreground shadow-sm glow-soft' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Range filter (Today / Week / … / Custom) ─────────────────────────────────
export function RangeFilter({
  value, onChange, customStart, customEnd, onCustom,
}: {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
  customStart?: string;
  customEnd?: string;
  onCustom: (start?: string, end?: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        size="sm"
        options={RANGE_KEYS.map((k) => ({ value: k, label: RANGE_LABELS[k] }))}
        value={value}
        onChange={onChange}
      />
      {value === 'custom' && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date" className="h-7 w-[8.5rem] rounded-lg px-2 text-xs" value={customStart ?? ''}
            onChange={(e) => onCustom(e.target.value, customEnd)} aria-label="Range start date"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date" className="h-7 w-[8.5rem] rounded-lg px-2 text-xs" value={customEnd ?? ''}
            onChange={(e) => onCustom(customStart, e.target.value)} aria-label="Range end date"
          />
        </div>
      )}
    </div>
  );
}

// ─── Ring progress (SVG) ──────────────────────────────────────────────────────
export function RingProgress({
  value, size = 84, stroke = 8, color = 'var(--primary)', trackOpacity = 0.12, children, label,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  color?: string;
  trackOpacity?: number;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value, 0, 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v)}% progress`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`color-mix(in oklab, ${color} ${trackOpacity * 100}%, transparent)`} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
export function StarRating({ value, onChange, max = 5 }: { value: number; onChange?: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {Array.from({ length: max }, (_, i) => i + 1).map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} of ${max}`}
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={cn(
            'h-6 w-6 rounded text-sm transition-colors',
            onChange && 'hover:scale-110',
            i <= value ? 'text-foreground' : 'text-muted-foreground/35',
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Tooltip builder re-export for module charts ──────────────────────────────
export { baseTooltip, useChartTheme };
export type { EChartsOption };
