"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase, type AuditEvent } from "@/lib/supabase";
import { useLanguage, plural, type Lang, type TFn } from "@/lib/i18n";
import LangDropdown from "@/components/LangDropdown";
import ScoreRing from "@/components/ScoreRing";

/* ─────────────────────────  presentation helpers  ─────────────────────────
   Pure derivations over EXISTING fields. No data is invented; where the design
   asks for something the schema lacks, the helper returns a fallback. Static
   chrome strings are translated via t(); agent content is rendered verbatim. */

const KNOWN_AGENTS = new Set(["red", "blue", "arbiter", "human", "user"]);
const PASS_THRESHOLD = 80;

function agentClass(agent: string) {
  const a = agent?.toLowerCase();
  return KNOWN_AGENTS.has(a) ? a : "user";
}

function agentName(agent: string) {
  // Agent names are proper nouns — NOT translated (Red, Blue, Arbiter, …).
  if (!agent) return "—";
  return agent.charAt(0).toUpperCase() + agent.slice(1).toLowerCase();
}

function hhmmss(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function actionLabel(ev: AuditEvent, t: TFn, lang: Lang): string {
  const e = ev.event?.toLowerCase();
  switch (e) {
    case "submission":
      return t("action_submission");
    case "findings": {
      const n = findingsCount(ev.content);
      if (!n) return t("action_attack");
      return t("action_attack_n", {
        n,
        vulnWord: plural(lang, n, "vulnerability", "vulnerabilities", { id: "kerentanan", es: ["vulnerabilidad", "vulnerabilidades"], fr: ["vulnérabilité", "vulnérabilités"], de: ["Schwachstelle", "Schwachstellen"], pt: ["vulnerabilidade", "vulnerabilidades"], it: "vulnerabilità" }),
      });
    }
    case "revision":
      return t("action_revision");
    case "verdict":
      return t("action_verdict");
    case "escalated":
      return t("action_escalated");
    case "approved":
      return t("action_approved");
    case "human_signoff":
      return t("action_signoff");
    default:
      return (ev.event ?? "").replace(/_/g, " ");
  }
}

function findingsCount(content: string | null): number | null {
  if (!content) return null;
  const n = (content.match(/^\s*\d+\.\s/gm) ?? []).length;
  return n > 0 ? n : null;
}

const SEV_RE = /(?:severity[:*\s]+|\*\*\s*)(critical|high|medium)\b/gi;

function severities(content: string | null): ("crit" | "high" | "med")[] {
  if (!content) return [];
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  SEV_RE.lastIndex = 0;
  while ((m = SEV_RE.exec(content))) found.add(m[1].toLowerCase());
  const order: Array<["critical" | "high" | "medium", "crit" | "high" | "med"]> = [
    ["critical", "crit"],
    ["high", "high"],
    ["medium", "med"],
  ];
  return order.filter(([k]) => found.has(k)).map(([, cls]) => cls);
}

function sevTally(reds: AuditEvent[]): { crit: number; high: number; med: number } {
  const t = { crit: 0, high: 0, med: 0 };
  for (const e of reds) {
    if (!e.content) continue;
    let m: RegExpExecArray | null;
    SEV_RE.lastIndex = 0;
    while ((m = SEV_RE.exec(e.content))) {
      const s = m[1].toLowerCase();
      if (s === "critical") t.crit++;
      else if (s === "high") t.high++;
      else t.med++;
    }
  }
  return t;
}

const SEV_KEY: Record<"crit" | "high" | "med", string> = {
  crit: "sev_crit",
  high: "sev_high",
  med: "sev_med",
};

// canonical decision text (English) + css class; the text is translated at render
function decisionTag(ev: AuditEvent): { text: string; cls: string } | null {
  const e = ev.event?.toLowerCase();
  if (e === "verdict" && ev.decision)
    return { text: ev.decision.toUpperCase(), cls: decClass(ev.decision) };
  if (e === "escalated") return { text: "ESCALATE", cls: "esc" };
  if (e === "approved") return { text: "APPROVED", cls: "appr" };
  if (e === "human_signoff") {
    const approve = ev.decision?.toUpperCase() === "APPROVE";
    return { text: approve ? "APPROVED" : "REJECTED", cls: approve ? "appr" : "rej" };
  }
  return null;
}

function decClass(decision: string) {
  const d = decision.toUpperCase();
  if (d.includes("ESCAL")) return "esc";
  if (d.includes("APPROV")) return "appr";
  if (d.includes("REJECT")) return "rej";
  return "again";
}

function decisionLabel(text: string, t: TFn): string {
  const d = text.toUpperCase();
  if (d.includes("ANOTHER")) return t("dec_another_round");
  if (d.includes("ESCAL")) return t("dec_escalate");
  if (d.includes("APPROV")) return t("dec_approved");
  if (d.includes("REJECT")) return t("dec_rejected");
  return text;
}

function showsScore(ev: AuditEvent) {
  const e = ev.event?.toLowerCase();
  return (
    (e === "verdict" || e === "escalated" || e === "approved") && ev.score !== null
  );
}

function parseSignoff(content: string | null): { note: string | null; signer: string | null } {
  if (!content) return { note: null, signer: null };
  let c = content.trim().replace(/^SIGNOFF:\s*(APPROVE|REJECT)\b[\s:,-]*/i, "");
  let signer: string | null = null;
  const sm = /\s[-–—]\s*([^-\n]{1,60})\s*$/.exec(c);
  if (sm) {
    signer = sm[1].trim();
    c = c.slice(0, sm.index).trim();
  }
  return { note: c || null, signer };
}

function artifactTitle(events: AuditEvent[]): string | null {
  const sub = events.find((e) => e.event?.toLowerCase() === "submission");
  if (!sub?.content) return null;
  const lines = sub.content
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
  const skip = /^(please|review|harden|identify|here|below|the following|kindly)/i;
  const title = lines.find((l) => !skip.test(l)) ?? lines[0];
  return title ? title.slice(0, 64) : null;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function roundCount(events: AuditEvent[]): number {
  return events.reduce((max, e) => (e.round && e.round > max ? e.round : max), 0);
}

function agentCount(events: AuditEvent[]): number {
  const set = new Set(
    events.map((e) => e.agent?.toLowerCase()).filter((a) => a && a !== "user"),
  );
  return set.size;
}

function scoreByRound(events: AuditEvent[]): { round: number; score: number }[] {
  const m = new Map<number, number>();
  for (const e of events) {
    if (e.score !== null && e.round !== null) m.set(e.round, e.score);
  }
  return [...m.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, score]) => ({ round, score }));
}

