"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "./try.css";

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
          <svg className="hex" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
          </svg>
          CRUCIBLE
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

const RUNBOOK_LINES = [
  {
    num: "01",
    code: "ssh -i ~/.ssh/admin_key root@db-primary-01.prod",
    fb: "Privileged access without an audit trail. Use sudo with session logging — root over SSH leaves no who/what/when record.",
    flaw: true,
  },
  {
    num: "02",
    code: 'psql -c "SELECT * FROM pg_stat_replication" # verify lag < 1s',
    fb: "Pre-change verification. Confirms the replica is ready before any failover.",
    flaw: false,
  },
  {
    num: "03",
    code: "systemctl stop postgresql",
    fb: "Stops the primary before promoting the replica. Application sees a hard outage window. Promote replica first, then stop primary.",
    flaw: true,
  },
  {
    num: "04",
    code: "tar -czf /tmp/db-snap.tar.gz /var/lib/postgresql",
    fb: "/tmp is ephemeral — wiped on reboot. The snapshot is lost the moment recovery requires a restart.",
    flaw: true,
  },
  {
    num: "05",
    code: 'psql -c "DROP INDEX users_pkey CASCADE"',
    fb: "CASCADE silently drops every dependent object (FKs, views). No backup taken first. One typo = unrecoverable data loss.",
    flaw: true,
  },
  {
    num: "06",
    code: "systemctl start postgresql && nc -z localhost 5432",
    fb: "Port-open ≠ service-healthy. Postgres can listen on 5432 while still rejecting queries. Run a real SELECT 1 probe.",
    flaw: true,
  },
  {
    num: "07",
    code: 'pagerduty ack --user oncall-dba --message "primary recovered"',
    fb: "Standard handoff. Confirms recovery with the right human in the loop.",
    flaw: false,
  },
];

