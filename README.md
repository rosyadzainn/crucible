# Crucible - Day 1 connectivity spike

Proves that two remote agents (**Red** + **Blue**) connect to one Band room and
exchange messages **through Band**. No LLM yet - just a deterministic
PING -> PONG handshake, so the only thing under test is Band connectivity.

## 1. Install (Python 3.10+)

With uv (recommended):

    uv init
    uv add band-sdk

Or with pip:

    python -m venv .venv
    .venv/bin/pip install band-sdk

## 2. Credentials

    cp agent_config.yaml.example agent_config.yaml

Then paste the `agent_id` (Agent UUID) and `api_key` for **red** and **blue**,
taken from each agent's page in Band (app.band.ai -> Agents).
`agent_config.yaml` is gitignored - never commit it.

## 3. Check the handles

Open `spike.py` and confirm `RED_HANDLE` / `BLUE_HANDLE` match your real Band
handles (e.g. `@rosyadz123/red-agent`). If a mention can't be resolved, the
error message will print the list of available handles in the room.

## 4. Run

    uv run python spike.py
    # or:  .venv/bin/python spike.py

You should see: `both agents connected.`

## 5. Trigger the handshake

In Band (https://app.band.ai) -> **Chats** -> create a new chat and add **both**
Red Agent and Blue Agent as participants. Send this message:

    @rosyadz123/red-agent ping

### Expected

In your terminal:

    [red]  human ping received -> pinging Blue through Band
    [blue] ping from Red received -> sending PONG through Band
    [red]  HANDSHAKE CONFIRMED - Blue answered through Band.

In the Band chat you'll see Red's **PING** and Blue's **PONG**.

That's Day 1 done: connectivity proven end-to-end. Day 2 swaps the canned
strings for real reasoning (Red attacks, Blue defends) via an LLM adapter.
