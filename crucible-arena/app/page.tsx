"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type AuditEvent } from "@/lib/supabase";

const AGENT_STYLES: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  user: {
    label: "user",
    dot: "bg-neutral-400",
    badge: "bg-neutral-800 text-neutral-200 ring-neutral-600",
  },
  red: {
    label: "red",
    dot: "bg-red-500",
    badge: "bg-red-950 text-red-300 ring-red-800",
  },
  blue: {
    label: "blue",
    dot: "bg-sky-500",
    badge: "bg-sky-950 text-sky-300 ring-sky-800",
  },
  arbiter: {
    label: "arbiter",
    dot: "bg-amber-500",
    badge: "bg-amber-950 text-amber-300 ring-amber-800",
  },
  human: {
    label: "human",
    // final authority — violet lane with a soft glow on the timeline dot
    dot: "bg-violet-500 shadow-[0_0_10px_2px_rgba(139,92,246,0.6)]",
    badge: "bg-violet-950 text-violet-200 ring-violet-600",
  },
};

const FALLBACK_STYLE = {
  label: "unknown",
  dot: "bg-neutral-500",
  badge: "bg-neutral-800 text-neutral-300 ring-neutral-600",
};

const TRUNCATE_AT = 200;

function agentStyle(agent: string) {
  return AGENT_STYLES[agent?.toLowerCase()] ?? { ...FALLBACK_STYLE, label: agent };
}

function hasScore(event: string) {
  return ["verdict", "approved", "escalated", "human_signoff"].includes(
    event?.toLowerCase(),
  );
}

const EVENT_LABELS: Record<string, string> = {
  human_signoff: "human sign-off",
};

function eventLabel(event: string) {
  return EVENT_LABELS[event?.toLowerCase()] ?? event?.replace(/_/g, " ");
}

function Content({ content }: { content: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!content) return null;

  const isLong = content.length > TRUNCATE_AT;
  const shown = !isLong || expanded ? content : content.slice(0, TRUNCATE_AT).trimEnd() + "…";

  return (
    <div className="mt-3">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
        {shown}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline"
        >
          {expanded ? "show less" : "show more"}
        </button>
      )}
    </div>
  );
}

function ScorePill({
  event,
  score,
  decision,
}: {
  event: string;
  score: number | null;
  decision: string | null;
}) {
  if (score === null && !decision) return null;
  const approve = decision?.toUpperCase() === "APPROVE";
  const isHuman = event?.toLowerCase() === "human_signoff";
  // human sign-off speaks in APPROVED/REJECTED; reject reads red, not orange.
  const decisionLabel = isHuman ? (approve ? "APPROVED" : "REJECTED") : decision;
  const decisionTone = approve
    ? "bg-emerald-950 text-emerald-300 ring-emerald-800"
    : isHuman
      ? "bg-red-950 text-red-300 ring-red-800"
      : "bg-orange-950 text-orange-300 ring-orange-800";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {score !== null && (
        <span className="rounded-md bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-100 ring-1 ring-neutral-700">
          score {score}
        </span>
      )}
      {decision && (
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${decisionTone}`}
        >
          {decisionLabel}
        </span>
      )}
    </div>
  );
}

function EventCard({ ev }: { ev: AuditEvent }) {
  const style = agentStyle(ev.agent);
  return (
    <li className="relative pl-10">
      {/* timeline dot */}
      <span
        className={`absolute left-[11px] top-2 h-3 w-3 rounded-full ring-4 ring-neutral-950 ${style.dot}`}
      />
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {ev.round !== null && (
            <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400">
              round {ev.round}
            </span>
          )}
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${style.badge}`}
          >
            {style.label}
          </span>
          <span className="text-sm font-medium text-neutral-100">
            {eventLabel(ev.event)}
          </span>
        </div>
        {hasScore(ev.event) && (
          <ScorePill event={ev.event} score={ev.score} decision={ev.decision} />
        )}
        <Content content={ev.content} />
      </div>
    </li>
  );
}

type RunOutcome = {
  state:
    | "HUMAN-APPROVED"
    | "HUMAN-REJECTED"
    | "APPROVED"
    | "ESCALATED"
    | "PENDING";
  score: number | null;
};

