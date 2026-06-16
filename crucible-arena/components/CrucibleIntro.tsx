"use client";

import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import styles from "./CrucibleIntro.module.css";

const SESSION_KEY = "crucible_intro_seen";

export default function CrucibleIntro() {
  const [show, setShow] = useState(false);
  const { t } = useLanguage();

  // Keep a ref to t() so the animation effect doesn't need it as a dep
  // (prevents restarting the animation on language change)
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; });

  const rootRef   = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const docRef    = useRef<HTMLDivElement>(null);
  const tintRef   = useRef<HTMLDivElement>(null);
  const scanRef   = useRef<HTMLDivElement>(null);
  const cracksRef = useRef<SVGSVGElement>(null);
  const healRef   = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const scoreRef  = useRef<HTMLDivElement>(null);
  const sealRef   = useRef<HTMLDivElement>(null);
  const brandRef  = useRef<HTMLDivElement>(null);
  const glowRef   = useRef<HTMLDivElement>(null);
  const timers  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef  = useRef<number | null>(null);

  const dismiss = useCallback((fast: boolean) => {
    // Halt all pending timeline work
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Fade the overlay out via inline style (avoids a separate exiting-state re-render)
    const dur = fast ? 400 : 500;
    if (rootRef.current) {
      rootRef.current.style.transition = `opacity ${dur}ms ease`;
      rootRef.current.style.opacity = "0";
      rootRef.current.style.pointerEvents = "none";
    }

    const tid = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* private mode */ }
      setShow(false);
    }, dur + 50);
    timers.current.push(tid);
  }, []);

  // Session / reduced-motion gate — runs synchronously before first paint
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* private mode — proceed to show */ }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      return; // skip animation entirely, show landing immediately
    }

    setShow(true);
  }, []);

  // Animation timeline — runs once when show flips to true
  useEffect(() => {
    if (!show) return;

    // Body-scroll lock
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Escape to skip
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss(true);
    };
    window.addEventListener("keydown", onKey);

    const at = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    };

    const setStatus = (text: string, color: string) => {
      const el = statusRef.current;
      if (!el) return;
      el.innerHTML = `<span class="${styles.dot}" style="background:${color}"></span>${text}`;
      el.style.color = color;
      el.style.opacity = "1";
    };

    // ── T=0: document fades in ──────────────────────────────────
    docRef.current?.setAttribute("data-in", "true");

    // ── T=450: FIND ────────────────────────────────────────────
    at(450, () => {
      setStatus(tRef.current("custody_adversarial"), "var(--o-red)");
      scanRef.current?.setAttribute("data-go", "true");
      cracksRef.current?.setAttribute("data-go", "true");
      tintRef.current?.setAttribute("data-tint", "red");
    });

    // ── T=1300: FIX ────────────────────────────────────────────
    at(1300, () => {
      setStatus(tRef.current("intro_status_fix"), "var(--o-blue)");
      healRef.current?.setAttribute("data-go", "true");
      cracksRef.current?.setAttribute("data-out", "true");
      tintRef.current?.setAttribute("data-tint", "blue");
    });

    // ── T=2150: ARBITER ────────────────────────────────────────
    at(2150, () => {
      setStatus(tRef.current("intro_status_arbiter"), "var(--o-amber)");
      tintRef.current?.setAttribute("data-tint", "amber");
      verdictRef.current?.setAttribute("data-in", "true");

      // Score count-up 0 → 85 over 700 ms
      const startT = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - startT) / 700, 1);
        if (scoreRef.current) {
          scoreRef.current.textContent = String(Math.round(p * 85));
        }
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    // ── T=3050: SEAL ───────────────────────────────────────────
    at(3050, () => {
      setStatus(tRef.current("intro_status_seal"), "var(--o-green)");
      verdictRef.current?.removeAttribute("data-in");
      tintRef.current?.removeAttribute("data-tint");
      sealRef.current?.setAttribute("data-go", "true");
    });

    // ── T=3800: BRAND ──────────────────────────────────────────
    at(3800, () => {
      docRef.current?.removeAttribute("data-in");
      docRef.current?.setAttribute("data-out", "true");
      sealRef.current?.removeAttribute("data-go");
      if (statusRef.current) statusRef.current.style.opacity = "0";
      brandRef.current?.setAttribute("data-in", "true");
      glowRef.current?.setAttribute("data-in", "true");
    });

    // ── Auto-dismiss: ~1 s hold after brand + 500 ms fade ─────
    at(4800, () => dismiss(false));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [show, dismiss]);

  if (!show) return null;

  return (
    <div ref={rootRef} className={styles.root}>
      <span className={styles.sr}>
        Crucible intro: a document is adversarially reviewed, hardened, adjudicated, and sealed.
      </span>

      <div className={styles.scene}>
        {/* Status line */}
        <div ref={statusRef} className={styles.status} aria-live="polite" />

        {/* Document card */}
        <div ref={docRef} className={styles.doc}>
          <div className={styles.dh}>Incident runbook</div>
          <div className={`${styles.ln} ${styles.lnL}`} />
          <div className={`${styles.ln} ${styles.lnM}`} />
          <div className={`${styles.ln} ${styles.lnS}`} />
          <div className={`${styles.ln} ${styles.lnM}`} />
          <div className={`${styles.ln} ${styles.lnL}`} />
          <div className={`${styles.ln} ${styles.lnS}`} />
          <div ref={tintRef} className={styles.tint} />
          <div ref={scanRef} className={styles.scan} />
          <svg
            ref={cracksRef}
            className={styles.cracks}
            viewBox="0 0 174 214"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M92 22 L78 64 L98 96 L82 138 L96 176 L86 206" />
            <path d="M98 96 L134 110 L150 150" />
            <path d="M78 64 L44 78 L30 116" />
          </svg>
          <div ref={healRef} className={styles.heal} />
        </div>

        {/* Verdict ring */}
        <div ref={verdictRef} className={styles.verdict}>
          <svg className={styles.ring} viewBox="0 0 98 98" aria-hidden="true">
            <circle className={styles.track} cx="49" cy="49" r="34" />
            <circle className={styles.arc}   cx="49" cy="49" r="34" />
          </svg>
          <div ref={scoreRef} className={styles.num}>0</div>
          <div className={styles.of}>/ 100</div>
        </div>

        {/* Seal strip */}
        <div ref={sealRef} className={styles.seal} aria-hidden="true">
          <div className={styles.lk} />
          <div className={styles.lk} />
          <div className={styles.lk} />
          <div className={styles.chk}>&#10003;</div>
        </div>

        {/* Ambient glow */}
        <div ref={glowRef} className={styles.glow} aria-hidden="true" />

        {/* Brand lockup */}
        <div ref={brandRef} className={styles.brand}>
          <div className={styles.lockup}>
            <svg className={styles.hex} viewBox="0 0 34 38" fill="none" aria-hidden="true">
              <path d="M17 2 L31 10 L31 28 L17 36 L3 28 L3 10 Z" stroke="#ffffff" strokeWidth="1.6" />
              <path d="M17 12 L23 15.5 L23 22.5 L17 26 L11 22.5 L11 15.5 Z" stroke="#ffffff" strokeWidth="1.4" opacity=".9" />
            </svg>
            <div className={styles.wm}>CRUCIBLE</div>
          </div>
          {/* tagline renders verbatim — intentionally not keyed in i18n (matches landing convention) */}
          <div className={styles.tag}>Break it before reality does.</div>
        </div>

      </div>
    </div>
  );
}
