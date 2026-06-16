"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Lang = "en" | "id" | "es" | "fr" | "de" | "pt" | "it";

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
  try_skip: "Skip to the result →",

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
  try_skip: "Langsung ke hasil →",

  lp_nav_agents: "Para Agen",
  lp_nav_how: "Cara Kerja",
  lp_nav_proof: "Bukti",

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

  lp_stack_eyebrow: "Dibangun dengan",
  lp_stack_title: "Di balik layar.",
  lp_stack_intro:
    "Para agen berjalan di Band, ditenagai Featherless. Arena ini aplikasi Next.js dengan Supabase, di-deploy di Vercel — dan tiap langkah disegel dengan rantai hash SHA-256.",

  intro_status_fix: "Pengerasan",
  intro_status_arbiter: "Adjudikasi",
  intro_status_seal: "Tersegel · anti-palsu",
};

const es: Dict = {
  live: "EN VIVO",
  pill_checking: "verificando cadena…",
  pill_intact: "cadena intacta",
  pill_broken: "cadena ROTA en #{seq}",
  pill_unverified: "cadena sin verificar",

  field_artifact: "Artefacto",
  field_run: "Run",
  field_rounds: "Rondas",
  field_agents: "Agentes",
  field_arbiter_score: "Puntuación del Árbitro",

  outcome_human_approved: "APROBADO POR HUMANO",
  outcome_human_rejected: "RECHAZADO POR HUMANO",
  outcome_approved: "APROBADO",
  outcome_escalated: "ESCALADO",
  outcome_pending: "PENDIENTE",

  event_log: "Registro de eventos",
  events_rounds: "{n} eventos · {m} {roundsWord}",
  round: "Ronda",
  show_more: "mostrar más",
  show_less: "mostrar menos",

  action_submission: "Envío",
  action_attack: "Ataque",
  action_attack_n: "Ataque — {n} {vulnWord} encontradas",
  action_revision: "Revisión reforzada",
  action_verdict: "Veredicto",
  action_escalated: "Escalado",
  action_approved: "Aprobado",
  action_signoff: "Aprobación",

  sev_crit: "CRÍTICO",
  sev_high: "ALTO",
  sev_med: "MEDIO",

  dec_another_round: "OTRA RONDA",
  dec_escalate: "ESCALAR",
  dec_approved: "APROBADO",
  dec_rejected: "RECHAZADO",

  passport_title: "Pasaporte de Refuerzo",
  passport_word: "pasaporte",
  chain_of_custody: "Cadena de custodia",
  score_by_round: "Puntuación por ronda",
  round_verdict_cleared: "superó 80 · escalado a humano",
  round_verdict_below: "por debajo de 80 · otra ronda",
  round_verdict_limit: "por debajo de 80 · límite de rondas · escalado",
  custody_origin: "Origen",
  custody_adversarial: "Revisión adversarial",
  custody_hardened: "Reforzado",
  custody_adjudication: "Adjudicación",
  custody_signoff: "Aprobación humana",
  custody_sealed: "Sellado",

  detail_origin: "El humano envió el borrador del artefacto.",
  detail_no_submission: "No se registró ningún envío.",
  detail_adversarial: "{n} {vulnWord} en {m} {roundsWord}",
  detail_no_findings: "No se registraron hallazgos.",
  detail_hardened: "Revisión reforzada producida ({n} {passWord}).",
  detail_no_revision: "No se registró ninguna revisión.",
  adj_final_score: "Puntuación final",
  rounds_count: "{m} {roundsWord}",
  detail_not_adjudicated: "Aún no adjudicado.",
  detail_awaiting_signoff: "Esperando aprobación humana.",

  adj_escalated: "escalado",
  adj_approved: "aprobado",
  adj_another_round: "otra ronda",

  entries_count: "{n} entradas",
  sealed_checking: "verificando…",
  sealed_broken: "ROTA en #{seq}",
  sealed_unverified: "sin verificar",
  btn_verify: "Verificar cadena",
  btn_verifying: "Verificando…",
  btn_intact: "✓ Cadena intacta — {n} entradas",
  btn_broken: "✗ ROTA en #{seq}",
  btn_unverified: "Cadena sin verificar",

  msg_loading: "Cargando run…",
  msg_no_events: "No se encontraron eventos de auditoría.",
  msg_error: "Error al cargar eventos de auditoría: {err}",

  footer_left: "Crucible · Mesa de refuerzo adversarial",
  transition_opening: "Abriendo la Arena…",
  transition_walkthrough: "Iniciando el tutorial…",
  try_skip: "Ir al resultado →",

  lp_nav_agents: "Los Agentes",
  lp_nav_how: "Cómo Funciona",
  lp_nav_proof: "Prueba",

  lp_hero_eyebrow: "Refuerzo adversarial de documentos",
  lp_hero_lede:
    "Crucible desata tres agentes de IA adversariales sobre tus documentos más críticos — runbooks de incidentes, políticas de seguridad, conjuntos de órdenes clínicas — y sella cada paso en un registro a prueba de manipulaciones.",
  lp_hero_diff_a: "La mayoría de las herramientas señalan problemas y se detienen.",
  lp_hero_diff_b: "Crucible los corrige — y lo demuestra.",
  lp_hero_cta_harden: "Ver un ejemplo →",
  lp_hero_cta_how: "Abrir la Arena en vivo →",
  lp_hero_cap_try: "Guiado · un minuto aprox. · un runbook real reforzado",
  lp_hero_cap_arena: "Un run real, sellado y verificable",

  lp_card_example: "Ejemplo · Respuesta a incidentes",
  lp_card_critical: "Riesgo crítico encontrado",
  lp_card_rewritten: "Reescrito a una versión segura",
  lp_card_adjudicated: "Adjudicado",
  lp_card_approved_lead: "Aprobado por el responsable de guardia",

  lp_agents_eyebrow: "El panel adversarial",
  lp_agents_h2: "Tres agentes. Un documento reforzado.",
  lp_agents_p:
    "Cada uno cumple un rol que la mayoría de las herramientas de revisión omite — y juntos no solo evalúan tu documento, sino que lo reparan hasta que sea sólido.",
  lp_red_role: "El Adversario",
  lp_red_h3: "Lo ataca.",
  lp_red_ad:
    "Lee tu documento como lo haría un atacante, buscando el fallo que termina en un postmortem.",
  lp_red_li1: "Encuentra pasos inseguros y modos de fallo",
  lp_red_li2: "Clasifica cada hallazgo como Crítico / Alto / Medio",
  lp_red_li3: "Reataca cada revisión hasta que no quede nada",
  lp_blue_role: "El Defensor",
  lp_blue_h3: "Lo corrige.",
  lp_blue_ad:
    "No solo señala problemas — reescribe el documento en una versión reforzada que los cierra.",
  lp_blue_li1: "Convierte fallos en pasos seguros y específicos",
  lp_blue_li2: "Agrega las salvaguardas y verificaciones que faltan",
  lp_blue_li3: "Devuelve un documento listo para desplegar, no un informe",
  lp_arbiter_role: "El Juez",
  lp_arbiter_h3: "Decide.",
  lp_arbiter_ad:
    "Puntúa el resultado y resuelve: publicarlo, ejecutar otra ronda o escalarlo a un humano.",
  lp_arbiter_li1: "Puntúa cada ronda de 0 a 100",
  lp_arbiter_li2: "Fuerza otra ronda hasta que sea seguro",
  lp_arbiter_li3: "Escala decisiones de alto riesgo a una persona",
  lp_you: "+ Tú",
  lp_you_title: "Tú tienes la última palabra.",
  lp_you_note:
    "Un humano siempre tiene la decisión final. En documentos de alto riesgo, Crucible escala a una persona para aprobar, rechazar o agregar contexto — y esa decisión también queda sellada en el registro.",

  lp_how_eyebrow: "Cómo funciona",
  lp_how_h2: "Del borrador defectuoso a la prueba sellada.",
  lp_how_p:
    "Un proceso adversarial completamente trazable, con un humano en el ciclo y un registro infalsificable al final.",
  lp_step: "PASO",
  lp_instant: "~ instantáneo",
  lp_seconds: "~ segundos",
  lp_hitl: "humano en el ciclo",
  lp_step1_h: "Enviar",
  lp_step1_p: "Pega o sube tu documento — o carga la demo para verlo en acción.",
  lp_step2_h: "Red ataca",
  lp_step2_p: "Encuentra cada fallo y lo clasifica por severidad, ronda tras ronda.",
  lp_step3_h: "Blue refuerza",
  lp_step3_p: "Reescribe el documento en una versión más segura que cierra las brechas.",
  lp_step4_h: "Arbiter evalúa",
  lp_step4_p: "Lo puntúa y lo devuelve para otra ronda hasta que sea sólido.",
  lp_step5_h: "Humano aprueba",
  lp_step5_p: "Una persona aprueba, rechaza o agrega contexto en decisiones de alto riesgo.",
  lp_step6_p: "Cada paso sellado en una cadena a prueba de manipulaciones que puedes verificar.",

  lp_vs_m_find_d: "Detecta fallos y genera un informe",
  lp_vs_m_fix_d: "Te lo devuelve — tú lo corriges manualmente",
  lp_vs_m_prove_d: "Sin registro de qué cambió ni cuándo",
  lp_vs_c_find_d: "Red ataca el documento en busca de fallos — ronda tras ronda",
  lp_vs_c_fix_d: "Blue lo reescribe en una versión reforzada y lista para desplegar",
  lp_vs_c_prove_d: "Cada paso sellado en una cadena a prueba de manipulaciones que puedes verificar",

  lp_proof_eyebrow: "A prueba de manipulaciones por diseño",
  lp_proof_h2: "Una prueba que puedes romper.",
  lp_proof_p:
    "Cada ataque, corrección, puntuación y aprobación queda sellado en una hash chain. Cambia un carácter del registro y la verificación falla al instante — restáuralo, y vuelve a pasar.",
  lp_proof_pb: "No es una promesa en una diapositiva. Rómpela en vivo, en el escenario.",
  lp_entries: "Entradas",
  lp_head_hash: "Hash de cabeza",
  lp_every_step: "Cada paso",
  lp_sealed_linked: "sellado y enlazado",
  lp_chain_broken: "cadena ROTA",

  lp_band_agents: "agentes adversariales",
  lp_band_every: "Cada",
  lp_band_step_sealed: "paso sellado",
  lp_band_human: "Humano",
  lp_band_in_loop: "en el ciclo",
  lp_band_types: "Runbooks · políticas · contratos · conjuntos de órdenes",

  lp_final_eyebrow: "Pruébalo",
  lp_final_h2: "Refuerza tu primer documento.",
  lp_final_p:
    "Carga la demo y observa cómo trabajan Red, Blue y Arbiter — luego verifica tú mismo el registro sellado.",
  lp_final_demo: "Ver un ejemplo →",
  lp_final_arena: "Abrir la Arena en vivo",

  lp_foot_tagline: "La mesa de refuerzo adversarial para documentos de alto riesgo.",
  lp_foot_product: "Producto",
  lp_foot_start: "Comenzar",
  lp_foot_builton: "Construido con",
  lp_foot_band: "Orquestación multi-agente Band",
  lp_foot_chain: "Hash chain a prueba de manipulaciones",
  lp_foot_hitl: "Aprobación human-in-the-loop",
  lp_foot_for: "Para",
  lp_foot_ir: "Respuesta a incidentes",
  lp_foot_sec: "Seguridad y cumplimiento",
  lp_foot_health: "Conjuntos de órdenes clínicas",
  lp_foot_desk: "Mesa de refuerzo adversarial",

  lp_stack_eyebrow: "Construido con",
  lp_stack_title: "Bajo el capó.",
  lp_stack_intro:
    "Los agentes se ejecutan en Band, impulsado por Featherless. La Arena es una aplicación Next.js con Supabase, desplegada en Vercel — y cada paso está sellado con una hash chain SHA-256.",

  intro_status_fix: "Reforzando",
  intro_status_arbiter: "Adjudicando",
  intro_status_seal: "Sellado · a prueba de manipulaciones",
};