function truncHash(h: string | null, head = 8, tail = 3): string {
  if (!h) return "—";
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

/* ───────────────────────────  outcome (unchanged)  ─────────────────────────── */

type RunOutcome = {
  state:
    | "HUMAN-APPROVED"
    | "HUMAN-REJECTED"
    | "APPROVED"
    | "ESCALATED"
    | "PENDING";
  score: number | null;
};

function finalScore(events: AuditEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].score !== null) return events[i].score;
  }
  return null;
}

function runOutcome(events: AuditEvent[]): RunOutcome {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event?.toLowerCase() === "human_signoff") {
      const approve = events[i].decision?.toUpperCase() === "APPROVE";
      return {
        state: approve ? "HUMAN-APPROVED" : "HUMAN-REJECTED",
        score: finalScore(events),
      };
    }
  }
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i].event?.toLowerCase();
    if (e === "approved") return { state: "APPROVED", score: events[i].score };
    if (e === "escalated") return { state: "ESCALATED", score: events[i].score };
  }
  return { state: "PENDING", score: null };
}

const VTAG_COLOR: Record<RunOutcome["state"], string> = {
  "HUMAN-APPROVED": "violet",
  "HUMAN-REJECTED": "red",
  APPROVED: "blue",
  ESCALATED: "amber",
  PENDING: "",
};

const OUTCOME_KEY: Record<RunOutcome["state"], string> = {
  "HUMAN-APPROVED": "outcome_human_approved",
  "HUMAN-REJECTED": "outcome_human_rejected",
  APPROVED: "outcome_approved",
  ESCALATED: "outcome_escalated",
  PENDING: "outcome_pending",
};