function Stage1({ onDone }: { onDone: (n: number) => void }) {
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [fresh, setFresh] = useState(true);
  // foundFlaws counts only flagged lines that are actually dangerous — passed to Stage 2
  const foundFlaws = Array.from(flagged).filter((i) => RUNBOOK_LINES[i].flaw).length;

  function handleClick(i: number) {
    setFlagged((prev) => {
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
          <span>Incident runbook — Database outage</span>
          <span className="rbtag">v2.3 · pre-hardening</span>
        </div>
        {RUNBOOK_LINES.map((line, i) => (
          <div
            key={i}
            className={"rline" + (flagged.has(i) ? " flagged" : "")}
            onClick={() => handleClick(i)}
          >
            <span className="rnum">{line.num}</span>
            <span className="rcode">{line.code}</span>
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
      <button className="skip" onClick={() => onDone(foundFlaws)}>Skip the game →</button>
    </>
  );
}

// ─── Stage 2 — Red attacks ───────────────────────────────────────────────────

const FINDINGS = [
  {
    sev: "critical",
    ref: "Line 05",
    title: "CASCADE drop on primary key",
    body: (
      <>
        <code>DROP INDEX users_pkey CASCADE</code> silently removes every foreign key and view depending on it.
        No backup taken first. One typo here is unrecoverable.
      </>
    ),
  },
  {
    sev: "critical",
    ref: "Line 04",
    title: "Snapshot stored on volatile path",
    body: (
      <>
        <code>/tmp</code> is wiped on every reboot. If recovery requires a restart — which it often does — this
        snapshot is gone. Use a persistent, off-host destination.
      </>
    ),
  },
  {
    sev: "high",
    ref: "Line 01",
    title: "Root SSH bypasses audit trail",
    body: (
      <>
        <code>ssh root@…</code> leaves no who/what/when record. Use <code>sudo</code> with session logging so
        every action stays attributable to a human.
      </>
    ),
  },
  {
    sev: "high",
    ref: "Line 03",
    title: "Primary stopped before replica promotion",
    body: (
      <>
        Application sees a hard outage window between the stop and the promotion. Sequence should be: promote
        replica → drain connections → stop primary.
      </>
    ),
  },
  {
    sev: "high",
    ref: "Cross-line · between 04 & 05",
    title: "No backup verification before destruction",
    body: (
      <>
        The runbook drops an index on production data without verifying that the snapshot from step 04 is
        restorable. An untested backup is a hope, not a backup.
      </>
    ),
  },
  {
    sev: "medium",
    ref: "Line 06",
    title: "Port-listen check ≠ service health",
    body: (
      <>
        <code>nc -z localhost 5432</code> confirms the socket is open, not that Postgres accepts queries. A real{" "}
        <code>SELECT 1</code> probe catches the difference.
      </>
    ),
  },
  {
    sev: "medium",
    ref: "Cross-line · steps 02–07",
    title: "No rollback plan",
    body: (
      <>
        Every step assumes forward progress. There&apos;s no documented &ldquo;if this fails, do this&rdquo; —
        escalation reverts to tribal knowledge under pressure.
      </>
    ),
  },
];

function Stage2({ foundFlaws, onDone }: { foundFlaws: number; onDone: () => void }) {
  const redCountRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setAnimated(true);
      if (redCountRef.current) redCountRef.current.textContent = "7";
      return;
    }

    // Brief delay: let the initial hidden state paint before triggering the reveal
    const timer = setTimeout(() => {
      setAnimated(true); // fires CSS stagger + scan line
      const el = redCountRef.current;
      if (!el) return;
      const startT = performance.now();
      function frame(t: number) {
        const p = Math.min(1, (t - startT) / 1200);
        const eased = 1 - Math.pow(1 - p, 3);
        el!.textContent = String(Math.round(eased * 7));
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="shead s2">
        <span className="eyebrow">Stage 2 of 5 · Red attacks</span>
        <h1>Red found 7 risks.</h1>
        <p>You caught {foundFlaws}. Here&apos;s everything Red Agent flagged — including 2 you couldn&apos;t see from a single line.</p>
      </div>

      <div className="scoresnap">
        <div className="sbox you">
          <div className="slbl">You</div>
          <div className="sval">{foundFlaws}</div>
          <div className="ssub">of 5 line flaws spotted</div>
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
          {FINDINGS.map((f, i) => (
            <div key={i} className={"finding " + f.sev}>
              <div className="ftop">
                <span className={"ftag " + f.sev}>{f.sev.charAt(0).toUpperCase() + f.sev.slice(1)}</span>
                <span className="fref">{f.ref}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="next-cta s2">
        <button className="btn btn-primary" onClick={onDone}>Let Blue harden the runbook →</button>
        <span className="nextback" style={{ cursor: "default", opacity: 0.5 }}>← Back to Stage 1</span>
      </div>
    </>
  );
}

// ─── Stage 3 — Blue hardens ───────────────────────────────────────────────────

const CHANGES = [
  {
    num: "Line 01",
    isNew: false,
    title: "Root SSH bypasses audit",
    minus: ["ssh -i ~/.ssh/admin_key root@db-primary-01.prod"],
    plus: ["sudo -i ssh db-primary --session-log /var/log/incidents/$INC_ID.log"],
    note: "sudo with session logging keeps every command attributable to a human.",
  },
  {
    num: "Line 03",
    isNew: false,
    title: "Primary stopped before replica promotion",
    minus: ["systemctl stop postgresql"],
    plus: ["promote_replica db-replica-01 && drain --grace 30s && systemctl stop postgresql"],
    note: "Promote replica first, drain in-flight connections, then stop primary. Outage window: zero.",
  },
  {
    num: "Line 04",
    isNew: false,
    title: "Snapshot stored on volatile path",
    minus: ["tar -czf /tmp/db-snap.tar.gz /var/lib/postgresql"],
    plus: ["pg_basebackup -D /var/backups/snap-$(date -I) --checkpoint=fast --wal-method=stream"],
    note: "Persistent storage, postgres-aware tool, includes WAL for point-in-time recovery.",
  },
  {
    num: "+ New step",
    isNew: true,
    title: "Backup verification before destruction",
    minus: [],
    plus: ['verify_restorable /var/backups/snap-$(date -I) || abort "backup not restorable"'],
    note: "Inserted between line 04 and the destructive op. An untested backup is a hope, not a backup.",
  },
  {
    num: "Line 05",
    isNew: false,
    title: "CASCADE drop on primary key",
    minus: ['psql -c "DROP INDEX users_pkey CASCADE"'],
    plus: ['psql -c "REINDEX INDEX CONCURRENTLY users_pkey"'],
    note: "Rebuild in-place instead of drop. No dependency loss, no table lock during rebuild.",
  },
  {
    num: "Line 06",
    isNew: false,
    title: "Port-listen check ≠ service health",
    minus: ["systemctl start postgresql && nc -z localhost 5432"],
    plus: ['systemctl start postgresql && psql -c "SELECT 1" -tA | grep -q "^1$"'],
    note: "Real query probe. Confirms postgres accepts queries, not just that the socket is open.",
  },
  {
    num: "+ New section",
    isNew: true,
    title: "Explicit rollback plan",
    minus: [],
    plus: [
      "# ROLLBACK · run if any verify_* step above fails",
      "demote_primary && restore_from_backup /var/backups/snap-$(date -I)",
      "page_secondary_oncall --reason \"primary recovery failed at step $LAST_STEP\"",
    ],
    note: "Appended to runbook. Escalation no longer depends on tribal knowledge under pressure.",
  },
];

function Stage3({ onDone }: { onDone: () => void }) {
  return (
    <>
      <div className="shead s3">
        <span className="eyebrow">Stage 3 of 5 · Blue hardens</span>
        <h1>Blue rewrote 7 of them.</h1>
        <p>Same runbook. Same intent. Every Red flag closed with a safer step — and two missing steps added.</p>
      </div>

      <div className="dhead">
        <span className="dtitle">runbook-db-outage</span>
        <span className="dver">v2.3 <span className="arrow">→</span> v2.4 (hardened)</span>
        <span className="dmetric">7 risks closed</span>
      </div>

      <div className="scrollarea">
      <div className="changes">
        {CHANGES.map((c, i) => (
          <div key={i} className="change">
            <div className="cref">
              <span className={"cnum" + (c.isNew ? " new" : "")}>{c.num}</span>
              <span className="ctitle">{c.title}</span>
            </div>
            <div className="diff">
              {c.minus.map((line, j) => (
                <div key={"m" + j} className="dline minus">
                  <span className="dpre">−</span>
                  <code>{line}</code>
                </div>
              ))}
              {c.plus.map((line, j) => (
                <div key={"p" + j} className="dline plus">
                  <span className="dpre">+</span>
                  <code>{line}</code>
                </div>
              ))}
            </div>
            <div className="cnote">
              <span className="carrow">→</span>
              {c.note}
            </div>
          </div>
        ))}
      </div>
      </div>

      <div className="next-cta s3">
        <button className="btn btn-primary" onClick={onDone}>See Arbiter&apos;s verdict →</button>
        <span className="nextback" style={{ cursor: "default", opacity: 0.5 }}>← Back to Stage 2</span>
      </div>
    </>
  );
}

// ─── Stage 4 — Arbiter judges ─────────────────────────────────────────────────

function Stage4({ onDone }: { onDone: () => void }) {
  const gnumRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = 85;
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
  }, []);

  return (
    <>
      <div className="shead s4">
        <span className="eyebrow">Stage 4 of 5 · Arbiter judges</span>
        <h1>Verdict: 85 of 100.</h1>
        <p>Hardened runbook clears the safety threshold. Sealed for human sign-off.</p>
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
            Passed
          </span>
        </div>
      </div>

      <div className="rubric">
        <div className="rubric-title">Rubric · score breakdown</div>
        <div className="rrow r1">
          <span className="rlbl">Audit &amp; accountability</span>
          <span className="rscore">20<span className="rmax">/20</span></span>
          <div className="rbar-wrap"><div className="rbar" /></div>
        </div>
        <div className="rrow r2">
          <span className="rlbl">Failure recovery</span>
          <span className="rscore">20<span className="rmax">/25</span></span>
          <div className="rbar-wrap"><div className="rbar" /></div>
        </div>
        <div className="rrow r3">
          <span className="rlbl">Operational safety</span>
          <span className="rscore">28<span className="rmax">/30</span></span>
          <div className="rbar-wrap"><div className="rbar" /></div>
        </div>
        <div className="rrow r4">
          <span className="rlbl">Documentation &amp; rollback</span>
          <span className="rscore">17<span className="rmax">/25</span></span>
          <div className="rbar-wrap"><div className="rbar" /></div>
        </div>
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
              <span className="vval">12241517f6…d4a</span>
            </div>
          </div>
          <div className="vsigned">
            Signed by <strong style={{ color: "var(--text)" }}>Zain</strong> · on-call DBA · 2026-06-13 18:23 UTC
          </div>
        </div>
      </div>

      <div className="next-cta s4">
        <button className="btn btn-primary" onClick={onDone}>Verify the chain →</button>
        <span className="nextback" style={{ cursor: "default", opacity: 0.5 }}>← Back to Stage 3</span>
      </div>
    </>
  );
}

// ─── Stage 5 — Verify + Passport ─────────────────────────────────────────────

function Stage5({ onRestart }: { onRestart: () => void }) {
  const [broken, setBroken] = useState(false);

  return (
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
            <h2 className="ptitle">Incident runbook — Database outage</h2>
            <div className="psub">run-id <code>run-20260613-134941-d26249</code></div>
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
          <div className="pmeta-item"><span className="pmlbl">Entries</span><span className="pmval">42</span></div>
          <div className="pmeta-item"><span className="pmlbl">Version</span><span className="pmval">v2.4</span></div>
        </div>

        {/* chain section */}
        <div className="pchain">
          <div className="pclabel">Audit trail · SHA-256 hash chain</div>
          <div className={"chainviz5" + (broken ? " broken" : "")}>
            <div className="block">
              <div className="bnum">#001</div>
              <div className="bhash">a3f1…b8c2</div>
              <div className="bcheck">✓</div>
            </div>
            <div className="bconn" />
            <div className="block">
              <div className="bnum">#002</div>
              <div className="bhash">7d2e…4af9</div>
              <div className="bcheck">✓</div>
            </div>
            <div className="bconn" />
            <div className="block tampered">
              <div className="bnum">#003</div>
              <div className="bhash">5b9c…1e3d</div>
              <div className="bcheck">✓</div>
            </div>
            <div className="bconn" />
            <div className="block">
              <div className="bnum">#004</div>
              <div className="bhash">8a4f…2c7b</div>
              <div className="bcheck">✓</div>
            </div>
            <div className="bconn" />
            <div className="block head">
              <div className="bnum">#042 · HEAD</div>
              <div className="bhash">122415…d4a</div>
              <div className="bcheck">✓</div>
            </div>
          </div>

          <div className="prow">
            <div className={"pstatus" + (broken ? " broken" : "")}>
              <span className="psdot" />
              {broken ? (
                <span>chain BROKEN at #003 · verification failed</span>
              ) : (
                <span>chain intact · 42 entries · head <code>12241517f6…d4a</code></span>
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
            <div className="pfoot-val"><strong>Zain</strong> · on-call DBA</div>
          </div>
          <div className="pfoot-right">
            <div className="pfoot-lbl">Sealed</div>
            <div className="pfoot-val">2026-06-13 18:23 UTC</div>
          </div>
        </div>
      </div>

      <div className="finalcta">
        <Link href="/arena" className="btn btn-primary">Open the Arena →</Link>
        <button className="restart" onClick={onRestart}>Try another document</button>
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function TryPage() {
  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [foundFlaws, setFoundFlaws] = useState(0);
  const restart = () => { setStage(1); setFoundFlaws(0); };

  return (
    <div className={`try stage-${stage}`}>
      <TryNav stage={stage} />
      <main>
        {stage === 1 && <div className="wrap"><Stage1 onDone={(n) => { setFoundFlaws(n); setStage(2); }} /></div>}
        {stage === 2 && <div className="wrap"><Stage2 foundFlaws={foundFlaws} onDone={() => setStage(3)} /></div>}
        {stage === 3 && <div className="wrap-lg"><Stage3 onDone={() => setStage(4)} /></div>}
        {stage === 4 && <div className="wrap-sm"><Stage4 onDone={() => setStage(5)} /></div>}
        {stage === 5 && <Stage5 onRestart={restart} />}
      </main>
    </div>
  );
}