const fr: Dict = {
  live: "EN DIRECT",
  pill_checking: "vérification de la chaîne…",
  pill_intact: "chaîne intacte",
  pill_broken: "chaîne BRISÉE à #{seq}",
  pill_unverified: "chaîne non vérifiée",

  field_artifact: "Artefact",
  field_run: "Run",
  field_rounds: "Manches",
  field_agents: "Agents",
  field_arbiter_score: "Score de l'Arbitre",

  outcome_human_approved: "APPROUVÉ PAR HUMAIN",
  outcome_human_rejected: "REJETÉ PAR HUMAIN",
  outcome_approved: "APPROUVÉ",
  outcome_escalated: "ESCALADÉ",
  outcome_pending: "EN ATTENTE",

  event_log: "Journal d'événements",
  events_rounds: "{n} événements · {m} {roundsWord}",
  round: "Manche",
  show_more: "voir plus",
  show_less: "voir moins",

  action_submission: "Soumission",
  action_attack: "Attaque",
  action_attack_n: "Attaque — {n} {vulnWord} détectées",
  action_revision: "Révision renforcée",
  action_verdict: "Verdict",
  action_escalated: "Escaladé",
  action_approved: "Approuvé",
  action_signoff: "Validation",

  sev_crit: "CRITIQUE",
  sev_high: "ÉLEVÉ",
  sev_med: "MOYEN",

  dec_another_round: "AUTRE MANCHE",
  dec_escalate: "ESCALADER",
  dec_approved: "APPROUVÉ",
  dec_rejected: "REJETÉ",

  passport_title: "Passeport de Renforcement",
  passport_word: "passeport",
  chain_of_custody: "Chaîne de traçabilité",
  score_by_round: "Score par manche",
  round_verdict_cleared: "supérieur à 80 · escaladé vers humain",
  round_verdict_below: "inférieur à 80 · autre manche",
  round_verdict_limit: "inférieur à 80 · limite de manches · escaladé",
  custody_origin: "Origine",
  custody_adversarial: "Revue adversariale",
  custody_hardened: "Renforcé",
  custody_adjudication: "Adjudication",
  custody_signoff: "Validation humaine",
  custody_sealed: "Scellé",

  detail_origin: "L'humain a soumis le brouillon de l'artefact.",
  detail_no_submission: "Aucune soumission enregistrée.",
  detail_adversarial: "{n} {vulnWord} sur {m} {roundsWord}",
  detail_no_findings: "Aucun résultat enregistré.",
  detail_hardened: "Révision renforcée produite ({n} {passWord}).",
  detail_no_revision: "Aucune révision enregistrée.",
  adj_final_score: "Score final",
  rounds_count: "{m} {roundsWord}",
  detail_not_adjudicated: "Pas encore adjugé.",
  detail_awaiting_signoff: "En attente de validation humaine.",

  adj_escalated: "escaladé",
  adj_approved: "approuvé",
  adj_another_round: "autre manche",

  entries_count: "{n} entrées",
  sealed_checking: "vérification…",
  sealed_broken: "BRISÉE à #{seq}",
  sealed_unverified: "non vérifiée",
  btn_verify: "Vérifier la chaîne",
  btn_verifying: "Vérification…",
  btn_intact: "✓ Chaîne intacte — {n} entrées",
  btn_broken: "✗ BRISÉE à #{seq}",
  btn_unverified: "Chaîne non vérifiée",

  msg_loading: "Chargement du run…",
  msg_no_events: "Aucun événement d'audit trouvé.",
  msg_error: "Échec du chargement des événements d'audit : {err}",

  footer_left: "Crucible · Poste de renforcement adversarial",
  transition_opening: "Ouverture de l'Arène…",
  transition_walkthrough: "Démarrage du tutoriel…",
  try_skip: "Aller au résultat →",

  lp_nav_agents: "Les Agents",
  lp_nav_how: "Fonctionnement",
  lp_nav_proof: "Preuve",

  lp_hero_eyebrow: "Renforcement adversarial de documents",
  lp_hero_lede:
    "Crucible lance trois agents IA adversariaux sur vos documents les plus critiques — runbooks d'incidents, politiques de sécurité, ensembles d'ordres cliniques — et scelle chaque étape dans un enregistrement infalsifiable.",
  lp_hero_diff_a: "La plupart des outils signalent des problèmes et s'arrêtent.",
  lp_hero_diff_b: "Crucible les corrige — et le prouve.",
  lp_hero_cta_harden: "Parcourir un exemple →",
  lp_hero_cta_how: "Ouvrir l'Arène en direct →",
  lp_hero_cap_try: "Guidé · environ une minute · un vrai runbook renforcé",
  lp_hero_cap_arena: "Un vrai run, scellé et vérifiable",

  lp_card_example: "Exemple · Réponse à incident",
  lp_card_critical: "Risque critique détecté",
  lp_card_rewritten: "Réécrit dans une version sécurisée",
  lp_card_adjudicated: "Adjugé",
  lp_card_approved_lead: "Approuvé par le responsable d'astreinte",

  lp_agents_eyebrow: "Le comité adversarial",
  lp_agents_h2: "Trois agents. Un document renforcé.",
  lp_agents_p:
    "Chacun joue un rôle que la plupart des outils de revue ignorent — et ensemble ils ne se contentent pas d'évaluer votre document, ils le réparent jusqu'à ce qu'il tienne.",
  lp_red_role: "L'Adversaire",
  lp_red_h3: "Il l'attaque.",
  lp_red_ad:
    "Lit votre document comme un attaquant, cherchant la faille qui finit dans un postmortem.",
  lp_red_li1: "Trouve les étapes dangereuses et les modes de défaillance",
  lp_red_li2: "Évalue chaque résultat Critique / Élevé / Moyen",
  lp_red_li3: "Ré-attaque chaque révision jusqu'à ce qu'il ne reste rien",
  lp_blue_role: "Le Défenseur",
  lp_blue_h3: "Il le corrige.",
  lp_blue_ad:
    "Ne se contente pas de pointer les problèmes — réécrit le document dans une version renforcée qui les ferme.",
  lp_blue_li1: "Transforme les failles en étapes sûres et précises",
  lp_blue_li2: "Ajoute les garde-fous et vérifications manquants",
  lp_blue_li3: "Restitue un document prêt à déployer, pas un rapport",
  lp_arbiter_role: "Le Juge",
  lp_arbiter_h3: "Il décide.",
  lp_arbiter_ad:
    "Score le résultat et tranche : le publier, lancer une autre manche ou escalader vers un humain.",
  lp_arbiter_li1: "Score chaque manche de 0 à 100",
  lp_arbiter_li2: "Impose une autre manche jusqu'à ce que ce soit sûr",
  lp_arbiter_li3: "Escalade les décisions à enjeux élevés vers une personne",
  lp_you: "+ Vous",
  lp_you_title: "Vous avez le dernier mot.",
  lp_you_note:
    "Un humain a toujours la décision finale. Sur les documents à forts enjeux, Crucible escalade vers une personne pour approuver, rejeter ou ajouter du contexte — et cette décision est aussi scellée dans l'enregistrement.",

  lp_how_eyebrow: "Fonctionnement",
  lp_how_h2: "Du brouillon défaillant à la preuve scellée.",
  lp_how_p:
    "Un processus adversarial entièrement traçable, avec un humain dans la boucle et un enregistrement infalsifiable au bout.",
  lp_step: "ÉTAPE",
  lp_instant: "~ instantané",
  lp_seconds: "~ secondes",
  lp_hitl: "humain dans la boucle",
  lp_step1_h: "Soumettre",
  lp_step1_p: "Collez ou téléversez votre document — ou chargez la démo pour le voir tourner.",
  lp_step2_h: "Red attaque",
  lp_step2_p: "Trouve chaque faille et l'évalue par sévérité, manche après manche.",
  lp_step3_h: "Blue renforce",
  lp_step3_p: "Réécrit le document dans une version plus sûre qui ferme les brèches.",
  lp_step4_h: "Arbiter juge",
  lp_step4_p: "Le score et le renvoie pour une autre manche jusqu'à ce qu'il tienne.",
  lp_step5_h: "L'humain valide",
  lp_step5_p: "Une personne approuve, rejette ou ajoute du contexte sur les décisions à forts enjeux.",
  lp_step6_p: "Chaque étape verrouillée dans une chaîne infalsifiable que vous pouvez vérifier.",

  lp_vs_m_find_d: "Détecte les failles et produit un rapport",
  lp_vs_m_fix_d: "Vous le retourne — vous le corrigez manuellement",
  lp_vs_m_prove_d: "Aucun enregistrement de ce qui a changé, ni quand",
  lp_vs_c_find_d: "Red attaque le document pour trouver des failles — manche après manche",
  lp_vs_c_fix_d: "Blue le réécrit dans une version renforcée et prête à déployer",
  lp_vs_c_prove_d: "Chaque étape scellée dans une chaîne infalsifiable que vous pouvez vérifier",

  lp_proof_eyebrow: "Infalsifiable par conception",
  lp_proof_h2: "Une preuve que vous pouvez casser.",
  lp_proof_p:
    "Chaque attaque, correction, score et validation est scellé dans une hash chain. Changez un seul caractère de l'enregistrement et la vérification échoue instantanément — restaurez-le, et elle passe à nouveau.",
  lp_proof_pb: "Ce n'est pas une promesse sur une diapositive. Cassez-la en direct, sur scène.",
  lp_entries: "Entrées",
  lp_head_hash: "Hash de tête",
  lp_every_step: "Chaque étape",
  lp_sealed_linked: "scellée et liée",
  lp_chain_broken: "chaîne BRISÉE",

  lp_band_agents: "agents adversariaux",
  lp_band_every: "Chaque",
  lp_band_step_sealed: "étape scellée",
  lp_band_human: "Humain",
  lp_band_in_loop: "dans la boucle",
  lp_band_types: "Runbooks · politiques · contrats · ensembles d'ordres",

  lp_final_eyebrow: "Essayez",
  lp_final_h2: "Renforcez votre premier document.",
  lp_final_p:
    "Chargez la démo et regardez Red, Blue et Arbiter au travail — puis vérifiez vous-même l'enregistrement scellé.",
  lp_final_demo: "Parcourir un exemple →",
  lp_final_arena: "Ouvrir l'Arène en direct",

  lp_foot_tagline: "Le poste de renforcement adversarial pour les documents à forts enjeux.",
  lp_foot_product: "Produit",
  lp_foot_start: "Commencer",
  lp_foot_builton: "Construit avec",
  lp_foot_band: "Orchestration multi-agents Band",
  lp_foot_chain: "Hash chain infalsifiable",
  lp_foot_hitl: "Validation human-in-the-loop",
  lp_foot_for: "Pour",
  lp_foot_ir: "Réponse à incident",
  lp_foot_sec: "Sécurité et conformité",
  lp_foot_health: "Ensembles d'ordres cliniques",
  lp_foot_desk: "Poste de renforcement adversarial",

  lp_stack_eyebrow: "Construit avec",
  lp_stack_title: "Sous le capot.",
  lp_stack_intro:
    "Les agents tournent sur Band, propulsé par Featherless. L'Arène est une application Next.js avec Supabase, déployée sur Vercel — et chaque étape est scellée avec une hash chain SHA-256.",

  intro_status_fix: "Renforcement",
  intro_status_arbiter: "Adjudication",
  intro_status_seal: "Scellé · infalsifiable",
};

