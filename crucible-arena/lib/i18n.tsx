"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Lang = "en" | "id";

type Dict = Record<string, string>;

/* Display-only chrome dictionary. Agent-generated content (Red findings, Blue's
   document, Arbiter prose) and the human sign-off NOTE are NEVER in here — they
   render verbatim. Brand/proper nouns (CRUCIBLE, Red, Blue, Arbiter, Band, run
   ids, hashes) are intentionally absent too. */

const en: Dict = {
  // top bar / status
  live: "LIVE",
  pill_checking: "checking chain…",
  pill_intact: "chain intact",
  pill_broken: "chain BROKEN at #{seq}",
  pill_unverified: "chain unverified",

  // run header strip
  field_artifact: "Artifact",
  field_run: "Run",
  field_rounds: "Rounds",
  field_agents: "Agents",
  field_arbiter_score: "Arbiter score",

  // outcome / status badge
  outcome_human_approved: "HUMAN-APPROVED",
  outcome_human_rejected: "HUMAN-REJECTED",
  outcome_approved: "APPROVED",
  outcome_escalated: "ESCALATED",
  outcome_pending: "PENDING",

  // event log
  event_log: "Event log",
  events_rounds: "{n} events · {m} {roundsWord}",
  round: "Round",
  show_more: "show more",
  show_less: "show less",

  // event action labels
  action_submission: "Submission",
  action_attack: "Attack",
  action_attack_n: "Attack — {n} {vulnWord} found",
  action_revision: "Hardened revision",
  action_verdict: "Verdict",
  action_escalated: "Escalated",
  action_approved: "Approved",
  action_signoff: "Sign-off",

  // severity
  sev_crit: "CRITICAL",
  sev_high: "HIGH",
  sev_med: "MEDIUM",

  // decision tags
  dec_another_round: "ANOTHER ROUND",
  dec_escalate: "ESCALATE",
  dec_approved: "APPROVED",
  dec_rejected: "REJECTED",

  // passport
  passport_title: "Hardening Passport",
  passport_word: "passport",
  chain_of_custody: "Chain of custody",
  score_by_round: "Score by round",
  round_verdict_cleared: "cleared 80 · escalated to human",
  round_verdict_below: "below 80 · another round",
  round_verdict_limit: "below 80 · round limit · escalated",
  custody_origin: "Origin",
  custody_adversarial: "Adversarial review",
  custody_hardened: "Hardened",
  custody_adjudication: "Adjudication",
  custody_signoff: "Human sign-off",
  custody_sealed: "Sealed",

  detail_origin: "Human submitted the draft artifact.",
  detail_no_submission: "No submission recorded.",
  detail_adversarial: "{n} {vulnWord} across {m} {roundsWord}",
  detail_no_findings: "No findings recorded.",
  detail_hardened: "Hardened revision produced ({n} {passWord}).",
  detail_no_revision: "No revision recorded.",
  adj_final_score: "Final score",
  rounds_count: "{m} {roundsWord}",
  detail_not_adjudicated: "Not yet adjudicated.",
  detail_awaiting_signoff: "Awaiting human sign-off.",

  // adjudication decision word (inline)
  adj_escalated: "escalated",
  adj_approved: "approved",
  adj_another_round: "another round",

  // sealed / verify
  entries_count: "{n} entries",
  sealed_checking: "checking…",
  sealed_broken: "BROKEN at #{seq}",
  sealed_unverified: "unverified",
  btn_verify: "Verify chain",
  btn_verifying: "Verifying…",
  btn_intact: "✓ Chain intact — {n} entries",
  btn_broken: "✗ BROKEN at #{seq}",
  btn_unverified: "Chain unverified",

  // status messages
  msg_loading: "Loading run…",
  msg_no_events: "No audit events found.",
  msg_error: "Failed to load audit events: {err}",

  // footer (right side is brand text, kept verbatim in both languages)
  footer_left: "Crucible · Adversarial hardening desk",
  transition_opening: "Opening the Arena…",
  transition_walkthrough: "Starting the walkthrough…",

  /* ── landing page (marketing). Brand/proper nouns (Crucible, Red, Blue,
     Arbiter, Band), the tagline "Break it before reality does.", the
     "Find → Fix → Prove" motif, the example artifact title, and all
     numbers/hash are NOT keyed here — they render verbatim in both languages.
     Shared terms reuse the dashboard keys above (passport_title,
     outcome_human_approved, custody_*, adj_escalated, pill_intact,
     entries_count) so both pages match exactly. */
  lp_nav_agents: "The Agents",
  lp_nav_how: "How It Works",
  lp_nav_proof: "Proof",
  lp_nav_harden: "Walk through it",

  lp_hero_eyebrow: "Adversarial document hardening",
  lp_hero_lede:
    "Crucible turns three adversarial AI agents loose on your most dangerous documents — incident runbooks, security policies, clinical order sets — then seals every step in a tamper-evident record.",
  lp_hero_diff_a: "Most tools flag problems and stop.",
  lp_hero_diff_b: "Crucible fixes them — and proves it.",
  lp_hero_cta_harden: "Walk through an example →",
  lp_hero_cta_how: "Open the live Arena →",
  lp_hero_cap_try: "Guided · about a minute · a real hardened runbook",
  lp_hero_cap_arena: "A real run, sealed and verifiable",

  lp_card_example: "Example · Incident response",
  lp_card_critical: "Critical risk found",
  lp_card_rewritten: "Rewritten to a safe version",
  lp_card_adjudicated: "Adjudicated",
  lp_card_approved_lead: "Approved by an on-call lead",

  lp_agents_eyebrow: "The adversarial board",
  lp_agents_h2: "Three agents. One hardened document.",
  lp_agents_p:
    "Each plays a role most review tools skip — and together they don't just judge your document, they repair it until it holds.",
  lp_red_role: "The Adversary",
  lp_red_h3: "Attacks it.",
  lp_red_ad:
    "Reads your document like an attacker would, hunting for the failure that ends up in a postmortem.",
  lp_red_li1: "Finds unsafe steps and failure modes",
  lp_red_li2: "Rates each finding Critical / High / Medium",
  lp_red_li3: "Re-attacks every revision until nothing's left",
  lp_blue_role: "The Defender",
  lp_blue_h3: "Fixes it.",
  lp_blue_ad:
    "Doesn't just point at problems — rewrites the document into a hardened version that closes them.",
  lp_blue_li1: "Turns flaws into safe, specific steps",
  lp_blue_li2: "Adds the missing safeguards and checks",
  lp_blue_li3: "Hands back a deployable document, not a report",
  lp_arbiter_role: "The Judge",
  lp_arbiter_h3: "Decides.",
  lp_arbiter_ad:
    "Scores the result and rules on it: ship it, run another round, or escalate to a human.",
  lp_arbiter_li1: "Scores every round 0–100",
  lp_arbiter_li2: "Forces another round until it's safe",
  lp_arbiter_li3: "Escalates high-stakes calls to a person",
  lp_you: "+ You",
  lp_you_title: "You hold the final call.",
  lp_you_note:
    "A human always holds the final call. On high-stakes documents, Crucible escalates to a person to approve, reject, or add context — and that decision is sealed into the record too.",

  lp_how_eyebrow: "How it works",
  lp_how_h2: "From flawed draft to sealed proof.",
  lp_how_p:
    "A fully traceable adversarial process, with a human in the loop and an un-fakeable record at the end.",
  lp_step: "STEP",
  lp_instant: "~ instant",
  lp_seconds: "~ seconds",
  lp_hitl: "human-in-the-loop",
  lp_step1_h: "Submit",
  lp_step1_p: "Paste or upload your document — or load a demo to see it run.",
  lp_step2_h: "Red attacks",
  lp_step2_p: "Finds every flaw and rates it by severity, round after round.",
  lp_step3_h: "Blue hardens",
  lp_step3_p: "Rewrites the document into a safer version that closes the gaps.",
  lp_step4_h: "Arbiter judges",
  lp_step4_p: "Scores it and sends it back for another round until it holds.",
  lp_step5_h: "Human signs off",
  lp_step5_p: "A person approves, rejects, or adds context on high-stakes calls.",
  lp_step6_p: "Every step locked into a tamper-evident chain you can verify.",

  lp_vs_m_find_d: "Spots flaws and produces a report",
  lp_vs_m_fix_d: "Hands it back — you fix it manually",
  lp_vs_m_prove_d: "No record of what changed, or when",
  lp_vs_c_find_d: "Red attacks the document for flaws — round after round",
  lp_vs_c_fix_d: "Blue rewrites it into a hardened, deployable version",
  lp_vs_c_prove_d: "Every step sealed in a tamper-evident chain you can verify",

  lp_proof_eyebrow: "Tamper-evident by design",
  lp_proof_h2: "Proof you can break.",
  lp_proof_p:
    "Every attack, fix, score, and sign-off is sealed into a hash chain. Change one character of the record and verification fails instantly — restore it, and it passes again.",
  lp_proof_pb: "It's not a claim on a slide. Break it live, on stage.",
  lp_entries: "Entries",
  lp_head_hash: "Head hash",
  lp_every_step: "Every step",
  lp_sealed_linked: "sealed & linked",
  lp_chain_broken: "chain BROKEN",

  lp_band_agents: "adversarial agents",
  lp_band_every: "Every",
  lp_band_step_sealed: "step sealed",
  lp_band_human: "Human",
  lp_band_in_loop: "in the loop",
  lp_band_types: "Runbooks · policies · contracts · order sets",

  lp_final_eyebrow: "Try it",
  lp_final_h2: "Harden your first document.",
  lp_final_p:
    "Load the demo and watch Red, Blue, and Arbiter go to work — then verify the sealed record yourself.",
  lp_final_demo: "Walk through an example →",
  lp_final_arena: "Open the live Arena",

  lp_foot_tagline: "The adversarial hardening desk for high-stakes documents.",
  lp_foot_product: "Product",
  lp_foot_start: "Start",
  lp_foot_builton: "Built on",
  lp_foot_band: "Band multi-agent orchestration",
  lp_foot_chain: "Tamper-evident hash chain",
  lp_foot_hitl: "Human-in-the-loop sign-off",
  lp_foot_for: "For",
  lp_foot_ir: "Incident response",
  lp_foot_sec: "Security & compliance",
  lp_foot_health: "Healthcare order sets",
  lp_foot_desk: "Adversarial hardening desk",

  // landing — "Under the hood" tech section (logo names stay literal English)
  lp_stack_eyebrow: "Built with",
  lp_stack_title: "Under the hood.",
  lp_stack_intro:
    "The agents run on Band, powered by Featherless. The Arena is a Next.js app with Supabase, deployed on Vercel — and every step is sealed with a SHA-256 hash chain.",

  // intro overlay (cinematic loading screen — landing only)
  // intro_status_find reuses custody_adversarial: "Adversarial review"
  intro_status_fix: "Hardening",
  intro_status_arbiter: "Adjudicating",
  intro_status_seal: "Sealed · tamper-evident",
};

