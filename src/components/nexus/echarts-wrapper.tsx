'use client';

import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import { useNexus } from '@/lib/nexus/store';

export interface ChartThemeInfo {
  dark: boolean;
  text: string;
  subtext: string;
  split: string;
  bg: string;
  tooltipBg: string;
  palette: string[];
}

const PALETTE = ['#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#fbbf24', '#fb7185', '#2dd4bf', '#e879f9', '#fb923c', '#4ade80'];

/** Theme-aware colors for chart options. */
export function useChartTheme(): ChartThemeInfo {
  const theme = useNexus((s) => s.settings.theme);
  const dark = theme !== 'light';
  return {
    dark,
    text: dark ? '#c8c8d0' : '#3f4450',
    subtext: dark ? '#8b8b96' : '#6b7280',
    split: dark ? 'rgba(148,163,184,0.12)' : 'rgba(71,85,105,0.14)',
    bg: dark ? '#101014' : '#ffffff',
    tooltipBg: dark ? 'rgba(16,16,20,0.95)' : 'rgba(255,255,255,0.97)',
    palette: PALETTE,
  };
}

export function baseTooltip(theme: ChartThemeInfo) {
  return {
    backgroundColor: theme.tooltipBg,
    borderColor: theme.dark ? '#2c2c34' : '#d8dbe1',
    textStyle: { color: theme.text, fontSize: 12 },
    extraCssText: 'backdrop-filter: blur(8px); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.35);',
  };
}

export interface EChartProps {
  option: echarts.EChartsOption;
  height?: number | string;
  className?: string;
  group?: string;
  onClick?: (params: echarts.ECElementEvent) => void;
}

/** Thin, resilient ECharts wrapper with auto-resize + dispose. */
export function EChart({ option, height = 280, className, onClick }: EChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onClick);

  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    chart.on('click', (p) => clickRef.current?.(p));
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} className={className} style={{ width: '100%', height, ...(!className && {}) }} aria-hidden="true" />;
}