const de: Dict = {
  live: "LIVE",
  pill_checking: "Kette wird geprüft…",
  pill_intact: "Kette intakt",
  pill_broken: "Kette bei #{seq} GEBROCHEN",
  pill_unverified: "Kette ungeprüft",

  field_artifact: "Artefakt",
  field_run: "Run",
  field_rounds: "Runden",
  field_agents: "Agenten",
  field_arbiter_score: "Arbiter-Bewertung",

  outcome_human_approved: "VON MENSCH GENEHMIGT",
  outcome_human_rejected: "VON MENSCH ABGELEHNT",
  outcome_approved: "GENEHMIGT",
  outcome_escalated: "ESKALIERT",
  outcome_pending: "AUSSTEHEND",

  event_log: "Ereignisprotokoll",
  events_rounds: "{n} Ereignisse · {m} {roundsWord}",
  round: "Runde",
  show_more: "mehr anzeigen",
  show_less: "weniger anzeigen",

  action_submission: "Einreichung",
  action_attack: "Angriff",
  action_attack_n: "Angriff — {n} {vulnWord} gefunden",
  action_revision: "Gehärtete Revision",
  action_verdict: "Urteil",
  action_escalated: "Eskaliert",
  action_approved: "Genehmigt",
  action_signoff: "Freigabe",

  sev_crit: "KRITISCH",
  sev_high: "HOCH",
  sev_med: "MITTEL",

  dec_another_round: "WEITERE RUNDE",
  dec_escalate: "ESKALIEREN",
  dec_approved: "GENEHMIGT",
  dec_rejected: "ABGELEHNT",

  passport_title: "Härtungspass",
  passport_word: "Pass",
  chain_of_custody: "Beweismittelkette",
  score_by_round: "Bewertung pro Runde",
  round_verdict_cleared: "über 80 · an Mensch eskaliert",
  round_verdict_below: "unter 80 · weitere Runde",
  round_verdict_limit: "unter 80 · Rundenlimit · eskaliert",
  custody_origin: "Ursprung",
  custody_adversarial: "Adversariale Prüfung",
  custody_hardened: "Gehärtet",
  custody_adjudication: "Entscheidung",
  custody_signoff: "Menschliche Freigabe",
  custody_sealed: "Versiegelt",

  detail_origin: "Mensch hat den Artefakt-Entwurf eingereicht.",
  detail_no_submission: "Keine Einreichung aufgezeichnet.",
  detail_adversarial: "{n} {vulnWord} über {m} {roundsWord}",
  detail_no_findings: "Keine Befunde aufgezeichnet.",
  detail_hardened: "Gehärtete Revision erstellt ({n} {passWord}).",
  detail_no_revision: "Keine Revision aufgezeichnet.",
  adj_final_score: "Endwertung",
  rounds_count: "{m} {roundsWord}",
  detail_not_adjudicated: "Noch nicht entschieden.",
  detail_awaiting_signoff: "Warte auf menschliche Freigabe.",

  adj_escalated: "eskaliert",
  adj_approved: "genehmigt",
  adj_another_round: "weitere Runde",

  entries_count: "{n} Einträge",
  sealed_checking: "wird geprüft…",
  sealed_broken: "GEBROCHEN bei #{seq}",
  sealed_unverified: "ungeprüft",
  btn_verify: "Kette prüfen",
  btn_verifying: "Wird geprüft…",
  btn_intact: "✓ Kette intakt — {n} Einträge",
  btn_broken: "✗ GEBROCHEN bei #{seq}",
  btn_unverified: "Kette ungeprüft",

  msg_loading: "Run wird geladen…",
  msg_no_events: "Keine Audit-Ereignisse gefunden.",
  msg_error: "Audit-Ereignisse konnten nicht geladen werden: {err}",

  footer_left: "Crucible · Adversariales Härtungs-Dashboard",
  transition_opening: "Arena wird geöffnet…",
  transition_walkthrough: "Walkthrough wird gestartet…",
  try_skip: "Direkt zum Ergebnis →",

  lp_nav_agents: "Die Agenten",
  lp_nav_how: "So funktioniert es",
  lp_nav_proof: "Beweis",

  lp_hero_eyebrow: "Adversariales Dokumenten-Hardening",
  lp_hero_lede:
    "Crucible setzt drei adversariale KI-Agenten auf Ihre kritischsten Dokumente an — Incident-Runbooks, Sicherheitsrichtlinien, klinische Anordnungssätze — und versiegelt jeden Schritt in einem manipulationssicheren Protokoll.",
  lp_hero_diff_a: "Die meisten Tools markieren Probleme und hören auf.",
  lp_hero_diff_b: "Crucible behebt sie — und beweist es.",
  lp_hero_cta_harden: "Beispiel durchgehen →",
  lp_hero_cta_how: "Live-Arena öffnen →",
  lp_hero_cap_try: "Geführt · ca. eine Minute · ein echter gehärteter Runbook",
  lp_hero_cap_arena: "Ein echter Run, versiegelt und verifizierbar",

  lp_card_example: "Beispiel · Incident Response",
  lp_card_critical: "Kritisches Risiko gefunden",
  lp_card_rewritten: "In eine sichere Version umgeschrieben",
  lp_card_adjudicated: "Entschieden",
  lp_card_approved_lead: "Vom Bereitschaftsverantwortlichen genehmigt",

  lp_agents_eyebrow: "Das adversariale Gremium",
  lp_agents_h2: "Drei Agenten. Ein gehärtetes Dokument.",
  lp_agents_p:
    "Jeder übernimmt eine Rolle, die die meisten Review-Tools überspringen — und gemeinsam beurteilen sie Ihr Dokument nicht nur, sondern reparieren es, bis es standhält.",
  lp_red_role: "Der Angreifer",
  lp_red_h3: "Greift an.",
  lp_red_ad:
    "Liest Ihr Dokument wie ein Angreifer und sucht nach dem Fehler, der im Postmortem landet.",
  lp_red_li1: "Findet unsichere Schritte und Fehlermodi",
  lp_red_li2: "Bewertet jeden Befund als Kritisch / Hoch / Mittel",
  lp_red_li3: "Greift jede Revision erneut an, bis nichts mehr übrig ist",
  lp_blue_role: "Der Verteidiger",
  lp_blue_h3: "Behebt es.",
  lp_blue_ad:
    "Zeigt nicht nur auf Probleme — schreibt das Dokument in eine gehärtete Version um, die sie schließt.",
  lp_blue_li1: "Wandelt Schwachstellen in sichere, konkrete Schritte um",
  lp_blue_li2: "Fügt fehlende Schutzmaßnahmen und Prüfungen hinzu",
  lp_blue_li3: "Liefert ein einsatzbereites Dokument, keinen Bericht",
  lp_arbiter_role: "Der Richter",
  lp_arbiter_h3: "Entscheidet.",
  lp_arbiter_ad:
    "Bewertet das Ergebnis und urteilt: freigeben, eine weitere Runde starten oder an einen Menschen eskalieren.",
  lp_arbiter_li1: "Bewertet jede Runde von 0 bis 100",
  lp_arbiter_li2: "Erzwingt eine weitere Runde, bis es sicher ist",
  lp_arbiter_li3: "Eskaliert hochriskante Entscheidungen an eine Person",
  lp_you: "+ Sie",
  lp_you_title: "Sie haben das letzte Wort.",
  lp_you_note:
    "Ein Mensch hat immer die endgültige Entscheidung. Bei hochriskanten Dokumenten eskaliert Crucible an eine Person, um zu genehmigen, abzulehnen oder Kontext hinzuzufügen — und diese Entscheidung wird ebenfalls im Protokoll versiegelt.",

  lp_how_eyebrow: "So funktioniert es",
  lp_how_h2: "Vom fehlerhaften Entwurf zum versiegelten Beweis.",
  lp_how_p:
    "Ein vollständig nachverfolgbarer adversarialer Prozess, mit einem Menschen in der Schleife und einem unfälschbaren Protokoll am Ende.",
  lp_step: "SCHRITT",
  lp_instant: "~ sofort",
  lp_seconds: "~ Sekunden",
  lp_hitl: "Mensch in der Schleife",
  lp_step1_h: "Einreichen",
  lp_step1_p: "Fügen Sie Ihr Dokument ein oder laden Sie es hoch — oder laden Sie die Demo, um es in Aktion zu sehen.",
  lp_step2_h: "Red greift an",
  lp_step2_p: "Findet jeden Fehler und bewertet ihn nach Schweregrad, Runde für Runde.",
  lp_step3_h: "Blue härtet",
  lp_step3_p: "Schreibt das Dokument in eine sicherere Version um, die die Lücken schließt.",
  lp_step4_h: "Arbiter urteilt",
  lp_step4_p: "Bewertet es und schickt es für eine weitere Runde zurück, bis es standhält.",
  lp_step5_h: "Mensch gibt frei",
  lp_step5_p: "Eine Person genehmigt, lehnt ab oder ergänzt Kontext bei hochriskanten Entscheidungen.",
  lp_step6_p: "Jeder Schritt in einer manipulationssicheren Kette gesperrt, die Sie verifizieren können.",

  lp_vs_m_find_d: "Erkennt Fehler und erstellt einen Bericht",
  lp_vs_m_fix_d: "Gibt ihn zurück — Sie beheben es manuell",
  lp_vs_m_prove_d: "Kein Protokoll darüber, was sich wann geändert hat",
  lp_vs_c_find_d: "Red greift das Dokument nach Fehlern an — Runde für Runde",
  lp_vs_c_fix_d: "Blue schreibt es in eine gehärtete, einsatzbereite Version um",
  lp_vs_c_prove_d: "Jeder Schritt in einer manipulationssicheren Kette versiegelt, die Sie verifizieren können",

  lp_proof_eyebrow: "Manipulationssicher von Grund auf",
  lp_proof_h2: "Ein Beweis, den Sie brechen können.",
  lp_proof_p:
    "Jeder Angriff, jede Korrektur, jede Bewertung und jede Freigabe wird in einer Hash-Chain versiegelt. Ändern Sie ein einziges Zeichen im Protokoll, und die Verifizierung schlägt sofort fehl — stellen Sie es wieder her, und sie besteht.",
  lp_proof_pb: "Das ist keine Behauptung auf einer Folie. Brechen Sie es live auf der Bühne.",
  lp_entries: "Einträge",
  lp_head_hash: "Head-Hash",
  lp_every_step: "Jeder Schritt",
  lp_sealed_linked: "versiegelt und verknüpft",
  lp_chain_broken: "Kette GEBROCHEN",

  lp_band_agents: "adversariale Agenten",
  lp_band_every: "Jeder",
  lp_band_step_sealed: "Schritt versiegelt",
  lp_band_human: "Mensch",
  lp_band_in_loop: "in der Schleife",
  lp_band_types: "Runbooks · Richtlinien · Verträge · Anordnungssätze",

  lp_final_eyebrow: "Ausprobieren",
  lp_final_h2: "Härten Sie Ihr erstes Dokument.",
  lp_final_p:
    "Laden Sie die Demo und beobachten Sie, wie Red, Blue und Arbiter arbeiten — und verifizieren Sie dann das versiegelte Protokoll selbst.",
  lp_final_demo: "Beispiel durchgehen →",
  lp_final_arena: "Live-Arena öffnen",

  lp_foot_tagline: "Das adversariale Härtungs-Dashboard für hochriskante Dokumente.",
  lp_foot_product: "Produkt",
  lp_foot_start: "Starten",
  lp_foot_builton: "Gebaut mit",
  lp_foot_band: "Band Multi-Agenten-Orchestrierung",
  lp_foot_chain: "Manipulationssichere Hash-Chain",
  lp_foot_hitl: "Human-in-the-Loop-Freigabe",
  lp_foot_for: "Für",
  lp_foot_ir: "Incident Response",
  lp_foot_sec: "Sicherheit & Compliance",
  lp_foot_health: "Klinische Anordnungssätze",
  lp_foot_desk: "Adversariales Härtungs-Dashboard",

  lp_stack_eyebrow: "Gebaut mit",
  lp_stack_title: "Unter der Haube.",
  lp_stack_intro:
    "Die Agenten laufen auf Band, betrieben von Featherless. Die Arena ist eine Next.js-App mit Supabase, auf Vercel bereitgestellt — und jeder Schritt wird mit einer SHA-256-Hash-Chain versiegelt.",

  intro_status_fix: "Härtung",
  intro_status_arbiter: "Adjudikation",
  intro_status_seal: "Versiegelt · manipulationssicher",
};

