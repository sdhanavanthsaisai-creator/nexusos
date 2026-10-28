---
name: design-system-roboto-rb-25
description: >
  Apply the Roboto® RB/25 design system when building or updating UI.
  Use when creating components, choosing colors or typography,
  or reviewing designs for the NexusOS application surface.
---

# Roboto® RB/25 — Design System Skill

## When to Use

- Building new UI components for NexusOS.
- Reviewing or updating existing component styles.
- Choosing colors, typography, or spacing.
- Checking designs against the extracted token set.

## Context

- **Product:** Roboto® RB/25 — https://webdev-team-3.vercel.app/
- **Surface:** marketing system adapted to the NexusOS application
- **Character:** Conversion-focused presence with a balanced monochrome color system and 3 typefaces.

## Tokens

### Colors

| Token | Value | Role |
|-------|-------|------|
| color-1 | `#000000` | Text Primary |
| color-2 | `#FFFFFF` | Text Light |
| --color-3 | `#C9C9C9` | Text Light (secondary) |
| --color-4 | `#F1F1F1` | Text Light (fog) |

Alpha variants of black/white are permitted. No chromatic hues. Series/status differentiation uses the ink ramp (`--ink-1…--ink-10`), shape, glyphs, and weight.

### Typography

**Font stack:** Aeonik (web substitute: Inter), IBM Plex Mono, Times New Roman

| Level | Size | Usage |
|-------|------|-------|
| text-xs | 10px | Captions, metadata |
| text-sm | 13px | Labels, secondary text |
| text-base | 15px | Body text (default) |
| text-lg | 17px | Subheadings, emphasis |
| display | 40–96px | Section headings (weight 900) |

**Weight scale:** 400 · 500 · 600 · 900

### Spacing

**Base unit:** 4px — use Tailwind's scale. No arbitrary values.

### Shapes

**Border radius:** `100%` (circles) · `999px` (pills) · one pinned card radius. Never mix within a component.

### Elevation

- **shadow-sm:** hairline ring `0 0 0 0.5px 1.5px` — implemented as ring-1 borders on glass.
- Neutral shadows only.

### Motion

- fast: `transform 0.15s cubic-bezier(0.33,1,0.68,1)`, `background-color 0.25s ease-in-out`
- base: `color 0.2s–0.3s`, `box-shadow 0.3s`
- slow: `2s linear infinite` loops (aurora, equalizer)

## Constraints

### Always

- Use tokens from the tables above — do not introduce new values.
- Include hover, focus-visible, and disabled states for interactive elements.
- Follow the 4px spacing grid.
- Meet WCAG 2.2 AA contrast minimums (use alpha ≥ 0.55 for text-on-glass).

### Never

- Do not introduce colors outside the extracted palette.
- Do not use arbitrary spacing values — stick to the scale.
- Do not mix border-radius values within a component.
- Do not use full-uppercase text for body or paragraph content.
- Do not nest interactive elements (e.g. buttons inside links).
- Do not ship components without defining hover, focus-visible, and disabled states.

## Tone

Concise, confident, implementation-focused. Avoid filler preambles.

## Authoring Workflow

1. State intent — one sentence on purpose.
2. Map tokens — list every token the component uses.
3. Define anatomy — named parts with token assignments.
4. Specify states — default, hover, focus-visible, active, disabled, loading, error, empty.
5. Describe interactions — keyboard, pointer, touch, edge cases.
6. Add a11y criteria — testable pass/fail checks.
7. List anti-patterns — concrete misuse examples.
8. Close with the Definition of Done checklist.

## Component Requirements

- Reference only tokens from the tables above.
- Define all states: default, hover, focus-visible, active, disabled, loading, error.
- Handle edge cases: empty, overflow, truncation, max content.
- Include keyboard navigation behavior.
- Document ARIA roles and labels.

## Definition of Done

- Default state renders (smoke test).
- All states visually verified.
- Zero hardcoded visual values — tokens only.
- Keyboard navigation works without pointer.
- No critical a11y violations.
- Tested at min and max breakpoint.
- At least one anti-pattern documented.
- Purpose, usage, and limitations documented.
