"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, BookOpen, HelpCircle, Terminal, CornerDownLeft, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SearchItem {
  id: string;
  type: "blog" | "faq";
  title: string;
  titleEN: string;
  excerpt: string;
  excerptEN?: string;
  category?: string;
  label?: string;
  index?: number; // for FAQ index
}

export default function SearchPalette() {
  const { locale, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Search Database matching BlogRoll.tsx and FAQ.tsx
  const searchItems: SearchItem[] = [
    // Blog Posts
    {
      id: "post-1",
      type: "blog",
      title: locale === "DE" 
        ? "Die tödliche Plage sanfter Zustimmung" 
        : locale === "JA" 
        ? "穏やかな同意という致命的な疫病" 
        : locale === "FR" 
        ? "Le fléau mortel du consentement doux" 
        : "The Lethal Plague of Soft Agreement",
      titleEN: "The Lethal Plague of Soft Agreement",
      excerpt: locale === "DE"
        ? "Warum moderne Software standardmäßig Ihre intellektuelle Voreingenommenheit verhätschelt und warum ein bequemer Konsens der gefährlichste Risikovektor in der Unternehmensstrategie ist."
        : locale === "JA"
        ? "なぜ現代のソフトウェアはデフォルトであなたの知的バイアスを甘やかすのか、そしてなぜ心地よい合意が企業戦略における最も危険なリスク要因なのか。"
        : locale === "FR"
        ? "Pourquoi les logiciels modernes tendent par défaut à cajoler votre biais intellectuel, et pourquoi un consensus confortable est le vecteur de risque le plus dangereux dans la stratégie d'entreprise."
        : "Why modern software defaults to coddling your intellectual bias, and why comfortable consensus is the most dangerous risk vector in enterprise strategy.",
      excerptEN: "Why modern software defaults to coddling your intellectual bias, and why comfortable consensus is the most dangerous risk vector in enterprise strategy.",
      category: locale === "DE" ? "MANIFEST" : locale === "JA" ? "マニフェスト" : locale === "FR" ? "MANIFESTE" : "MANIFESTO",
    },
    {
      id: "post-2",
      type: "blog",
      title: locale === "DE" 
        ? "Wie man einen Texteditor baut, der widerspricht" 
        : locale === "JA" 
        ? "反論するテキストエディタの構築方法" 
        : locale === "FR" 
        ? "Comment construire un éditeur de texte qui contredit" 
        : "How to Build a Text Editor that Argues Back",
      titleEN: "How to Build a Text Editor that Argues Back",
      excerpt: locale === "DE"
        ? "Ein tiefer Einblick in die Designmuster, semantischen Gewichtungsberechnungen und Verhaltensauslöser, die den interaktiven Schmelztiegel von Content Storm antreiben."
        : locale === "JA"
        ? "Content Stormのインタラクティブな試練を機能させるデザインパターン、意味の重み計算、行動トリガーへのディープダイブ。"
        : locale === "FR"
        ? "Plongée profonde dans les modèles de conception, les calculs de poids sémantique et les déclencheurs comportementaux qui font fonctionner le creuset interactif de Content Storm."
        : "Deep diving into the design patterns, semantic weight calculations, and behavioral triggers that make Content Storm's interactive crucible work.",
      excerptEN: "Deep diving into the design patterns, semantic weight calculations, and behavioral triggers that make Content Storm's interactive crucible work.",
      category: locale === "DE" ? "TECHNIK" : locale === "JA" ? "技術仕様" : locale === "FR" ? "TECHNIQUE" : "TECHNICAL WORK",
    },
    {
      id: "post-3",
      type: "blog",
      title: locale === "DE" 
        ? "Ausreißer-Resilienz gegenüber Durchschnittsoptima" 
        : locale === "JA" 
        ? "平均的な最適化を超える外れ値の回復力" 
        : locale === "FR" 
        ? "Résilience aux valeurs aberrantes plutôt qu'à l'optimum moyen" 
        : "Outlier Resilience over Mean Optima",
      titleEN: "Outlier Resilience over Mean Optima",
      excerpt: locale === "DE"
        ? "Warum Standardmodelle für den durchschnittlichen Benutzer optimieren und warum extreme Belastungstests der einzige Weg sind, dauerhafte systemische Strategien aufzubauen."
        : locale === "JA"
        ? "なぜ標準的なモデルは平均的なユーザー向けに最適化されるのか、そしてなぜ極端なストレス検証が永続的な体系的戦略を構築する唯一の方法なのか。"
        : locale === "FR"
        ? "Pourquoi les modèles standard optimisent pour l'utilisateur moyen, et pourquoi les tests de résistance extrêmes sont le seul moyen de construire des stratégies systémiques durables."
        : "Why standard models optimize for the average user, and why extreme stress testing is the only way to build durable systemic strategies.",
      excerptEN: "Why standard models optimize for the average user, and why extreme stress testing is the only way to build durable systemic strategies.",
      category: locale === "DE" ? "STRATEGIE" : locale === "JA" ? "監査分析" : locale === "FR" ? "STRATÉGIE" : "STRATEGIC AUDIT",
    },
    // FAQs
    {
      id: "faq-0",
      type: "faq",
      title: locale === "DE"
        ? "WARUM WIDERSPRICHT CONTENT STORM MEINEN PRÄMISSEN UNERBITTLICH?"
        : locale === "JA"
        ? "なぜCONTENT STORMは私の前提に執拗に反対するのですか？"
        : locale === "FR"
        ? "POURQUOI CONTENT STORM CONTREDIT-IL SANS CESSE MES PRÉMISSES ?"
        : "WHY DOES CONTENT STORM RELENTLESSLY DISAGREE WITH MY PREMISES?",
      titleEN: "WHY DOES CONTENT STORM RELENTLESSLY DISAGREE WITH MY PREMISES?",
      excerpt: locale === "DE"
        ? "Standardmäßige generative Engines und Texteditoren sind darauf programmiert, unterwürfige Assistenten zu sein; sie nicken zustimmend, erweitern Ihre Aussagen..."
        : locale === "JA"
        ? "標準的な生成エンジンやテキストエディタは、卑屈なアシスタントになるようにプログラムされています。彼らは同意してうなずき、あなたの発言を調和的に拡張し..."
        : locale === "FR"
        ? "Les moteurs génératifs et les éditeurs de texte standards sont programmés pour être des assistants serviles ; ils hochent la tête en signe d'accord..."
        : "Standard generative engines and text editors are programmed to be servile assistants; they nod in agreement, expand your statements harmoniously...",
      excerptEN: "Standard generative engines and text editors are programmed to be servile assistants; they nod in agreement, expand your statements harmoniously...",
      label: "INTEGRITY_01",
      index: 0,
    },
    {
      id: "faq-1",
      type: "faq",
      title: locale === "DE"
        ? "WAS IST DER 'KONVERGENZ'-MECHANISMUS UND WIE VERHINDERT ER VORZEITIGE EXPORTE?"
        : locale === "JA"
        ? "「コンバージェンス」メカニズムとは何ですか？また、どのように時期尚早なエクスポートを防ぐのですか？"
        : locale === "FR"
        ? "QU'EST-CE QUE LE MÉCANISME DE 'CONVERGENCE' ET COMMENT EMPÊCHE-T-IL LES EXPORTATIONS PRÉMATURÉES ?"
        : "WHAT IS THE 'CONVERGENCE' MECHANIC AND HOW DOES IT PREVENT PREMATURE EXPORTS?",
      titleEN: "WHAT IS THE 'CONVERGENCE' MECHANIC AND HOW DOES IT PREVENT PREMATURE EXPORTS?",
      excerpt: locale === "DE"
        ? "Konvergenz ist unser semantischer struktureller Sperrmechanismus. Wenn Sie im Schmelztiegel entwerfen, werden die logische Dichte Ihres Inhalts..."
        : locale === "JA"
        ? "コンバージェンス（収束）は、当社の意味構造ロックメカニズムです。Crucible内で下書きを作成すると、コンテンツの論理密度..."
        : locale === "FR"
        ? "La convergence est notre mécanisme de verrouillage structurel sémantique. Lorsque vous rédigez dans le Creuset, la densité logique..."
        : "Convergence is our semantic structural locking mechanism. When you draft inside the Crucible, your content's logical density...",
      label: "VECTOR_02",
      index: 1,
    },
    {
      id: "faq-2",
      type: "faq",
      title: locale === "DE"
        ? "WIE FUNKTIONIERT DIE AUTOMATISIERTE KAMPAGNE UND DIE MAILCHIMP-PIPELINE?"
        : locale === "JA"
        ? "自動キャンペーンとMAILCHIMPパイプラインはどのように機能しますか？"
        : locale === "FR"
        ? "COMMENT FONCTIONNE LA CAMPAGNE AUTOMATISÉE ET LE PIPELINE MAILCHIMP ?"
        : "HOW DOES THE AUTOMATED CAMPAIGN AND MAILCHIMP PIPELINE FUNCTION?",
      titleEN: "HOW DOES THE AUTOMATED CAMPAIGN AND MAILCHIMP PIPELINE FUNCTION?",
      excerpt: locale === "DE"
        ? "Wenn ein neuer Strategie-Experte seinen sicheren Endpunkt registriert, versucht der Content Storm Adversarial Core sofort einen sicheren API-Handshake..."
        : locale === "JA"
        ? "新しい戦略家が安全なエンドポイントを登録すると、Content Storm Adversarial Coreは即座にMailchimpとの安全なAPIハンドシェイクを..."
        : locale === "FR"
        ? "Lorsqu'un nouveau stratège enregistre son point d'accès sécurisé, le Content Storm Adversarial Core tente immédiatement un handshake API..."
        : "When a new strategist registers their secure endpoint, the Content Storm Adversarial Core immediately attempts a secure API handshake...",
      label: "PIPELINE_03",
      index: 2,
    },
    {
      id: "faq-3",
      type: "faq",
      title: locale === "DE"
        ? "KANN ICH ZUSÄTZLICHE GEGNERISCHE PERSONAS ANPASSEN ODER DEPLOYEN?"
        : locale === "JA"
        ? "敵対的なペルソナをカスタマイズまたは追加展開できますか？"
        : locale === "FR"
        ? "PUIS-JE PERSONNALISER OU DÉPLOYER DES PERSONNALITÉS ADVERSAIRES SUPPLÉMENTAIRES ?"
        : "CAN I CUSTOMIZE OR DEPLOY ADDITIONAL ADVERSARIAL PERSONAS?",
      titleEN: "CAN I CUSTOMIZE OR DEPLOY ADDITIONAL ADVERSARIAL PERSONAS?",
      excerpt: locale === "DE"
        ? "Das Interrogator-Quintett repräsentiert die fünf Kernvektoren dialektischer Spannung: empirische, statistische, gegnerische, objektive..."
        : locale === "JA"
        ? "尋問官の5人組は、弁証法的な緊張の5つのコアベクトルを表しています：経験的、統計的、逆張り、客観的..."
        : locale === "FR"
        ? "Le Quintette de l'Interrogateur représente les cinq vecteurs fondamentaux de la tension dialectique : empirique, statistique..."
        : "The Interrogator Quintet represents the five core vectors of dialectic tension: empirical, statistical, contrarian, objective, and outlier resilience...",
      label: "PERSONA_04",
      index: 3,
    },
    {
      id: "faq-4",
      type: "faq",
      title: locale === "DE"
        ? "WIE SICHER SIND DIE ENTWÜRFE, DIE ICH ÜBER DAS SYSTEM ÜBERTRAGE?"
        : locale === "JA"
        ? "システムを通じて送信する下書きのセキュリティはどのようになっていますか？"
        : locale === "FR"
        ? "QUEL EST LE NIVEAU DE SÉCURITÉ DES BROUILLONS QUE JE TRANSMETS VIA LE SYSTÈME ?"
        : "HOW SECURE ARE THE DRAFTS I TRANSMIT THROUGH THE SYSTEM?",
      titleEN: "HOW SECURE ARE THE DRAFTS I TRANSMIT THROUGH THE SYSTEM?",
      excerpt: locale === "DE"
        ? "Alle im Schmelztiegel verarbeiteten strategischen Entwürfe werden einem lokalisierten clientseitigen Parsing unterzogen, bevor sie..."
        : locale === "JA"
        ? "Crucibleで処理されるすべての戦略的下書きは、サーバー側のAPIプロキシに到達する前に、ローカルのクライアント側解析を受けます..."
        : locale === "FR"
        ? "Tous les brouillons stratégiques traités dans le Creuset sont soumis à une analyse locale côté client avant d'atteindre..."
        : "All strategic drafts processed in the Crucible are subjected to localized client-side parsing before hitting our server-side API proxy...",
      label: "SECURITY_05",
      index: 4,
    }
  ];

  // Key Event bindings (Ctrl+K, Cmd+K, Custom Event Toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    const handleCustomToggle = () => {
      setIsOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("toggle-search-palette", handleCustomToggle);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("toggle-search-palette", handleCustomToggle);
    };
  }, []);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle outside clicks
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Filter items based on query
  const filteredItems = searchItems.filter((item) => {
    if (!query.trim()) return true;
    const cleanQuery = query.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(cleanQuery) ||
      item.titleEN.toLowerCase().includes(cleanQuery) ||
      item.excerpt.toLowerCase().includes(cleanQuery) ||
      (item.excerptEN && item.excerptEN.toLowerCase().includes(cleanQuery)) ||
      (item.category && item.category.toLowerCase().includes(cleanQuery)) ||
      (item.label && item.label.toLowerCase().includes(cleanQuery))
    );
  });

  // Keep selected index in bound
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems, selectedIndex]);

  // Handle action selection
  const handleSelectItem = (item: SearchItem) => {
    setIsOpen(false);
    if (item.type === "blog") {
      window.dispatchEvent(new CustomEvent("open-blog-post", { detail: { id: item.id } }));
    } else if (item.type === "faq") {
      window.dispatchEvent(new CustomEvent("open-faq-item", { detail: { index: item.index } }));
    }
  };

  // Keyboard navigation inside modal
  const handleKeyDownInModal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex]);
      }
    }
  };

  // Ensure selected item is visible in scrolling container
  useEffect(() => {
    const container = resultsContainerRef.current;
    if (!container) return;

    const selectedElement = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedElement) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const elemTop = selectedElement.offsetTop;
      const elemBottom = elemTop + selectedElement.clientHeight;

      if (elemTop < containerTop) {
        container.scrollTop = elemTop;
      } else if (elemBottom > containerBottom) {
        container.scrollTop = elemBottom - container.clientHeight;
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] bg-obsidian/95 backdrop-blur-md flex items-start justify-center pt-[12vh] p-4 font-sans text-cotton-lace select-none"
      onClick={handleOverlayClick}
      id="search-palette-overlay"
    >
      {/* Search Container Box */}
      <div 
        className="bg-surface border-2 border-gold-crust w-full max-w-2xl flex flex-col shadow-[0_25px_60px_rgba(201,162,75,0.18)] max-h-[70vh] animate-in fade-in zoom-in-95 duration-150"
        id="search-palette-modal"
      >
        {/* Search Input field */}
        <div className="flex items-center border-b border-border-structural bg-surface-container-lowest/80 p-4 gap-3">
          <Search size={18} className="text-gold-crust flex-shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInModal}
            placeholder={t("search_placeholder")}
            className="w-full bg-transparent border-0 font-mono text-sm text-cotton-lace placeholder-cotton-muted outline-none focus:ring-0 focus:outline-none"
            id="search-input"
          />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-mono text-[8px] border border-border-structural px-1.5 py-0.5 bg-obsidian text-cotton-muted rounded-sm">
              ESC
            </span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-cotton-muted hover:text-gold-crust cursor-pointer p-0.5"
              title="CLOSE_SEARCH"
              id="search-close-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="bg-obsidian border-b border-border-structural/40 px-4 py-2 flex justify-between items-center text-[8px] font-mono text-cotton-muted tracking-widest uppercase">
          <span>
            {query.trim() ? `${filteredItems.length} ${t("search_results")}` : "POPULAR_SEARCH_VECTORS"}
          </span>
          {filteredItems.length > 0 && (
            <span className="flex items-center gap-1">
              <CornerDownLeft size={8} /> {t("search_tip")}
            </span>
          )}
        </div>

        {/* Results / Suggestions Container */}
        <div 
          ref={resultsContainerRef}
          className="flex-grow overflow-y-auto max-h-[45vh] divide-y divide-border-structural/30"
          id="search-results-container"
        >
          {filteredItems.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <Terminal size={24} className="mx-auto text-rust animate-pulse" />
              <p className="font-mono text-[10px] text-rust tracking-wider uppercase font-bold">
                {t("search_no_results")}
              </p>
              <p className="font-serif text-xs text-cotton-muted max-w-sm mx-auto">
                No matching indexes found. Try adjusting your vocabulary or check alternative spellings.
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={() => handleSelectItem(item)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-surface-teal/15 border-l-4 border-l-gold-crust" 
                      : "hover:bg-surface-container/30 border-l-4 border-l-transparent"
                  }`}
                  id={`search-item-${item.id}`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.type === "blog" ? (
                        <span className="font-mono text-[8px] text-teal-bright bg-teal-bright/5 border border-teal-bright/20 px-1.5 py-0.2 uppercase tracking-wider flex items-center gap-1">
                          <BookOpen size={8} />
                          {t("search_type_blog")}
                        </span>
                      ) : (
                        <span className="font-mono text-[8px] text-gold-crust bg-gold-crust/5 border border-gold-crust/20 px-1.5 py-0.2 uppercase tracking-wider flex items-center gap-1">
                          <HelpCircle size={8} />
                          {t("search_type_faq")}
                        </span>
                      )}
                      {item.category && (
                        <span className="font-mono text-[8px] text-cotton-muted">
                          [{item.category}]
                        </span>
                      )}
                      {item.label && (
                        <span className="font-mono text-[8px] text-cotton-muted">
                          [{item.label}]
                        </span>
                      )}
                    </div>
                    <h4 className={`font-mono text-xs sm:text-sm font-bold tracking-wide uppercase transition-colors ${
                      isSelected ? "text-gold-crust" : "text-cotton-lace"
                    }`}>
                      {item.title}
                    </h4>
                    <p className="font-serif text-xs text-cotton-muted line-clamp-2 leading-relaxed">
                      {item.excerpt}
                    </p>
                  </div>

                  {/* Indicator Arrow on Hover/Selection */}
                  <div className={`mt-5 flex-shrink-0 transition-all ${
                    isSelected ? "text-gold-crust translate-x-0 opacity-100" : "text-cotton-muted -translate-x-2 opacity-0"
                  }`}>
                    <CornerDownLeft size={14} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info footer banner */}
        <div className="bg-surface-container-lowest/90 border-t border-border-structural p-3 flex flex-col sm:flex-row justify-between items-center text-[8px] font-mono text-cotton-muted gap-2">
          <div className="flex items-center gap-1 uppercase">
            <Sparkles size={10} className="text-gold-crust" />
            <span>CRITICAL COMPLIMENTARY MODULE LOADED</span>
          </div>
          <span className="uppercase">
            CTRL+K // COGNITIVE RECON ARCHIVE v1.2
          </span>
        </div>
      </div>
    </div>
  );
}
