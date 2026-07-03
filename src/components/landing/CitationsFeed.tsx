"use client";

import React, { useState } from "react";
import { MessageSquare, Twitter, Globe, Award, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Citation {
  id: string;
  source: "X_TWITTER" | "LINKEDIN" | "ACADEMIC_JOURNAL" | "HACKER_NEWS";
  author: string;
  handle: string;
  date: string;
  text: string;
  impactRate: string;
  url?: string;
}

export default function CitationsFeed() {
  const { locale, t } = useLanguage();
  const [filter, setFilter] = useState<"ALL" | "X_TWITTER" | "LINKEDIN" | "ACADEMIC_JOURNAL">("ALL");

  const citations: Citation[] = [
    {
      id: "cite-1",
      source: "X_TWITTER",
      author: "Julius Vance",
      handle: "@julius_v",
      date: locale === "DE" ? "vor 14 Std." : locale === "JA" ? "14時間前" : locale === "FR" ? "il y a 14h" : "14h ago",
      text: locale === "DE"
        ? "Die Skeptiker-Persona von Content Storm hat die Behauptungen unseres Pitch Decks zum adressierbaren Markt absolut dezimiert. Unangenehm? Ja. Präzise? Extrem. Wir haben die Zahlen überarbeitet und uns gerade unseren Lead-Investor gesichert."
        : locale === "JA"
        ? "Content Stormの懐疑論者ペルソナは、当社のピッチデッキの獲得可能最大市場規模に関する主張を完全に崩壊させました。不快だったか？はい。正確だったか？極めて。数値を再検討し、リード投資家を獲得したばかりです。"
        : locale === "FR"
        ? "La personnalité Sceptique de Content Storm a absolument décimé les affirmations de notre pitch deck sur le marché adressable. Désagréable ? Oui. Précis ? Extrêmement. Nous avons retravaillé les chiffres et venons de sécuriser notre investisseur principal."
        : "Content Storm's Skeptic persona absolutely decimated our pitch deck's addressable market claims. Unpleasant? Yes. Accurate? Extremely. We reworked the numbers and just secured our lead investor.",
      impactRate: locale === "DE" ? "STRATEGISCHES_ÜBERLEBEN" : locale === "JA" ? "戦略的生存" : locale === "FR" ? "SURVIE_STRATÉGIQUE" : "STRATEGIC_SURVIVAL"
    },
    {
      id: "cite-2",
      source: "ACADEMIC_JOURNAL",
      author: locale === "DE" ? "Review für Dialektische Informatik" : locale === "JA" ? "弁証法計算レビュー" : locale === "FR" ? "Revue d'Informatique Dialectique" : "Dialectic Computing Review",
      handle: "ISSN: 2049-391X",
      date: locale === "DE" ? "Mai 2026" : locale === "JA" ? "2026年5月" : locale === "FR" ? "Mai 2026" : "May 2026",
      text: locale === "DE"
        ? "Durch die Etablierung von geschlossenen gegnerischen Bewertungsschwellen (The Convergence Metric) bietet Content Storm ein wiederholbares Schnittstellen-Framework, das kognitiven Verzerrungen in den Entscheidungspipelines von Führungskräften aktiv entgegenwirkt."
        : locale === "JA"
        ? "クローズドループの敵対的スコアリングしきい値（コンバージェンスメトリック）を確立することにより、Content Stormは、経営陣の意思決定パイプラインにおける認知バイアスに積極的に対抗する再現可能なインターフェースフレームワークを提供します。"
        : locale === "FR"
        ? "En établissant des seuils d'évaluation contradictoires en boucle fermée (The Convergence Metric), Content Storm propose un cadre d'interface reproductible qui neutralise activement les biais cognitifs dans les pipelines de décision des dirigeants."
        : "By establishing closed-loop adversarial scoring thresholds (The Convergence Metric), Content Storm offers a repeatable interface framework that actively counteracts cognitive bias in executive decision pipelines.",
      impactRate: locale === "DE" ? "EMPIRISCHER_BEWEIS" : locale === "JA" ? "経験的証拠" : locale === "FR" ? "PREUVE_EMPIRIQUE" : "EMPIRICAL_PROOF"
    },
    {
      id: "cite-3",
      source: "LINKEDIN",
      author: "Sarah Jenkins, PhD",
      handle: locale === "DE" ? "Direktorin für kognitive Systeme @ Apex" : locale === "JA" ? "認知システム責任者 @ Apex" : locale === "FR" ? "Directrice des Systèmes Cognitifs @ Apex" : "Director of Cognitive Systems @ Apex",
      date: locale === "DE" ? "vor 2 Tagen" : locale === "JA" ? "2日前" : locale === "FR" ? "il y a 2 jours" : "2 days ago",
      text: locale === "DE"
        ? "Die meisten KI-Zusammenfasser verhalten sich wie unterwürfige Assistenten – sie nicken immer, erweitern immer. Content Storm ist das erste Werkzeug, das ich benutzt habe, das tatsächlich mit Daten argumentiert. Das Contrarian-Modell ist eine Meisterklasse in der Verzerrungsstörung."
        : locale === "JA"
        ? "ほとんどのAI要約ツールは、お世辞を言うアシスタントのように振る舞います。常にうなずき、常に拡張します。Content Stormは、データを使って実際に反論する初めてのツールです。逆張り屋モデルは偏見の破壊におけるマスタークラスです。"
        : locale === "FR"
        ? "La plupart des résumeurs d'IA agissent comme des assistants obséquieux — toujours d'accord, toujours en train d'en faire plus. Content Storm est le premier outil que j'utilise qui argumente réellement avec des données. Le modèle Contrarien est un modèle de perturbation des biais."
        : "Most AI summarizers act like obsequious assistants—always nodding, always expanding. Content Storm is the first tool I've used that actually argues back with data. The Contrarian model is a masterclass in bias disruption.",
      impactRate: locale === "DE" ? "GEGNERISCHE_TIEFE" : locale === "JA" ? "敵対的深度" : locale === "FR" ? "PROFONDEUR_ADVERSAIRE" : "ADVERSARIAL_DEPTH"
    },
    {
      id: "cite-4",
      source: "X_TWITTER",
      author: "Tectonic Capital",
      handle: "@tectonic_cap",
      date: locale === "DE" ? "vor 3 Tagen" : locale === "JA" ? "3日前" : locale === "FR" ? "il y a 3 jours" : "3 days ago",
      text: locale === "DE"
        ? "Wir schreiben nun vor, dass alle Portfolio-Startups ihre Q3-Expansions-Memos vor Pitch-Präsentationen einer Content Storm Challenge Chamber vorlegen. Kein Export unter einem Resilience Score von 85 wird freigegeben."
        : locale === "JA"
        ? "ピッチプレゼンテーションの前に、すべてのポートフォリオスタートアップに第3四半期の拡大メモをContent Stormチャレンジチャンバーに提出することを義務付けています。レジリエンススコアが85未満のエクスポートは許可されません。"
        : locale === "FR"
        ? "Nous imposons désormais à toutes les startups de notre portefeuille de soumettre leurs notes d'expansion du T3 à une Challenge Chamber de Content Storm avant les présentations de pitch. Aucun export en dessous d'un score de résilience de 85 n'est validé."
        : "We are now mandating all portfolio startups submit their Q3 expansion memos to a Content Storm Challenge Chamber before pitch presentations. No export below an 85 Resilience Score is cleared.",
      impactRate: locale === "DE" ? "FREIGABE_MANDAT" : locale === "JA" ? "義務的承認" : locale === "FR" ? "AUTORISATION_OBLIGATOIRE" : "MANDATE_CLEARANCE"
    },
    {
      id: "cite-5",
      source: "HACKER_NEWS",
      author: "grey_hat_synthesizer",
      handle: "HN Thread #4409",
      date: locale === "DE" ? "vor 1 Woche" : locale === "JA" ? "1週間前" : locale === "FR" ? "il y a 1 semaine" : "1 week ago",
      text: locale === "DE"
        ? "Content Storm ist die brutalistische Antwort auf die 'KI-Slop'-Plage. Anstatt endlose Zusammenfassungen mit geringer Dichte zu erstellen, verdichtet und testet es aktiv die Logikdichte. So sollten intellektuelle Werkzeuge aussehen."
        : locale === "JA"
        ? "Content Stormは「AIスロップ（無駄情報）」の疫病に対するブルータリズム的な答えです。密度の低い要約を果てしなく作成するのではなく、論理の密度を積極的に凝縮し検証します。知的なツールはこうあるべきです。"
        : locale === "FR"
        ? "Content Storm est la réponse brutaliste au fléau du « gaspillage d'IA ». Au lieu de produire d'interminables résumés à faible densité, il condense et teste activement la densité logique. C'est à cela que devraient ressembler les outils intellectuels."
        : "Content Storm is the brutalist answer to the 'AI Slop' plague. Instead of producing endless low-density summaries, it actively condenses and tests logic density. This is how intellectual tools should look.",
      impactRate: locale === "DE" ? "LOGIK_DICHTE" : locale === "JA" ? "論理密度" : locale === "FR" ? "DENSITÉ_LOGIQUE" : "LOGIC_DENSITY"
    }
  ];

  const filteredCitations = filter === "ALL" 
    ? citations 
    : citations.filter(c => c.source === filter);

  const getSourceIcon = (source: Citation["source"]) => {
    switch (source) {
      case "X_TWITTER":
        return <Twitter size={14} className="text-gold-crust" />;
      case "LINKEDIN":
        return <Globe size={14} className="text-teal-bright" />;
      case "ACADEMIC_JOURNAL":
        return <Award size={14} className="text-cotton-lace" />;
      default:
        return <MessageSquare size={14} className="text-cotton-muted" />;
    }
  };

  const getSourceBadgeColor = (source: Citation["source"]) => {
    switch (source) {
      case "X_TWITTER":
        return "border-gold-crust/20 text-gold-crust bg-gold-crust/5";
      case "LINKEDIN":
        return "border-teal-bright/20 text-teal-bright bg-teal-bright/5";
      case "ACADEMIC_JOURNAL":
        return "border-cotton-lace/20 text-cotton-lace bg-cotton-lace/5";
      default:
        return "border-border-structural text-cotton-muted";
    }
  };

  return (
    <section id="citations" className="py-16 bg-surface px-4 lg:px-8 border-b border-border-structural">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
              {t("citations_title_sub")}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("citations_title")}
            </h2>
            <p className="font-serif text-sm text-cotton-muted max-w-2xl leading-relaxed">
              {t("citations_desc")}
            </p>
          </div>

          {/* Filtering buttons */}
          <div className="flex flex-wrap gap-2 font-mono text-[9px]">
            {(["ALL", "X_TWITTER", "LINKEDIN", "ACADEMIC_JOURNAL"] as const).map((btn) => (
              <button
                key={btn}
                onClick={() => setFilter(btn)}
                className={`px-3 py-1.5 border transition-all cursor-pointer uppercase ${
                  filter === btn 
                    ? "border-gold-crust text-gold-crust bg-gold-crust/5" 
                    : "border-border-structural text-cotton-muted hover:text-cotton-lace"
                }`}
              >
                {btn === "ALL" ? (locale === "DE" ? "ALLE_NENNUNGEN" : locale === "JA" ? "すべてのメンション" : locale === "FR" ? "TOUTES_LES_MENTIONS" : "ALL_MENTIONS") : btn}
              </button>
            ))}
          </div>
        </div>

        {/* Citations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-structural border border-border-structural">
          {filteredCitations.map((c) => (
            <div 
              key={c.id} 
              className="bg-obsidian p-6 sm:p-8 flex flex-col justify-between min-h-[280px] hover:bg-surface-teal/5 transition-all"
            >
              <div className="space-y-4">
                {/* Meta info bar */}
                <div className="flex justify-between items-center border-b border-border-structural/30 pb-3">
                  <span className={`font-mono text-[8px] border px-2 py-0.5 tracking-widest uppercase ${getSourceBadgeColor(c.source)}`}>
                    {c.source}
                  </span>
                  <span className="font-mono text-[8px] text-cotton-muted">
                    {c.date}
                  </span>
                </div>

                {/* Content body in serif representing the citation text */}
                <p className="font-serif text-sm text-cotton-lace leading-relaxed italic">
                  "{c.text}"
                </p>
              </div>

              {/* Author & Handle row */}
              <div className="pt-6 border-t border-border-structural/30 flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="font-sans text-xs font-bold text-cotton-lace uppercase tracking-wide">
                    {c.author}
                  </p>
                  <p className="font-mono text-[9px] text-cotton-muted">
                    {c.handle}
                  </p>
                </div>
                
                <div className="text-right space-y-1">
                  <span className="font-mono text-[8px] text-gold-crust bg-gold-crust/5 border border-gold-crust/10 px-1.5 py-0.5 block">
                    {c.impactRate}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Live system state banner */}
        <div className="mt-8 border border-border-structural bg-surface-container-lowest p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-teal-bright animate-pulse" />
            <span className="font-mono text-[9px] text-cotton-muted uppercase tracking-wider">
              {locale === "DE" 
                ? "CITATIONS-INTEGRITÄTSPROTOKOLL AKTIV // VERIFIZIERTER RADARSCAN: AKTIV" 
                : locale === "JA" 
                ? "引用整合性プロトコル作動中 // 検証済みレーダースキャン: 作動中" 
                : locale === "FR" 
                ? "PROTOCOLE D'INTÉGRITÉ DES CITATIONS ACTIF // SCAN RADAR VÉRIFIÉ : ACTIF" 
                : "CITATIONS INTEGRITY PROTOCOL ACTIVE // VERIFIED RADAR SCAN: ACTIVE"}
            </span>
          </div>
          <a 
            href="#contact"
            className="font-mono text-[10px] tracking-wider text-gold-crust hover:text-cotton-lace inline-flex items-center gap-1 uppercase"
          >
            {locale === "DE" ? "ZITAT MELDEN" : locale === "JA" ? "引用を報告する" : locale === "FR" ? "SIGNALER UNE CITATION" : "REPORT A CITATION"}
            <ArrowUpRight size={12} />
          </a>
        </div>

      </div>
    </section>
  );
}
