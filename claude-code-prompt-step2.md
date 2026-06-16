# Crucible — Add `/try` interactive demo (Step 2 of 7)

## CONTEXT

You're working in the Crucible dashboard repo (Next.js 16 App Router + React + TypeScript + Tailwind v4 + Vercel). The landing page is already done. The `/arena` route is already done — **DO NOT TOUCH** `/arena` or any of its files.

This step adds a new `/try` route — a 5-stage interactive demo flow that walks visitors through the adversarial hardening cycle before they explore the full arena. The "Try the demo →" tombol in the landing's Final CTA section will link here.

## SOURCE OF TRUTH

I've placed 5 mockup HTML files at the repo root:

- `crucible-try.html` — Stage 1 (Find the flaw)
- `crucible-try-stage2.html` — Stage 2 (Watch Red)
- `crucible-try-stage3.html` — Stage 3 (Blue hardens)
- `crucible-try-stage4.html` — Stage 4 (Arbiter judges)
- `crucible-try-stage5.html` — Stage 5 (Verify + Passport)

**These mockups are the canonical reference** for content, structure, CSS, animations, and JS interaction logic. **Read each file thoroughly before writing any code.** If a question arises about wording, scores, hash strings, colors, or layout — the mockup is the answer.

Port them faithfully. Don't redesign. Don't "improve". Match the mockup.

## FILE LAYOUT

**Create:**
```
app/try/
├── page.tsx       — main component, state machine, 5 stage sub-components
└── try.css        — all stage CSS combined, scoped under `.try`
```

**Modify:**
- Landing's Final CTA section — wire the "Try the demo →" tombol to `<Link href="/try">`. Locate the existing button/link and just swap the href. Do not change copy or styling.

**DO NOT modify:**
- `/arena` route or anything inside it
- Any other landing section, component, or CSS
- Global CSS / layout / fonts
- `next.config.js`, `tsconfig.json`, or any other config

## ROUTING

- New route `/try` via `app/try/page.tsx`.
- `'use client'` directive at top (component needs `useState` + click handlers).
- Sticky nav inside `/try` has a "Back" link → `<Link href="/">` (landing).
- Stage 5 "Open the Arena →" → `<Link href="/arena">`.
- Stage 5 "Try another document" link → resets state to Stage 1 in-place (no nav).
- Stage 1 "Skip the game →" link → setStage(2) in-place.

## STATE MACHINE

```tsx
const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);
const [foundFlaws, setFoundFlaws] = useState(0);
```

- Stage 1 click handlers on `.flaw` lines increment `foundFlaws`. Lines with `.safe` do not increment.
- Stage 2 reads `foundFlaws` to populate the subtitle ("You caught {n}.") and the YOU score box value.
- Stages 2 → 3 → 4 → 5 just advance: `setStage(stage + 1)`.
- "Try another document" calls `setStage(1)` + `setFoundFlaws(0)`.

## COMPONENT STRUCTURE (suggested)

```tsx
// app/try/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import './try.css';

export default function TryPage() {
  const [stage, setStage] = useState<1|2|3|4|5>(1);
  const [foundFlaws, setFoundFlaws] = useState(0);
  const restart = () => { setStage(1); setFoundFlaws(0); };

  return (
    <div className="try">
      <TryNav stage={stage} />
      <main>
        <div className="wrap">
          {stage === 1 && <Stage1 onDone={(n) => { setFoundFlaws(n); setStage(2); }} />}
          {stage === 2 && <Stage2 foundFlaws={foundFlaws} onDone={() => setStage(3)} />}
          {stage === 3 && <Stage3 onDone={() => setStage(4)} />}
          {stage === 4 && <Stage4 onDone={() => setStage(5)} />}
          {stage === 5 && <Stage5 onRestart={restart} />}
        </div>
      </main>
    </div>
  );
}
```

Each `StageX` is a function component in the same file (keep them inline — single file is fine since they share state context only via props). `TryNav` is also a small component in the same file.

## PER-STAGE PORTING

For each stage:

1. Open the mockup HTML file.
2. Copy the markup inside `<main><div class="wrap">...</div></main>` to JSX (convert `class=` → `className=`, `for=` → `htmlFor=`, etc.).
3. Copy the entire `<style>` block to the relevant section of `try.css`.
4. Replace vanilla JS (the `<script>` block) with React idioms:
   - Stage 1: `onClick` handlers on each runbook line element. Track clicked state per line (or use a `Set<number>` of clicked indices). Increment `foundFlaws` callback when a `.flaw` line is clicked for the first time.
   - Stage 4 gauge counter: port the setTimeout + requestAnimationFrame script verbatim, wrap in `useEffect(() => { ... }, [])` inside the Stage 4 component. Use a `useRef` to target the number element if needed.
   - Stage 5 chain interactivity: `const [broken, setBroken] = useState(false);`. Conditional className on `.chainviz` and `.pstatus`. Status text conditional on `broken` state.
5. CSS animations are mount-triggered automatically — when the stage component remounts, the elements are freshly added to DOM and animations replay. No special handling needed.

### Stage-specific notes

**Stage 1 — Find the flaw**
- Runbook has 7 lines: 5 with `.flaw`, 2 with `.safe`. Exact order, copy text, and feedback strings in `crucible-try.html`.
- Counter at bottom shows live foundFlaws count.
- Hint pulse animation on first `.rline:not(.clicked)` — fades after first interaction (toggle a `.fresh` class on the runbook container, remove on first click).
- "Show me what Red found →" tombol is always enabled (skip-able). On click → invoke `onDone(foundFlaws)`.
- "Skip the game →" link → also invokes `onDone(foundFlaws)`.

**Stage 2 — Watch Red**
- Heading: "Red found 7 risks."
- Subtitle: "You caught {foundFlaws}. Here's everything Red Agent flagged — including 2 you couldn't see from a single line."
- YOU score box: `foundFlaws` (not hardcoded 3).
- RED AGENT score box: 7 (hardcoded).
- 7 finding cards with staggered reveal — exact text, severity, line refs in mockup.
- CTA "Let Blue harden the runbook →" → onDone().

**Stage 3 — Blue hardens**
- Diff header bar: "runbook-db-outage" + "v2.3 → v2.4 (hardened)" tag + "7 risks closed" (right-aligned blue uppercase).
- 7 change cards (staggered reveal). Each: cref header (line badge + title) + diff body (- and/or + lines) + cnote ("→ explanation"). 
- Cards 4 and 7 are "new step" / "new section" — their cnum badge gets the `.new` modifier (blue).
- CTA "See Arbiter's verdict →" → onDone().

**Stage 4 — Arbiter judges**
- Heading: "Verdict: 85 of 100."
- Animated SVG semicircle gauge — arc fill from `stroke-dashoffset: 251.33` → `37.7` over 1.5s.
- JS counter syncs in parallel: number 0 → 85 with ease-out cubic.
- Threshold dot at (164.7, 53) on the arc.
- "✓ PASSED" badge reveals after gauge animation.
- Rubric: 4 rows with animated bar fills. Scores 20/20, 20/25, 28/30, 17/25 (sums to 85). Labels: "Audit & accountability", "Failure recovery", "Operational safety", "Documentation & rollback".
- Verdict card pops in: HUMAN-APPROVED stamp (violet), Hash·head "12241517f6…d4a", "Signed by Zain · on-call DBA · 2026-06-13 18:23 UTC".
- CTA "Verify the chain →" → onDone().