// Most recent numeric score in the run (human_signoff carries none of its own).
function finalScore(events: AuditEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].score !== null) return events[i].score;
  }
  return null;
}

function runOutcome(events: AuditEvent[]): RunOutcome {
  // A human sign-off is the FINAL decision and overrides the auto outcome.
  // Latest (highest seq) wins; events are sorted ascending.
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event?.toLowerCase() === "human_signoff") {
      const approve = events[i].decision?.toUpperCase() === "APPROVE";
      return {
        state: approve ? "HUMAN-APPROVED" : "HUMAN-REJECTED",
        score: finalScore(events),
      };
    }
  }
  // Otherwise the last terminal arbiter event wins.
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i].event?.toLowerCase();
    if (e === "approved") return { state: "APPROVED", score: events[i].score };
    if (e === "escalated") return { state: "ESCALATED", score: events[i].score };
  }
  return { state: "PENDING", score: null };
}

export default function Home() {
  const [rows, setRows] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .order("seq", { ascending: true });
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data as AuditEvent[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates: append new INSERTs into rows. Run selection (switching to a
  // fresh submission) and outcome/score updates fall out of the latestRun memo.
  useEffect(() => {
    const channel = supabase
      .channel("audit_events_inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_events" },
        (payload) => {
          const row = payload.new as AuditEvent;
          setRows((prev) => {
            const base = prev ?? [];
            if (base.some((r) => r.id === row.id)) return base; // dedup
            return [...base, row];
          });
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const latestRun = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    // group by run_id
    const groups = new Map<string, AuditEvent[]>();
    for (const r of rows) {
      const g = groups.get(r.run_id) ?? [];
      g.push(r);
      groups.set(r.run_id, g);
    }
    // pick run with the most recent created_at among its events
    let bestId: string | null = null;
    let bestTime = -Infinity;
    for (const [id, evs] of groups) {
      const t = Math.max(...evs.map((e) => new Date(e.created_at).getTime()));
      if (t > bestTime) {
        bestTime = t;
        bestId = id;
      }
    }
    if (!bestId) return null;
    const events = (groups.get(bestId) ?? [])
      .slice()
      .sort((a, b) => a.seq - b.seq);
    return { runId: bestId, events };
  }, [rows]);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-100">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Crucible Arena
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Adversarial hardening, on the record
            </p>
          </div>
          {live && (
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-400 ring-1 ring-neutral-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              live
            </span>
          )}
        </header>

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
            Failed to load audit events: {error}
          </div>
        )}

        {!error && rows === null && (
          <p className="text-sm text-neutral-500">Loading run…</p>
        )}

        {!error && rows !== null && !latestRun && (
          <p className="text-sm text-neutral-500">No audit events found.</p>
        )}

        {latestRun && <RunView runId={latestRun.runId} events={latestRun.events} />}
      </div>
    </main>
  );
}

function RunView({ runId, events }: { runId: string; events: AuditEvent[] }) {
  const outcome = runOutcome(events);
  const outcomeStyles: Record<RunOutcome["state"], string> = {
    "HUMAN-APPROVED": "bg-emerald-950 text-emerald-300 ring-emerald-700",
    "HUMAN-REJECTED": "bg-red-950 text-red-300 ring-red-700",
    APPROVED: "bg-emerald-950 text-emerald-300 ring-emerald-800",
    ESCALATED: "bg-orange-950 text-orange-300 ring-orange-800",
    PENDING: "bg-neutral-800 text-neutral-300 ring-neutral-700",
  };

  return (
    <>
      <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              run
            </div>
            <div className="font-mono text-sm text-neutral-200">{runId}</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-3 py-1 text-sm font-semibold ring-1 ${outcomeStyles[outcome.state]}`}
            >
              {outcome.state}
            </span>
            {outcome.score !== null && (
              <span className="rounded-md bg-neutral-800 px-3 py-1 text-sm font-semibold text-neutral-100 ring-1 ring-neutral-700">
                {outcome.score}
              </span>
            )}
          </div>
        </div>
      </div>

      <ol className="relative space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-neutral-800">
        {events.map((ev) => (
          <EventCard key={ev.id} ev={ev} />
        ))}
      </ol>
    </>
  );
}