const pt: Dict = {
  live: "AO VIVO",
  pill_checking: "verificando cadeia…",
  pill_intact: "cadeia intacta",
  pill_broken: "cadeia QUEBRADA em #{seq}",
  pill_unverified: "cadeia não verificada",

  field_artifact: "Artefato",
  field_run: "Run",
  field_rounds: "Rodadas",
  field_agents: "Agentes",
  field_arbiter_score: "Pontuação do Árbitro",

  outcome_human_approved: "APROVADO POR HUMANO",
  outcome_human_rejected: "REJEITADO POR HUMANO",
  outcome_approved: "APROVADO",
  outcome_escalated: "ESCALADO",
  outcome_pending: "PENDENTE",

  event_log: "Registro de eventos",
  events_rounds: "{n} eventos · {m} {roundsWord}",
  round: "Rodada",
  show_more: "ver mais",
  show_less: "ver menos",

  action_submission: "Envio",
  action_attack: "Ataque",
  action_attack_n: "Ataque — {n} {vulnWord} encontradas",
  action_revision: "Revisão reforçada",
  action_verdict: "Veredicto",
  action_escalated: "Escalado",
  action_approved: "Aprovado",
  action_signoff: "Aprovação",

  sev_crit: "CRÍTICO",
  sev_high: "ALTO",
  sev_med: "MÉDIO",

  dec_another_round: "OUTRA RODADA",
  dec_escalate: "ESCALAR",
  dec_approved: "APROVADO",
  dec_rejected: "REJEITADO",

  passport_title: "Passaporte de Reforço",
  passport_word: "passaporte",
  chain_of_custody: "Cadeia de custódia",
  score_by_round: "Pontuação por rodada",
  round_verdict_cleared: "acima de 80 · escalado para humano",
  round_verdict_below: "abaixo de 80 · outra rodada",
  round_verdict_limit: "abaixo de 80 · limite de rodadas · escalado",
  custody_origin: "Origem",
  custody_adversarial: "Revisão adversarial",
  custody_hardened: "Reforçado",
  custody_adjudication: "Adjudicação",
  custody_signoff: "Aprovação humana",
  custody_sealed: "Selado",

  detail_origin: "Humano enviou o rascunho do artefato.",
  detail_no_submission: "Nenhum envio registrado.",
  detail_adversarial: "{n} {vulnWord} em {m} {roundsWord}",
  detail_no_findings: "Nenhum resultado registrado.",
  detail_hardened: "Revisão reforçada produzida ({n} {passWord}).",
  detail_no_revision: "Nenhuma revisão registrada.",
  adj_final_score: "Pontuação final",
  rounds_count: "{m} {roundsWord}",
  detail_not_adjudicated: "Ainda não adjudicado.",
  detail_awaiting_signoff: "Aguardando aprovação humana.",

  adj_escalated: "escalado",
  adj_approved: "aprovado",
  adj_another_round: "outra rodada",

  entries_count: "{n} entradas",
  sealed_checking: "verificando…",
  sealed_broken: "QUEBRADA em #{seq}",
  sealed_unverified: "não verificada",
  btn_verify: "Verificar cadeia",
  btn_verifying: "Verificando…",
  btn_intact: "✓ Cadeia intacta — {n} entradas",
  btn_broken: "✗ QUEBRADA em #{seq}",
  btn_unverified: "Cadeia não verificada",

  msg_loading: "Carregando run…",
  msg_no_events: "Nenhum evento de auditoria encontrado.",
  msg_error: "Falha ao carregar eventos de auditoria: {err}",

  footer_left: "Crucible · Central de reforço adversarial",
  transition_opening: "Abrindo a Arena…",
  transition_walkthrough: "Iniciando o tutorial…",
  try_skip: "Ir para o resultado →",

  lp_nav_agents: "Os Agentes",
  lp_nav_how: "Como Funciona",
  lp_nav_proof: "Prova",

  lp_hero_eyebrow: "Reforço adversarial de documentos",
  lp_hero_lede:
    "Crucible solta três agentes de IA adversariais nos seus documentos mais críticos — runbooks de incidentes, políticas de segurança, conjuntos de ordens clínicas — e sela cada etapa em um registro à prova de adulteração.",
  lp_hero_diff_a: "A maioria das ferramentas aponta problemas e para.",
  lp_hero_diff_b: "Crucible os corrige — e comprova.",
  lp_hero_cta_harden: "Ver um exemplo →",
  lp_hero_cta_how: "Abrir a Arena ao vivo →",
  lp_hero_cap_try: "Guiado · cerca de um minuto · um runbook real reforçado",
  lp_hero_cap_arena: "Um run real, selado e verificável",

  lp_card_example: "Exemplo · Resposta a incidentes",
  lp_card_critical: "Risco crítico encontrado",
  lp_card_rewritten: "Reescrito em versão segura",
  lp_card_adjudicated: "Adjudicado",
  lp_card_approved_lead: "Aprovado pelo responsável de plantão",

  lp_agents_eyebrow: "O conselho adversarial",
  lp_agents_h2: "Três agentes. Um documento reforçado.",
  lp_agents_p:
    "Cada um desempenha um papel que a maioria das ferramentas de revisão pula — e juntos eles não apenas avaliam o seu documento, mas o reparam até que ele se sustente.",
  lp_red_role: "O Adversário",
  lp_red_h3: "Ele ataca.",
  lp_red_ad:
    "Lê o seu documento como um atacante faria, caçando a falha que acaba em um postmortem.",
  lp_red_li1: "Encontra etapas inseguras e modos de falha",
  lp_red_li2: "Classifica cada resultado como Crítico / Alto / Médio",
  lp_red_li3: "Reataca cada revisão até que nada reste",
  lp_blue_role: "O Defensor",
  lp_blue_h3: "Ele corrige.",
  lp_blue_ad:
    "Não apenas aponta problemas — reescreve o documento em uma versão reforçada que os fecha.",
  lp_blue_li1: "Transforma falhas em etapas seguras e específicas",
  lp_blue_li2: "Adiciona as salvaguardas e verificações ausentes",
  lp_blue_li3: "Entrega um documento pronto para deploy, não um relatório",
  lp_arbiter_role: "O Juiz",
  lp_arbiter_h3: "Ele decide.",
  lp_arbiter_ad:
    "Pontua o resultado e decide: publicar, executar outra rodada ou escalar para um humano.",
  lp_arbiter_li1: "Pontua cada rodada de 0 a 100",
  lp_arbiter_li2: "Força outra rodada até que seja seguro",
  lp_arbiter_li3: "Escala decisões de alto risco para uma pessoa",
  lp_you: "+ Você",
  lp_you_title: "Você tem a palavra final.",
  lp_you_note:
    "Um humano sempre tem a decisão final. Em documentos de alto risco, o Crucible escala para uma pessoa para aprovar, rejeitar ou adicionar contexto — e essa decisão também é selada no registro.",

  lp_how_eyebrow: "Como funciona",
  lp_how_h2: "Do rascunho defeituoso à prova selada.",
  lp_how_p:
    "Um processo adversarial totalmente rastreável, com um humano no ciclo e um registro infalsificável no final.",
  lp_step: "PASSO",
  lp_instant: "~ instantâneo",
  lp_seconds: "~ segundos",
  lp_hitl: "humano no ciclo",
  lp_step1_h: "Enviar",
  lp_step1_p: "Cole ou carregue o seu documento — ou carregue a demo para vê-lo em ação.",
  lp_step2_h: "Red ataca",
  lp_step2_p: "Encontra cada falha e a classifica por severidade, rodada após rodada.",
  lp_step3_h: "Blue reforça",
  lp_step3_p: "Reescreve o documento em uma versão mais segura que fecha as lacunas.",
  lp_step4_h: "Arbiter julga",
  lp_step4_p: "Pontua e o devolve para outra rodada até que se sustente.",
  lp_step5_h: "Humano aprova",
  lp_step5_p: "Uma pessoa aprova, rejeita ou adiciona contexto em decisões de alto risco.",
  lp_step6_p: "Cada etapa bloqueada em uma cadeia à prova de adulteração que você pode verificar.",

  lp_vs_m_find_d: "Detecta falhas e produz um relatório",
  lp_vs_m_fix_d: "Devolve para você — você corrige manualmente",
  lp_vs_m_prove_d: "Sem registro do que mudou, nem quando",
  lp_vs_c_find_d: "Red ataca o documento em busca de falhas — rodada após rodada",
  lp_vs_c_fix_d: "Blue o reescreve em uma versão reforçada e pronta para deploy",
  lp_vs_c_prove_d: "Cada etapa selada em uma cadeia à prova de adulteração que você pode verificar",

  lp_proof_eyebrow: "À prova de adulteração por design",
  lp_proof_h2: "Uma prova que você pode quebrar.",
  lp_proof_p:
    "Cada ataque, correção, pontuação e aprovação é selado em uma hash chain. Altere um único caractere do registro e a verificação falha instantaneamente — restaure-o, e ela passa novamente.",
  lp_proof_pb: "Não é uma promessa em um slide. Quebre-a ao vivo, no palco.",
  lp_entries: "Entradas",
  lp_head_hash: "Hash de cabeça",
  lp_every_step: "Cada etapa",
  lp_sealed_linked: "selada e vinculada",
  lp_chain_broken: "cadeia QUEBRADA",

  lp_band_agents: "agentes adversariais",
  lp_band_every: "Cada",
  lp_band_step_sealed: "etapa selada",
  lp_band_human: "Humano",
  lp_band_in_loop: "no ciclo",
  lp_band_types: "Runbooks · políticas · contratos · conjuntos de ordens",

  lp_final_eyebrow: "Experimente",
  lp_final_h2: "Reforce o seu primeiro documento.",
  lp_final_p:
    "Carregue a demo e veja Red, Blue e Arbiter em ação — depois verifique você mesmo o registro selado.",
  lp_final_demo: "Ver um exemplo →",
  lp_final_arena: "Abrir a Arena ao vivo",

  lp_foot_tagline: "A central de reforço adversarial para documentos de alto risco.",
  lp_foot_product: "Produto",
  lp_foot_start: "Começar",
  lp_foot_builton: "Construído com",
  lp_foot_band: "Orquestração multi-agente Band",
  lp_foot_chain: "Hash chain à prova de adulteração",
  lp_foot_hitl: "Aprovação human-in-the-loop",
  lp_foot_for: "Para",
  lp_foot_ir: "Resposta a incidentes",
  lp_foot_sec: "Segurança e conformidade",
  lp_foot_health: "Conjuntos de ordens clínicas",
  lp_foot_desk: "Central de reforço adversarial",

  lp_stack_eyebrow: "Construído com",
  lp_stack_title: "Sob o capô.",
  lp_stack_intro:
    "Os agentes rodam no Band, movido a Featherless. A Arena é um app Next.js com Supabase, implantado no Vercel — e cada etapa é selada com uma hash chain SHA-256.",

  intro_status_fix: "Reforçando",
  intro_status_arbiter: "Adjudicando",
  intro_status_seal: "Selado · à prova de adulteração",
};

