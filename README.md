# Crucible

**Break it before reality does.**

Crucible is an adversarial document-hardening desk for high-stakes documents. Three AI agents and a human fight over your document until it is provably safer — then seal the result in a tamper-evident audit trail.

`Band of Agents · Track 3 — Regulated & High-Stakes Workflows`

**Live demo → https://crucible-iota.vercel.app**

---

## The problem

Hardening a critical document — a production runbook, a security SOP, a clinical protocol, a contract — is a *process* problem, not just a reasoning one. Most review tools handle only the easy half:

- **Finding isn't fixing.** They list flaws and stop. Nobody rewrites the document or proves the fix held.
- **One bad line is enough.** A rollback runbook with a single unconfirmed `kubectl delete` can take down production the moment someone runs it.
- **No trail you can trust.** "We reviewed it" isn't evidence — there's no verdict, no sign-off, no record you can verify later.

## What Crucible does — Find → Fix → Prove

Most tools stop at **Find**. Crucible closes the loop.

- **Find** — an adversary hunts every flaw, exploit, and failure mode.
- **Fix** — a defender rewrites the document to close each finding.
- **Prove** — a judge scores it, a human signs off, and the record is sealed.

## How it works

A document goes around an adversarial loop until the Arbiter is satisfied or the run escalates to a human. Nothing ships without a human, and every step is recorded.

```
Submit ─► Red attacks ─► Blue hardens ─► Arbiter scores 0–100
                                              │
                    re-run (≤ 3 rounds) ◄─────┤  below 80
                                              │  80+ or 3 rounds reached
                                              ▼
                                   Human sign-off ─► Sealed (SHA-256 hash chain)
```

- **Threshold to ship:** 80
- **Rounds:** up to 3
- **Human gate:** every high-stakes outcome is signed by a person

## The agents

| Agent | Role | Job |
|---|---|---|
| **Red** | Adversary | Finds flaws, exploits, and failure modes. Attacks the draft on purpose. |
| **Blue** | Defender | Rewrites the document to close every finding Red surfaces. |
| **Arbiter** | Judge | Scores 0–100 and decides: approve, re-run, or escalate. |
| **Human** | Sign-off | Owns every high-stakes call. Nothing ships without them. |

These are specialized roles — not one model wearing four hats. Each runs adversarially against the others.

## Built on Band

Crucible is **not a chatbot and not a thin wrapper**. [Band](https://app.band.ai) is the coordination layer that makes the multi-agent collaboration real:

- **Real handoffs** — User → Red → Blue → Arbiter → (loop) → Human, routed across a shared room.
- **Shared context** — each agent builds on the previous one's output; one source of truth.
- **Role specialization** — Red, Blue, and Arbiter run as distinct Band agents.
- **Multi-round task state** — status and scores carry across all three rounds of a run.

## Inference — Featherless

All three agents run on **Qwen2.5-7B-Instruct** served via [Featherless](https://featherless.ai) — an open-source model, so there is no closed black box behind the verdict. Same engine, three adversarial roles; the behavior comes from the roles and the loop, not a proprietary model.

## Proof you can break — a real run

The live demo is backed by a real, end-to-end run — not a mockup.

- **Document:** Incident Runbook — Production API Rollback (Kubernetes)
- **Rounds:** 3 · scores **75 → 75 → 85**
- **Findings:** 14 surfaced over the run (3 Critical · 5 High · 5 Medium · 1 Low), hardened by Blue
- **Outcome:** cleared the threshold (80) but was **still escalated to a human** — high-stakes outcomes always get a person. Approved and sealed.
- **Seal:** a **67-entry SHA-256 hash chain**, head `3828cf55…9ec`

Every event is chained to the one before it. **Tamper with any record and verification fails instantly; restore it and it passes** — proof, not a promise. You can re-verify the seal yourself from the `/arena` viewer or the `/api/verify` endpoint on the live app.

## Tech stack

- **Web** — Next.js (App Router), React, TypeScript, Tailwind CSS — in [`crucible-arena/`](crucible-arena)
- **Agents / worker** — Python, [`band-sdk`](https://app.band.ai)
- **Inference** — Featherless (Qwen2.5-7B-Instruct)
- **Data + realtime** — Supabase (`audit_events` table)
- **Hosting** — Vercel

## Repository structure

```
crucible/
├── crucible-arena/             # Next.js app — landing, /try walkthrough, /arena run viewer, /api/verify
├── crucible.py                 # Band worker — runs the adversarial loop and writes the audit trail
├── red_attack.py               # Red agent logic
├── verify_audit.py             # standalone hash-chain verifier
├── agent_config.yaml.example   # Band agent credentials template (the real file is gitignored)
└── env.example                 # environment variables template (the real file is gitignored)
```

`spike.py` is the original Day-1 Band connectivity test, kept for reference.

## Run it locally

Real credentials live in `.env.local` / `agent_config.yaml`, which are **gitignored** — never commit keys.

**Web app**

```bash
cd crucible-arena
cp env.example .env.local      # add your Supabase URL + anon key
npm install
npm run dev                    # http://localhost:3000
```

**Agents / worker**

```bash
cp agent_config.yaml.example agent_config.yaml   # add Band agent IDs + keys (app.band.ai → Agents)
# add your Featherless + Supabase keys per env.example
python crucible.py             # or: uv run python crucible.py
```

## Links

- **Live demo:** https://crucible-iota.vercel.app
- **Demo video:** _add link_
- **Platform:** [app.band.ai](https://app.band.ai) · **Inference:** [featherless.ai](https://featherless.ai)

## Submission

Band of Agents Hackathon · **Track 3 — Regulated & High-Stakes Workflows**.
