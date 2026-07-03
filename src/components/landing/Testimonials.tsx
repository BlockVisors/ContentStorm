"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Quote } from "lucide-react";
import { Testimonial } from "@/types/landing";
import { useLanguage } from "@/context/LanguageContext";

export default function Testimonials() {
  const { locale, t } = useLanguage();

  const testimonials: Testimonial[] = [
    {
      id: "test-1",
      quote: locale === "DE"
        ? "Content Storm hat unsere gesamte Expansions-These in fünf Minuten demontiert. Wir waren gezwungen, unsere Annahmen abzustreifen, empirische Beweise zu finden und unsere Strategie von Grund auf neu zu schreiben. Wir haben gerade unsere Serie B über 45 Millionen US-Dollar abgeschlossen. Reibung ist in der Tat das ultimative Designmerkmal."
        : locale === "JA"
        ? "Content Stormは私たちの拡大論文全体を5分で解体しました。私たちは前提を取り除き、経験的な証拠を見つけ、戦略を一から書き直すことを余儀なくされました。私たちはちょうど4500万ドルでシリーズBを完了しました。摩擦こそが究極のデザイン機能です。"
        : locale === "FR"
        ? "Content Storm a démantelé toute notre thèse d'expansion en cinq minutes. Nous avons été contraints de dépouiller nos hypothèses, de trouver des preuves empiriques et de réécrire notre stratégie à partir de zéro. Nous venons de finaliser notre Série B à 45 M$. La friction est en effet la caractéristique de conception ultime."
        : "Content Storm dismantled our entire expansion thesis in five minutes. We were forced to strip our assumptions, find empirical proofs, and rewrite our strategy from scratch. We just completed our Series B at $45M. Friction is indeed the ultimate design feature.",
      author: "MAREK VANCE",
      role: locale === "DE" ? "CHIEF STRATEGY OFFICER" : locale === "JA" ? "最高戦略責任者" : locale === "FR" ? "DIRECTEUR DE LA STRATÉGIE" : "CHIEF STRATEGY OFFICER",
      organization: "APEX SYSTEM COGNITION",
      verdictScore: 98,
    },
    {
      id: "test-2",
      quote: locale === "DE"
        ? "Jedes Schreibwerkzeug, das wir ausprobiert haben, sagte uns, unsere Marketingkampagnen-Strategie sei 'hervorragend' und 'ansprechend'. Die Stoiker- und Skeptiker-Modelle von Content Storm nannten unsere Behauptungen 'intellektuell faul' und 'ohne historische Grundlage'. Sie hatten zu 100 % recht."
        : locale === "JA"
        ? "私たちが試したすべての執筆ツールは、当社のマーケティングキャンペーン戦略が「素晴らしい」「魅力的」であると教えてくれました。Content Stormのストア派と懐疑論者モデルは、当社の主張を「知的に怠惰」で「歴史的根拠が欠けている」と評価しました。彼らは100%正しかったです。"
        : locale === "FR"
        ? "Chaque outil d'écriture que nous avons essayé nous disait que notre stratégie de campagne marketing était « stellaire » et « engageante ». Les modèles Stoïques et Sceptiques de Content Storm ont qualifié nos affirmations de « paresseuses intellectuellement » et « sans fondement historique ». Ils avaient raison à 100 %."
        : "Every writing tool we tried told us our marketing campaign strategy was 'stellar' and 'engaging'. Content Storm's Stoic and Skeptic models called our claims 'intellectually lazy' and 'lacking historical grounding'. They were 100% correct.",
      author: "ELENA CHEN",
      role: locale === "DE" ? "VP DER KOMMUNIKATION" : locale === "JA" ? "コミュニケーション担当副社長" : locale === "FR" ? "VICE-PRÉSIDENTE DES COMMUNICATIONS" : "VP OF COMMUNICATIONS",
      organization: "SOVEREIGN DATA INFRASTRUCTURES",
      verdictScore: 92,
    },
    {
      id: "test-3",
      quote: locale === "DE"
        ? "Die Contrarian-Persona hat unser Produkt-Launch-Memo abgefangen und die exakten gegenteiligen Argumente präsentiert. Indem wir Gegenargumente zu diesen spezifischen Druckpunkten vorbereiteten, verlief unser realer Start makellos. Kompromisslos, streng und absolut überlebenswichtig."
        : locale === "JA"
        ? "逆張り屋のペルソナが当社の製品発表メモを傍受し、正確に正反対の議論を提示しました。それらの特定の圧力ポイントに対する反論を準備することで、実際の発表は完璧に行われました。妥協がなく、厳格で、完全に不可欠です。"
        : locale === "FR"
        ? "La personnalité Contrarienne a intercepté notre note de lancement de produit et a présenté exactement les arguments opposés. En préparant des réfutations à ces points de pression spécifiques, notre lancement dans le monde réel a été un succès total. Intransigeant, rigoureux et absolument vital."
        : "The Contrarian persona intercepted our product launch memo and presented the exact polar opposite arguments. By preparing rebuttals to those specific pressure points, our real-world launch was flawless. Uncompromising, rigorous, and completely vital.",
      author: "DR. MARCUS THAW",
      role: locale === "DE" ? "LEITER LOGISCHE ANALYSE" : locale === "JA" ? "論理分析部門ヘッド" : locale === "FR" ? "CHEF DE L'ANALYSE LOGIQUE" : "HEAD OF LOGICAL ANALYSIS",
      organization: "HELIX GLOBAL LOGISTICS",
      verdictScore: 89,
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    stopTimer();
    if (isPlaying && !isHovered) {
      autoPlayInterval.current = setInterval(() => {
        setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
      }, 6000); // 6 seconds slide duration for comfortable reading
    }
  };

  const stopTimer = () => {
    if (autoPlayInterval.current) {
      clearInterval(autoPlayInterval.current);
      autoPlayInterval.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [activeIndex, isPlaying, isHovered]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <section id="testimonials" className="py-16 bg-surface-container-low px-4 lg:px-8 border-b border-border-structural">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
              {t("testimonials_title_sub")}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("testimonials_title")}
            </h2>
          </div>
          <p className="font-serif text-sm text-cotton-muted max-w-sm leading-relaxed">
            {t("testimonials_desc")}
          </p>
        </div>

        {/* Carousel Frame */}
        <div 
          className="border border-border-structural bg-obsidian relative overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Subtle Ambient Scanline inside carousel */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-10"></div>

          {/* Carousel Slide Track */}
          <div className="relative min-h-[300px] flex flex-col justify-between p-6 sm:p-10 z-10">
            
            {/* Top Info Bar */}
            <div className="flex justify-between items-center border-b border-border-structural/40 pb-4 mb-6">
              <span className="font-mono text-[9px] text-cotton-muted uppercase tracking-wider flex items-center gap-2">
                <span className={`w-1.5 h-1.5 ${(!isPlaying || isHovered) ? "bg-rust" : "bg-gold-crust animate-pulse"}`}></span>
                {locale === "DE" ? "URTEILS_VERIFIKATION" : locale === "JA" ? "評決検証" : locale === "FR" ? "VÉRIFICATION_DU_VERDICT" : "VERDICT_VERIFICATION"} // CASE_0{activeIndex + 1}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[8px] text-cotton-muted hidden sm:inline uppercase">
                  {isHovered 
                    ? (locale === "DE" ? "STATUS: PAUSIERT_HOVER" : locale === "JA" ? "ステータス: ホバー一時停止" : locale === "FR" ? "STATUT : PAUSE_SURVOL" : "STATUS: PAUSED_HOVER")
                    : !isPlaying 
                    ? (locale === "DE" ? "STATUS: PAUSIERT_MANUELL" : locale === "JA" ? "ステータス: 手動一時停止" : locale === "FR" ? "STATUT : PAUSE_MANUELLE" : "STATUS: PAUSED_MANUAL")
                    : (locale === "DE" ? "STATUS: AUTO_STREAMING" : locale === "JA" ? "ステータス: 自動配信" : locale === "FR" ? "STATUT : DIFFUSION_AUTO" : "STATUS: AUTO_STREAMING")}
                </span>
                <span className="font-mono text-[10px] text-gold-crust font-bold bg-gold-crust/5 border border-gold-crust/20 px-2 py-0.5">
                  {locale === "DE" ? "ÜBERLEBT" : locale === "JA" ? "生存" : locale === "FR" ? "SURVÉCU" : "SURVIVED"} // {testimonials[activeIndex].verdictScore}/100
                </span>
              </div>
            </div>

            {/* Quote content area */}
            <div className="my-auto py-4">
              <p className="font-serif text-base sm:text-lg text-cotton-lace italic leading-relaxed relative pl-4 border-l border-gold-crust/30">
                "{testimonials[activeIndex].quote}"
              </p>
            </div>

            {/* Author details / bottom row */}
            <div className="pt-6 border-t border-border-structural/30 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-sans text-sm font-bold text-cotton-lace tracking-wide uppercase">
                  {testimonials[activeIndex].author}
                </p>
                <div className="flex items-center gap-2 text-[9px] font-mono text-cotton-muted uppercase">
                  <span>{testimonials[activeIndex].role}</span>
                  <span className="text-gold-crust font-bold">// {testimonials[activeIndex].organization}</span>
                </div>
              </div>

              {/* Progress and controls bar */}
              <div className="flex items-center gap-4">
                {/* Micro timing indicator or indicators */}
                <div className="flex items-center gap-2 font-mono text-[9px]">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`w-3 h-3 flex items-center justify-center border transition-all duration-300 cursor-pointer text-[8px] font-bold ${
                        activeIndex === idx 
                          ? "border-gold-crust bg-gold-crust text-obsidian" 
                          : "border-border-structural text-cotton-muted hover:border-cotton-lace hover:text-cotton-lace"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Vertical Divider */}
                <span className="h-4 w-px bg-border-structural"></span>

                {/* Interactive Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 text-cotton-muted hover:text-gold-crust transition-all border border-border-structural/50 bg-surface hover:border-gold-crust cursor-pointer"
                    title={isPlaying ? "PAUSE_AUTOPLAY" : "RESUME_AUTOPLAY"}
                  >
                    {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                  </button>
                  <button
                    onClick={handlePrev}
                    className="p-1.5 text-cotton-muted hover:text-gold-crust transition-all border border-border-structural/50 bg-surface hover:border-gold-crust cursor-pointer"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={10} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 text-cotton-muted hover:text-gold-crust transition-all border border-border-structural/50 bg-surface hover:border-gold-crust cursor-pointer"
                    aria-label="Next slide"
                  >
                    <ChevronRight size={10} />
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom active block highlight line */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border-structural/40">
            <div 
              className="h-full bg-gold-crust transition-all duration-500" 
              style={{ width: `${((activeIndex + 1) / testimonials.length) * 100}%` }}
            />
          </div>

        </div>

      </div>
    </section>
  );
}
