"use client";
import { useEffect, useRef } from "react";

interface ScoreRingProps {
  score: number | null;
  size?: number;
}

// Amber ring matching the intro's verdict ring (r=34, circumference≈213.6).
// Mounts with a subtle fill + count-up animation.
export default function ScoreRing({ score, size = 44 }: ScoreRingProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const s = score ?? 0;
    const circumference = 213.6;
    const target = circumference * (1 - s / 100);

    // Defer by one frame so the browser paints the initial empty state first,
    // allowing the CSS transition to actually animate.
    const raf0 = requestAnimationFrame(() => {
      if (arcRef.current) {
        arcRef.current.style.strokeDashoffset = String(target);
      }
    });

    // Count-up the number
    const el = numRef.current;
    if (!el) return () => cancelAnimationFrame(raf0);
    el.textContent = "0";
    const start = performance.now();
    const dur = 900;
    let rafN: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(s * eased));
      if (p < 1) rafN = requestAnimationFrame(tick);
      else el.textContent = String(s);
    };
    rafN = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf0);
      cancelAnimationFrame(rafN);
    };
  }, [score]);

  if (score === null) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text2)", fontSize: "13px" }}>
        —
      </span>
    );
  }

  const fontSize = Math.round(size * 0.31);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {/* Ring SVG — rotated -90° so arc starts at 12 o'clock */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 98 98"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
      >
        {/* faint amber track */}
        <circle
          cx="49" cy="49" r="34"
          fill="none"
          stroke="rgba(227, 162, 62, 0.18)"
          strokeWidth="4"
        />
        {/* amber fill arc */}
        <circle
          ref={arcRef}
          cx="49" cy="49" r="34"
          fill="none"
          stroke="var(--amber)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="213.6"
          strokeDashoffset="213.6"
          style={{ transition: "stroke-dashoffset 0.85s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </svg>
      {/* centered number */}
      <span
        ref={numRef}
        style={{
          position: "relative",
          fontFamily: "var(--font-jakarta, var(--font-space, sans-serif))",
          fontWeight: 600,
          fontSize: fontSize + "px",
          color: "var(--amber)",
          lineHeight: 1,
        }}
      >
        {score}
      </span>
    </span>
  );
}
