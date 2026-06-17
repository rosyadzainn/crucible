"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import ArenaTransition from "@/components/ArenaTransition";
import { supabase } from "@/lib/supabase";
import "./try.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChainData = { entries: number; headHash: string; nodeHashes: string[] };
type AuditEvent = {
  id: string; run_id: string; seq: number; round: number | null;
  event: string; agent: string; score: number | null; decision: string | null;
  content: string | null; hash: string | null; created_at: string;
};
type SubmissionStep = { num: string; text: string; flaggable: boolean };
type Finding = { num: number; title: string; scenario: string; sev: string; round: number };
type FindingStatus = { name: string; status: "resolved" | "partial" | "unresolved" };
type VerdictData = { score: number; text: string; findings: FindingStatus[]; openRisks: string };
type RevisionChange = {
  isNew: boolean; title: string; oldLines: string[]; newLines: string[]; justification: string;
};
type RunData = {
  artifact: string;
  submissionSteps: SubmissionStep[];
  allFindings: Finding[];
  verdicts: (VerdictData | null)[];
  changes: RevisionChange[];
  risksClosedCount: number;
  signoffTs: string;
};

const RUN_ID = "run-20260616-074254-d22e2f";
const SIGNER_NAME = "Rosyad Zain";
const SIGNER_ROLE = "on-call engineer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortHash(h: string | null | undefined, head = 4, tail = 4): string {
  if (!h) return "—";
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

const FLAWED_TOKENS = ["--force", "--grace-period", "password='", "Pr0dDB", "curl -k "];
const NEW_STEP_KW = ["credential", "graceful", "rolled back successfully", "CA certificate", "validates"];

function isStepFlaggable(stepText: string, redR1: string): boolean {
  for (const [, q] of stepText.matchAll(/'([^']{4,})'/g)) if (redR1.includes(q)) return true;
  for (const [, f] of stepText.matchAll(/--([\w-]{5,})/g)) if (redR1.includes("--" + f)) return true;
  for (const [, p] of stepText.matchAll(/kubectl\s+(\w+\s+\w+(?:\s+\w+)?)/g))
    if (p.length > 10 && redR1.includes("kubectl " + p)) return true;
  return false;
}

function parseSubmissionSteps(content: string, redR1: string): { artifact: string; steps: SubmissionStep[] } {
  const artifact = content.split("\n")[0]?.trim() ?? "Incident Runbook";
  const steps: SubmissionStep[] = [];
  for (const line of content.split("\n")) {
    const m = /^(\d{2})\s{1,4}(.+)$/.exec(line);
    if (m) steps.push({ num: m[1], text: m[2].trim(), flaggable: isStepFlaggable(m[2].trim(), redR1) });
  }
  return { artifact, steps };
}

function parseFindings(content: string, round: number): Finding[] {
  if (!content) return [];
  const findings: Finding[] = [];
  const re = /^\s*\d+\./gm;
  const pos: number[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(content))) pos.push(m.index);
  for (let i = 0; i < pos.length; i++) {
    const chunk = content.slice(pos[i], i + 1 < pos.length ? pos[i + 1] : content.length);
    const num = parseInt(chunk.match(/^\s*(\d+)\./)?.[1] ?? "0");
    let title = chunk.match(/^\s*\d+\.\s+\*\*([^*]+)\*\*/)?.[1]?.trim() ?? "";
    title = title.replace(/:$/, "").replace(/^(critical|high|medium|low)\s*[-–]\s*/i, "").replace(/`/g, "").trim();
    const scenario = chunk.match(/Failure Scenario[^:]*:\s*\*{0,2}\s*([^\n]+)/i)
      ?.[1]?.replace(/\*\*/g, "").trim() ?? "";
    let sev = chunk.match(/Severity[^:]*:\s*\*{0,2}\s*([a-zA-Z]+)/i)?.[1]?.toLowerCase() ?? "medium";
    if (!["critical", "high", "medium", "low"].includes(sev)) sev = "medium";
    if (title) findings.push({ num, title, scenario, sev, round });
  }
  return findings;
}

function parseVerdictData(content: string): VerdictData | null {
  if (!content) return null;
  const text = content.match(/1\.\s*Verdict:\s*([^\n]+)/)?.[1]?.trim() ?? "";
  const score = parseInt(content.match(/Hardening score:\s*(\d+)/)?.[1] ?? "0");
  const openRisks = content.match(/3\.\s*Open risks?:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
  const findings: FindingStatus[] = [];
  const section = content.match(/2\.\s*Findings status:([\s\S]*?)(?=\n\d+\.|\s*$)/)?.[1] ?? "";
  for (const line of section.split("\n")) {
    if (!/^\s+[-*]/.test(line)) continue;
    const lc = line.lastIndexOf(":");
    if (lc < 0) continue;
    const name = line.slice(0, lc).replace(/^\s*[-*]\s*/, "").replace(/\*\*/g, "").replace(/`/g, "").trim();
    const st = line.slice(lc + 1).toLowerCase();
    const status: FindingStatus["status"] = st.includes("partial") ? "partial"
      : st.includes("unresolved") ? "unresolved" : "resolved";
    if (name) findings.push({ name, status });
  }
  return { score, text, findings, openRisks };
}