/* ────────────────────────────  verify (PART B)  ──────────────────────────── */

type VerifyResult =
  | { status: "intact"; entries: number; headHash: string | null }
  | { status: "broken"; brokenSeq: number; entries: number; headHash: string | null }
  | { status: "unavailable"; entries: number; headHash: string | null; error?: string };

/* ─────────────────────────────  small pieces  ───────────────────────────── */

const Check = () => <span aria-hidden>✓</span>;

// Lucide-style inline SVGs — same paths as landing-content.tsx so both pages
// share visual language without a shared module import.
const IconDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2.5H7A2 2 0 0 0 5 4.5v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z" />
    <path d="M14 2.5v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </svg>
);
const IconCrosshair = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="7.5" />
    <line x1="12" y1="1.5" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22.5" />
    <line x1="1.5" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22.5" y2="12" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5 4.5 5.5v6c0 4.5 3.2 7.7 7.5 9.5 4.3-1.8 7.5-5 7.5-9.5v-6L12 2.5Z" />
    <path d="m8.8 12.2 2.2 2.2 4.4-4.6" />
  </svg>
);
const IconScales = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
);
const IconPersonCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="11" width="15" height="9.5" rx="2" />
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
  </svg>
);

function HexMark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
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
      <circle cx="16" cy="16" r="1.7" fill="#E6E8EC" />
    </svg>
  );
}


const MD_COMPONENTS = {
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props} target="_blank" rel="noreferrer" />
  ),
};

// Full markdown (agent content, verbatim), collapsed via CSS clamp — never
// truncates the raw string mid-syntax. Only the show more/less control is chrome.
function ClampMarkdown({ content }: { content: string }) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > el.clientHeight + 2);
  }, [content]);

  return (
    <div className="mdblock">
      <div ref={ref} className={`md ${expanded ? "" : "md-clamp"}`}>
        <Markdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {content}
        </Markdown>
      </div>
      {(overflowing || expanded) && (
        <button className="more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t("show_less") : t("show_more")}
        </button>
      )}
    </div>
  );
}

function EventRow({ ev }: { ev: AuditEvent }) {
  const { t, lang } = useLanguage();
  const cls = agentClass(ev.agent);
  const dec = decisionTag(ev);
  const isHuman = ev.event?.toLowerCase() === "human_signoff";
  const isRed = ev.event?.toLowerCase() === "findings" && cls === "red";
  const sevs = isRed ? severities(ev.content) : [];
  const signoff = isHuman ? parseSignoff(ev.content) : null;

  return (
    <div className={`event ${cls}`}>
      <span className="etime mono">{hhmmss(ev.created_at)}</span>
      <span className="etick" />
      <div className="ebody">
        <div className="eline">
          <span className="ename">{agentName(ev.agent)}</span>
          <span className="eact">{actionLabel(ev, t, lang)}</span>
          {showsScore(ev) && (
            <span className="score">
              {ev.score}
              <s>/100</s>
            </span>
          )}
          {dec && <span className={`dec ${dec.cls}`}>{decisionLabel(dec.text, t)}</span>}
          {/* signer name is verbatim (proper noun) */}
          {signoff?.signer && <span className="eact mono">{signoff.signer}</span>}
        </div>

        {sevs.length > 0 && (
          <div className="sevrow">
            {sevs.map((s) => (
              <span key={s} className={`sev ${s}`}>
                {t(SEV_KEY[s])}
              </span>
            ))}
          </div>
        )}

        {isHuman ? (
          // human sign-off NOTE is the real audit record — rendered verbatim
          signoff?.note && <p>{signoff.note}</p>
        ) : (
          ev.content && <ClampMarkdown content={ev.content} />
        )}
      </div>
    </div>
  );
}