**Stage 5 — Verify (passport finale)**
- Heading: "Sealed. Try to break it."
- Passport card with all sections from mockup:
  - Header: "Hardening Passport" eyebrow + "Incident runbook — Database outage" title + "run-id run-20260613-134941-d26249" + score "85 / 100" (amber) + "Human-approved" stamp (violet).
  - Metadata strip: Rounds 3 · Agents 4 · Entries 42 · Version v2.4.
  - Chain section: "Audit trail · SHA-256 hash chain" header + 5 blocks (#001, #002, #003 [tampered target], #004, #042-HEAD). Hashes: a3f1…b8c2, 7d2e…4af9, 5b9c…1e3d, 8a4f…2c7b, 122415…d4a. HEAD block has `.head` modifier (blue border).
  - Status badge + buttons row: status text + "Break the chain" + "Show intact".
  - Footer: Signed by Zain · on-call DBA / Sealed 2026-06-13 18:23 UTC.
- Chain interactivity:
  - "Break the chain" → toggle broken = true. ChainViz gets `.broken` class, status badge gets `.broken` class, status text becomes "chain BROKEN at #003 · verification failed".
  - "Show intact" → broken = false. Status text becomes "chain intact · 42 entries · head <code>12241517f6…d4a</code>".
- Final CTAs:
  - "Open the Arena →" → `<Link href="/arena">`.
  - "Try another document" → onRestart().

## STYLING

- Single CSS file: `app/try/try.css`.
- Root scope: every rule starts with `.try ` (or nested inside `.try { ... }` if using preprocessor-style nesting — but the repo doesn't use Sass, so write flat with `.try` prefix).
- **No Tailwind for stage layouts.** Use raw CSS copied from mockups. Tailwind is fine for the link wire on landing if landing uses it there, but don't introduce it inside `/try`.
- CSS variables (--bg, --surface, --text, --red, --blue, --amber, --violet, --green, etc.) — copy from mockups. They're identical across all 5 stage files; declare once at the top of `try.css` inside `.try { ... }` block.
- Plus Jakarta Sans font — should already be loaded globally from landing. Just reference `font-family: "Plus Jakarta Sans", ...`.
- All keyframes (`revealUp`, `gFill`, `rFill`, `vIn`, `blockIn`, `connDraw`, `hintPulse`) — copy from mockups.

## CONSTRAINTS

- No new npm dependencies.
- No Tailwind classes inside `/try` stage components.
- No changes to landing's CSS (except adding the link wire on the Final CTA tombol).
- No changes to `/arena`.
- No i18n changes in this step. `/try` is English-only. If landing uses `t()` and you touch the Final CTA, keep its existing `t()` call intact when swapping just the `href`.
- Use `<Link>` from `next/link` for all internal navigation.

## VERIFICATION

After implementation, run a clean dev build (`npm run dev`), open `localhost:3000`, and confirm every item below:

- [ ] Landing renders unchanged. Final CTA "Try the demo →" tombol navigates to `/try`.
- [ ] `/try` loads with Stage 1 active. Sticky nav shows "Stage 1 / 5" with dot 1 lit, dots 2-5 unlit.
- [ ] Stage 1: click line 01 (root SSH) → red bar + ✗ + reason text appears. Counter ticks to 1.
- [ ] Stage 1: click line 02 (replica check, safe) → dimmed + ✓ + reason. Counter stays at 1.
- [ ] Stage 1: click line 04, 05, 06 (all flaws) — counter ticks to 4.
- [ ] Stage 1: click "Show me what Red found →" — Stage 2 renders.
- [ ] Stage 2: subtitle says "You caught 4." (or whatever you clicked). YOU score box shows 4. RED AGENT shows 7.
- [ ] Stage 2: all 7 finding cards reveal with stagger animation. Severity tags colored correctly (red Critical, amber High, gold Medium).
- [ ] Stage 2: "Let Blue harden the runbook →" → Stage 3.
- [ ] Stage 3: diff header shows v2.3 → v2.4 + "7 risks closed". All 7 change cards reveal staggered. Minus lines red+strikethrough, plus lines blue. Cards 4 and 7 have blue "+ New step" / "+ New section" badge.
- [ ] Stage 3: "See Arbiter's verdict →" → Stage 4.
- [ ] Stage 4: gauge arc animates fill amber, number counts 0 → 85, "✓ PASSED" badge appears. Rubric bars fill (20+20+28+17=85). HUMAN-APPROVED card pops in last.
- [ ] Stage 4: "Verify the chain →" → Stage 5.
- [ ] Stage 5: passport card reveals. Chain blocks stagger in. Status badge green "chain intact".
- [ ] Stage 5: click "Break the chain" — block #003 reddens (red border + strikethrough hash + red ✗). Status badge flips red "chain BROKEN at #003 · verification failed".
- [ ] Stage 5: click "Show intact" — block #003 returns to neutral. Status badge green again.
- [ ] Stage 5: "Open the Arena →" navigates to `/arena`.
- [ ] Stage 5: "Try another document" — resets to Stage 1, foundFlaws = 0.
- [ ] Stage nav "Back" link — returns to landing.
- [ ] Browser console clean (no errors, no warnings about keys or hydration).
- [ ] `/arena` route unchanged and still works.
- [ ] No regressions on landing.

## NOTES

- Total expected file sizes: `try.css` ~1000-1500 lines (combined CSS from 5 mockups, with shared rules like nav deduplicated). `page.tsx` ~700-1000 lines including all 5 stage components.
- Mobile responsive media queries are in each mockup — port them into `try.css`.
- If anything renders differently from its mockup after porting, treat that as a bug, not a design call. Debug until parity.
- Don't add loading states, fallbacks, suspense boundaries, or error boundaries — `/try` is fully client-side, deterministic, no async work.