function parseRevisionSteps(content: string): { title: string; codeLines: string[]; justification: string | null }[] {
  if (!content) return [];
  const steps: { title: string; codeLines: string[]; justification: string | null }[] = [];
  const re = /^\s*\d+\.\s+\*\*/gm;
  const pos: number[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(content))) pos.push(m.index);
  for (let i = 0; i < pos.length; i++) {
    const chunk = content.slice(pos[i], i + 1 < pos.length ? pos[i + 1] : content.length);
    const title = chunk.match(/^\s*\d+\.\s+\*\*([^*]+)\*\*/)?.[1]?.trim().replace(/:$/, "") ?? "";
    const codeM = [...chunk.matchAll(/```(?:bash)?\n([\s\S]*?)```/g)];
    const codeLines = codeM.length > 0
      ? codeM[0][1].split("\n").map(l => l.trim()).filter(Boolean)
      : [];
    const justM = chunk.match(/Justification[^:]*:\s*([\s\S]*?)(?=\n\n|\n\s*[-*#\d`]|$)/i);
    const justification = justM?.[1]?.replace(/\*\*/g, "").trim().split("\n")[0] ?? null;
    if (title) steps.push({ title, codeLines, justification });
  }
  return steps;
}

function buildRunData(events: AuditEvent[]): RunData {
  const sub = events.find(e => e.event === "submission");
  const redR1 = events.find(e => e.event === "findings" && e.round === 1);
  const redR2 = events.find(e => e.event === "findings" && e.round === 2);
  const redR3 = events.find(e => e.event === "findings" && e.round === 3);
  const revR3 = events.find(e => e.event === "revision" && e.round === 3);
  const verdR1 = events.find(e => e.event === "verdict" && e.round === 1);
  const verdR2 = events.find(e => e.event === "verdict" && e.round === 2);
  const verdR3 = events.find(e => e.event === "verdict" && e.round === 3);
  const signoff = events.find(e => e.event === "human_signoff");

  const subContent = sub?.content ?? "";
  const r1Content = redR1?.content ?? "";
  const { artifact, steps } = parseSubmissionSteps(subContent, r1Content);

  const allFindings = [
    ...parseFindings(r1Content, 1),
    ...parseFindings(redR2?.content ?? "", 2),
    ...parseFindings(redR3?.content ?? "", 3),
  ];

  const v1 = parseVerdictData(verdR1?.content ?? "");
  const v2 = parseVerdictData(verdR2?.content ?? "");
  const v3 = parseVerdictData(verdR3?.content ?? "");

  const risksClosedCount = [v1, v2, v3]
    .flatMap(v => v?.findings ?? [])
    .filter(f => f.status === "resolved").length;

  // Build map of original steps by command pattern
  const origByCmd = new Map<string, string>();
  const origByWord = new Map<string, string>();
  for (const s of steps) {
    const kb = s.text.match(/kubectl\s+\w+\s+\w+/)?.[0]?.slice(0, 18);
    if (kb) origByCmd.set(kb, s.text);
    const fw = s.text.split(/\s/)[0];
    if (fw && fw.length > 2) origByWord.set(fw, s.text);
  }

  const changes: RevisionChange[] = [];
  for (const rs of parseRevisionSteps(revR3?.content ?? "")) {
    if (!rs.justification) continue;
    const codeStr = rs.codeLines.join(" ");
    const kb = codeStr.match(/kubectl\s+\w+\s+\w+/)?.[0]?.slice(0, 18) ?? "";
    let origMatch: string | null = null;
    if (kb.length > 5) {
      for (const [k, v] of origByCmd.entries())
        if (k.slice(0, 16) === kb.slice(0, 16)) { origMatch = v; break; }
    }
    if (!origMatch && rs.codeLines.length > 0) {
      const fw = rs.codeLines[0].split(/\s/)[0];
      origMatch = origByWord.get(fw) ?? null;
    }

    const isNew = !origMatch;
    const jl = rs.justification.toLowerCase();
    if (isNew) {
      if (!NEW_STEP_KW.some(kw => jl.includes(kw.toLowerCase()))) continue;
    } else {
      if (!FLAWED_TOKENS.some(p => origMatch!.includes(p))) continue;
    }

    changes.push({
      isNew,
      title: rs.title,
      oldLines: origMatch ? [origMatch] : [],
      newLines: rs.codeLines.slice(0, 3),
      justification: rs.justification.split(/\.\s/)[0].trim() + ".",
    });
  }

  const rawTs = signoff?.created_at ?? "";
  const signoffTs = rawTs
    ? new Date(rawTs).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "";

  return { artifact, submissionSteps: steps, allFindings, verdicts: [v1, v2, v3], changes, risksClosedCount, signoffTs };
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function TryNav({ stage }: { stage: 1 | 2 | 3 | 4 | 5 }) {
  const dots = [1, 2, 3, 4, 5] as const;
  return (
    <nav>
      <div className="navin">
        <Link href="/" className="navback" aria-label="Back to landing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Link>
        <div className="navsep">|</div>
        <div className="navlogo">
          <Link href="/"><img src="/logo-crucible.svg" alt="Crucible" className="brand-logo" /></Link>
        </div>
        <div className="navspacer" />
        <div className="navstage">
          Stage {stage} / 5
          <span className="navdots" aria-hidden="true">
            {dots.map((d) => (
              <span
                key={d}
                className={"navdot" + (d === stage ? " on" : d < stage ? " done" : "")}
              />
            ))}
          </span>
        </div>
      </div>
    </nav>
  );
}

// ─── Stage 1 — Find the flaw ──────────────────────────────────────────────────

function Stage1({
  steps,
  onDone,
  onSkip,
}: {
  steps: SubmissionStep[];
  onDone: (n: number) => void;
  onSkip: () => void;
}) {
  const { t } = useLanguage();
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [fresh, setFresh] = useState(true);
  const foundFlaws = Array.from(flagged).filter(i => steps[i]?.flaggable ?? false).length;

  function handleClick(i: number) {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
    if (fresh) setFresh(false);
  }

  return (
    <>
      <div className="shead">
        <span className="eyebrow">Stage 1 of 5 · Find the flaw</span>
        <h1>This runbook ran into production.</h1>
        <p>Click every step you&apos;d flag as dangerous. We&apos;ll show you what Red Agent found after.</p>
      </div>

      <div className={"runbook" + (fresh ? " fresh" : "")}>
        <div className="rbhead">
          <span className="rbdot" />
          <span>Production API Rollback (Kubernetes)</span>
          <span className="rbtag">v1.4 · pre-hardening</span>
        </div>
        {steps.length === 0 ? (
          <div className="rline" style={{ opacity: 0.4, pointerEvents: "none" }}>
            <span className="rnum">—</span>
            <span className="rcode">Loading…</span>
          </div>
        ) : steps.map((step, i) => (
          <div
            key={i}
            className={"rline" + (flagged.has(i) ? " flagged" : "")}
            onClick={() => handleClick(i)}
          >
            <span className="rnum">{step.num}</span>
            <span className="rcode">{step.text}</span>
          </div>
        ))}
      </div>

      <div className="control">
        <div className="counter">
          <span className="cnum">{flagged.size}</span>
          <span><span className="ctotal">flagged</span></span>
        </div>
        <div className="control-actions">
          <button className="btn-s1 primary" onClick={() => onDone(foundFlaws)}>
            Show me what Red found →
          </button>
        </div>
      </div>
      <button className="skip" onClick={onSkip}>{t("try_skip")}</button>
    </>
  );
}

// ─── Stage 2 — Red attacks ───────────────────────────────────────────────────

function Stage2({
  foundFlaws,
  allFindings,
  totalFlagCount,
  onDone,
  onBack,
}: {
  foundFlaws: number;
  allFindings: Finding[];
  totalFlagCount: number;
  onDone: () => void;
  onBack: () => void;
}) {
  const redCountRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  const totalFindings = allFindings.length || 14;

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setAnimated(true);
      if (redCountRef.current) redCountRef.current.textContent = String(totalFindings);
      return;
    }
    const timer = setTimeout(() => {
      setAnimated(true);
      const el = redCountRef.current;
      if (!el) return;
      const startT = performance.now();
      function frame(t: number) {
        const p = Math.min(1, (t - startT) / 1200);
        const eased = 1 - Math.pow(1 - p, 3);
        el!.textContent = String(Math.round(eased * totalFindings));
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, 150);
    return () => clearTimeout(timer);
  }, [totalFindings]);

  const SEV_ORDER = ["critical", "high", "medium", "low"];
  const sorted = [...allFindings].sort((a, b) => SEV_ORDER.indexOf(a.sev) - SEV_ORDER.indexOf(b.sev));

  return (
    <>
      <div className="shead s2">
        <span className="eyebrow">Stage 2 of 5 · Red attacks</span>
        <h1>Red found {totalFindings} risks.</h1>
        <p>You caught {foundFlaws}. Here&apos;s everything Red Agent flagged across 3 rounds — including risks you couldn&apos;t see from a single line.</p>
      </div>

      <div className="scoresnap">
        <div className="sbox you">
          <div className="slbl">You</div>
          <div className="sval">{foundFlaws}</div>
          <div className="ssub">of {totalFlagCount} line flaws spotted</div>
        </div>
        <div className="sbox red">
          <div className="slbl">Red Agent</div>
          <div className="sval" ref={redCountRef}>0</div>
          <div className="ssub">total risks flagged</div>
        </div>
      </div>

      <div className="fhead">Findings · sorted by severity</div>

      <div className={"scrollarea" + (animated ? " s2-animated" : "")}>
        <div className="scanline" aria-hidden="true" />
        <div className="findings">
          {sorted.map((f, i) => (
            <div key={i} className={"finding " + f.sev}>
              <div className="ftop">
                <span className={"ftag " + f.sev}>{f.sev.charAt(0).toUpperCase() + f.sev.slice(1)}</span>
                <span className="fref">Round {f.round}</span>
              </div>
              <h3>{f.title}</h3>
              {f.scenario && <p>{f.scenario}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="next-cta s2">
        <button className="btn btn-primary" onClick={onDone}>Let Blue harden the runbook →</button>
        <button className="nextback" onClick={onBack}>← Back to Stage 1</button>
      </div>
    </>
  );
}

// ─── Stage 3 — Blue hardens ───────────────────────────────────────────────────

function Stage3({
  changes,
  risksClosedCount,
  onDone,
  onBack,
}: {
  changes: RevisionChange[];
  risksClosedCount: number;
  onDone: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="shead s3">
        <span className="eyebrow">Stage 3 of 5 · Blue hardens</span>
        <h1>Blue hardened it over 3 rounds.</h1>
        <p>Same runbook. Same intent. Every major Red flag closed with a safer step — and new verification steps added.</p>
      </div>

      <div className="dhead">
        <span className="dtitle">runbook-k8s-api-rollback</span>
        <span className="dver">v1.4 <span className="arrow">→</span> v1.6 (hardened)</span>
        <span className="dmetric">{risksClosedCount || 6} risks closed</span>
      </div>

      <div className="scrollarea">
        <div className="changes">
          {changes.length === 0 ? (
            <div className="change" style={{ opacity: 0.45 }}>
              <div className="cref"><span className="cnum">—</span><span className="ctitle">Loading changes…</span></div>
            </div>
          ) : changes.map((c, i) => (
            <div key={i} className="change">
              <div className="cref">
                <span className={"cnum" + (c.isNew ? " new" : "")}>{c.isNew ? "+ New step" : "Changed"}</span>
                <span className="ctitle">{c.title}</span>
              </div>
              <div className="diff">
                {c.oldLines.map((line, j) => (
                  <div key={"m" + j} className="dline minus">
                    <span className="dpre">−</span>
                    <code>{line}</code>
                  </div>
                ))}
                {c.newLines.map((line, j) => (
                  <div key={"p" + j} className="dline plus">
                    <span className="dpre">+</span>
                    <code>{line}</code>
                  </div>
                ))}
              </div>
              <div className="cnote">
                <span className="carrow">→</span>
                {c.justification}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="next-cta s3">
        <button className="btn btn-primary" onClick={onDone}>See Arbiter&apos;s verdict →</button>
        <button className="nextback" onClick={onBack}>← Back to Stage 2</button>
      </div>
    </>
  );
}

// ─── Stage 4 — Arbiter judges ─────────────────────────────────────────────────

function Stage4({
  verdicts,
  chainData,
  signoffTs,
  onDone,
  onBack,
}: {
  verdicts: (VerdictData | null)[];
  chainData: ChainData | null;
  signoffTs: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const gnumRef = useRef<HTMLDivElement>(null);
  const v3 = verdicts[2];
  const score = v3?.score ?? 85;

  useEffect(() => {
    const target = score;
    const duration = 1500;
    const delay = 350;
    const el = gnumRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      const start = performance.now();
      function frame(t: number) {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el!.textContent = String(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, delay);
    return () => clearTimeout(timer);
  }, [score]);

  const openCount = (v3?.findings ?? []).filter(f => f.status !== "resolved").length;

  return (
    <>
      <div className="shead s4">
        <span className="eyebrow">Stage 4 of 5 · Arbiter judges</span>
        <h1>Verdict: {score} of 100.</h1>
        <p>3 rounds, {openCount > 0 ? `${openCount} open risk${openCount !== 1 ? "s" : ""} remaining — ` : ""}escalated to the on-call engineer and approved.</p>
      </div>

      <div className="arbiter-grid">
        <div className="gcard">
          <div className="gwrap">
            <svg className="gauge" viewBox="0 0 200 120" aria-hidden="true">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" className="gtrack" strokeWidth="10" strokeLinecap="round" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" className="gfill" strokeWidth="10" strokeLinecap="round" />
              <circle cx="164.7" cy="53" r="3" fill="rgba(231,233,236,.5)" />
            </svg>
            <div className="gnum" ref={gnumRef}>0</div>
            <div className="gsub">out of <span className="of">100</span> · threshold to ship 80</div>
            <span className="gbadge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Escalated · Human-approved
            </span>
          </div>
        </div>

        <div className="rubric">
          <div className="rubric-title">Round scores · 3 rounds</div>
          {([0, 1, 2] as const).map(i => (
            <div key={i} className={`rrow r${i + 1}`}>
              <span className="rlbl">Round {i + 1}</span>
              <span className="rscore">
                {verdicts[i]?.score ?? "—"}<span className="rmax">/100</span>
              </span>
              <div className="rbar-wrap">
                <div className="rbar" style={{ width: `${verdicts[i]?.score ?? 0}%` }} />
              </div>
            </div>
          ))}
          {v3 && v3.findings.length > 0 && (
            <>
              <div className="rubric-title" style={{ marginTop: "1.1rem" }}>R3 findings status</div>
              {v3.findings.map((f, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "3px 0", fontSize: "12px", gap: "8px",
                }}>
                  <span style={{
                    color: "var(--text2)", flex: 1, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{f.name}</span>
                  <span style={{
                    color: f.status === "resolved" ? "var(--green)"
                      : f.status === "partial" ? "var(--amber)" : "var(--red)",
                    fontWeight: 600, fontSize: "11px", flexShrink: 0,
                  }}>
                    {f.status === "resolved" ? "Resolved" : f.status === "partial" ? "Partial" : "Open"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="verdict">
        <span className="vstamp">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Human-approved
        </span>
        <div className="vmeta">
          <div className="vrow">
            <div>
              <span className="vlbl">Hash · head</span>{" "}
              <span className="vval">{chainData ? shortHash(chainData.headHash, 8, 3) : "—"}</span>
            </div>
          </div>
          <div className="vsigned">
            Signed by <strong style={{ color: "var(--text)" }}>{SIGNER_NAME}</strong>{" "}
            · {SIGNER_ROLE} · {signoffTs || "2026-06-16 07:45 UTC"}
          </div>
        </div>
      </div>

      <div className="next-cta s4">
        <button className="btn btn-primary" onClick={onDone}>Verify the chain →</button>
        <button className="nextback" onClick={onBack}>← Back to Stage 3</button>
      </div>
    </>
  );
}

// ─── Stage 5 — Verify + Passport ─────────────────────────────────────────────

function Stage5({
  onBack,
  chainData,
  artifact,
  signoffTs,
}: {
  onBack: () => void;
  chainData: ChainData | null;
  artifact: string;
  signoffTs: string;
}) {
  const [broken, setBroken] = useState(false);
  const [entering, setEntering] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  function handleArenaClick() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/arena");
      return;
    }
    setEntering(true);
  }

  const displayArtifact = artifact || "Incident Runbook — Production API Rollback (Kubernetes)";

  return (
    <>
      {entering && <ArenaTransition caption={t("transition_opening")} />}
      <div className="wrap s5">
        <div className="shead s5">
          <span className="eyebrow">Stage 5 of 5 · Verify</span>
          <h1>Sealed. Try to break it.</h1>
          <p>Every step above is now locked in a SHA-256 hash chain. Tamper with one block — verification fails instantly. Restore — and it passes.</p>
        </div>

        <div className="passport">
          {/* header */}
          <div className="phead">
            <div className="phead-left">
              <div className="peyebrow">Hardening Passport</div>
              <h2 className="ptitle">{displayArtifact}</h2>
              <div className="psub">run-id <code>{RUN_ID}</code></div>
            </div>
            <div className="phead-right">
              <div className="pscore">
                <div className="pscore-num">85<span style={{ fontSize: "18px", color: "var(--text3)", fontWeight: 500 }}> / 100</span></div>
                <div className="pscore-lbl">Arbiter score</div>
              </div>
              <span className="pstamp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Human-approved
              </span>
            </div>
          </div>

          {/* metadata strip */}
          <div className="pmeta">
            <div className="pmeta-item"><span className="pmlbl">Rounds</span><span className="pmval">3</span></div>
            <div className="pmeta-item"><span className="pmlbl">Agents</span><span className="pmval">4</span></div>
            <div className="pmeta-item"><span className="pmlbl">Entries</span><span className="pmval">{chainData?.entries ?? 42}</span></div>
            <div className="pmeta-item"><span className="pmlbl">Version</span><span className="pmval">v1.6</span></div>
          </div>

          {/* chain section */}
          <div className="pchain">
            <div className="pclabel">Audit trail · SHA-256 hash chain</div>
            <div className={"chainviz5" + (broken ? " broken" : "")}>
              <div className="block">
                <div className="bnum">#001</div>
                <div className="bhash">{chainData ? shortHash(chainData.nodeHashes[0]) : "a3f1…b8c2"}</div>
                <div className="bcheck">✓</div>
              </div>
              <div className="bconn" />
              <div className="block">
                <div className="bnum">#002</div>
                <div className="bhash">{chainData ? shortHash(chainData.nodeHashes[1]) : "7d2e…4af9"}</div>
                <div className="bcheck">✓</div>
              </div>
              <div className="bconn" />
              <div className="block tampered">
                <div className="bnum">#003</div>
                <div className="bhash">{chainData ? shortHash(chainData.nodeHashes[2]) : "5b9c…1e3d"}</div>
                <div className="bcheck">✓</div>
              </div>
              <div className="bconn" />
              <div className="block">
                <div className="bnum">#004</div>
                <div className="bhash">{chainData ? shortHash(chainData.nodeHashes[3]) : "8a4f…2c7b"}</div>
                <div className="bcheck">✓</div>
              </div>
              <div className="bconn" />
              <div className="block head">
                <div className="bnum">{chainData ? `#${String(chainData.entries).padStart(3, "0")} · HEAD` : "#042 · HEAD"}</div>
                <div className="bhash">{chainData ? shortHash(chainData.headHash, 8, 3) : "122415…d4a"}</div>
                <div className="bcheck">✓</div>
              </div>
            </div>

            <div className="prow">
              <div className={"pstatus" + (broken ? " broken" : "")}>
                <span className="psdot" />
                {broken ? (
                  <span>chain BROKEN at #003 · verification failed</span>
                ) : (
                  <span>chain intact · {chainData?.entries ?? 42} entries · head <code>{chainData ? shortHash(chainData.headHash, 8, 3) : "12241517f6…d4a"}</code></span>
                )}
              </div>
              <div className="pcbuttons">
                <button className="btn-ghost danger" onClick={() => setBroken(true)}>Break the chain</button>
                <button className="btn-ghost success" onClick={() => setBroken(false)}>Show intact</button>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="pfoot">
            <div className="pfoot-left">
              <div className="pfoot-lbl">Signed by</div>
              <div className="pfoot-val"><strong>{SIGNER_NAME}</strong> · {SIGNER_ROLE}</div>
            </div>
            <div className="pfoot-right">
              <div className="pfoot-lbl">Sealed</div>
              <div className="pfoot-val">{signoffTs || "2026-06-16 07:45 UTC"}</div>
            </div>
          </div>
        </div>

        <div className="finalcta">
          <button className="btn btn-primary" onClick={handleArenaClick}>Open the Arena →</button>
          <button className="nextback" onClick={onBack}>← Back to Stage 4</button>
        </div>
      </div>
    </>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function TryPage() {
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [foundFlaws, setFoundFlaws] = useState(0);
  const [chainData, setChainData] = useState<ChainData | null>(null);
  const [runData, setRunData] = useState<RunData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: chainRows } = await supabase
        .from("audit_events")
        .select("seq, hash")
        .order("seq", { ascending: true });
      if (!cancelled && chainRows && chainRows.length > 0) {
        const head = chainRows[chainRows.length - 1] as { seq: number; hash: string | null };
        setChainData({
          entries: chainRows.length,
          headHash: head.hash ?? "",
          nodeHashes: (chainRows as { seq: number; hash: string | null }[])
            .slice(0, 4)
            .map(e => e.hash ?? ""),
        });
      }
      const { data: runRows } = await supabase
        .from("audit_events")
        .select("*")
        .eq("run_id", RUN_ID)
        .order("seq", { ascending: true });
      if (!cancelled && runRows && runRows.length > 0) {
        setRunData(buildRunData(runRows as AuditEvent[]));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const steps = runData?.submissionSteps ?? [];
  const totalFlagCount = steps.filter(s => s.flaggable).length || 3;

  return (
    <div className={`try stage-${stage}`}>
      <TryNav stage={stage} />
      <main>
        {stage === 1 && (
          <div className="wrap">
            <Stage1
              steps={steps}
              onDone={n => { setFoundFlaws(n); setStage(2); }}
              onSkip={() => setStage(5)}
            />
          </div>
        )}
        {stage === 2 && (
          <div className="wrap">
            <Stage2
              foundFlaws={foundFlaws}
              allFindings={runData?.allFindings ?? []}
              totalFlagCount={totalFlagCount}
              onDone={() => setStage(3)}
              onBack={() => setStage(1)}
            />
          </div>
        )}
        {stage === 3 && (
          <div className="wrap-lg">
            <Stage3
              changes={runData?.changes ?? []}
              risksClosedCount={runData?.risksClosedCount ?? 6}
              onDone={() => setStage(4)}
              onBack={() => setStage(2)}
            />
          </div>
        )}
        {stage === 4 && (
          <div className="wrap-sm">
            <Stage4
              verdicts={runData?.verdicts ?? [null, null, null]}
              chainData={chainData}
              signoffTs={runData?.signoffTs ?? ""}
              onDone={() => setStage(5)}
              onBack={() => setStage(3)}
            />
          </div>
        )}
        {stage === 5 && (
          <Stage5
            onBack={() => setStage(4)}
            chainData={chainData}
            artifact={runData?.artifact ?? ""}
            signoffTs={runData?.signoffTs ?? ""}
          />
        )}
      </main>
    </div>
  );
}