const id: Dict = {
  live: "LANGSUNG",
  pill_checking: "memeriksa rantai…",
  pill_intact: "rantai utuh",
  pill_broken: "rantai RUSAK di #{seq}",
  pill_unverified: "rantai belum terverifikasi",

  field_artifact: "Artefak",
  field_run: "Run",
  field_rounds: "Ronde",
  field_agents: "Agen",
  field_arbiter_score: "Skor Arbiter",

  outcome_human_approved: "DISETUJUI MANUSIA",
  outcome_human_rejected: "DITOLAK MANUSIA",
  outcome_approved: "DISETUJUI",
  outcome_escalated: "DIESKALASI",
  outcome_pending: "MENUNGGU",

  event_log: "Log peristiwa",
  events_rounds: "{n} peristiwa · {m} {roundsWord}",
  round: "Ronde",
  show_more: "lihat selengkapnya",
  show_less: "lihat ringkas",

  action_submission: "Pengajuan",
  action_attack: "Serangan",
  action_attack_n: "Serangan — {n} kerentanan ditemukan",
  action_revision: "Revisi perkuatan",
  action_verdict: "Vonis",
  action_escalated: "Dieskalasi",
  action_approved: "Disetujui",
  action_signoff: "Persetujuan",

  sev_crit: "KRITIS",
  sev_high: "TINGGI",
  sev_med: "SEDANG",

  dec_another_round: "RONDE LAGI",
  dec_escalate: "ESKALASI",
  dec_approved: "DISETUJUI",
  dec_rejected: "DITOLAK",

  passport_title: "Paspor Perkuatan",
  passport_word: "paspor",
  chain_of_custody: "Rantai kustodi",
  score_by_round: "Skor per ronde",
  round_verdict_cleared: "lolos 80 · eskalasi ke manusia",
  round_verdict_below: "di bawah 80 · ronde lagi",
  round_verdict_limit: "di bawah 80 · batas ronde · eskalasi",
  custody_origin: "Asal",
  custody_adversarial: "Tinjauan adversarial",
  custody_hardened: "Diperkuat",
  custody_adjudication: "Putusan",
  custody_signoff: "Persetujuan manusia",
  custody_sealed: "Tersegel",

  detail_origin: "Manusia mengirim draf dokumen.",
  detail_no_submission: "Tidak ada pengajuan tercatat.",
  detail_adversarial: "{n} kerentanan dalam {m} {roundsWord}",
  detail_no_findings: "Tidak ada temuan tercatat.",
  detail_hardened: "Revisi yang diperkuat dihasilkan ({n} {passWord}).",
  detail_no_revision: "Tidak ada revisi tercatat.",
  adj_final_score: "Skor akhir",
  rounds_count: "{m} {roundsWord}",
  detail_not_adjudicated: "Belum diputus.",
  detail_awaiting_signoff: "Menunggu persetujuan manusia.",

  adj_escalated: "dieskalasi",
  adj_approved: "disetujui",
  adj_another_round: "ronde lagi",

  entries_count: "{n} entri",
  sealed_checking: "memeriksa…",
  sealed_broken: "RUSAK di #{seq}",
  sealed_unverified: "belum terverifikasi",
  btn_verify: "Verifikasi rantai",
  btn_verifying: "Memverifikasi…",
  btn_intact: "✓ Rantai utuh — {n} entri",
  btn_broken: "✗ RUSAK di #{seq}",
  btn_unverified: "Rantai belum terverifikasi",

  msg_loading: "Memuat run…",
  msg_no_events: "Tidak ada peristiwa audit ditemukan.",
  msg_error: "Gagal memuat peristiwa audit: {err}",

  footer_left: "Crucible · Meja perkuatan adversarial",
  transition_opening: "Membuka Arena…",
  transition_walkthrough: "Memulai walkthrough…",

  // ── landing page (marketing) ──
  lp_nav_agents: "Para Agen",
  lp_nav_how: "Cara Kerja",
  lp_nav_proof: "Bukti",
  lp_nav_harden: "Telusuri contoh",

  lp_hero_eyebrow: "Perkuatan dokumen secara adversarial",
  lp_hero_lede:
    "Crucible melepaskan tiga agen AI adversarial ke dokumen-dokumen paling berisikomu — runbook insiden, kebijakan keamanan, order set klinis — lalu menyegel setiap langkah ke dalam catatan anti-palsu.",
  lp_hero_diff_a: "Kebanyakan tool cuma menandai masalah lalu berhenti.",
  lp_hero_diff_b: "Crucible memperbaikinya — dan membuktikannya.",
  lp_hero_cta_harden: "Telusuri contohnya →",
  lp_hero_cta_how: "Buka Arena live →",
  lp_hero_cap_try: "Terpandu · sekitar semenit · runbook nyata yang dikeraskan",
  lp_hero_cap_arena: "Run nyata, tersegel dan dapat diverifikasi",

  lp_card_example: "Contoh · Respons insiden",
  lp_card_critical: "Risiko kritis ditemukan",
  lp_card_rewritten: "Ditulis ulang jadi versi aman",
  lp_card_adjudicated: "Putusan",
  lp_card_approved_lead: "Disetujui oleh on-call lead",

  lp_agents_eyebrow: "Dewan adversarial",
  lp_agents_h2: "Tiga agen. Satu dokumen yang diperkuat.",
  lp_agents_p:
    "Masing-masing punya peran yang dilewatin kebanyakan tool review — dan bareng-bareng mereka nggak cuma menilai dokumenmu, tapi memperbaikinya sampai benar-benar tahan.",
  lp_red_role: "Sang Penyerang",
  lp_red_h3: "Menyerang.",
  lp_red_ad:
    "Membaca dokumenmu seperti seorang penyerang, memburu celah yang berujung jadi bahan postmortem.",
  lp_red_li1: "Menemukan langkah tidak aman dan titik gagal",
  lp_red_li2: "Memberi label tiap temuan: Critical / High / Medium",
  lp_red_li3: "Menyerang ulang tiap revisi sampai tak ada yang tersisa",
  lp_blue_role: "Sang Pembela",
  lp_blue_h3: "Memperbaiki.",
  lp_blue_ad:
    "Nggak cuma nunjuk masalah — menulis ulang dokumen jadi versi yang diperkuat dan menutup celahnya.",
  lp_blue_li1: "Mengubah celah jadi langkah yang aman dan spesifik",
  lp_blue_li2: "Menambah pengaman dan pengecekan yang kurang",
  lp_blue_li3: "Mengembalikan dokumen yang siap pakai, bukan laporan",
  lp_arbiter_role: "Sang Juri",
  lp_arbiter_h3: "Memutuskan.",
  lp_arbiter_ad:
    "Menilai hasilnya lalu memutuskan: loloskan, jalankan ronde lagi, atau eskalasi ke manusia.",
  lp_arbiter_li1: "Menilai tiap ronde 0–100",
  lp_arbiter_li2: "Memaksa ronde lagi sampai aman",
  lp_arbiter_li3: "Mengeskalasi keputusan berisiko tinggi ke manusia",
  lp_you: "+ Kamu",
  lp_you_title: "Keputusan akhir di tangan kamu.",
  lp_you_note:
    "Manusia selalu pegang keputusan akhir. Untuk dokumen berisiko tinggi, Crucible mengeskalasi ke manusia buat menyetujui, menolak, atau menambah konteks — dan keputusan itu ikut disegel ke dalam catatan.",

  lp_how_eyebrow: "Cara kerja",
  lp_how_h2: "Dari draft cacat jadi bukti tersegel.",
  lp_how_p:
    "Proses adversarial yang sepenuhnya terlacak, dengan manusia di dalam alur dan catatan yang tak bisa dipalsukan di ujungnya.",
  lp_step: "LANGKAH",
  lp_instant: "~ seketika",
  lp_seconds: "~ detik",
  lp_hitl: "human-in-the-loop",
  lp_step1_h: "Kirim",
  lp_step1_p: "Tempel atau unggah dokumenmu — atau muat demo buat lihat dia jalan.",
  lp_step2_h: "Red menyerang",
  lp_step2_p: "Menemukan tiap celah dan memberi label tingkat bahaya, ronde demi ronde.",
  lp_step3_h: "Blue memperkuat",
  lp_step3_p: "Menulis ulang dokumen jadi versi lebih aman yang menutup celahnya.",
  lp_step4_h: "Arbiter menilai",
  lp_step4_p: "Menilainya dan mengembalikannya untuk ronde lagi sampai tahan.",
  lp_step5_h: "Manusia menandatangani",
  lp_step5_p: "Seseorang menyetujui, menolak, atau menambah konteks untuk keputusan berisiko tinggi.",
  lp_step6_p: "Tiap langkah dikunci ke rantai anti-palsu yang bisa kamu verifikasi.",

  lp_vs_m_find_d: "Menemukan celah dan menghasilkan laporan",
  lp_vs_m_fix_d: "Dikembalikan ke kamu — kamu yang memperbaikinya",
  lp_vs_m_prove_d: "Tidak ada catatan apa yang berubah, atau kapan",
  lp_vs_c_find_d: "Red menyerang dokumen mencari celah — ronde demi ronde",
  lp_vs_c_fix_d: "Blue menulis ulang jadi versi yang diperkuat dan siap pakai",
  lp_vs_c_prove_d: "Tiap langkah disegel dalam rantai anti-palsu yang bisa kamu verifikasi",

  lp_proof_eyebrow: "Anti-palsu sejak dirancang",
  lp_proof_h2: "Bukti yang bisa kamu pecahkan.",
  lp_proof_p:
    "Tiap serangan, perbaikan, skor, dan tanda tangan disegel ke dalam hash chain. Ubah satu karakter saja di catatannya, verifikasi langsung gagal — kembalikan, dan lolos lagi.",
  lp_proof_pb: "Ini bukan klaim di slide. Pecahkan langsung, di atas panggung.",
  lp_entries: "Entri",
  lp_head_hash: "Hash kepala",
  lp_every_step: "Tiap langkah",
  lp_sealed_linked: "tersegel & terangkai",
  lp_chain_broken: "rantai RUSAK",

  lp_band_agents: "agen adversarial",
  lp_band_every: "Tiap",
  lp_band_step_sealed: "langkah tersegel",
  lp_band_human: "Manusia",
  lp_band_in_loop: "di dalam alur",
  lp_band_types: "Runbook · kebijakan · kontrak · order set",

  lp_final_eyebrow: "Coba",
  lp_final_h2: "Perkuat dokumen pertamamu.",
  lp_final_p:
    "Muat demo dan lihat Red, Blue, dan Arbiter bekerja — lalu verifikasi sendiri catatan yang tersegel.",
  lp_final_demo: "Telusuri contohnya →",
  lp_final_arena: "Buka Arena live",

  lp_foot_tagline: "Meja perkuatan adversarial untuk dokumen berisiko tinggi.",
  lp_foot_product: "Produk",
  lp_foot_start: "Mulai",
  lp_foot_builton: "Dibangun di atas",
  lp_foot_band: "Orkestrasi multi-agen Band",
  lp_foot_chain: "Hash chain anti-palsu",
  lp_foot_hitl: "Tanda tangan human-in-the-loop",
  lp_foot_for: "Untuk",
  lp_foot_ir: "Respons insiden",
  lp_foot_sec: "Keamanan & kepatuhan",
  lp_foot_health: "Order set kesehatan",
  lp_foot_desk: "Meja perkuatan adversarial",

  // landing — "Under the hood" tech section (Band, Featherless, Next.js,
  // Supabase, Vercel, SHA-256 kept literal in the ID string)
  lp_stack_eyebrow: "Dibangun dengan",
  lp_stack_title: "Di balik layar.",
  lp_stack_intro:
    "Para agen berjalan di Band, ditenagai Featherless. Arena ini aplikasi Next.js dengan Supabase, di-deploy di Vercel — dan tiap langkah disegel dengan rantai hash SHA-256.",

  // intro overlay (cinematic loading screen — landing only)
  // intro_status_find reuses custody_adversarial: "Tinjauan adversarial"
  intro_status_fix: "Pengerasan",
  intro_status_arbiter: "Adjudikasi",
  intro_status_seal: "Tersegel · anti-palsu",
};

const DICTS: Record<Lang, Dict> = { en, id };

export type Vars = Record<string, string | number>;
export type TFn = (key: string, vars?: Vars) => string;

// English uses singular/plural forms; Indonesian has one invariant form.
export function plural(lang: Lang, n: number, en1: string, enN: string, idWord: string): string {
  if (lang === "id") return idWord;
  return n === 1 ? en1 : enN;
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: TFn };

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "crucible-lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR and first client paint both render "en" → no hydration mismatch.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "id") setLangState(saved);
    } catch {
      // localStorage unavailable — stay on default
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore persistence failure
    }
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      let s = DICTS[lang][key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
