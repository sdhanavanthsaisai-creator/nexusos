# Roboto® RB/25 — Design System (design.md)

> Applied to: **NexusOS — Student Productivity & Coding OS** (single `/` route, client-rendered)

## Overview

**Product:** Roboto® RB/25
**Reference URL:** https://webdev-team-3.vercel.app/
**Surface type:** marketing (adapted here to an application surface)
**Brand character:** Conversion-focused presence with a balanced color system and 3 typefaces.

### Design Principles

- Consistency over novelty — reuse existing patterns before inventing new ones.
- Token-driven — every visual decision references a token, not a magic number.
- Accessible by default — compliance is a baseline, not an application feature.

## Colors

| Token | Value | Role |
|-------|-------|------|
| color-1 | `#000000` | Text Primary / strongest ink |
| color-2 | `#FFFFFF` | Text Light / surfaces |
| --color-3 | `#C9C9C9` | Text Light (secondary) |
| --color-4 | `#F1F1F1` | Text Light (fog surfaces) |

**NexusOS mapping (application adaptation):**

| Mood | Background | Foreground | Secondary | Accent |
|------|-----------|------------|-----------|--------|
| Obsidian (dark) | `#000000` + white aurora glows | `#F1F1F1` | `#C9C9C9` | `#FFFFFF` (inverted pill: white bg / black text) |
| Frost (light) | `#F1F1F1` | `#000000` | `rgba(0,0,0,0.55)` | `#000000` (inverted pill: black bg / white text) |
| Void (OLED) | `#000000` | `#F1F1F1` | `#C9C9C9` | `#FFFFFF` |
| Fog | `#101014` | `#F1F1F1` | `#C9C9C9` | `#FFFFFF` |

Alpha variants of `#000000` / `#FFFFFF` are permitted (tints of palette colors). **No chromatic hues anywhere** — series differentiation is done with a 10-step **ink ramp** (`--ink-1…--ink-10`, foreground at 100% → 14% alpha), shape (filled / ring / dim dots), glyphs (✓ · ! · ★), and weight — never hue.

## Typography

**Font stack:** Aeonik, IBM Plex Mono, Times New Roman

> Web delivery: Aeonik is commercial — **Inter** is the sanctioned substitute (`--font-rb-sans`). IBM Plex Mono ships via `next/font` (`--font-rb-mono`). Times New Roman is available through the system serif stack (`.font-editorial`).

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 10px | Captions, metadata, micro-labels (mono, tracked) |
| text-sm | 13–14px | Labels, secondary text |
| text-base | 15px | Body text (default, set on body) |
| text-lg | 17px | Subheadings, emphasis |
| display | clamp(40px → 96px) | Hero / section headings — **weight 900**, tight tracking |

**Weight scale:** 400 · 500 · 600 · 900

## Spacing

**Base unit:** 4px — Tailwind's scale is used as-is (p-4, gap-6, etc.). No arbitrary values.

## Shapes

**Border radius:** pinned set — `999px` (pills: buttons, badges, chips, Dynamic Island, inputs), `100%` (circles: dots, avatars, icon wells), cards use one pinned radius (`1rem/1.25rem` family — the card-scale application of radius-lg). Never mix radii within a component.

## Elevation

- **shadow-sm:** `0 0 0 0.5px 1.5px` hairline ring (implemented as `ring-1` borders on glass).
- Glass shadows are **neutral black/white only** — no colored glow.

## Motion

- **duration-fast:** `transform 0.15s cubic-bezier(0.33, 1, 0.68, 1)`, `background-color 0.25s ease-in-out`
- **duration-base:** `color 0.2s–0.3s`, `box-shadow 0.3s`
- **duration-slow:** `2s linear infinite` (looperino — aurora drift, equalizer bars)
- Spring physics (Framer Motion) for island expansion, view transitions, and hovers.

## Component density (reference page)

- Buttons: 41 · Links: 23 · Inputs: 1 · Navigation: 2 · Lists: 1 · Code blocks: 3 · Images: 5

## Do's and Don'ts

### Do

- Reference tokens by name, not raw values.
- Define all interactive states: default, hover, focus-visible, active, disabled.
- Use the 4px spacing scale for all padding, margin, and gap values.
- Write content in sentence case. Reserve ALL CAPS for acronyms (mono micro-labels exempt).
- Test every component at the smallest and largest breakpoint before shipping.

### Don't

- Do not introduce colors outside the extracted palette (no hues — only black/white/#C9C9C9/#F1F1F1 + alpha).
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values within a component.
- Do not use full-uppercase text for body or paragraph content.
- Do not nest interactive elements (e.g. buttons inside links).
- Do not ship components without hover, focus-visible, and disabled states.

## Writing Tone

Concise, confident, implementation-focused. Avoid filler preambles.

## Required component-guideline structure

1. Overview — purpose, when to use, when not to use.
2. Tokens and foundations.
3. Anatomy and variants.
4. States and interactions.
5. Accessibility.
6. Content guidelines.
7. Anti-patterns.

## Definition of Done

- Renders correctly in its default state (smoke test).
- All states documented and visually verified.
- All visual values use design tokens — zero hardcoded values.
- Keyboard navigation works without a pointer.
- No critical accessibility violations (contrast, ARIA, focus order).
- Tested at smallest and largest breakpoint.
- Anti-patterns section lists at least one concrete misuse example.
- Documentation covers purpose, usage, props/API, and limitations.
