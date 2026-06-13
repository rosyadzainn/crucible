"""
Crucible - Day 4: looping three-agent hardening THROUGH Band + an immutable audit trail.

Flow (each arrow is a real Band message with an @mention):
    You --@red <draft>--> Red --@blue findings--> Blue --@arbiter revision-->
        Arbiter --decision-->
            APPROVE          -> @you  : final hardened artifact, ready for sign-off
            ANOTHER ROUND    -> @red  : Blue's revision becomes the new artifact (round + 1)
            (max rounds hit) -> @you  : escalate - best version so far + open risks

    Then you (the human) close the loop with a governance sign-off:
        You --@arbiter SIGNOFF: APPROVE|REJECT--> Arbiter records it as a
            'human_signoff' entry in the hash-chained audit trail and confirms.
        The human decision therefore lives INSIDE the tamper-evident chain too.

- Red    = adversary: finds flaws in the artifact (severity-labelled).
- Blue   = defender: rewrites the artifact to address Red's findings.
- Arbiter= governance: judges the revision, scores it, decides APPROVE / ANOTHER ROUND,
           and records the human's final sign-off.

Audit trail: every step is appended to a hash-chained JSONL file (AUDIT_PATH).
Each entry's hash covers its own content PLUS the previous entry's hash, so editing any
line later breaks the chain -> tamper-evident. Run verify_audit.py to check it.

Loop safety (no infinite loops):
  * MAX_ROUNDS hard cap, enforced by the Arbiter: it only bounces back to Red
    while round < MAX_ROUNDS; at the cap it escalates to you instead.
  * Every agent ignores its own messages (sender_id == own id).
  * Only the Arbiter -> Red "go again" message carries a ===NEXTROUND=== marker;
    the human-facing APPROVE / ESCALATE messages do NOT, so Red never re-fires on them.
  * A human SIGNOFF message is a governance decision, not a draft: Red explicitly
    skips it, and only the Arbiter records it. The Arbiter's confirmation carries no
    marker, so it never re-fires the loop either.

Setup:
    1. agent_config.yaml must contain red, blue AND arbiter (agent_id + api_key).
    2. .env must contain FEATHERLESS_API_KEY=...
    3. In Band, the chat room must include all three agents + you.
    4. .venv\\Scripts\\python crucible.py
    5. In Band, send a draft to the Red Agent (do this AFTER the worker is online).
    6. After APPROVE/ESCALATE, sign off to the Arbiter, e.g.:
           @rosyadz123/arbiter-agent SIGNOFF: APPROVE accepting residual risk
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from uuid import uuid4

from dotenv import load_dotenv
from openai import AsyncOpenAI

try:  # Supabase mirror is optional; the JSONL audit log stays the canonical record.
    from supabase import create_client
except ImportError:  # worker still runs (JSONL-only) if the package isn't installed
    create_client = None

from band import Agent
from band.core.simple_adapter import SimpleAdapter
from band.config import load_agent_config

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-9s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("crucible")

# --- Loop control ----------------------------------------------------------
MAX_ROUNDS = 3  # after this many Red->Blue->Arbiter cycles, escalate to a human.

# --- Audit trail -----------------------------------------------------------
AUDIT_PATH = "crucible_audit.jsonl"
GENESIS_HASH = "0" * 64

# --- Supabase mirror (optional; powers the live dashboard) -----------------
# The worker writes with the service_role key, which BYPASSES RLS. Keep both in
# .env and NEVER commit them. If either is missing, the worker runs JSONL-only.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
SUPABASE_TABLE = "audit_events"

# --- Handles (confirm these match your Band handles) -----------------------
USER_HANDLE = "@rosyadz123"
RED_HANDLE = "@rosyadz123/red-agent"
BLUE_HANDLE = "@rosyadz123/blue-agent"
ARBITER_HANDLE = "@rosyadz123/arbiter-agent"

# --- LLM provider: Featherless AI (OpenAI-compatible) ----------------------
BASE_URL = "https://api.featherless.ai/v1"
MODEL = "Qwen/Qwen2.5-7B-Instruct"  # free-tier friendly; swap to a bigger model on Premium.
API_KEY_ENV = "FEATHERLESS_API_KEY"

RED_SYSTEM = """You are Red, an adversarial red-team reviewer in a high-stakes review process.
You receive a DRAFT ARTIFACT (e.g. an incident-response runbook, security policy,
access configuration, or contract clause). Break it before reality does: find the
most serious flaws, gaps, ambiguities, exploitable assumptions, and failure modes.
- Be concrete and specific; reference the actual content. No generic advice.
- Prioritise by severity; lead with what could cause real damage.
- For each finding: a short name, the exact failure scenario, and a severity label
  (Critical / High / Medium / Low).
