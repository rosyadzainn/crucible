"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Ring geometry: viewBox 0 0 50 50, r=22, circumference = 2π×22 ≈ 138.23
const CIRC = 138.23;
const DURATION = 2000; // ms until router.push fires

export default function ArenaTransition({ caption }: { caption: string }) {
  const router = useRouter();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tid = setTimeout(() => router.push("/arena"), DURATION);
    return () => {
      clearTimeout(tid);
      document.body.style.overflow = prev;
    };
  }, [router]);

  return (
    <div className="at-overlay" role="status" aria-label={caption}>
      <div className="at-content">
        <div className="at-ring-wrap">
          {/* Amber ring */}
          <svg viewBox="0 0 50 50" className="at-ring-svg" aria-hidden="true">
            {/* Faint track */}
            <circle cx="25" cy="25" r="22" fill="none"
              stroke="rgba(227,162,62,0.18)" strokeWidth="2" />
            {/* Animated sweep arc */}
            <circle cx="25" cy="25" r="22" fill="none"
              stroke="var(--amber)" strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              className="at-arc"
              transform="rotate(-90 25 25)" />
          </svg>
          {/* Hex mark, centered over the ring */}
          <svg viewBox="0 0 32 32" fill="none" className="at-hex" aria-hidden="true">
            <path
              d="M16 3.5 27 9.75v12.5L16 28.5 5 22.25V9.75L16 3.5Z"
              stroke="#E6E8EC"
              strokeWidth="1.6"
            />
            <path
              d="M16 10.5 21.5 13.6v6.8L16 23.5l-5.5-3.1v-6.8L16 10.5Z"
              fill="rgba(230,232,236,.10)"
              stroke="#E6E8EC"
              strokeWidth="1.2"
            />
          </svg>
        </div>
        <p className="at-caption">{caption}</p>
      </div>
    </div>
  );
}
