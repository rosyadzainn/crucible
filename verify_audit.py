"""
Verify the Crucible audit trail's hash chain.

Usage:
    .venv\\Scripts\\python verify_audit.py            (checks crucible_audit.jsonl)
    .venv\\Scripts\\python verify_audit.py other.jsonl

Recomputes each entry's hash and checks it links to the previous entry. If anyone
edited, reordered, inserted, or deleted a line, the chain breaks and we report where.
"""

import hashlib
import json
import sys

GENESIS_HASH = "0" * 64


def hash_entry(entry: dict) -> str:
    payload = json.dumps(entry, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else "crucible_audit.jsonl"
    try:
        f = open(path, "r", encoding="utf-8")
    except FileNotFoundError:
        print(f"No audit file at {path} (run crucible.py and submit a draft first).")
        return 1

    prev = GENESIS_HASH
    n = 0
    with f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                print(f"BROKEN at line {i}: not valid JSON")
                return 1
            stored = entry.pop("hash", None)
            if entry.get("prev_hash") != prev:
                print(f"BROKEN at line {i} (seq={entry.get('seq')}): prev_hash does not match the previous entry")
                return 1
            if hash_entry(entry) != stored:
                print(f"BROKEN at line {i} (seq={entry.get('seq')}): content was altered (hash mismatch)")
                return 1
            prev = stored
            n += 1

    print(f"OK: {n} entries, chain intact. head hash = {prev[:16]}...")
    return 0


if __name__ == "__main__":
    sys.exit(main())