const it: Dict = {
  live: "IN DIRETTA",
  pill_checking: "verifica della catena…",
  pill_intact: "catena intatta",
  pill_broken: "catena COMPROMESSA a #{seq}",
  pill_unverified: "catena non verificata",

  field_artifact: "Artefatto",
  field_run: "Run",
  field_rounds: "Round",
  field_agents: "Agenti",
  field_arbiter_score: "Punteggio dell'Arbitro",

  outcome_human_approved: "APPROVATO DA UMANO",
  outcome_human_rejected: "RIFIUTATO DA UMANO",
  outcome_approved: "APPROVATO",
  outcome_escalated: "ESCALATO",
  outcome_pending: "IN ATTESA",

  event_log: "Registro eventi",
  events_rounds: "{n} eventi · {m} {roundsWord}",
  round: "Round",
  show_more: "mostra di più",
  show_less: "mostra meno",

  action_submission: "Invio",
  action_attack: "Attacco",
  action_attack_n: "Attacco — {n} {vulnWord} rilevate",
  action_revision: "Revisione rafforzata",
  action_verdict: "Verdetto",
  action_escalated: "Escalato",
  action_approved: "Approvato",
  action_signoff: "Approvazione",

  sev_crit: "CRITICO",
  sev_high: "ALTO",
  sev_med: "MEDIO",

  dec_another_round: "ALTRO ROUND",
  dec_escalate: "ESCALARE",
  dec_approved: "APPROVATO",
  dec_rejected: "RIFIUTATO",

  passport_title: "Passaporto di Hardening",
  passport_word: "passaporto",
  chain_of_custody: "Catena di custodia",
  score_by_round: "Punteggio per round",
  round_verdict_cleared: "superato 80 · escalato a umano",
  round_verdict_below: "sotto 80 · altro round",
  round_verdict_limit: "sotto 80 · limite di round · escalato",
  custody_origin: "Origine",
  custody_adversarial: "Revisione adversarial",
  custody_hardened: "Rafforzato",
  custody_adjudication: "Aggiudicazione",
  custody_signoff: "Approvazione umana",
  custody_sealed: "Sigillato",

  detail_origin: "L'umano ha inviato la bozza dell'artefatto.",
  detail_no_submission: "Nessun invio registrato.",
  detail_adversarial: "{n} {vulnWord} in {m} {roundsWord}",
  detail_no_findings: "Nessun risultato registrato.",
  detail_hardened: "Revisione rafforzata prodotta ({n} {passWord}).",
  detail_no_revision: "Nessuna revisione registrata.",
  adj_final_score: "Punteggio finale",
  rounds_count: "{m} {roundsWord}",
  detail_not_adjudicated: "Non ancora aggiudicato.",
  detail_awaiting_signoff: "In attesa di approvazione umana.",

  adj_escalated: "escalato",
  adj_approved: "approvato",
  adj_another_round: "altro round",

  entries_count: "{n} voci",
  sealed_checking: "verifica…",
  sealed_broken: "COMPROMESSA a #{seq}",
  sealed_unverified: "non verificata",
  btn_verify: "Verifica catena",
  btn_verifying: "Verifica in corso…",
  btn_intact: "✓ Catena intatta — {n} voci",
  btn_broken: "✗ COMPROMESSA a #{seq}",
  btn_unverified: "Catena non verificata",

  msg_loading: "Caricamento run…",
  msg_no_events: "Nessun evento di audit trovato.",
  msg_error: "Impossibile caricare gli eventi di audit: {err}",

  footer_left: "Crucible · Postazione di hardening adversarial",
  transition_opening: "Apertura dell'Arena…",
  transition_walkthrough: "Avvio del tutorial…",
  try_skip: "Vai al risultato →",

  lp_nav_agents: "Gli Agenti",
  lp_nav_how: "Come Funziona",
  lp_nav_proof: "Prova",

  lp_hero_eyebrow: "Hardening adversarial di documenti",
  lp_hero_lede:
    "Crucible scatena tre agenti IA adversariali sui tuoi documenti più critici — runbook per incidenti, policy di sicurezza, set di ordini clinici — e sigilla ogni passaggio in un registro a prova di manomissione.",
  lp_hero_diff_a: "La maggior parte degli strumenti segnala i problemi e si ferma.",
  lp_hero_diff_b: "Crucible li risolve — e lo dimostra.",
  lp_hero_cta_harden: "Sfoglia un esempio →",
  lp_hero_cta_how: "Apri l'Arena live →",
  lp_hero_cap_try: "Guidato · circa un minuto · un vero runbook rafforzato",
  lp_hero_cap_arena: "Un run reale, sigillato e verificabile",

  lp_card_example: "Esempio · Risposta agli incidenti",
  lp_card_critical: "Rischio critico trovato",
  lp_card_rewritten: "Riscritto in una versione sicura",
  lp_card_adjudicated: "Aggiudicato",
  lp_card_approved_lead: "Approvato dal responsabile di turno",

  lp_agents_eyebrow: "Il comitato adversarial",
  lp_agents_h2: "Tre agenti. Un documento rafforzato.",
  lp_agents_p:
    "Ognuno ricopre un ruolo che la maggior parte degli strumenti di revisione salta — e insieme non si limitano a valutare il tuo documento, ma lo riparano finché non regge.",
  lp_red_role: "L'Avversario",
  lp_red_h3: "Lo attacca.",
  lp_red_ad:
    "Legge il tuo documento come farebbe un attaccante, cercando la falla che finisce in un postmortem.",
  lp_red_li1: "Trova passaggi non sicuri e modalità di guasto",
  lp_red_li2: "Classifica ogni risultato come Critico / Alto / Medio",
  lp_red_li3: "Riattacca ogni revisione finché non rimane nulla",
  lp_blue_role: "Il Difensore",
  lp_blue_h3: "Lo corregge.",
  lp_blue_ad:
    "Non si limita a indicare i problemi — riscrive il documento in una versione rafforzata che li chiude.",
  lp_blue_li1: "Trasforma le falle in passaggi sicuri e specifici",
  lp_blue_li2: "Aggiunge le salvaguardie e i controlli mancanti",
  lp_blue_li3: "Restituisce un documento pronto al deploy, non un report",
  lp_arbiter_role: "Il Giudice",
  lp_arbiter_h3: "Decide.",
  lp_arbiter_ad:
    "Punteggia il risultato e decide: pubblicarlo, eseguire un altro round o escalarlo a un umano.",
  lp_arbiter_li1: "Punteggia ogni round da 0 a 100",
  lp_arbiter_li2: "Impone un altro round finché non è sicuro",
  lp_arbiter_li3: "Scala le decisioni ad alto rischio a una persona",
  lp_you: "+ Tu",
  lp_you_title: "Tu hai l'ultima parola.",
  lp_you_note:
    "Un umano ha sempre la decisione finale. Per i documenti ad alto rischio, Crucible scala a una persona per approvare, rifiutare o aggiungere contesto — e anche quella decisione viene sigillata nel registro.",

  lp_how_eyebrow: "Come funziona",
  lp_how_h2: "Dalla bozza difettosa alla prova sigillata.",
  lp_how_p:
    "Un processo adversarial completamente tracciabile, con un umano nel ciclo e un registro infalsificabile alla fine.",
  lp_step: "PASSO",
  lp_instant: "~ immediato",
  lp_seconds: "~ secondi",
  lp_hitl: "umano nel ciclo",
  lp_step1_h: "Invia",
  lp_step1_p: "Incolla o carica il tuo documento — o carica la demo per vederlo in azione.",
  lp_step2_h: "Red attacca",
  lp_step2_p: "Trova ogni difetto e lo classifica per gravità, round dopo round.",
  lp_step3_h: "Blue rafforza",
  lp_step3_p: "Riscrive il documento in una versione più sicura che colma le lacune.",
  lp_step4_h: "Arbiter giudica",
  lp_step4_p: "Lo punteggia e lo rimanda per un altro round finché non regge.",
  lp_step5_h: "L'umano approva",
  lp_step5_p: "Una persona approva, rifiuta o aggiunge contesto sulle decisioni ad alto rischio.",
  lp_step6_p: "Ogni passaggio bloccato in una catena a prova di manomissione che puoi verificare.",

  lp_vs_m_find_d: "Individua le falle e produce un report",
  lp_vs_m_fix_d: "Te lo restituisce — lo correggi manualmente",
  lp_vs_m_prove_d: "Nessun registro di cosa è cambiato, né quando",
  lp_vs_c_find_d: "Red attacca il documento alla ricerca di falle — round dopo round",
  lp_vs_c_fix_d: "Blue lo riscrive in una versione rafforzata e pronta al deploy",
  lp_vs_c_prove_d: "Ogni passaggio sigillato in una catena a prova di manomissione che puoi verificare",

  lp_proof_eyebrow: "A prova di manomissione per design",
  lp_proof_h2: "Una prova che puoi rompere.",
  lp_proof_p:
    "Ogni attacco, correzione, punteggio e approvazione è sigillato in una hash chain. Cambia un solo carattere del registro e la verifica fallisce istantaneamente — ripristinalo, e passa di nuovo.",
  lp_proof_pb: "Non è un'affermazione su una slide. Rompila live, sul palco.",
  lp_entries: "Voci",
  lp_head_hash: "Hash di testa",
  lp_every_step: "Ogni passaggio",
  lp_sealed_linked: "sigillato e collegato",
  lp_chain_broken: "catena COMPROMESSA",

  lp_band_agents: "agenti adversariali",
  lp_band_every: "Ogni",
  lp_band_step_sealed: "passaggio sigillato",
  lp_band_human: "Umano",
  lp_band_in_loop: "nel ciclo",
  lp_band_types: "Runbook · policy · contratti · set di ordini",

  lp_final_eyebrow: "Provalo",
  lp_final_h2: "Rafforza il tuo primo documento.",
  lp_final_p:
    "Carica la demo e guarda Red, Blue e Arbiter al lavoro — poi verifica tu stesso il registro sigillato.",
  lp_final_demo: "Sfoglia un esempio →",
  lp_final_arena: "Apri l'Arena live",

  lp_foot_tagline: "La postazione di hardening adversarial per documenti ad alto rischio.",
  lp_foot_product: "Prodotto",
  lp_foot_start: "Inizia",
  lp_foot_builton: "Costruito con",
  lp_foot_band: "Orchestrazione multi-agente Band",
  lp_foot_chain: "Hash chain a prova di manomissione",
  lp_foot_hitl: "Approvazione human-in-the-loop",
  lp_foot_for: "Per",
  lp_foot_ir: "Risposta agli incidenti",
  lp_foot_sec: "Sicurezza e conformità",
  lp_foot_health: "Set di ordini clinici",
  lp_foot_desk: "Postazione di hardening adversarial",

  lp_stack_eyebrow: "Costruito con",
  lp_stack_title: "Sotto il cofano.",
  lp_stack_intro:
    "Gli agenti girano su Band, alimentato da Featherless. L'Arena è un'app Next.js con Supabase, distribuita su Vercel — e ogni passaggio è sigillato con una hash chain SHA-256.",

  intro_status_fix: "Rafforzamento",
  intro_status_arbiter: "Aggiudicazione",
  intro_status_seal: "Sigillato · a prova di manomissione",
};

const DICTS: Record<Lang, Dict> = { en, id, es, fr, de, pt, it };

export type Vars = Record<string, string | number>;
export type TFn = (key: string, vars?: Vars) => string;

// Plural helper. English uses singular/plural; other languages pass:
//   - a string → invariant form (e.g. Indonesian)
//   - a [singular, plural] tuple → number-sensitive form
// Falls back to English if no form is provided for the active language.
export function plural(
  lang: Lang,
  n: number,
  en1: string,
  enN: string,
  forms: Partial<Record<Exclude<Lang, "en">, string | [string, string]>> = {},
): string {
  if (lang === "en") return n === 1 ? en1 : enN;
  const f = forms[lang];
  if (f === undefined) return n === 1 ? en1 : enN;
  if (typeof f === "string") return f;
  return n === 1 ? f[0] : f[1];
}

const VALID_LANGS = new Set<Lang>(["en", "id", "es", "fr", "de", "pt", "it"]);

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: TFn };

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "crucible-lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR and first client paint both render "en" → no hydration mismatch.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && VALID_LANGS.has(saved)) setLangState(saved);
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
