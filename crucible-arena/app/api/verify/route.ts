import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Read-only verifier. Re-computes the tamper-evident hash chain from the
// CANONICAL record (crucible_audit.jsonl) using the EXACT algorithm in
// crucible.py: sha256 over json.dumps(entry, sort_keys=True, ensure_ascii=False,
// separators=(",",":")) with the "hash" field removed, plus a prev_hash link.
//
// NOTE: we deliberately do NOT verify from Supabase. The Supabase mirror is a
// lossy copy — it drops `ts` and `prev_hash` and renames the body field to
// `content`, so the original hash pre-image cannot be reconstructed from it.
// The JSONL is the canonical, tamper-evident record (see crucible.py).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENESIS_HASH = "0".repeat(64);

// Byte-for-byte equivalent of Python json.dumps(sort_keys=True,
// ensure_ascii=False, separators=(",",":")). Entries hold only scalars, but the
// serializer recurses for safety. JSON.stringify on a string yields the same
// minimal escaping (\" \\ \n \t \r \b \f, \u00xx for other control chars,
// non-ASCII left raw) that Python emits with ensure_ascii=False.
function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort(); // code-point sort == Python sort_keys for these keys
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonical(obj[k])).join(",") +
    "}"
  );
}

function hashEntry(entry: Record<string, unknown>): string {
  return createHash("sha256").update(canonical(entry), "utf-8").digest("hex");
}

async function readAuditFile(): Promise<string | null> {
  const candidates = [
    process.env.CRUCIBLE_AUDIT_PATH,
    path.join(process.cwd(), "..", "crucible_audit.jsonl"),
    path.join(process.cwd(), "crucible_audit.jsonl"),
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      return await readFile(p, "utf-8");
    } catch {
      // try next candidate
    }
  }
  return null;
}

type VerifyResult =
  | { status: "intact"; entries: number; headHash: string | null }
  | { status: "broken"; brokenSeq: number; entries: number; headHash: string | null }
  | { status: "unavailable"; entries: 0; headHash: null; error: string };

export async function GET() {
  const text = await readAuditFile();
  if (text === null) {
    const body: VerifyResult = {
      status: "unavailable",
      entries: 0,
      headHash: null,
      error: "Canonical audit log (crucible_audit.jsonl) not found.",
    };
    return Response.json(body);
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let prev = GENESIS_HASH;
  let entries = 0;

  for (const line of lines) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line);
    } catch {
      const body: VerifyResult = {
        status: "broken",
        brokenSeq: entries, // first malformed line (0-based count so far)
        entries,
        headHash: prev === GENESIS_HASH ? null : prev,
      };
      return Response.json(body);
    }

    const stored = entry.hash as string | undefined;
    const seq = typeof entry.seq === "number" ? entry.seq : entries;
    delete entry.hash;

    // each entry must link to the previous entry's hash
    if (entry.prev_hash !== prev) {
      const body: VerifyResult = {
        status: "broken",
        brokenSeq: seq,
        entries,
        headHash: prev === GENESIS_HASH ? null : prev,
      };
      return Response.json(body);
    }

    // content must hash to the stored value
    if (hashEntry(entry) !== stored) {
      const body: VerifyResult = {
        status: "broken",
        brokenSeq: seq,
        entries,
        headHash: prev === GENESIS_HASH ? null : prev,
      };
      return Response.json(body);
    }

    prev = stored as string;
    entries += 1;
  }

  const body: VerifyResult = {
    status: "intact",
    entries,
    headHash: entries === 0 ? null : prev,
  };
  return Response.json(body);
}
