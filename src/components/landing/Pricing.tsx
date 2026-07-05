"use client";

import React from "react";
import { Check, HelpCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Pricing() {
  const { locale, t } = useLanguage();

  const tiers = [
    {
      key: "FREE",
      name: "FREE",
      price: "$0",
      period: locale === "DE" ? "/monat" : locale === "JA" ? "/月" : locale === "FR" ? "/mois" : "/mo",
      credits: locale === "DE" ? "50 Credits/Monat" : locale === "JA" ? "50 クレジット/月" : locale === "FR" ? "50 crédits/mois" : "50 credits/mo",
      features: [
        locale === "DE" ? "Text-Engine" : locale === "JA" ? "テキストエンジン" : locale === "FR" ? "Moteur de texte" : "Text engine",
        locale === "DE" ? "Herausforderungskammer" : locale === "JA" ? "チャレンジチャンバー" : locale === "FR" ? "Chambre des défis" : "Challenge Chamber",
        locale === "DE" ? "Wasserzeichen 720p MP4" : locale === "JA" ? "ウォーターマーク付き 720p MP4" : locale === "FR" ? "MP4 720p avec filigrane" : "Watermarked 720p MP4"
      ],
      cta: t("plan_cta_free"),
      link: "/sign-up?redirect_url=/billing",
      highlight: false
    },
    {
      key: "PRO",
      name: "PRO",
      price: "$49",
      period: locale === "DE" ? "/monat" : locale === "JA" ? "/月" : locale === "FR" ? "/mois" : "/mo",
      credits: locale === "DE" ? "500 Credits/Monat" : locale === "JA" ? "500 クレジット/月" : locale === "FR" ? "500 crédits/mois" : "500 credits/mo",
      features: [
        locale === "DE" ? "Größeres Credit-Kontingent" : locale === "JA" ? "より大きなクレジット割り当て" : locale === "FR" ? "Plus grande allocation de crédits" : "Larger credit allotment",
        locale === "DE" ? "1080p/4K Video" : locale === "JA" ? "1080p/4K ビデオ" : locale === "FR" ? "Vidéo 1080p/4K" : "1080p/4K video",
        locale === "DE" ? "Rohdaten-Stems" : locale === "JA" ? "生アセット・ステム" : locale === "FR" ? "Pistes d'actifs bruts" : "Raw asset stems",
        locale === "DE" ? "Kein Wasserzeichen" : locale === "JA" ? "ウォーターマークなし" : locale === "FR" ? "Sans filigrane" : "No watermark"
      ],
      cta: t("plan_cta_select"),
      link: "/sign-up?redirect_url=/billing",
      highlight: true
    },
    {
      key: "ARCHITECT",
      name: "ARCHITECT",
      price: "$79–149",
      period: locale === "DE" ? "/monat" : locale === "JA" ? "/月" : locale === "FR" ? "/mois" : "/mo",
      credits: locale === "DE" ? "1500 inkl. + Überhang-Abrechnung" : locale === "JA" ? "1500込み + 従量制超越料金" : locale === "FR" ? "1500 incl. + dépassement mesuré" : "1500 incl. + metered overage",
      features: [
        locale === "DE" ? "Keine feste Credit-Obergrenze" : locale === "JA" ? "ハードなクレジット上限なし" : locale === "FR" ? "Pas de plafond de crédit strict" : "No hard credit ceiling",
        locale === "DE" ? "Priorisierte Rendering-Warteschlange" : locale === "JA" ? "優先レンダーキュー" : locale === "FR" ? "File d'attente de rendu prioritaire" : "Priority render queue",
        locale === "DE" ? "1080p/4K, sauber, Rohdaten-Stems" : locale === "JA" ? "1080p/4K、クリーン、生ステム" : locale === "FR" ? "1080p/4K, propre, pistes brutes" : "1080p/4K, clean, raw stems"
      ],
      cta: t("plan_cta_select"),
      link: "/sign-up?redirect_url=/billing",
      highlight: false
    },
    {
      key: "ENTERPRISE_SANDBOX",
      name: "SANDBOX",
      price: "$40–75",
      period: locale === "DE" ? "/sitzplatz/monat" : locale === "JA" ? "/席/月" : locale === "FR" ? "/siège/mois" : "/seat/mo",
      credits: locale === "DE" ? "800 Credits/Sitzplatz/Monat" : locale === "JA" ? "800 クレジット/席/月" : locale === "FR" ? "800 crédits/siège/mois" : "800 credits/seat/mo",
      features: [
        "LTI 1.3 + AGS + xAPI + SCORM",
        locale === "DE" ? "On-Chain-SRS + Premium-Berechnung inklusive" : locale === "JA" ? "オンチェーンSRS + プレミアム計算込み" : locale === "FR" ? "SRS sur chaîne + calcul premium inclus" : "On-chain SRS + premium compute included",
        locale === "DE" ? "Sitzplatzbasiert, jährliches Minimum" : locale === "JA" ? "席数ベース、年間最小" : locale === "FR" ? "Basé sur les sièges, minimum annuel" : "Seat-based, annual minimum"
      ],
      cta: t("plan_cta_select"),
      link: "/sign-up?redirect_url=/billing",
      highlight: false
    },
    {
      key: "SOVEREIGN",
      name: "SOVEREIGN",
      price: locale === "DE" ? "Individuell" : locale === "JA" ? "カスタム" : locale === "FR" ? "Sur mesure" : "Custom",
      period: "",
      credits: locale === "DE" ? "Verhandelte Kapazität" : locale === "JA" ? "交渉容量" : locale === "FR" ? "Capacité négociée" : "negotiated capacity",
      features: [
        locale === "DE" ? "Drift-Dashboard" : locale === "JA" ? "ドリフトダッシュボード" : locale === "FR" ? "Tableau de bord de dérive" : "Drift Dashboard",
        locale === "DE" ? "Curriculum-Arbitrage" : locale === "JA" ? "カリキュラム裁定取引" : locale === "FR" ? "Arbitrage de programme" : "Curriculum Arbitrage",
        locale === "DE" ? "Federated Edge" : locale === "JA" ? "フェデレーテッドエッジ" : locale === "FR" ? "Federated Edge" : "Federated Edge",
        locale === "DE" ? "Persönliche Betreuung" : locale === "JA" ? "ホワイトグローブ対応" : locale === "FR" ? "Service personnalisé" : "White-glove"
      ],
      cta: t("plan_cta_sales"),
      link: "mailto:sales@contentstorm.ai?subject=Sovereign%20tier%20inquiry",
      highlight: false
    }
  ];

  const addons = [
    {
      name: locale === "DE" ? "On-Chain SRS Nachweise" : locale === "JA" ? "オンチェーンSRSクレデンシャル" : locale === "FR" ? "Identifiants SRS sur chaîne" : "On-Chain SRS Credentials",
      price: "+$29/mo",
      desc: locale === "DE" ? "Unveränderlicher Nachweis über die Bewältigung von Herausforderungen." : locale === "JA" ? "チャレンジ完了の不変の証明。" : locale === "FR" ? "Preuve immuable de la réussite des défis." : "Immutable proof of challenge completion."
    },
    {
      name: locale === "DE" ? "High-Tier Gegnerische Berechnung" : locale === "JA" ? "ハイティア敵対的計算" : locale === "FR" ? "Calcul adverse de haut niveau" : "High-Tier Adversarial Compute",
      price: "+$39/mo",
      desc: locale === "DE" ? "Schnellere Durchläufe und tiefere Persona-Mapping-Funktionen." : locale === "JA" ? "より高速な実行とより深いペルソナマッピング。" : locale === "FR" ? "Exécutions plus rapides et cartographie approfondie des personas." : "Faster runs and deeper persona mapping."
    },
    {
      name: locale === "DE" ? "Der Arbitrage Clipper" : locale === "JA" ? "裁定取引クリッパー" : locale === "FR" ? "Le Clipper d'arbitrage" : "The Arbitrage Clipper",
      price: "+$39/mo",
      desc: locale === "DE" ? "Automatisierte Trimm-Werkzeuge für Folien und Videos." : locale === "JA" ? "自動スライド＆ビデオトリミングツール。" : locale === "FR" ? "Outils de rognage automatisés pour diapositives et vidéos." : "Automated slide and video trimming tools."
    },
    {
      name: locale === "DE" ? "Curriculum-Arbitrage" : locale === "JA" ? "カリキュラム裁定取引" : locale === "FR" ? "Arbitrage de programme" : "Curriculum Arbitrage",
      price: "+$49/mo",
      desc: locale === "DE" ? "Abbildung von Ausrichtungsanomalien auf externe Standards." : locale === "JA" ? "アライメント異常を外部基準にマッピング。" : locale === "FR" ? "Mise en correspondance des anomalies d'alignement avec les normes externes." : "Map alignment anomalies to external standards."
    },
    {
      name: locale === "DE" ? "Federated Edge Laufzeit" : locale === "JA" ? "フェデレーテッドエッジ・ランタイム" : locale === "FR" ? "Runtime Federated Edge" : "Federated Edge Runtime",
      price: locale === "DE" ? "Individuell" : locale === "JA" ? "カスタム" : locale === "FR" ? "Sur mesure" : "Custom",
      desc: locale === "DE" ? "Führen Sie Modelle und Rendering innerhalb Ihrer privaten VPC aus." : locale === "JA" ? "プライベートVPC内でのモデル実行とレンダリング。" : locale === "FR" ? "Exécutez des modèles et effectuez le rendu dans votre VPC privé." : "Run models and render inside your private VPC."
    }
  ];

  return (
    <section id="pricing" className="py-20 px-4 lg:px-8 bg-obsidian border-b border-border-structural">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border-structural/30">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
              {t("pricing_title_sub")}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("pricing_title")}
            </h2>
          </div>
          <p className="font-serif text-sm text-cotton-muted max-w-md leading-relaxed">
            {t("pricing_desc")}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.key}
              className={`border p-6 flex flex-col justify-between transition-all duration-300 relative group bg-surface-teal/20 ${
                tier.highlight
                  ? "border-gold-crust bg-surface-container/60 shadow-[0_0_20px_rgba(201,162,75,0.05)]"
                  : "border-border-structural hover:border-cotton-muted bg-surface-container-low"
              }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-gold-crust text-obsidian px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider">
                  {locale === "DE" ? "BELIEBT" : locale === "JA" ? "推奨" : locale === "FR" ? "RECOMMANDÉ" : "POPULAR"}
                </div>
              )}

              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2 pb-4 border-b border-border-structural/40">
                  <h3 className={`font-mono text-xs font-bold tracking-widest uppercase ${tier.highlight ? "text-gold-crust" : "text-cotton-lace"}`}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="font-sans text-2xl font-bold text-cotton-lace tracking-tight">
                      {tier.price}
                    </span>
                    <span className="font-mono text-[9px] text-cotton-muted lowercase">
                      {tier.period}
                    </span>
                  </div>
                  <div className="font-mono text-[8px] text-teal-bright tracking-wider uppercase pt-1">
                    {tier.credits}
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex gap-2 items-start font-serif text-[11px] text-cotton-muted leading-relaxed">
                      <Check size={10} className="text-teal-bright mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action CTA */}
              <div className="pt-8">
                <a
                  href={tier.link}
                  className={`w-full font-mono text-[9px] tracking-widest font-bold py-3 px-4 hover:bg-cotton-lace hover:text-obsidian transition-all uppercase flex items-center justify-center gap-1.5 border ${
                    tier.highlight
                      ? "bg-gold-crust text-obsidian border-gold-crust"
                      : "bg-transparent text-cotton-muted border-border-structural hover:border-cotton-muted hover:text-cotton-lace"
                  }`}
                >
                  <span>{tier.cta}</span>
                  <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Add-ons Subsection */}
        <div className="space-y-8 pt-8 border-t border-border-structural/30">
          <div className="space-y-1">
            <h3 className="font-sans text-xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("addons_title")}
            </h3>
            <p className="font-serif text-xs text-cotton-muted leading-relaxed">
              {t("addons_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {addons.map((addon, index) => (
              <div
                key={index}
                className="border border-border-structural bg-surface-container-low p-5 flex flex-col justify-between space-y-4 hover:border-cotton-muted transition-colors duration-200"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-mono text-[10px] font-bold text-cotton-lace tracking-wider uppercase leading-snug">
                      {addon.name}
                    </h4>
                    <span className="font-mono text-[9px] text-gold-crust font-bold bg-gold-crust/5 border border-gold-crust/20 px-1.5 py-0.5 whitespace-nowrap">
                      {addon.price}
                    </span>
                  </div>
                  <p className="font-serif text-[11px] text-cotton-muted leading-relaxed">
                    {addon.desc}
                  </p>
                </div>
                
                <div className="pt-2 border-t border-border-structural/20 flex justify-between items-center">
                  <span className="font-mono text-[7px] text-cotton-muted uppercase tracking-widest">
                    {addon.price === "Custom" || addon.price === "Sur mesure" || addon.price === "カスタム" || addon.price === "Individuell"
                      ? (locale === "DE" ? "DIREKTE_ANFRAGE" : locale === "JA" ? "直接問い合わせ" : locale === "FR" ? "ENQUÊTE_DIRECTE" : "DIRECT_INQUIRY")
                      : (locale === "DE" ? "IM_DASHBOARD_AKTIVIEREN" : locale === "JA" ? "ダッシュボードで有効化" : locale === "FR" ? "ACTIVER_DANS_LE_TABLEAU" : "ENABLE_IN_DASHBOARD")}
                  </span>
                  <span title="Configurable in organization settings">
                    <HelpCircle size={10} className="text-cotton-muted/40 cursor-help" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
