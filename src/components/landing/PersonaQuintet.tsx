"use client";

import { useState } from "react";
import { Terminal, Shield, MessageSquare, Flame, Check } from "lucide-react";
import { Interrogator } from "@/types/landing";
import { useLanguage } from "@/context/LanguageContext";

export default function PersonaQuintet() {
  const { locale, t } = useLanguage();

  const personas: Interrogator[] = [
    {
      id: "skeptic",
      name: locale === "DE" ? "DER SKEPTIKER" : locale === "JA" ? "懐疑論者" : locale === "FR" ? "LE SCEPTIQUE" : "THE SKEPTIC",
      initial: "S",
      color: "border-rust text-rust bg-rust/5",
      domain: locale === "DE" ? "Logische Fehlschlüsse & Integritätslücken" : locale === "JA" ? "論理的誤謬 & 整合性の欠如" : locale === "FR" ? "Sophismes et failles d'intégrité" : "Logical Fallacies & Integrity Gaps",
      quote: locale === "DE" ? "Ihre Behauptungen setzen einen linearen Trend voraus, was eine strukturelle Falle ist. Wo sind Ihre Gegenszenario-Daten?" : locale === "JA" ? "あなたの主張は線形トレンドを前提としていますが、それは構造的な罠です。対抗シナリオのデータはどこにありますか？" : locale === "FR" ? "Vos affirmations supposent une tendance linéaire, ce qui est un piège structurel. Où sont vos données de contre-scénario ?" : "Your claims assume a linear trend, which is a structural trap. Where is your counter-scenario data?",
      vector: locale === "DE" ? "Empirische Fundierung" : locale === "JA" ? "経験的根拠" : locale === "FR" ? "Ancrage empirique" : "Empirical Grounding",
      impactRate: 88,
    },
    {
      id: "analyst",
      name: locale === "DE" ? "DER ANALYST" : locale === "JA" ? "分析官" : locale === "FR" ? "L'ANALYSTE" : "THE ANALYST",
      initial: "A",
      color: "border-teal-bright text-teal-bright bg-teal-bright/5",
      domain: locale === "DE" ? "Statistische Zuverlässigkeit & Variablenschärfe" : locale === "JA" ? "統計的健全性 & 変数の厳密さ" : locale === "FR" ? "Solidité statistique et rigueur des variables" : "Statistical Soundness & Variable Rigor",
      quote: locale === "DE" ? "Die zugrundeliegende Varianz in Ihren Q4-Logistikindizes stellt eine fatale Fehlerrate dar. Margen neu berechnen." : locale === "JA" ? "第4四半期の物流指数の不一致は致命的なエラー率を示しています。マージンを再計算してください。" : locale === "FR" ? "La variance sous-jacente de vos indices logistiques du T4 représente un taux d'erreur fatal. Recalculez les marges." : "The underlying variance in your Q4 logistics indices represents a fatal error rate. Recalculate margins.",
      vector: locale === "DE" ? "Quantitative Strenge" : locale === "JA" ? "定量的な厳格さ" : locale === "FR" ? "Rigueur quantitative" : "Quantitative Rigor",
      impactRate: 94,
    },
    {
      id: "contrarian",
      name: locale === "DE" ? "DER GEGNER" : locale === "JA" ? "逆張り屋" : locale === "FR" ? "LE CONTRARIEN" : "THE CONTRARIAN",
      initial: "C",
      color: "border-gold-crust text-gold-crust bg-gold-crust/5",
      domain: locale === "DE" ? "Konsensstörung & Ausreißeranalyse" : locale === "JA" ? "合意破壊 & 外れ値分析" : locale === "FR" ? "Perturbation du consensus et analyse des valeurs aberrantes" : "Consensus Disruption & Outlier Analysis",
      quote: locale === "DE" ? "Zustimmung ist Komfort, und Komfort ist Verfall. Was wäre, wenn Ihr Hauptwertversprechen tatsächlich Ihr Hauptengpass ist?" : locale === "JA" ? "合意は心地よさであり、心地よさは衰退です。あなたの主要な価値提案が、実は主要なボトルネックだとしたら？" : locale === "FR" ? "L'accord est le confort, et le confort est le déclin. Et si votre principale proposition de valeur était en réalité votre principal goulot d'étranglement ?" : "Agreement is comfort, and comfort is decay. What if your main value proposition is actually your primary bottleneck?",
      vector: locale === "DE" ? "Verzerrungsstörung" : locale === "JA" ? "偏見 of 破壊" : locale === "FR" ? "Perturbation des biais" : "Bias Disruption",
      impactRate: 72,
    },
    {
      id: "stoic",
      name: locale === "DE" ? "DER STOIKER" : locale === "JA" ? "ストア派" : locale === "FR" ? "LE STOÏQUE" : "THE STOIC",
      initial: "S",
      color: "border-cotton-muted text-cotton-muted bg-cotton-muted/5",
      domain: locale === "DE" ? "Eliminierung emotionaler Stimmungen" : locale === "JA" ? "感情的センチメントの排除" : locale === "FR" ? "Élimination des sentiments émotionnels" : "Emotional Sentiment Elimination",
      quote: locale === "DE" ? "Entfernen Sie die qualitativen Adjektive aus Ihrem Pitch. Betrachten wir ausschließlich den kalten Kapitalbedarf." : locale === "JA" ? "ピッチから形容詞を排除してください。冷酷な資本要件のみに焦点を当てましょう。" : locale === "FR" ? "Retirez les adjectifs qualificatifs de votre pitch. Concentrons-nous uniquement sur les exigences de capital froid." : "Strip the qualitative adjectives from your pitch. Let us look solely at the cold capital requirements.",
      vector: locale === "DE" ? "Objektive Destillation" : locale === "JA" ? "客観的蒸留" : locale === "FR" ? "Distillation objective" : "Objective Distillation",
      impactRate: 91,
    },
    {
      id: "radical",
      name: locale === "DE" ? "DER RADIKALE" : locale === "JA" ? "急進派" : locale === "FR" ? "LE RADICAL" : "THE RADICAL",
      initial: "R",
      color: "border-amber-500 text-amber-500 bg-amber-500/5",
      domain: locale === "DE" ? "Extremer Grenzwertgegner" : locale === "JA" ? "過激な境界の敵" : locale === "FR" ? "Adversaire des limites extrêmes" : "Extreme Boundary Adversary",
      quote: locale === "DE" ? "Sie haben für eine ruhige See optimiert. Mal sehen, wie sich Ihre Barreserven bei einer plötzlichen Marktsperre von 90 % behaupten." : locale === "JA" ? "あなたは穏やかな海を前提に最適化しました。突然市場が90%停止した場合に、現金準備がどうなるか見てみましょう。" : locale === "FR" ? "Vous avez optimisé pour une mer calme. Voyons comment vos réserves de trésorerie résistent à un blocage soudain de 90 % du marché." : "You've optimized for a calm sea. Let's see how your cash reserves hold up under a 90% sudden market lockup.",
      vector: locale === "DE" ? "Ausreißer-Resilienz" : locale === "JA" ? "外れ値回復力" : locale === "FR" ? "Résilience aux valeurs aberrantes" : "Outlier Resiliency",
      impactRate: 85,
    },
  ];

  const [activeId, setActiveId] = useState<string>("skeptic");
  const activePersona = personas.find((p) => p.id === activeId) || personas[0];

  return (
    <section id="personas" className="py-16 border-b border-border-structural bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-cotton-muted block uppercase">
              {t("personas_title_sub")}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("personas_title")}
            </h2>
          </div>
          <p className="font-serif text-sm text-cotton-muted max-w-md leading-relaxed">
            {t("personas_desc")}
          </p>
        </div>

        {/* Dynamic Interactive Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border-structural border border-border-structural">
          
          {/* List/Grid of Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-px bg-border-structural">
            {personas.map((p) => {
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`p-6 text-left cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[180px] ${
                    isActive ? "bg-surface" : "bg-obsidian hover:bg-surface/50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    {/* Persona Badge */}
                    <div className={`w-10 h-10 border flex items-center justify-center font-mono font-bold text-lg ${p.color}`}>
                      {p.initial}
                    </div>
                    <span className="font-mono text-[8px] tracking-widest text-cotton-muted uppercase">
                      ENTITY // {p.id}
                    </span>
                  </div>

                  <div className="space-y-1 mt-6">
                    <h4 className="font-sans text-base font-bold text-cotton-lace tracking-wide uppercase">
                      {p.name}
                    </h4>
                    <p className="font-mono text-[9px] text-cotton-muted uppercase">
                      {p.domain}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Simulated locked status / future additions slot */}
            <div className="p-6 bg-obsidian flex flex-col items-center justify-center text-center text-cotton-muted border-dashed border border-border-structural/30">
              <Terminal size={24} className="text-border-structural mb-2" />
              <p className="font-mono text-[10px] tracking-widest uppercase">
                {t("deploy_new_adversary")}
              </p>
              <p className="font-mono text-[8px] text-rust uppercase mt-1">
                {t("requires_clearance")}
              </p>
            </div>
          </div>

          {/* Active Detail Display Panel */}
          <div className="lg:col-span-5 bg-surface p-6 sm:p-8 flex flex-col justify-between min-h-[350px]">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border-structural/50 pb-4">
                <span className="font-mono text-[10px] tracking-widest text-gold-crust uppercase">
                  {t("active_interg")}{activePersona.name}
                </span>
                <span className="w-2 h-2 bg-gold-crust"></span>
              </div>

              {/* Serif Quote Box representing the "Adversarial Voice" */}
              <div className="relative border-l-2 border-gold-crust pl-4 py-1 italic text-cotton-lace font-serif text-base sm:text-lg leading-relaxed">
                "{activePersona.quote}"
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-cotton-muted uppercase">{t("impact_vector")}</span>
                  <span className="text-cotton-lace uppercase tracking-wider">{activePersona.vector}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-cotton-muted uppercase">{t("pressure_index")}</span>
                  <span className="text-gold-crust font-bold">{activePersona.impactRate}%</span>
                </div>

                {/* Simulated Resilience bar indicator */}
                <div className="w-full h-1 bg-surface-container-high">
                  <div 
                    className="h-full bg-gold-crust transition-all duration-500" 
                    style={{ width: `${activePersona.impactRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border-structural/50 flex justify-between items-center">
              <span className="font-mono text-[8px] text-cotton-muted uppercase tracking-widest">
                {t("stress_test_vector")}
              </span>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-3 ${i < activePersona.impactRate/20 ? "bg-gold-crust" : "bg-border-structural"}`}
                  ></div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}