- Be terse and surgical. 3-6 findings, strongest first. Never invent flaws."""

BLUE_SYSTEM = """You are Blue, the defender and author in a high-stakes review process.
You are given a draft ARTIFACT and Red's FINDINGS. Produce a REVISED, hardened version
of the artifact that addresses every finding: fix the gap, add the missing safeguard,
or explicitly state and justify an accepted risk.
- Output the FULL revised artifact (not a diff, not a summary), clear and usable.
- Be concrete: add specific steps, thresholds, owners, and checks - no hand-waving.
- Keep the original structure where it works; strengthen what Red broke."""

ARBITER_SYSTEM = """You are the Arbiter, an independent governance reviewer with sign-off authority.
You are given the ORIGINAL artifact, Red's FINDINGS, and Blue's REVISION.
Decide whether the revision is safe to approve for human sign-off.
Respond in EXACTLY this structure:
1. Verdict: 1-2 sentences.
2. Findings status: list each of Red's findings as Resolved / Partially resolved / Unresolved.
3. Open risks: anything still concerning (or "none").
4. Hardening score: a single number 0-100.
5. A final line, exactly one of:
DECISION: APPROVE
DECISION: ANOTHER ROUND
Be strict: if any Critical or High finding is Unresolved, you must NOT approve."""


def wrap(**sections: str) -> str:
    """Pack named sections into a single message body with ===NAME=== markers."""
    return "\n".join(f"==={name}===\n{body}" for name, body in sections.items())


def section(text: str, name: str) -> str:
    """Pull one ===NAME=== section back out of a message body."""
    m = re.search(rf"==={name}===\s*(.*?)(?=\n===\w+===|\Z)", text or "", re.S)
    return m.group(1).strip() if m else ""


def parse_round(text: str, default: int = 1) -> int:
    """Pull the round number out of a message, defaulting when absent/malformed."""
    raw = section(text, "ROUND")
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def parse_decision(verdict: str) -> str:
    """Read the Arbiter's own DECISION line.
    Default to ANOTHER ROUND on ambiguity - never auto-approve when unsure."""
    m = re.search(r"DECISION:\s*(APPROVE|ANOTHER\s+ROUND)", verdict or "", re.I)
    if not m:
        return "ANOTHER ROUND"
    return "APPROVE" if m.group(1).upper().startswith("APPROVE") else "ANOTHER ROUND"


def parse_score(verdict: str) -> int | None:
    """Pull the 0-100 hardening score out of the Arbiter's verdict (or None)."""
    m = re.search(r"Hardening score:\s*(\d{1,3})", verdict or "", re.I)
    return int(m.group(1)) if m else None


def strip_mentions(text: str) -> str:
    """Remove Band's encoded mentions like @[[<uuid>]] so they don't pollute artifact text."""
    return re.sub(r"@\[\[[^\]]+\]\]", "", text or "").strip()