function VerifyButton({
  verify,
  verifying,
  onVerify,
}: {
  verify: VerifyResult | null;
  verifying: boolean;
  onVerify: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [showResult, setShowResult] = useState(false);

  async function click() {
    setShowResult(true);
    await onVerify();
    window.setTimeout(() => setShowResult(false), 3200);
  }

  let label = t("btn_verify");
  if (verifying) label = t("btn_verifying");
  else if (showResult && verify) {
    label =
      verify.status === "intact"
        ? t("btn_intact", { n: verify.entries })
        : verify.status === "broken"
          ? t("btn_broken", { seq: verify.brokenSeq })
          : t("btn_unverified");
  }

  const broken = showResult && verify?.status === "broken";

  return (
    <button
      className={`verify ${broken ? "broken" : ""}`}
      onClick={click}
      disabled={verifying}
    >
      {label}
    </button>
  );
}

/* ─────────────────────────────────  page  ───────────────────────────────── */

export default function Home() {
  const { t } = useLanguage();
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

  // Read-only chain verification (the one new API route). Runs once on mount and
  // again whenever the user clicks "Verify chain". Independent of the Supabase
  // query / realtime subscription / run-selection logic above.
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const runVerify = useCallback(async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/verify", { cache: "no-store" });
      setVerify((await res.json()) as VerifyResult);
    } catch (e) {
      setVerify({
        status: "unavailable",
        entries: 0,
        headHash: null,
        error: String(e),
      });
    } finally {
      setVerifying(false);
    }
  }, []);
  useEffect(() => {
    runVerify();
  }, [runVerify]);

  const latestRun = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const groups = new Map<string, AuditEvent[]>();
    for (const r of rows) {
      const g = groups.get(r.run_id) ?? [];
      g.push(r);
      groups.set(r.run_id, g);
    }
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

  const chainEntries = rows?.length ?? 0;
  const chainHead = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    return rows.reduce((a, b) => (b.seq > a.seq ? b : a)).hash;
  }, [rows]);

  const title = latestRun ? artifactTitle(latestRun.events) : null;
  const slug = title ? slugify(title) : latestRun ? latestRun.runId : null;
  const broken = verify?.status === "broken";

  return (
    <>
      <div className="arena-aurora" aria-hidden="true">
        <span className="ab1" />
        <span className="ab2" />
        <span className="ab3" />
      </div>
      <div className="wrap">
      <div className="topbar">
        <div className="brand">
          <HexMark />
          <span className="name">CRUCIBLE</span>
          <span className="crumb">
            / runs / <b>{slug ?? "—"}</b>
          </span>
        </div>
        <div className="status">
          <LangDropdown />
          {live && (
            <span className="live">
              <span className="dot" /> {t("live")}
            </span>
          )}
          <span className={`pill ${broken ? "broken" : ""}`}>
            {verifying || !verify ? (
              t("pill_checking")
            ) : verify.status === "intact" ? (
              <>
                <Check /> {t("pill_intact")}
              </>
            ) : verify.status === "broken" ? (
              <>✗ {t("pill_broken", { seq: verify.brokenSeq })}</>
            ) : (
              t("pill_unverified")
            )}
          </span>
        </div>
      </div>

      {error && <div className="msg err">{t("msg_error", { err: error })}</div>}
      {!error && rows === null && <div className="msg">{t("msg_loading")}</div>}
      {!error && rows !== null && !latestRun && (
        <div className="msg">{t("msg_no_events")}</div>
      )}

      {latestRun && (
        <RunView
          runId={latestRun.runId}
          events={latestRun.events}
          title={title}
          chainEntries={chainEntries}
          chainHead={chainHead}
          verify={verify}
          verifying={verifying}
          runVerify={runVerify}
        />
      )}

      <footer>
        <span>{t("footer_left")}</span>
        <span>Band of Agents Hackathon · Track 3</span>
      </footer>
    </div>
    </>
  );
}

