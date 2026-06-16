"use client";

import { useEffect, Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import CrucibleIntro from "@/components/CrucibleIntro";
import ArenaTransition from "@/components/ArenaTransition";

/* Bilingual marketing landing. Uses the SAME i18n context as /arena
   (useLanguage → { lang, setLang, t }, localStorage key "crucible-lang"), so a
   language picked here carries over to the dashboard and vice versa.

   Default lang is "en" on the server AND on the first client paint (provider
   initial state), so server HTML === first client render → no hydration
   mismatch; the stored language is applied in the provider's mount effect. */

/* Inline icons (lucide-style), copied from the mockup; colored via currentColor.
   stroke-* attributes are camelCased for JSX. */
const IconCrosshair = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="7.5" />
    <line x1="12" y1="1.5" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22.5" />
    <line x1="1.5" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22.5" y2="12" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5 4.5 5.5v6c0 4.5 3.2 7.7 7.5 9.5 4.3-1.8 7.5-5 7.5-9.5v-6L12 2.5Z" />
    <path d="m8.8 12.2 2.2 2.2 4.4-4.6" />
  </svg>
);
const IconScales = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
);
const IconPersonCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </svg>
);
const IconDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2.5H7A2 2 0 0 0 5 4.5v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z" />
    <path d="M14 2.5v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4.5" y="11" width="15" height="9.5" rx="2" />
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
  </svg>
);

function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <span className="langtoggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`lang ${lang === "en" ? "on" : ""}`}
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <span className="langdiv" aria-hidden>
        |
      </span>
      <button
        type="button"
        className={`lang ${lang === "id" ? "on" : ""}`}
        aria-pressed={lang === "id"}
        onClick={() => setLang("id")}
      >
        ID
      </button>
    </span>
  );
}