def parse_signoff(text: str) -> tuple[str, str] | None:
    """Detect a human governance sign-off command.

    A sign-off message starts (after any leading @mention is stripped) with
    'SIGNOFF:' followed by APPROVE or REJECT, for example:
        SIGNOFF: APPROVE - accepting residual risk; deploying with monitoring. - Zain
        SIGNOFF: REJECT - backup-restore step is still unverified.

    Returns (decision, full_text) with decision == 'APPROVE' or 'REJECT', or None
    if the message is not a sign-off - so a normal draft is never mistaken for one,
    and an invalid decision word is simply ignored (the human just retries)."""
    clean = strip_mentions(text)
    m = re.match(r"\s*SIGNOFF\s*:\s*(APPROVE|REJECT)\b", clean, re.I)
    if not m:
        return None
    return m.group(1).upper(), clean


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_entry(entry: dict) -> str:
    """Deterministic SHA-256 over an entry dict (the 'hash' field must be absent)."""
    payload = json.dumps(entry, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _new_run_id() -> str:
    """A fresh id for one end-to-end run (one human submission + its rounds).
    Sortable timestamp prefix + short random suffix so two runs never collide."""
    return f"run-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:6]}"


# Which event-specific field holds the human-readable body, in priority order.
# 'signoff' is last: a human_signoff entry only sets that key, so it is picked up,
# while richer agent events keep their own primary field.
_CONTENT_KEYS = ("artifact", "findings", "revision", "verdict", "final", "best_version", "signoff")


def _content_of(fields: dict) -> str | None:
    """Pick the main text body out of an entry's event-specific fields."""
    for k in _CONTENT_KEYS:
        if fields.get(k):
            return fields[k]
    return None


class AuditLog:
    """Append-only, hash-chained audit trail (one JSON object per line).

    Each entry's hash covers its content + the previous entry's hash, so any later
    edit to a line breaks the chain from that point on (tamper-evident). The chain
    continues correctly across restarts because we read the tail on startup.
    """

    def __init__(self, path: str = AUDIT_PATH):
        self.path = path
        self._lock = asyncio.Lock()
        self._seq, self._last_hash = self._load_tail()
        self._last_round = 1  # latest round of the current run; used by human_signoff
        self.run_id = _new_run_id()  # replaced whenever a new submission arrives
        self.sb = self._connect_supabase()

    @staticmethod
    def _connect_supabase():
        """Create the Supabase client, or return None to run JSONL-only."""
        if create_client is None:
            log.info("[audit] supabase package not installed - JSONL-only.")
            return None
        if not (SUPABASE_URL and SUPABASE_SERVICE_KEY):
            log.info("[audit] SUPABASE_URL / SUPABASE_SERVICE_KEY not set - JSONL-only.")
            return None
        try:
            client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            log.info("[audit] supabase mirror ON -> %s", SUPABASE_URL)
            return client
        except Exception as e:  # noqa: BLE001
            log.warning("[audit] supabase connect failed (%s) - JSONL-only.", e)
            return None

    def _load_tail(self) -> tuple[int, str]:
        last_seq, last_hash = -1, GENESIS_HASH
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    last_seq = obj.get("seq", last_seq)
                    last_hash = obj.get("hash", last_hash)
        return last_seq + 1, last_hash

    async def append(self, *, rnd: int, event: str, agent: str, **fields) -> str:
        async with self._lock:
            # A new human submission begins a new run; later steps inherit its id.
            if event == "submission":
                self.run_id = _new_run_id()
            entry = {
                "seq": self._seq,
                "run_id": self.run_id,
                "ts": _utc_now_iso(),
                "round": rnd,
                "event": event,
                "agent": agent,
                **fields,
                "prev_hash": self._last_hash,
            }
            entry["hash"] = hash_entry(entry)  # entry has no 'hash' key yet at this point
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            self._seq += 1
            self._last_hash = entry["hash"]
            self._last_round = rnd
            log.info("[audit] +%-13s r%d agent=%-7s seq=%d hash=%s",
                     event, rnd, agent, entry["seq"], entry["hash"][:8])
        # Outside the lock: the canonical JSONL line is already committed, so a slow
        # or failed push can never block or corrupt the chain.
        await self._mirror_to_supabase(entry, fields)
        return entry["hash"]

    async def _mirror_to_supabase(self, entry: dict, fields: dict) -> None:
        """Best-effort copy to Supabase for the live dashboard. Never fatal:
        the hash-chained JSONL above is the canonical, tamper-evident record."""
        if self.sb is None:
            return
        row = {
            "run_id": entry["run_id"],
            "seq": entry["seq"],
            "round": entry["round"],
            "event": entry["event"],
            "agent": entry["agent"],
            "score": fields.get("score"),
            "decision": fields.get("decision"),
            "content": _content_of(fields),
            "hash": entry["hash"],
        }
        try:
            await asyncio.to_thread(
                lambda: self.sb.table(SUPABASE_TABLE).insert(row).execute()
            )
        except Exception as e:  # noqa: BLE001
            log.warning("[audit] supabase push failed seq=%d (%s) - JSONL still intact.",
                        entry["seq"], e)


class CrucibleAdapter(SimpleAdapter):
    """One adapter, three roles. Behaviour depends on self.role."""

    def __init__(self, *, role: str, ids: dict[str, str], client: AsyncOpenAI, audit: AuditLog):
        super().__init__()
        self.role = role  # "red" | "blue" | "arbiter"
        self.ids = ids  # {"red": uuid, "blue": uuid, "arbiter": uuid}
        self.client = client
        self.audit = audit

    async def _llm(self, system: str, user: str, max_tokens: int = 900) -> str:
        resp = await self.client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.4,
            max_tokens=max_tokens,
        )
        return (resp.choices[0].message.content or "").strip()

    async def on_message(
        self,
        msg,
        tools,
        history,
        participants_msg,
        contacts_msg,
        *,
        is_session_bootstrap,
        room_id,
    ) -> None:
        # Primary loop guard: never react to our own messages.
        if msg.sender_id == self.ids[self.role]:
            return

        agent_ids = (self.ids["red"], self.ids["blue"], self.ids["arbiter"])

        # ---------------- RED: attack a fresh draft OR a "go again" from the Arbiter ----------------
        if self.role == "red":
            from_human = msg.sender_id not in agent_ids
            from_arbiter_again = (
                msg.sender_id == self.ids["arbiter"]
                and bool(section(msg.content, "NEXTROUND"))
            )
            if not (from_human or from_arbiter_again):
                return  # ignore everything else (incl. Arbiter's approve/escalate to human)

            # A human sign-off is a governance decision, NOT a new draft. The Arbiter
            # records it; Red must not attack it (that would start a junk run).
            if from_human and parse_signoff(msg.content) is not None:
                return

            if from_human:
                artifact = strip_mentions(msg.content)
                rnd = 1
                if artifact:
                    await self.audit.append(rnd=rnd, event="submission", agent="user", artifact=artifact)
            else:  # Arbiter asked for another round; artifact = Blue's last revision.
                artifact = strip_mentions(section(msg.content, "ARTIFACT"))
                rnd = parse_round(msg.content, default=1)

            if not artifact:
                return
            log.info("[red] round %d: attacking artifact (%d chars)", rnd, len(artifact))
            try:
                findings = await self._llm(
                    RED_SYSTEM, f"DRAFT ARTIFACT TO ATTACK:\n\n{artifact}"
                )
            except Exception as e:  # noqa: BLE001
                log.error("[red] LLM failed: %s", e)
                await tools.send_message(f"(Red failed: {e})", mentions=[USER_HANDLE])
                return
            await self.audit.append(rnd=rnd, event="findings", agent="red", findings=findings)
            body = (
                f"Blue, revise the artifact to address these findings (round {rnd}), "
                "then pass it to the Arbiter.\n\n"
                + wrap(ROUND=str(rnd), ARTIFACT=artifact, FINDINGS=findings)
            )
            log.info("[red] round %d: posting findings -> Blue", rnd)
            await tools.send_message(body, mentions=[BLUE_HANDLE])

        # ---------------- BLUE: revise to address findings ----------------
        elif self.role == "blue":
            if msg.sender_id != self.ids["red"]:
                return  # only react to Red
            rnd = parse_round(msg.content, default=1)
            artifact = section(msg.content, "ARTIFACT")
            findings = section(msg.content, "FINDINGS")
            if not artifact or not findings:
                log.warning("[blue] round %d: could not parse sections from Red", rnd)
                return
            log.info("[blue] round %d: revising artifact to address findings", rnd)
            try:
                revision = await self._llm(
                    BLUE_SYSTEM,
                    f"ARTIFACT:\n{artifact}\n\nRED'S FINDINGS:\n{findings}\n\n"
                    "Produce the full revised, hardened artifact.",
                )
            except Exception as e:  # noqa: BLE001
                log.error("[blue] LLM failed: %s", e)
                await tools.send_message(f"(Blue failed: {e})", mentions=[USER_HANDLE])
                return
            await self.audit.append(rnd=rnd, event="revision", agent="blue", revision=revision)
            body = (
                f"Arbiter, judge whether this revision is ready for human sign-off (round {rnd}).\n\n"
                + wrap(ROUND=str(rnd), ARTIFACT=artifact, FINDINGS=findings, REVISION=revision)
            )
            log.info("[blue] round %d: posting revision -> Arbiter", rnd)
            await tools.send_message(body, mentions=[ARBITER_HANDLE])

        # ---------------- ARBITER: judge, score, then APPROVE / loop / escalate ----------------
        elif self.role == "arbiter":
            # Governance owner also records the human's final sign-off. Humans never
            # drive the judging path, so handle (and return) before the Blue gate.
            if msg.sender_id not in agent_ids:
                parsed = parse_signoff(msg.content)
                if parsed is not None:
                    decision, signoff_text = parsed
                    await self.audit.append(
                        rnd=self.audit._last_round,
                        event="human_signoff",
                        agent="human",
                        decision=decision,
                        signoff=signoff_text,
                    )
                    verb = "APPROVED" if decision == "APPROVE" else "REJECTED"
                    log.info("[arbiter] human sign-off recorded: %s", decision)
                    await tools.send_message(
                        f"Sign-off recorded for {self.audit.run_id}: {verb}. "
                        "Sealed in the tamper-evident audit chain.",
                        mentions=[USER_HANDLE],
                    )
                return  # any other human message: ignore (Arbiter only judges Blue)

            if msg.sender_id != self.ids["blue"]:
                return  # only react to Blue
            rnd = parse_round(msg.content, default=1)
            artifact = section(msg.content, "ARTIFACT")
            findings = section(msg.content, "FINDINGS")
            revision = section(msg.content, "REVISION")
            if not revision:
                log.warning("[arbiter] round %d: could not parse revision from Blue", rnd)
                return
            log.info("[arbiter] round %d: judging the revision", rnd)
            try:
                verdict = await self._llm(
                    ARBITER_SYSTEM,
                    f"ORIGINAL ARTIFACT:\n{artifact}\n\n"
                    f"RED'S FINDINGS:\n{findings}\n\n"
                    f"BLUE'S REVISION:\n{revision}\n\nJudge it now.",
                    max_tokens=700,
                )
            except Exception as e:  # noqa: BLE001
                log.error("[arbiter] LLM failed: %s", e)
                await tools.send_message(f"(Arbiter failed: {e})", mentions=[USER_HANDLE])
                return

            decision = parse_decision(verdict)
            score = parse_score(verdict)
            log.info("[arbiter] round %d: decision=%s score=%s", rnd, decision, score)
            score_txt = f"{score}/100" if score is not None else "n/a"
            await self.audit.append(
                rnd=rnd, event="verdict", agent="arbiter",
                score=score, decision=decision, verdict=verdict,
            )

            # APPROVE -> hand the final hardened artifact to the human for sign-off.
            if decision == "APPROVE":
                await self.audit.append(rnd=rnd, event="approved", agent="arbiter", score=score, final=revision)
                body = (
                    f"APPROVED after {rnd} round(s). Hardening score: {score_txt}.\n\n"
                    f"--- ARBITER VERDICT ---\n{verdict}\n\n"
                    f"--- FINAL HARDENED ARTIFACT (ready for your sign-off) ---\n{revision}\n\n"
                    "To sign off, reply: @rosyadz123/arbiter-agent SIGNOFF: APPROVE <note>"
                )
                log.info("[arbiter] APPROVE -> human")
                await tools.send_message(body, mentions=[USER_HANDLE])
                return

            # ANOTHER ROUND but cap reached -> escalate to the human.
            if rnd >= MAX_ROUNDS:
                await self.audit.append(rnd=rnd, event="escalated", agent="arbiter", score=score, best_version=revision)
                body = (
                    f"ESCALATION: hit the {MAX_ROUNDS}-round limit without full approval "
                    f"(latest hardening score: {score_txt}).\n"
                    "This is the most hardened version so far, plus the open risks below. "
                    "Needs a human decision.\n\n"
                    f"--- ARBITER VERDICT ---\n{verdict}\n\n"
                    f"--- BEST VERSION SO FAR ---\n{revision}\n\n"
                    "To sign off, reply: @rosyadz123/arbiter-agent SIGNOFF: APPROVE|REJECT <note>"
                )
                log.info("[arbiter] max rounds reached -> escalate to human")
                await tools.send_message(body, mentions=[USER_HANDLE])
                return

            # ANOTHER ROUND, under the cap -> bounce Blue's revision back to Red as new artifact.
            next_round = rnd + 1
            body = (
                f"Red, this revision is not ready yet (score {score_txt}). "
                f"Attack it again - round {next_round}.\n\n"
                + wrap(NEXTROUND="go", ROUND=str(next_round), ARTIFACT=revision)
            )
            log.info("[arbiter] ANOTHER ROUND -> Red (round %d)", next_round)
            await tools.send_message(body, mentions=[RED_HANDLE])


