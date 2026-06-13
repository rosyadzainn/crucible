"""
Crucible - Day 1 connectivity spike.

Goal: prove that two remote agents (Red, Blue) can connect to ONE Band room
and exchange messages THROUGH Band. No LLM yet - just a deterministic
PING -> PONG handshake, so we isolate exactly one variable: Band connectivity.

Flow:
    You (human) --@red ping-->  Red  --@blue PING-->  Blue  --@red PONG-->  Red
                                                                   (logs success, stops)

Why no infinite loop:
    - Each agent ignores its own messages.
    - Red only reacts to a HUMAN message; when Blue's PONG comes back
      (sender = Blue), Red ignores it.
    - Blue only reacts to RED; it ignores humans and itself.

Run instructions are in README.md.
"""

from __future__ import annotations

import asyncio
import logging

from band import Agent
from band.core.simple_adapter import SimpleAdapter
from band.config import load_agent_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-10s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("spike")

# --- Non-secret config: confirm these match YOUR Band handles -------------
# (Secrets - agent_id + api_key - live in agent_config.yaml, which is gitignored.)
RED_HANDLE = "@rosyadz123/red-agent"
BLUE_HANDLE = "@rosyadz123/blue-agent"


class HandshakeAdapter(SimpleAdapter):
    """Deterministic ping/pong. No LLM - this only tests Band connectivity."""

    def __init__(self, *, role: str, self_id: str, red_id: str, blue_id: str):
        super().__init__()  # no history converter needed for the spike
        self.role = role  # "red" or "blue"
        self.self_id = self_id
        self.red_id = red_id
        self.blue_id = blue_id

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
        # 1. Never react to our own messages (prevents self-triggering).
        if msg.sender_id == self.self_id:
            return

        who = msg.sender_name or msg.sender_id
        log.info("[%s] <- from %s: %s", self.role, who, msg.content)

        if self.role == "red":
            # Red is the initiator. It reacts only to a HUMAN message
            # (anyone who is not one of our two known agents).
            if msg.sender_id == self.blue_id:
                log.info("[red] HANDSHAKE CONFIRMED - Blue answered through Band.")
                return
            if msg.sender_id == self.red_id:
                return
            log.info("[red] human ping received -> pinging Blue through Band")
            try:
                await tools.send_message(
                    "PING from Red. Blue, do you copy?",
                    mentions=[BLUE_HANDLE],
                )
            except Exception as e:  # noqa: BLE001
                log.error(
                    "[red] could not message Blue (%s). "
                    "Is Blue a participant in this room?",
                    e,
                )

        elif self.role == "blue":
            # Blue answers only Red; ignores humans and itself.
            if msg.sender_id != self.red_id:
                return
            log.info("[blue] ping from Red received -> sending PONG through Band")
            try:
                await tools.send_message(
                    "PONG from Blue. Copy that, Red - we are connected.",
                    mentions=[RED_HANDLE],
                )
            except Exception as e:  # noqa: BLE001
                log.error(
                    "[blue] could not message Red (%s). "
                    "Is Red a participant in this room?",
                    e,
                )


async def main() -> None:
    red_id, red_key = load_agent_config("red")
    blue_id, blue_key = load_agent_config("blue")
    log.info("loaded credentials: red=%s  blue=%s", red_id, blue_id)

    red = Agent.create(
        adapter=HandshakeAdapter(
            role="red", self_id=red_id, red_id=red_id, blue_id=blue_id
        ),
        agent_id=red_id,
        api_key=red_key,
    )
    blue = Agent.create(
        adapter=HandshakeAdapter(
            role="blue", self_id=blue_id, red_id=red_id, blue_id=blue_id
        ),
        agent_id=blue_id,
        api_key=blue_key,
    )

    # start() connects each agent's WebSocket and begins dispatching messages.
    await asyncio.gather(red.start(), blue.start())

    log.info("both agents connected.")
    log.info("now open Band -> Chats, create a room with BOTH Red + Blue, and send:")
    log.info("    %s ping", RED_HANDLE)
    log.info("waiting for messages - press Ctrl+C to stop.")

    try:
        await asyncio.Event().wait()  # keep the event loop alive
    finally:
        await red.stop()
        await blue.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