function RunView({
  runId,
  events,
  title,
  chainEntries,
  chainHead,
  verify,
  verifying,
  runVerify,
}: {
  runId: string;
  events: AuditEvent[];
  title: string | null;
  chainEntries: number;
  chainHead: string | null;
  verify: VerifyResult | null;
  verifying: boolean;
  runVerify: () => Promise<void>;
}) {
  const { t, lang } = useLanguage();
  const outcome = runOutcome(events);
  const rounds = roundCount(events);
  const agents = agentCount(events);
  const score = finalScore(events);
  const byRound = scoreByRound(events);

  let prevRound: number | null | undefined = undefined;
  const rowsOut: React.ReactNode[] = [];
  for (const ev of events) {
    if (ev.round !== prevRound) {
      prevRound = ev.round;
      rowsOut.push(
        <div className="round" key={`r-${ev.id}`}>
          {t("round")} {ev.round ?? "—"}
        </div>,
      );
    }
    rowsOut.push(<EventRow ev={ev} key={ev.id} />);
  }

  return (
    <>
      <section className="runbar">
        <div className="field">
          <span className="k">{t("field_artifact")}</span>
          <span className="v lg">{title ?? runId}</span>
        </div>
        <div className="field">
          <span className="k">{t("field_run")}</span>
          <span className="v">{runId}</span>
        </div>
        <div className="field">
          <span className="k">{t("field_rounds")}</span>
          <span className="v">{rounds || "—"}</span>
        </div>
        <div className="field">
          <span className="k">{t("field_agents")}</span>
          <span className="v">{agents} · via Band</span>
        </div>
        <div className="field">
          <span className="k">{t("field_arbiter_score")}</span>
          <ScoreRing score={score} size={54} />
        </div>
        <span className={`vtag ${VTAG_COLOR[outcome.state]}`}>
          {(outcome.state === "HUMAN-APPROVED" || outcome.state === "APPROVED") && (
            <Check />
          )}
          {t(OUTCOME_KEY[outcome.state])}
        </span>
      </section>

      <div className="grid">
        <main className="logwrap" aria-label="Hardening event log">
          <div className="loghead">
            <span className="lt">{t("event_log")}</span>
            <span className="lm">
              {t("events_rounds", {
                n: events.length,
                m: rounds,
                roundsWord: plural(lang, rounds, "round", "rounds", { id: "ronde", es: ["ronda", "rondas"], fr: ["manche", "manches"], de: ["Runde", "Runden"], pt: ["rodada", "rodadas"], it: "round" }),
              })}
            </span>
          </div>
          {rowsOut.map((node, i) => (
            <Fragment key={i}>{node}</Fragment>
          ))}
        </main>

        <Passport
          events={events}
          title={title}
          outcome={outcome}
          rounds={rounds}
          score={score}
          byRound={byRound}
          chainEntries={chainEntries}
          chainHead={chainHead}
          verify={verify}
          verifying={verifying}
          runVerify={runVerify}
        />
      </div>
    </>
  );
}

/* ───────────────────────────  Hardening Passport (PART C)  ─────────────────────────── */

function CustodyStep({
  color,
  icon,
  label,
  detail,
  time,
  done = true,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  detail: React.ReactNode;
  time?: string | null;
  done?: boolean;
}) {
  return (
    <div className={`cstep ${done ? "" : "pending"}`}>
      <span className={`cicon ${color}`}>{icon}</span>
      <div className="cbody">
        <div className="cline">
          <span className="clabel">{label}</span>
          {time && <span className="ctime mono">{time}</span>}
        </div>
        <div className="cdetail">{detail}</div>
      </div>
    </div>
  );
}

