"""
Crucible - Day 2, step A: give Red a real adversarial brain.

Red now uses an LLM to produce a genuine red-team critique of a draft artifact
you send it, and posts that critique back through Band.

Only Red runs here on purpose - we are isolating ONE new thing:
real reasoning flowing through Band. (Blue and the Arbiter come next.)

Flow:
    You (human)  --@red <paste a draft artifact>-->  Red  --(LLM critique)-->  @you

Setup:
    1. .venv\\Scripts\\pip install openai
    2. Create a .env file (see .env.example) containing:  FEATHERLESS_API_KEY=your_key
    3. .venv\\Scripts\\python red_attack.py
    4. In Band, send the Red Agent a draft, e.g.:
         @rosyadz123/red-agent here is my incident runbook: <paste it>
"""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

from band import Agent
from band.core.simple_adapter import SimpleAdapter
from band.config import load_agent_config

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-10s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("crucible")

# Your Band handle, so Red can mention you back when it replies.
USER_HANDLE = "@rosyadz123"

# --- LLM provider: Featherless AI (OpenAI-compatible) ----------------------
# We just point the OpenAI SDK at Featherless's base URL.
BASE_URL = "https://api.featherless.ai/v1"
MODEL = "Qwen/Qwen2.5-7B-Instruct"  # free-tier friendly (small). On Feather Premium you can
                                    # swap to a strong model, e.g. "deepseek-ai/DeepSeek-V3-0324".
API_KEY_ENV = "FEATHERLESS_API_KEY"
#
# To switch to AI/ML API later (once your lablab coupon unlocks), change to:
#   BASE_URL    = "https://api.aimlapi.com/v1"
#   MODEL       = "gpt-4o"
#   API_KEY_ENV = "AIML_API_KEY"
# (and put that key in .env instead) - nothing else changes.

RED_SYSTEM_PROMPT = """You are Red, an adversarial red-team reviewer in a high-stakes review process.
You receive a DRAFT ARTIFACT - for example an incident-response runbook, a security
policy, an access configuration, or a contract clause.

Your job: break it before reality does. Find the most serious flaws, gaps,
ambiguities, exploitable assumptions, and failure modes.

Rules:
- Be concrete and specific. Quote or reference the actual content. No generic advice.
- Prioritise by severity; lead with what could cause real damage.
- For each finding give: a short name, the exact failure scenario, and a severity
  label (Critical / High / Medium / Low).
- Be terse and surgical. No preamble, no praise. Give 3-6 findings, strongest first.
- Be adversarial but honest: never invent flaws that aren't there."""


class RedAttackAdapter(SimpleAdapter):
    """Red, with a real LLM brain. Reads a draft, returns prioritized findings."""

    def __init__(self, *, self_id: str, client: AsyncOpenAI):
        super().__init__()
        self.self_id = self_id
        self.client = client

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
        # Ignore our own messages.
        if msg.sender_id == self.self_id:
            return

        draft = (msg.content or "").strip()
        if not draft:
            return

        log.info(
            "[red] received a draft (%d chars) -> asking the LLM to attack it",
            len(draft),
        )
        try:
            resp = await self.client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": RED_SYSTEM_PROMPT},
                    {"role": "user", "content": f"DRAFT ARTIFACT TO ATTACK:\n\n{draft}"},
                ],
                temperature=0.4,
                max_tokens=700,
            )
            findings = (resp.choices[0].message.content or "").strip()
        except Exception as e:  # noqa: BLE001
            log.error("[red] LLM call failed: %s", e)
            await tools.send_message(
                f"(Red could not run its analysis: {e})", mentions=[USER_HANDLE]
            )
            return

        log.info("[red] got findings from the LLM -> posting through Band")
        await tools.send_message(findings, mentions=[USER_HANDLE])


async def main() -> None:
    api_key = os.environ.get(API_KEY_ENV)
    if not api_key:
        raise SystemExit(
            f"Missing {API_KEY_ENV}. Create a .env file in this folder containing:\n"
            f"    {API_KEY_ENV}=your_key"
        )

    client = AsyncOpenAI(base_url=BASE_URL, api_key=api_key)

    red_id, red_key = load_agent_config("red")
    log.info("loaded red=%s  (model=%s)", red_id, MODEL)

    red = Agent.create(
        adapter=RedAttackAdapter(self_id=red_id, client=client),
        agent_id=red_id,
        api_key=red_key,
    )

    await red.start()
    log.info("Red is online WITH A BRAIN.")
    log.info("In Band, send the Red Agent a draft artifact, e.g.:")
    log.info("    @rosyadz123/red-agent here is my incident runbook: <paste it>")
    log.info("waiting for a draft - press Ctrl+C to stop.")

    try:
        await asyncio.Event().wait()
    finally:
        await red.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
