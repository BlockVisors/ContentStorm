"use client";

import { Play, ShieldAlert, ArrowDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// No props: this used to receive onTriggerAction from App.tsx, which owned
// the handler because it was also the parent of Navbar. In the App Router
// split, Navbar's copy of this same handler moved to the (marketing) layout,
// and page.tsx (which renders Hero) is a Server Component — it can't hand a
// plain closure down to a Client Component as a prop (only Server Actions
// cross that boundary, and this isn't one; it's synchronous DOM manipulation
// that only makes sense client-side). Simplest correct fix: Hero is already
// "use client," so it just defines the same three lines itself.
export default function Hero() {
  const { t } = useLanguage();

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-[85vh] flex flex-col justify-center items-center text-center px-4 py-16 overflow-hidden border-b border-border-structural">
      {/* Dynamic Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c3a38_1px,transparent_1px),linear-gradient(to_bottom,#1c3a38_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8 mt-8">
        {/* Status Line */}
        <div className="inline-flex items-center gap-2 bg-rust/10 border border-rust/30 px-3 py-1">
          <span className="w-1.5 h-1.5 bg-rust animate-pulse"></span>
          <span className="font-mono text-[9px] tracking-[0.25em] text-rust uppercase">
            {t("hero_status")}
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="font-sans text-4xl sm:text-6xl md:text-7xl font-bold uppercase tracking-tighter text-cotton-lace leading-[0.9]">
          {t("hero_title_1")} <br />
          <span className="text-gold-crust">{t("hero_title_2")}</span>
        </h1>

        {/* Subtitle / Lede */}
        <p className="font-serif text-base sm:text-lg md:text-xl text-cotton-muted max-w-2xl mx-auto leading-relaxed">
          {t("hero_desc_1")} 
          <strong className="text-cotton-lace">{t("hero_desc_strong")}</strong>{t("hero_desc_2")}
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => handleScrollToSection("newsletter")}
            className="w-full sm:w-auto bg-gold-crust text-obsidian font-mono text-xs tracking-widest font-bold px-8 py-4 hover:bg-cotton-lace transition-all uppercase cursor-pointer flex items-center justify-center gap-2"
          >
            {t("hero_cta_1")}
            <ArrowDown size={14} />
          </button>
          <button
            onClick={() => handleScrollToSection("contact")}
            className="w-full sm:w-auto border border-border-structural bg-surface/50 text-cotton-lace font-mono text-xs tracking-widest font-bold px-8 py-4 hover:bg-surface-container hover:text-gold-crust hover:border-gold-crust transition-all uppercase cursor-pointer"
          >
            {t("hero_cta_2")}
          </button>
        </div>
      </div>

      {/* Three Core Value Proposition Blocks (V2 §14) — the enterprise
          positioning the doc calls for, without inventing a 13th component:
          folded into Hero since it's the highest-impact surface already. */}
      <div className="w-full max-w-6xl mx-auto mt-14 grid grid-cols-1 md:grid-cols-3 gap-px bg-border-structural z-10">
        {(["value_01", "value_02", "value_03"] as const).map((key) => (
          <div key={key} className="bg-obsidian p-6 text-left space-y-3">
            <p className="font-mono text-[9px] tracking-[0.25em] text-gold-crust uppercase">
              {t(`${key}_num`)}
            </p>
            <p className="font-sans text-sm font-bold uppercase tracking-tight text-cotton-lace">
              {t(`${key}_title`)}
            </p>
            <p className="font-serif text-[13px] text-cotton-muted leading-relaxed">
              {t(`${key}_desc`)}
            </p>
          </div>
        ))}
      </div>

      {/* Atmospheric Stats Stripe as specified in design mockup */}
      <div className="w-full max-w-7xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 border-t border-b md:border border-border-structural bg-obsidian z-10">
        <div className="p-6 border-r border-b md:border-b-0 border-border-structural text-left space-y-2">
          <p className="font-mono text-[8px] tracking-[0.3em] text-cotton-muted uppercase">
            {t("stats_operative")}
          </p>
          <p className="font-sans text-4xl font-bold text-cotton-lace leading-none">
            05
          </p>
          <p className="font-mono text-[9px] tracking-wider text-gold-crust uppercase">
            {t("stats_operative_val")}
          </p>
        </div>

        <div className="p-6 border-b md:border-b-0 md:border-r border-border-structural text-left space-y-2">
          <p className="font-mono text-[8px] tracking-[0.3em] text-cotton-muted uppercase">
            {t("stats_alliance")}
          </p>
          <p className="font-sans text-4xl font-bold text-cotton-lace leading-none">
            00
          </p>
          <p className="font-mono text-[9px] tracking-wider text-gold-crust uppercase">
            {t("stats_alliance_val")}
          </p>
        </div>

        <div className="p-6 border-r border-border-structural text-left space-y-2">
          <p className="font-mono text-[8px] tracking-[0.3em] text-cotton-muted uppercase">
            {t("stats_mean")}
          </p>
          <p className="font-sans text-4xl font-bold text-cotton-lace leading-none">
            41<span className="text-sm text-cotton-muted font-normal">/100</span>
          </p>
          <p className="font-mono text-[9px] tracking-wider text-gold-crust uppercase">
            {t("stats_mean_val")}
          </p>
        </div>

        <div className="p-6 text-left space-y-2">
          <p className="font-mono text-[8px] tracking-[0.3em] text-cotton-muted uppercase">
            {t("stats_planes")}
          </p>
          <p className="font-sans text-4xl font-bold text-cotton-lace leading-none">
            05
          </p>
          <p className="font-mono text-[9px] tracking-wider text-gold-crust uppercase">
            {t("stats_planes_val")}
          </p>
        </div>
      </div>
    </section>
  );
}