function Passport({
  events,
  title,
  outcome,
  rounds,
  score,
  byRound,
  chainEntries,
  chainHead,
  verify,
  verifying,
  runVerify,
}: {
  events: AuditEvent[];
  title: string | null;
  outcome: RunOutcome;
  rounds: number;
  score: number | null;
  byRound: { round: number; score: number }[];
  chainEntries: number;
  chainHead: string | null;
  verify: VerifyResult | null;
  verifying: boolean;
  runVerify: () => Promise<void>;
}) {
  const { t, lang } = useLanguage();

  const submission = events.find((e) => e.event?.toLowerCase() === "submission");
  const reds = events.filter(
    (e) => e.event?.toLowerCase() === "findings" && e.agent?.toLowerCase() === "red",
  );
  const totalVulns = reds.reduce((s, e) => s + (findingsCount(e.content) ?? 0), 0);
  const vulnN = totalVulns || reds.length;
  const redRounds = new Set(reds.map((e) => e.round)).size;
  const tally = sevTally(reds);
  const hasTally = tally.crit + tally.high + tally.med > 0;

  const revisions = events.filter((e) => e.event?.toLowerCase() === "revision");
  const lastRevision = revisions[revisions.length - 1];

  const terminal = [...events]
    .reverse()
    .find((e) => ["approved", "escalated"].includes(e.event?.toLowerCase()));
  const lastVerdict = [...events]
    .reverse()
    .find((e) => e.event?.toLowerCase() === "verdict");
  const adjEvent = terminal ?? lastVerdict;
  const adjDecisionRaw =
    terminal?.event ?? lastVerdict?.decision?.toLowerCase() ?? "";
  const adjDecision = adjDecisionLabel(adjDecisionRaw, t);

  const signoffEv = events.find((e) => e.event?.toLowerCase() === "human_signoff");
  const signoff = signoffEv ? parseSignoff(signoffEv.content) : null;
  const signoffApprove = signoffEv?.decision?.toUpperCase() === "APPROVE";

  const headHash = verify?.headHash ?? chainHead;
  const entries =
    verify && verify.status !== "unavailable" ? verify.entries : chainEntries;

  const sealedStatus =
    verifying || !verify
      ? t("sealed_checking")
      : verify.status === "intact"
        ? t("pill_intact")
        : verify.status === "broken"
          ? t("sealed_broken", { seq: verify.brokenSeq })
          : t("sealed_unverified");
  const sealedBroken = verify?.status === "broken";

  const roundsWord = plural(lang, rounds, "round", "rounds", { id: "ronde", es: ["ronda", "rondas"], fr: ["manche", "manches"], de: ["Runde", "Runden"], pt: ["rodada", "rodadas"], it: "round" });

  return (
    <aside className="ledger passport" aria-label="Hardening Passport">
      <div className="pp-head">
        <h3>{t("passport_title")}</h3>
        <div className="pp-meta">
          <span className="pp-artifact">{title ?? "—"}</span>
          <span className={`pp-badge ${VTAG_COLOR[outcome.state]}`}>
            {t(OUTCOME_KEY[outcome.state])}
          </span>
        </div>
        <div className="pp-id mono">
          {t("passport_word")} {truncHash(headHash, 8, 3)}
        </div>
      </div>

      <div className="barlbl">{t("chain_of_custody")}</div>
      <div className="custody">
        <CustodyStep
          color="user"
          icon={<IconDoc />}
          label={t("custody_origin")}
          time={submission ? hhmmss(submission.created_at) : null}
          done={!!submission}
          detail={submission ? t("detail_origin") : t("detail_no_submission")}
        />
        <CustodyStep
          color="red"
          icon={<IconCrosshair />}
          label={t("custody_adversarial")}
          time={reds.length ? hhmmss(reds[reds.length - 1].created_at) : null}
          done={reds.length > 0}
          detail={
            reds.length ? (
              <>
                {t("detail_adversarial", {
                  n: vulnN,
                  m: redRounds,
                  vulnWord: plural(lang, vulnN, "vulnerability", "vulnerabilities", { id: "kerentanan", es: ["vulnerabilidad", "vulnerabilidades"], fr: ["vulnérabilité", "vulnérabilités"], de: ["Schwachstelle", "Schwachstellen"], pt: ["vulnerabilidade", "vulnerabilidades"], it: "vulnerabilità" }),
                  roundsWord: plural(lang, redRounds, "round", "rounds", { id: "ronde", es: ["ronda", "rondas"], fr: ["manche", "manches"], de: ["Runde", "Runden"], pt: ["rodada", "rodadas"], it: "round" }),
                })}
                {hasTally && (
                  <span className="tally">
                    {tally.crit > 0 && (
                      <span className="sev crit">
                        {tally.crit} {t("sev_crit")}
                      </span>
                    )}
                    {tally.high > 0 && (
                      <span className="sev high">
                        {tally.high} {t("sev_high")}
                      </span>
                    )}
                    {tally.med > 0 && (
                      <span className="sev med">
                        {tally.med} {t("sev_med")}
                      </span>
                    )}
                  </span>
                )}
              </>
            ) : (
              t("detail_no_findings")
            )
          }
        />
        <CustodyStep
          color="blue"
          icon={<IconShield />}
          label={t("custody_hardened")}
          time={lastRevision ? hhmmss(lastRevision.created_at) : null}
          done={!!lastRevision}
          detail={
            lastRevision
              ? t("detail_hardened", {
                  n: revisions.length,
                  passWord: plural(lang, revisions.length, "pass", "passes", { id: "putaran", es: ["iteración", "iteraciones"], fr: ["itération", "itérations"], de: ["Durchlauf", "Durchläufe"], pt: ["iteração", "iterações"], it: ["iterazione", "iterazioni"] }),
                })
              : t("detail_no_revision")
          }
        />
        <CustodyStep
          color="arbiter"
          icon={<IconScales />}
          label={t("custody_adjudication")}
          time={adjEvent ? hhmmss(adjEvent.created_at) : null}
          done={!!adjEvent}
          detail={
            adjEvent ? (
              <>
                {t("adj_final_score")} {score ?? "—"}/100 ·{" "}
                <span className="em">{adjDecision}</span> ·{" "}
                {t("rounds_count", { m: rounds, roundsWord })}
              </>
            ) : (
              t("detail_not_adjudicated")
            )
          }
        />
        <CustodyStep
          color="human"
          icon={<IconPersonCheck />}
          label={t("custody_signoff")}
          time={signoffEv ? hhmmss(signoffEv.created_at) : null}
          done={!!signoffEv}
          detail={
            signoffEv ? (
              <>
                <span className={`dec ${signoffApprove ? "appr" : "rej"}`}>
                  {signoffApprove ? t("dec_approved") : t("dec_rejected")}
                </span>{" "}
                {signoff?.signer && <span className="em">{signoff.signer}</span>}
                {/* sign-off NOTE rendered verbatim */}
                {signoff?.note && <div className="cnote">{signoff.note}</div>}
              </>
            ) : (
              t("detail_awaiting_signoff")
            )
          }
        />
        <CustodyStep
          color={sealedBroken ? "" : "green"}
          icon={<IconLock />}
          label={t("custody_sealed")}
          done={!!verify && verify.status !== "unavailable"}
          detail={
            <>
              <div className="sealed-row mono">
                {t("entries_count", { n: entries })} · {truncHash(headHash, 10, 3)}
              </div>
              <div className={`sealed-status ${sealedBroken ? "broken" : ""}`}>
                {!sealedBroken && verify?.status === "intact" && <Check />} {sealedStatus}
              </div>
            </>
          }
        />
      </div>

      <VerifyButton verify={verify} verifying={verifying} onVerify={runVerify} />

      {byRound.length > 0 && (
        <div className="barwrap">
          <div className="barlbl">{t("score_by_round")}</div>
          {byRound.map((b, i) => {
            const pass = b.score >= PASS_THRESHOLD;
            const isLast = i === byRound.length - 1;
            const verdict = pass
              ? t("round_verdict_cleared")
              : isLast
              ? t("round_verdict_limit")
              : t("round_verdict_below");
            return (
              <div className="bar" key={b.round}>
                <div className="bar-row">
                  <span className={`rl${pass ? " pass" : ""}`}>
                    {t("round")} {b.round}
                  </span>
                  <span className="track">
                    <span
                      className={`fill${pass ? " pass" : ""}`}
                      style={{ width: `${b.score}%` }}
                    />
                    <span className="tmark" style={{ left: `${PASS_THRESHOLD}%` }} />
                  </span>
                  <span className={`bn${pass ? " pass" : ""}`}>{b.score}</span>
                </div>
                <div className="bar-verdict">{verdict}</div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function adjDecisionLabel(raw: string, t: TFn): string {
  const d = raw.toLowerCase();
  if (d.includes("escal")) return t("adj_escalated");
  if (d.includes("approv")) return t("adj_approved");
  if (d.includes("another")) return t("adj_another_round");
  return raw || "—";
}
