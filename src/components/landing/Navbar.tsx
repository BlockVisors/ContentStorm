"use client";

import { useState } from "react";
import { Menu, X, Terminal, ShieldAlert, Search } from "lucide-react";
import { useLanguage, Locale } from "@/context/LanguageContext";

interface NavbarProps {
  onScrollToSection: (id: string) => void;
  activeSection: string;
}

export default function Navbar({ onScrollToSection, activeSection }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale, t } = useLanguage();

  const navItems = [
    { label: t("intel"), id: "hero" },
    { label: t("personas"), id: "personas" },
    { label: t("brevities"), id: "blog" },
    { label: t("testimonials"), id: "testimonials" },
    { label: t("citations"), id: "citations" },
    { label: t("faq"), id: "faq" },
    { label: t("contact"), id: "contact" },
  ];

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-obsidian/95 backdrop-blur-md border-b border-border-structural h-14 w-full">
      <div className="max-w-7xl mx-auto h-full px-4 lg:px-8 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <svg width="22" height="24" viewBox="0 0 120 132" aria-hidden="true" className="text-cotton-lace">
            <rect x="20" y="20" width="80" height="3" fill="currentColor"/>
            <rect x="28" y="38" width="64" height="3" fill="currentColor"/>
            <rect x="36" y="56" width="48" height="3" fill="currentColor"/>
            <rect x="43" y="74" width="34" height="3" fill="currentColor"/>
            <rect x="49" y="92" width="22" height="3" fill="currentColor"/>
            <rect x="59" y="98" width="2" height="12" fill="currentColor" opacity=".55"/>
            <rect x="52" y="112" width="16" height="11" fill="#C9A24B"/>
          </svg>
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-cotton-lace select-none">
            CONTENT <span className="text-gold-crust">{t("brand_storm")}</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center h-full">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onScrollToSection(item.id)}
              className={`h-full px-3 font-mono text-[9px] tracking-widest transition-all cursor-pointer border-b-2 flex items-center justify-center hover:text-gold-crust hover:bg-surface-container ${
                activeSection === item.id
                  ? "border-gold-crust text-gold-crust bg-surface-teal/30"
                  : "border-transparent text-cotton-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions & Language Switcher */}
        <div className="hidden md:flex items-center gap-4">
          {/* Search trigger */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-search-palette"))}
            className="font-mono text-[9px] text-cotton-muted hover:text-gold-crust flex items-center gap-1.5 border border-border-structural/50 px-2.5 py-1 bg-obsidian/50 cursor-pointer uppercase tracking-wider h-7"
            title="SEARCH_ARCHIVES_CTRL_K"
          >
            <Search size={11} className="text-gold-crust" />
            <span>{locale === "DE" ? "SUCHE" : locale === "JA" ? "検索" : locale === "FR" ? "RECHERCHE" : "SEARCH"}</span>
            <kbd className="text-[7px] bg-border-structural/50 px-1 text-cotton-muted rounded-sm font-mono ml-0.5">⌘K</kbd>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 border border-border-structural/50 p-1 bg-obsidian/50 text-[9px] font-mono select-none">
            {(["EN", "DE", "JA", "FR"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`px-1.5 py-0.5 cursor-pointer hover:text-gold-crust transition-all ${
                  locale === lang 
                    ? "text-gold-crust bg-gold-crust/10 border border-gold-crust/20 font-bold" 
                    : "text-cotton-muted border border-transparent"
                }`}
                title={`SWITCH_LOCALE_${lang}`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button 
            onClick={() => onScrollToSection("contact")}
            className="font-mono text-[10px] tracking-wider text-cotton-muted hover:text-gold-crust cursor-pointer uppercase"
          >
            {t("transmit")}
          </button>
          <button 
            onClick={() => onScrollToSection("newsletter")}
            className="bg-gold-crust text-obsidian font-mono text-[10px] tracking-widest font-bold px-4 py-2 hover:bg-cotton-lace hover:text-obsidian transition-colors cursor-pointer uppercase"
          >
            {t("subscribe")}
          </button>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile search trigger */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-search-palette"))}
            className="text-cotton-muted hover:text-gold-crust p-1.5 border border-border-structural/50 bg-obsidian/50 cursor-pointer rounded-sm"
            title="SEARCH_ARCHIVES"
          >
            <Search size={14} className="text-gold-crust" />
          </button>

          <button
            onClick={() => onScrollToSection("newsletter")}
            className="bg-gold-crust text-obsidian font-mono text-[9px] tracking-wider font-bold px-2.5 py-1.5 hover:bg-cotton-lace hover:text-obsidian transition-colors cursor-pointer uppercase"
          >
            {t("subscribe")}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-cotton-lace hover:text-gold-crust p-1"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      {isOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-obsidian border-b border-border-structural z-40 p-6 space-y-4">
          <div className="flex flex-col space-y-2">
            {/* Mobile Search list item */}
            <button
              onClick={() => {
                setIsOpen(false);
                window.dispatchEvent(new CustomEvent("toggle-search-palette"));
              }}
              className="w-full text-left py-2 px-3 font-mono text-[11px] tracking-widest transition-all hover:bg-surface-container text-gold-crust flex items-center gap-2 border-b border-border-structural/30 pb-3"
            >
              <Search size={12} />
              <span>{locale === "DE" ? "SUCHE" : locale === "JA" ? "検索" : locale === "FR" ? "RECHERCHE" : "SEARCH"} (CTRL+K)</span>
            </button>

            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onScrollToSection(item.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left py-2 px-3 font-mono text-[11px] tracking-widest transition-all hover:bg-surface-container ${
                  activeSection === item.id
                    ? "text-gold-crust border-l border-gold-crust bg-surface-teal/20"
                    : "text-cotton-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          
          <div className="pt-4 border-t border-border-structural/50 flex flex-col gap-3">
            {/* Mobile Language Switcher */}
            <div className="flex justify-between items-center px-3 py-1.5 bg-surface-container/30 border border-border-structural/60">
              <span className="font-mono text-[8px] text-cotton-muted uppercase tracking-wider">LOCALE_SELECT</span>
              <div className="flex items-center gap-1 text-[9px] font-mono">
                {(["EN", "DE", "JA", "FR"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLocale(lang)}
                    className={`px-2 py-0.5 transition-all cursor-pointer ${
                      locale === lang 
                        ? "text-gold-crust bg-gold-crust/10 font-bold border border-gold-crust/30" 
                        : "text-cotton-muted border border-transparent hover:text-cotton-lace"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                onScrollToSection("contact");
                setIsOpen(false);
              }}
              className="w-full text-center font-mono text-[10px] tracking-wider text-cotton-muted py-2 hover:text-gold-crust border border-border-structural/30"
            >
              {t("transmit_feedback")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