export default function LandingContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const [arenaTransition, setArenaTransition] = useState(false);
  const [walkthroughTransition, setWalkthroughTransition] = useState(false);

  function handleArenaClick() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/arena");
      return;
    }
    setArenaTransition(true);
  }

  function handleWalkthroughClick() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/try");
      return;
    }
    setWalkthroughTransition(true);
  }

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    document.querySelectorAll(".agrid, .vsgrid, .steps, .lprimary, .lsecondary, .footin").forEach(g => g.classList.add("stagger"));
    const targets = document.querySelectorAll(".shead, .acard, .vscol, .humannote, .stepc, .logo, .final .wrap > *, .footin > *, .foot-base");
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    targets.forEach(el => { el.classList.add("reveal"); io.observe(el); });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const viz = document.querySelector(".chainviz");
    if (!viz) return;
    const btnBreak = viz.querySelector('[data-chain-action="break"]') as HTMLElement | null;
    const btnRestore = viz.querySelector('[data-chain-action="restore"]') as HTMLElement | null;
    if (!btnBreak || !btnRestore) return;
    const setBroken = (b: boolean) => {
      viz.classList.toggle("broken", b);
      btnBreak.classList.toggle("active", b);
      btnRestore.classList.toggle("active", !b);
    };
    const onBreak = () => setBroken(true);
    const onRestore = () => setBroken(false);
    btnBreak.addEventListener("click", onBreak);
    btnRestore.addEventListener("click", onRestore);
    return () => {
      btnBreak.removeEventListener("click", onBreak);
      btnRestore.removeEventListener("click", onRestore);
    };
  }, []);

  return (
    <>
    {arenaTransition && <ArenaTransition caption={t("transition_opening")} />}
    {walkthroughTransition && <ArenaTransition variant="walkthrough" caption={t("transition_walkthrough")} />}
    <CrucibleIntro />
    <div className="landing">
      <div className="aurora" aria-hidden="true">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
        <span className="a4" />
        <span className="a5" />
        <span className="a6" />
      </div>
      <nav id="navbar">
        <div className="navin">
          <div className="brand">
            <svg className="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M16 3.5 27 9.75v12.5L16 28.5 5 22.25V9.75L16 3.5Z"
                stroke="#ECEEF1"
                strokeWidth="1.6"
              />
              <path
                d="M16 10.5 21.5 13.6v6.8L16 23.5l-5.5-3.1v-6.8L16 10.5Z"
                fill="rgba(236,238,241,.10)"
                stroke="#ECEEF1"
                strokeWidth="1.2"
              />
              <circle cx="16" cy="16" r="1.7" fill="#ECEEF1" />
            </svg>
            {/* brand name stays "CRUCIBLE" in both languages */}
            <span className="name">CRUCIBLE</span>
          </div>
          <div className="navlinks">
            <Link href="#agents">{t("lp_nav_agents")}</Link>
            <Link href="#how">{t("lp_nav_how")}</Link>
            <Link href="#proof">{t("lp_nav_proof")}</Link>
            <LangToggle />
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap heroin">
          <div className="rise">
            <span className="eyebrow">{t("lp_hero_eyebrow")}</span>
            {/* tagline stays English in both languages */}
            <h1>Break it before reality does.</h1>
            <p className="lede">{t("lp_hero_lede")}</p>
            <p className="diff">
              {t("lp_hero_diff_a")} <b>{t("lp_hero_diff_b")}</b>
            </p>
            {/* "Find → Fix → Prove" motif stays English */}
            <div className="triad">
              <span className="f">
                <IconCrosshair />
                Find
              </span>
              <span className="arr">→</span>
              <span className="x">
                <IconShield />
                Fix
              </span>
              <span className="arr">→</span>
              <span className="p">
                <IconScales />
                Prove
              </span>
            </div>
            <div className="herocta">
              <div className="ctawrap">
                <button className="btn btn-primary" onClick={handleWalkthroughClick}>
                  {t("lp_hero_cta_harden")}
                </button>
                <span className="ctacap">{t("lp_hero_cap_try")}</span>
              </div>
              <div className="ctawrap">
                <button className="btn btn-ghost" onClick={handleArenaClick}>
                  {t("lp_hero_cta_how")}
                </button>
                <span className="ctacap">{t("lp_hero_cap_arena")}</span>
              </div>
            </div>
          </div>

          <div className="rise pcard" aria-label="Hardening Passport preview">
            <div className="extag">{t("lp_card_example")}</div>
            <div className="ph">
              <span className="pt">{t("passport_title")}</span>
              <span className="badge">✓ {t("outcome_human_approved")}</span>
            </div>
            {/* example artifact title stays English */}
            <div className="pid mono">Incident runbook — Database outage</div>
            <div className="step r">
              <span className="di">
                <IconCrosshair />
              </span>
              <div>
                <div className="sl">{t("custody_adversarial")}</div>
                <div className="sd">{t("lp_card_critical")}</div>
              </div>
            </div>
            <div className="step b">
              <span className="di">
                <IconShield />
              </span>
              <div>
                <div className="sl">{t("custody_hardened")}</div>
                <div className="sd">{t("lp_card_rewritten")}</div>
              </div>
            </div>
            <div className="step a">
              <span className="di">
                <IconScales />
              </span>
              <div>
                <div className="sl">{t("lp_card_adjudicated")}</div>
                <div className="sd">
                  <span className="mono">85/100</span> · {t("adj_escalated")}
                </div>
              </div>
            </div>
            <div className="step h">
              <span className="di">
                <IconPersonCheck />
              </span>
              <div>
                <div className="sl">{t("custody_signoff")}</div>
                <div className="sd">{t("lp_card_approved_lead")}</div>
              </div>
            </div>
            <div className="sealed">
              <span className="ok">✓</span> {t("custody_sealed")} ·{" "}
              {t("entries_count", { n: 42 })} ·{" "}
              <span className="mono">12241517f6…d4a</span>
            </div>
          </div>
        </div>
        <div className="band">
          <div className="bandin">
            <span>
              <svg className="bi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><line x1="12" y1="1.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22.5" y2="12"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>
              <b>3</b> {t("lp_band_agents")}
            </span>
            <span>
              <svg className="bi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="11" width="15" height="9.5" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>
              <b>{t("lp_band_every")}</b> {t("lp_band_step_sealed")}
            </span>
            <span>
              <svg className="bi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>
              <b>{t("lp_band_human")}</b> {t("lp_band_in_loop")}
            </span>
            <span>
              <svg className="bi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2.5H7A2 2 0 0 0 5 4.5v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z"/><path d="M14 2.5v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>
              {t("lp_band_types")}
            </span>
          </div>
        </div>
      </header>

      <section id="agents">
        <div className="wrap">
          <div className="shead">
            <span className="eyebrow">{t("lp_agents_eyebrow")}</span>
            <h2>{t("lp_agents_h2")}</h2>
            <p>{t("lp_agents_p")}</p>
          </div>
          <div className="agrid">
            <div className="acard red">
              <span className="aicon">
                <IconCrosshair />
              </span>
              <div className="role">Red · {t("lp_red_role")}</div>
              <h3>{t("lp_red_h3")}</h3>
              <p className="ad">{t("lp_red_ad")}</p>
              <ul>
                <li>{t("lp_red_li1")}</li>
                <li>{t("lp_red_li2")}</li>
                <li>{t("lp_red_li3")}</li>
              </ul>
            </div>
            <div className="acard blue">
              <span className="aicon">
                <IconShield />
              </span>
              <div className="role">Blue · {t("lp_blue_role")}</div>
              <h3>{t("lp_blue_h3")}</h3>
              <p className="ad">{t("lp_blue_ad")}</p>
              <ul>
                <li>{t("lp_blue_li1")}</li>
                <li>{t("lp_blue_li2")}</li>
                <li>{t("lp_blue_li3")}</li>
              </ul>
            </div>
            <div className="acard amber">
              <span className="aicon">
                <IconScales />
              </span>
              <div className="role">Arbiter · {t("lp_arbiter_role")}</div>
              <h3>{t("lp_arbiter_h3")}</h3>
              <p className="ad">{t("lp_arbiter_ad")}</p>
              <ul>
                <li>{t("lp_arbiter_li1")}</li>
                <li>{t("lp_arbiter_li2")}</li>
                <li>{t("lp_arbiter_li3")}</li>
              </ul>
            </div>
          </div>
          <div className="humannote">
            <span className="hicon">
              <IconPersonCheck />
            </span>
            <div className="hbody">
              <div className="role">+ You · The Human</div>
              <h3>{t("lp_you_title")}</h3>
              <p>{t("lp_you_note")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="vs">
        <div className="wrap">
          <div className="shead">
            <span className="eyebrow">Why Crucible</span>
            <h2>Most review tools stop at Find.</h2>
            <p>They surface problems and hand them back to you. Crucible fixes them — and seals the proof.</p>
          </div>
          <div className="vsgrid stagger">
            <div className="vscol vsmuted">
              <div className="vshead">Stops at Find.</div>
              <div className="vsrows">
                <div className="vsrow">
                  <span className="vsi vsi-c">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 8" /></svg>
                  </span>
                  <div>
                    <span className="vsstep">Find</span>
                    <p>{t("lp_vs_m_find_d")}</p>
                  </div>
                </div>
                <div className="vsrow miss">
                  <span className="vsi vsi-x">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
                  </span>
                  <div>
                    <span className="vsstep">Fix</span>
                    <p>{t("lp_vs_m_fix_d")}</p>
                  </div>
                </div>
                <div className="vsrow miss">
                  <span className="vsi vsi-x">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
                  </span>
                  <div>
                    <span className="vsstep">Prove</span>
                    <p>{t("lp_vs_m_prove_d")}</p>
                  </div>
                </div>
              </div>
              <div className="vslab">Traditional review tools</div>
            </div>
            <div className="vscol vsbright">
              <div className="vshead">Find. Fix. Prove.</div>
              <div className="vsrows">
                <div className="vsrow">
                  <span className="vsi vsi-c red">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 8" /></svg>
                  </span>
                  <div>
                    <span className="vsstep">Find</span>
                    <p>{t("lp_vs_c_find_d")}</p>
                  </div>
                </div>
                <div className="vsrow">
                  <span className="vsi vsi-c blue">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 8" /></svg>
                  </span>
                  <div>
                    <span className="vsstep">Fix</span>
                    <p>{t("lp_vs_c_fix_d")}</p>
                  </div>
                </div>
                <div className="vsrow">
                  <span className="vsi vsi-c amber">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 8" /></svg>
                  </span>
                  <div>
                    <span className="vsstep">Prove</span>
                    <p>{t("lp_vs_c_prove_d")}</p>
                  </div>
                </div>
              </div>
              <div className="vslab">Crucible</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <div className="shead">
            <span className="eyebrow">{t("lp_how_eyebrow")}</span>
            <h2>{t("lp_how_h2")}</h2>
            <p>{t("lp_how_p")}</p>
          </div>
          <div className="steps">
            <div className="stepc">
              <span className="sicon">
                <IconDoc />
              </span>
              <span className="no">{t("lp_step")} 01</span>
              <h3>{t("lp_step1_h")}</h3>
              <p>{t("lp_step1_p")}</p>
              <span className="t">{t("lp_instant")}</span>
            </div>
            <div className="stepc red">
              <span className="sicon">
                <IconCrosshair />
              </span>
              <span className="no">{t("lp_step")} 02</span>
              <h3>{t("lp_step2_h")}</h3>
              <p>{t("lp_step2_p")}</p>
              <span className="t">{t("lp_seconds")}</span>
            </div>
            <div className="stepc blue">
              <span className="sicon">
                <IconShield />
              </span>
              <span className="no">{t("lp_step")} 03</span>
              <h3>{t("lp_step3_h")}</h3>
              <p>{t("lp_step3_p")}</p>
              <span className="t">{t("lp_seconds")}</span>
            </div>
            <div className="stepc amber">
              <span className="sicon">
                <IconScales />
              </span>
              <span className="no">{t("lp_step")} 04</span>
              <h3>{t("lp_step4_h")}</h3>
              <p>{t("lp_step4_p")}</p>
              <span className="t">{t("lp_seconds")}</span>
            </div>
            <div className="stepc violet">
              <span className="sicon">
                <IconPersonCheck />
              </span>
              <span className="no">{t("lp_step")} 05</span>
              <h3>{t("lp_step5_h")}</h3>
              <p>{t("lp_step5_p")}</p>
              <span className="t">{t("lp_hitl")}</span>
            </div>
            <div className="stepc seal">
              <span className="sicon">
                <IconLock />
              </span>
              <span className="no">{t("lp_step")} 06</span>
              <h3>{t("custody_sealed")}</h3>
              <p>{t("lp_step6_p")}</p>
              <span className="t">{t("lp_instant")}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="proof" className="proof">
        <div className="wrap proofin">
          <div className="shead phead reveal">
            <span className="eyebrow">{t("lp_proof_eyebrow")}</span>
            <h2>{t("lp_proof_h2")}</h2>
            <p>{t("lp_proof_p")}</p>
          </div>
          <div className="chainviz" aria-label="Tamper-evident hash chain demo">
            <div className="chaintrack">
              {[
                { n: "#001", h: "a3f1…b8c2" },
                { n: "#002", h: "7d2e…4af9" },
                { n: "#003", h: "5b9c…1e3d", tampered: true },
                { n: "#004", h: "8a4f…2c7b" },
                { n: "#042 · HEAD", h: "122415…d4a", head: true },
              ].map((b, i) => (
                <Fragment key={i}>
                  {i > 0 && <div className={"clink" + (i === 3 ? " after-tampered" : "")} />}
                  <div className={"cblock" + (b.tampered ? " tampered" : "") + (b.head ? " head" : "")}>
                    <div className="cnum">{b.n}</div>
                    <div className="chash">{b.h}</div>
                    <svg className="ckicon ckicon-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="5 12 10 17 19 8" /></svg>
                    <svg className="ckicon ckicon-bad" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
                  </div>
                </Fragment>
              ))}
            </div>
            <div className="chainstatus">
              <div className="cstatus cstatus-ok"><span className="cdot" />{t("pill_intact")} · 42 entries · head <span className="mono">12241517f6…d4a</span></div>
              <div className="cstatus cstatus-bad"><span className="cdot" />{t("lp_chain_broken")} · entry #003 tampered — verification fails</div>
            </div>
            <div className="chainctl">
              <button type="button" className="cbtn cbtn-restore active" data-chain-action="restore">Show intact</button>
              <button type="button" className="cbtn cbtn-break" data-chain-action="break">Break the chain</button>
            </div>
          </div>
        </div>
      </section>

      <section id="stack">
        <div className="wrap">
          <div className="shead">
            <span className="eyebrow">{t("lp_stack_eyebrow")}</span>
            <h2>{t("lp_stack_title")}</h2>
            <p>{t("lp_stack_intro")}</p>
          </div>
          {/* logo names stay literal English in both languages */}
          <div className="logowall">
            <div className="lprimary stagger">
              <div className="logo">
                <img src="/logos/band.svg" alt="" aria-hidden="true" />
                <span>
                  Band
                  <span className="ltag">Agent orchestration</span>
                </span>
              </div>
              <div className="logo">
                <img src="/logos/featherless.png" alt="" aria-hidden="true" />
                <span>
                  Featherless
                  <span className="ltag">LLM inference</span>
                </span>
              </div>
            </div>
            <div className="lsecondary stagger">
              <div className="logo">
                <img src="/logos/nextjs.svg" alt="" aria-hidden="true" />
                Next.js
              </div>
              <div className="logo">
                <img src="/logos/react.svg" alt="" aria-hidden="true" />
                React
              </div>
              <div className="logo">
                <img src="/logos/typescript.svg" alt="" aria-hidden="true" />
                TypeScript
              </div>
              <div className="logo">
                <img src="/logos/tailwind.svg" alt="" aria-hidden="true" />
                Tailwind CSS
              </div>
              <div className="logo">
                <img src="/logos/vercel.svg" alt="" aria-hidden="true" />
                Vercel
              </div>
              <div className="logo">
                <img src="/logos/supabase.svg" alt="" aria-hidden="true" />
                Supabase
              </div>
              <div className="logo">
                <img src="/logos/python.svg" alt="" aria-hidden="true" />
                Python
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="start" className="final">
        <div className="wrap">
          <span className="eyebrow">{t("lp_final_eyebrow")}</span>
          <h2>{t("lp_final_h2")}</h2>
          <p>{t("lp_final_p")}</p>
          <div className="finalcta">
            <button className="btn btn-primary" onClick={handleWalkthroughClick}>
              {t("lp_final_demo")}
            </button>
            <button className="btn btn-ghost" onClick={handleArenaClick}>
              {t("lp_final_arena")}
            </button>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap footin">
          <div className="footbrand">
            <div className="name">CRUCIBLE</div>
            <p>{t("lp_foot_tagline")}</p>
            {/* "Find → Fix → Prove" motif stays English */}
            <div className="fp">
              <span className="f">
                <IconCrosshair />
                Find
              </span>{" "}
              <span className="arr">→</span>{" "}
              <span className="x">
                <IconShield />
                Fix
              </span>{" "}
              <span className="arr">→</span>{" "}
              <span className="p">
                <IconScales />
                Prove
              </span>
            </div>
          </div>
          <div className="fcol">
            <h4>{t("lp_foot_product")}</h4>
            <Link href="#agents">{t("lp_nav_agents")}</Link>
            <Link href="#how">{t("lp_nav_how")}</Link>
            <Link href="#proof">{t("lp_nav_proof")}</Link>
            <Link href="#start">{t("lp_foot_start")}</Link>
          </div>
          <div className="fcol">
            <h4>{t("lp_foot_builton")}</h4>
            <span>{t("lp_foot_band")}</span>
            <span>{t("lp_foot_chain")}</span>
            <span>{t("lp_foot_hitl")}</span>
          </div>
          <div className="fcol">
            <h4>{t("lp_foot_for")}</h4>
            <span>{t("lp_foot_ir")}</span>
            <span>{t("lp_foot_sec")}</span>
            <span>{t("lp_foot_health")}</span>
          </div>
        </div>
        <div className="foot-base">
          <span>© 2026 Crucible · {t("lp_foot_desk")}</span>
          {/* hackathon line stays English */}
          <span>
            Band of Agents Hackathon · Track 3 — Regulated &amp; High-Stakes Workflows
          </span>
        </div>
      </footer>
    </div>
    </>
  );
}