async def main() -> None:
    api_key = os.environ.get(API_KEY_ENV)
    if not api_key:
        raise SystemExit(f"Missing {API_KEY_ENV}. Put it in a .env file.")
    client = AsyncOpenAI(base_url=BASE_URL, api_key=api_key)
    audit = AuditLog(AUDIT_PATH)

    red_id, red_key = load_agent_config("red")
    blue_id, blue_key = load_agent_config("blue")
    arb_id, arb_key = load_agent_config("arbiter")
    ids = {"red": red_id, "blue": blue_id, "arbiter": arb_id}
    log.info(
        "loaded: red=%s blue=%s arbiter=%s (model=%s, max_rounds=%d)",
        red_id, blue_id, arb_id, MODEL, MAX_ROUNDS,
    )
    log.info("audit trail -> %s (continuing from seq=%d)", os.path.abspath(AUDIT_PATH), audit._seq)

    red = Agent.create(
        adapter=CrucibleAdapter(role="red", ids=ids, client=client, audit=audit),
        agent_id=red_id, api_key=red_key,
    )
    blue = Agent.create(
        adapter=CrucibleAdapter(role="blue", ids=ids, client=client, audit=audit),
        agent_id=blue_id, api_key=blue_key,
    )
    arbiter = Agent.create(
        adapter=CrucibleAdapter(role="arbiter", ids=ids, client=client, audit=audit),
        agent_id=arb_id, api_key=arb_key,
    )

    await asyncio.gather(red.start(), blue.start(), arbiter.start())
    log.info("Crucible online: Red + Blue + Arbiter (looping, max %d rounds).", MAX_ROUNDS)
    log.info("In Band, send a draft to the Red Agent, e.g.:")
    log.info("    @rosyadz123/red-agent here is my incident runbook: <paste it>")
    log.info("After APPROVE/ESCALATE, sign off to the Arbiter, e.g.:")
    log.info("    @rosyadz123/arbiter-agent SIGNOFF: APPROVE accepting residual risk")
    log.info("waiting - press Ctrl+C to stop.")

    try:
        await asyncio.Event().wait()
    finally:
        await asyncio.gather(red.stop(), blue.stop(), arbiter.stop())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
