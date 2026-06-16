"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, type Lang } from "@/lib/i18n";

const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: "en", label: "EN", name: "English" },
  { code: "es", label: "ES", name: "Español" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "pt", label: "PT", name: "Português" },
  { code: "it", label: "IT", name: "Italiano" },
  { code: "id", label: "ID", name: "Bahasa Indonesia" },
];

export default function LangDropdown() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // Close on outside-click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Escape + arrow-key navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']") ?? [],
        );
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown"
          ? (idx + 1) % items.length
          : (idx - 1 + items.length) % items.length;
        items[next].focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus selected item when menu opens
  useEffect(() => {
    if (!open) return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']") ?? [],
    );
    const idx = LANGS.findIndex((l) => l.code === lang);
    items[idx]?.focus();
  }, [open, lang]);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className="langdrop" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="langdrop-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label}
        <svg className="langdrop-caret" viewBox="0 0 10 6" aria-hidden="true" focusable="false">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {open && (
        <ul
          ref={menuRef}
          className="langdrop-menu"
          role="listbox"
          aria-label="Language"
        >
          {LANGS.map((l) => (
            <li key={l.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={lang === l.code}
                className={`langdrop-item${lang === l.code ? " active" : ""}`}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span className="langdrop-code">{l.label}</span>
                <span className="langdrop-name">{l.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
