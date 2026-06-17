import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import LandingContent from "./landing-content";
import "./landing.css";

export const metadata: Metadata = {
  title: "Crucible — Adversarial Document Hardening",
  description:
    "Crucible turns three adversarial AI agents loose on your most dangerous documents, then seals every step in a tamper-evident record.",
};

export type ChainWidgetData = {
  entries: number;
  headHash: string;
  nodeHashes: string[];
};

async function getChainData(): Promise<ChainWidgetData | null> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await sb
      .from("audit_events")
      .select("seq, hash")
      .order("seq", { ascending: true });
    if (!data || data.length === 0) return null;
    const head = data[data.length - 1] as { seq: number; hash: string | null };
    return {
      entries: data.length,
      headHash: head.hash ?? "",
      nodeHashes: (data as { seq: number; hash: string | null }[])
        .slice(0, 4)
        .map((e) => e.hash ?? ""),
    };
  } catch {
    return null;
  }
}

export default async function Home() {
  const chainData = await getChainData();
  return <LandingContent chainData={chainData} />;
}
