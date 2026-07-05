"use client";

import React from "react";
import { Database, ShieldAlert, GitMerge, Video, Swords, Cpu, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function HowItWorks() {
  const { locale, t } = useLanguage();

  const steps = [
    {
      num: "01",
      icon: Database,
      title: locale === "DE" ? "VAULT INGESTION" : locale === "JA" ? "ボルト取り込み" : locale === "FR" ? "INGESTION DU COFFRE" : "VAULT INGESTION",
      desc: locale === "DE" 
        ? "Ingestieren Sie Quell-PDFs, URLs oder Rohtext. Textabschnitte werden automatisch über pgvector indiziert." 
        : locale === "JA" 
        ? "ソースPDF、URL、または生テキストを取り込みます。テキストチャンクはpgvectorを介して自動的にインデックスされます。" 
        : locale === "FR" 
        ? "Ingestez les PDF source, URL ou texte brut. Les segments sont automatiquement indexés via pgvector." 
        : "Ingest source PDFs, URLs, or raw text. Chunks are automatically vectorized and indexed via pgvector."
    },
    {
      num: "02",
      icon: ShieldAlert,
      title: locale === "DE" ? "ADVERSARIAL SCAN" : locale === "JA" ? "敵対的スキャン" : locale === "FR" ? "SCAN ADVERSAIRE" : "ADVERSARIAL SCAN",
      desc: locale === "DE" 
        ? "Lassen Sie Materialien durch 5 kritische KI-Experten-Personas laufen, um Widersprüche und blinde Flecken zu extrahieren." 
        : locale === "JA" 
        ? "5人の重要なAIエキスパートペルソナに素材を通し、矛盾、偏見、死角を抽出します。" 
        : locale === "FR" 
        ? "Passez les documents au crible de 5 personas d'experts IA critiques pour extraire les contradictions et angles morts." 
        : "Run materials through 5 critical AI expert personas to extract contradictions, biases, and blind spots."
    },
    {
      num: "03",
      icon: GitMerge,
      title: locale === "DE" ? "SYNTHESIS MAP" : locale === "JA" ? "統合マップ" : locale === "FR" ? "CARTE DE SYNTHÈSE" : "SYNTHESIS MAP",
      desc: locale === "DE" 
        ? "Kompilieren Sie Vereinbarungen, widersprüchliche Argumente und ungelöste dialektische Fragen in eine strukturierte Karte." 
        : locale === "JA" 
        ? "合意、対立する議論、未解決の弁証法的質問を構造化された矛盾マップにコンパイルします。" 
        : locale === "FR" 
        ? "Compilez les accords, les arguments contradictoires et les questions dialectiques non résolues dans une carte structurée." 
        : "Compile agreements, clashing arguments, and unresolved dialectic questions into a structured contradiction map."
    },
    {
      num: "04",
      icon: Video,
      title: locale === "DE" ? "REMOTION RENDER" : locale === "JA" ? "ビデオレンダリング" : locale === "FR" ? "RENDU REMOTION" : "REMOTION RENDER",
      desc: locale === "DE" 
        ? "Transpilieren Sie die dialektische Synthese in ein multimodales Vorlesungsskript und kompilieren Sie Video-Stems." 
        : locale === "JA" 
        ? "総合内容をマルチモーダルな講義スクリプトに変換し、画像を生成し、ビデオステムをコンパイルします。" 
        : locale === "FR" 
        ? "Transpilez la synthèse en un script de conférence multimodal, générez des images et compilez des séquences vidéo." 
        : "Transpiles the dialectic synthesis into a multi-modal lecture script, generates image assets, and compiles video stems."
    },
    {
      num: "05",
      icon: Swords,
      title: locale === "DE" ? "CHALLENGE CHAMBER" : locale === "JA" ? "チャレンジチャンバー" : locale === "FR" ? "CHAMBRE DES DÉFIS" : "CHALLENGE CHAMBER",
      desc: locale === "DE" 
        ? "Verteidigen Sie Ihre These in Echtzeit gegen fünf Experten-Personas. Verdienen Sie Ihren kanonischen Score (SRS)." 
        : locale === "JA" 
        ? "5人のエキスパートペルソナに対してリアルタイムで論文を防衛します。自己調節スコア（SRS）を獲得します。" 
        : locale === "FR" 
        ? "Défendez votre thèse en temps réel contre cinq personas d'experts. Obtenez votre score d'autorégulation (SRS)." 
        : "Defend your thesis in real-time against five expert personas. Earn your canonical Self-Regulation Score (SRS)."
    },
    {
      num: "06",
      icon: Cpu,
      title: locale === "DE" ? "ON-CHAIN ATTESTATION" : locale === "JA" ? "オンチェーン証明" : locale === "FR" ? "ATTESTATION SUR CHAÎNE" : "ON-CHAIN ATTESTATION",
      desc: locale === "DE" 
        ? "Sichern Sie sich Blockchain-attestierte Nachweise (EAS), die Leistung und kritisches Verständnis belegen." 
        : locale === "JA" 
        ? "パフォーマンス、批判的理解、弁証法的な生存を証明するブロックチェーン証明付きの資格情報（EAS）を確保します。" 
        : locale === "FR" 
        ? "Sécurisez des identifiants attestés sur blockchain (EAS) prouvant votre performance et compréhension critique." 
        : "Secure blockchain-attested credentials (EAS) proving performance, critical comprehension, and dialectic survival."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 lg:px-8 bg-obsidian border-b border-border-structural">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border-structural/30">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
              {t("how_it_works_title_sub")}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("how_it_works_title")}
            </h2>
          </div>
          <p className="font-serif text-sm text-cotton-muted max-w-md leading-relaxed">
            {t("how_it_works_desc")}
          </p>
        </div>

        {/* Step Flow Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          
          {/* Subtle connecting backgrounds for large screens */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border-structural/20 -translate-y-1/2" />
          </div>

          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <div 
                key={step.num}
                className="border border-border-structural bg-surface-container-low p-6 flex flex-col justify-between space-y-6 hover:border-gold-crust hover:bg-surface-teal/5 transition-all duration-300 group z-10"
              >
                <div className="space-y-4">
                  {/* Step Header */}
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-gold-crust font-bold bg-gold-crust/5 border border-gold-crust/20 px-2 py-0.5">
                      {step.num}
                    </span>
                    <IconComponent size={18} className="text-cotton-muted group-hover:text-gold-crust transition-colors duration-300" />
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="font-mono text-xs font-bold tracking-widest text-cotton-lace uppercase group-hover:text-gold-crust transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="font-serif text-[11px] text-cotton-muted leading-relaxed group-hover:text-cotton-lace transition-colors duration-300">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {/* Footer label showing timeline routing */}
                <div className="pt-4 border-t border-border-structural/20 flex justify-between items-center text-[8px] font-mono text-cotton-muted/60 uppercase tracking-widest">
                  <span>VECTOR_STATE_{step.num}</span>
                  {idx < steps.length - 1 && (
                    <ArrowRight size={10} className="text-border-structural group-hover:text-gold-crust group-hover:translate-x-0.5 transition-all duration-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
