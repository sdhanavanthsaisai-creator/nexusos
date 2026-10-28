'use client';

import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import { useNexus } from '@/lib/nexus/store';

import { chartPalette } from '@/lib/nexus/constants';

export interface ChartThemeInfo {
  dark: boolean;
  text: string;
  subtext: string;
  split: string;
  bg: string;
  tooltipBg: string;
  palette: string[];
}

/** Roboto® RB/25 — canvas-safe monochrome series ramp (ECharts cannot resolve CSS vars). */
const AXIS_TEXT_DARK = '#c9c9c9';
const AXIS_TEXT_LIGHT = 'rgba(0,0,0,0.56)';

/** Theme-aware colors for chart options. */
export function useChartTheme(): ChartThemeInfo {
  const theme = useNexus((s) => s.settings.theme);
  const dark = theme !== 'light';
  return {
    dark,
    text: dark ? AXIS_TEXT_DARK : AXIS_TEXT_LIGHT,
    subtext: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    split: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    bg: dark ? '#0a0a0c' : '#ffffff',
    tooltipBg: dark ? 'rgba(8,8,10,0.95)' : 'rgba(255,255,255,0.97)',
    palette: chartPalette(dark),
  };
}

export function baseTooltip(theme: ChartThemeInfo) {
  return {
    backgroundColor: theme.tooltipBg,
    borderColor: theme.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
    textStyle: { color: theme.text, fontSize: 12 },
    extraCssText: 'backdrop-filter: blur(8px); border-radius: 999px; box-shadow: 0 8px 24px rgba(0,0,0,0.35);',
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
