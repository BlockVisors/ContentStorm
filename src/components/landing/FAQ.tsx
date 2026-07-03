"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FAQItem {
  question: string;
  answer: string;
  label: string;
}

export default function FAQ() {
  const { locale, t } = useLanguage();

  const faqItems: FAQItem[] = [
    {
      label: "INTEGRITY_01",
      question: locale === "DE"
        ? "WARUM WIDERSPRICHT CONTENT STORM MEINEN PRÄMISSEN UNERBITTLICH?"
        : locale === "JA"
        ? "なぜCONTENT STORMは私の前提に執拗に反対するのですか？"
        : locale === "FR"
        ? "POURQUOI CONTENT STORM CONTREDIT-IL SANS CESSE MES PRÉMISSES ?"
        : "WHY DOES CONTENT STORM RELENTLESSLY DISAGREE WITH MY PREMISES?",
      answer: locale === "DE"
        ? "Standardmäßige generative Engines und Texteditoren sind darauf programmiert, unterwürfige Assistenten zu sein; sie nicken zustimmend, erweitern Ihre Aussagen harmonisch und schmeicheln Ihren Vorurteilen. Content Storm ist ein intellektueller Gegner. Wir gehen davon aus, dass eine These nur dann strategischen Wert gewinnt, wenn sie Reibung übersteht. Wenn unser Quintett Ihre Behauptung nicht brechen kann, wird es der Markt auch nicht tun."
        : locale === "JA"
        ? "標準的な生成エンジンやテキストエディタは、卑屈なアシスタントになるようにプログラムされています。彼らは同意してうなずき、あなたの発言を調和的に拡張し、あなたの偏見をお世辞で飾ります。Content Stormは知的な対抗者です。私たちは、論文は摩擦を生き延びることによってのみ戦略的価値を獲得するという前提で活動しています。私たちの5人組があなたの主張を崩せなければ、市場も崩せません。"
        : locale === "FR"
        ? "Les moteurs génératifs et les éditeurs de texte standards sont programmés pour être des assistants serviles ; ils hochent la tête en signe d'accord, élargissent harmonieusement vos déclarations et flattent vos préjugés. Content Storm est un adversaire intellectuel. Nous partons du principe qu'une thèse ne gagne en valeur stratégique qu'en survivant à la friction. Si notre quintette ne peut pas briser votre affirmation, le marché ne le fera pas non plus."
        : "Standard generative engines and text editors are programmed to be servile assistants; they nod in agreement, expand your statements harmoniously, and flatter your biases. Content Storm is an intellectual adversary. We operate on the premise that a thesis only gains strategic value by surviving friction. If our quintet cannot break your claim, the market won't either."
    },
    {
      label: "VECTOR_02",
      question: locale === "DE"
        ? "WAS IST DER 'KONVERGENZ'-MECHANISMUS UND WIE VERHINDERT ER VORZEITIGE EXPORTE?"
        : locale === "JA"
        ? "「コンバージェンス」メカニズムとは何ですか？また、どのように時期尚早なエクスポートを防ぐのですか？"
        : locale === "FR"
        ? "QU'EST-CE QUE LE MÉCANISME DE 'CONVERGENCE' ET COMMENT EMPÊCHE-T-IL LES EXPORTATIONS PRÉMATURÉES ?"
        : "WHAT IS THE 'CONVERGENCE' MECHANIC AND HOW DOES IT PREVENT PREMATURE EXPORTS?",
      answer: locale === "DE"
        ? "Konvergenz ist unser semantischer struktureller Sperrmechanismus. Wenn Sie im Schmelztiegel entwerfen, werden die logische Dichte Ihres Inhalts, die Überprüfung von Behauptungen und der empirische Fundierungsindex in Echtzeit bewertet. Wenn ein Vektor unter eine Druckbewertung von 85 % fällt, sperrt sich das Exportterminal, sodass Sie sich mit den spezifischen Gegenargumenten der Interrogatoren befassen müssen."
        : locale === "JA"
        ? "コンバージェンス（収束）は、当社の意味構造ロックメカニズムです。Crucible内で下書きを作成すると、コンテンツの論理密度、主張の検証、および経験的根拠指数がリアルタイムでスコアリングされます。いずれかのベクトルが85%の圧力評価を下回ると、エクスポートターミナルがロックされ、尋問官によって提起された特定の反論に対処する必要があります。"
        : locale === "FR"
        ? "La convergence est notre mécanisme de verrouillage structurel sémantique. Lorsque vous rédigez dans le Creuset, la densité logique de votre contenu, la vérification des affirmations et l'indice d'ancrage empirique sont évalués en temps réel. Si un vecteur tombe en dessous d'un taux de pression de 85 %, le terminal d'exportation se verrouille, vous obligeant à répondre aux contre-arguments spécifiques soulevés par les Interrogateurs."
        : "Convergence is our semantic structural locking mechanism. When you draft inside the Crucible, your content's logical density, claim verification, and empirical grounding index are scored in real-time. If any vector falls below an 85% pressure rating, the export terminal locks, requiring you to address the specific counter-arguments raised by the Interrogators."
    },
    {
      label: "PIPELINE_03",
      question: locale === "DE"
        ? "WIE FUNKTIONIERT DIE AUTOMATISIERTE KAMPAGNE UND DIE MAILCHIMP-PIPELINE?"
        : locale === "JA"
        ? "自動キャンペーンとMAILCHIMPパイプラインはどのように機能しますか？"
        : locale === "FR"
        ? "COMMENT FONCTIONNE LA CAMPAGNE AUTOMATISÉE ET LE PIPELINE MAILCHIMP ?"
        : "HOW DOES THE AUTOMATED CAMPAIGN AND MAILCHIMP PIPELINE FUNCTION?",
      answer: locale === "DE"
        ? "Wenn ein neuer Strategie-Experte seinen sicheren Endpunkt registriert, versucht der Content Storm Adversarial Core sofort einen sicheren API-Handshake mit Mailchimp. Wenn Ihre Umgebungsschlüssel konfiguriert sind, wird der Abonnent Ihrem Zielgruppensegment hinzugefügt, was eine automatisierte strategische Briefing-Kampagne auslöst. Wenn nicht konfiguriert, werden Abonnenten sicher im lokalen Pufferspeicher zwischengespeichert."
        : locale === "JA"
        ? "新しい戦略家が安全なエンドポイントを登録すると、Content Storm Adversarial Coreは即座にMailchimpとの安全なAPIハンドシェイクを試みます。環境シークレットが構成されている場合、購読者はターゲットオーディエンスセグメントに追加され、自動化された戦略的ブリーフィングキャンペーンがトリガーされます。未構成の場合、購読者はローカルのバッファメモリに安全にキャッシュされます。"
        : locale === "FR"
        ? "Lorsqu'un nouveau stratège enregistre son point d'accès sécurisé, le Content Storm Adversarial Core tente immédiatement un handshake API sécurisé avec Mailchimp. Si vos secrets d'environnement sont configurés, l'abonné est ajouté à votre segment d'audience cible, déclenchant une campagne de briefing stratégique automatisée. S'ils ne sont pas configurés, les abonnés sont mis en cache en toute sécurité dans la mémoire tampon locale."
        : "When a new strategist registers their secure endpoint, the Content Storm Adversarial Core immediately attempts a secure API handshake with Mailchimp. If your environment secrets are configured, the subscriber is added to your target audience segment, triggering an automated strategic briefing campaign. If unconfigured, subscribers are securely cached in local buffer memory."
    },
    {
      label: "PERSONA_04",
      question: locale === "DE"
        ? "KANN ICH ZUSÄTZLICHE GEGNERISCHE PERSONAS ANPASSEN ODER DEPLOYEN?"
        : locale === "JA"
        ? "敵対的なペルソナをカスタマイズまたは追加展開できますか？"
        : locale === "FR"
        ? "PUIS-JE PERSONNALISER OU DÉPLOYER DES PERSONNALITÉS ADVERSAIRES SUPPLÉMENTAIRES ?"
        : "CAN I CUSTOMIZE OR DEPLOY ADDITIONAL ADVERSARIAL PERSONAS?",
      answer: locale === "DE"
        ? "Das Interrogator-Quintett repräsentiert die fünf Kernvektoren dialektischer Spannung: empirische, statistische, gegnerische, objektive und Ausreißer-Resilienz. Unternehmenspartner mit Freigabe der Stufe 7 können benutzerdefinierte Trainingsprotokolle synthetisieren, um spezifische Wettbewerbsgremien, Regulierungsbehörden oder gegnerische Marktszenarien zu replizieren."
        : locale === "JA"
        ? "尋問官の5人組は、弁証法的な緊張の5つのコアベクトルを表しています：経験的、統計的、逆張り、客観的、そして外れ値の回復力。レベル7のクリアランスを持つ企業パートナーは、特定の競合他社の取締役会、規制機関、または敵対的な市場シナリオを複製するためのカスタムトレーニングプロトコルを合成できます。"
        : locale === "FR"
        ? "Le Quintette de l'Interrogateur représente les cinq vecteurs fondamentaux de la tension dialectique : empirique, statistique, contrarienne, objective et de résilience aux valeurs aberrantes. Les partenaires d'entreprise disposant d'une autorisation de niveau 7 peuvent synthétiser des protocoles de formation personnalisés pour reproduire des conseils d'administration concurrents spécifiques, des organismes de réglementation ou des scénarios de marché adverses."
        : "The Interrogator Quintet represents the five core vectors of dialectic tension: empirical, statistical, contrarian, objective, and outlier resilience. Enterprise partners with Level 7 clearance can synthesize custom training protocols to replicate specific competitive boards, regulatory bodies, or adversarial market scenarios."
    },
    {
      label: "SECURITY_05",
      question: locale === "DE"
        ? "WIE SICHER SIND DIE ENTWÜRFE, DIE ICH ÜBER DAS SYSTEM ÜBERTRAGE?"
        : locale === "JA"
        ? "システムを通じて送信する下書きのセキュリティはどのようになっていますか？"
        : locale === "FR"
        ? "QUEL EST LE NIVEAU DE SÉCURITÉ DES BROUILLONS QUE JE TRANSMETS VIA LE SYSTÈME ?"
        : "HOW SECURE ARE THE DRAFTS I TRANSMIT THROUGH THE SYSTEM?",
      answer: locale === "DE"
        ? "Alle im Schmelztiegel verarbeiteten strategischen Entwürfe werden einem lokalisierten clientseitigen Parsing unterzogen, bevor sie unseren serverseitigen API-Proxy erreichen. Ihre Dokumente werden niemals für das öffentliche Modelltraining verwendet. Alle Netzwerkkanäle arbeiten unter strenger AES-256-GCM-Verschlüsselung mit sofortiger Löschung des transienten Speichers bei Beendigung der Sitzung."
        : locale === "JA"
        ? "Crucibleで処理されるすべての戦略的下書きは、サーバー側のAPIプロキシに到達する前に、ローカルのクライアント側解析を受けます。あなたのドキュメントがパブリックモデルのトレーニングに使用されることは決してありません。すべてのネットワークチャネルは、セッション終了時に即座に一時メモリがパージされる、厳格なAES-256-GCM暗号化の下で動作します。"
        : locale === "FR"
        ? "Tous les brouillons stratégiques traités dans le Creuset sont soumis à une analyse locale côté client avant d'atteindre notre proxy API côté serveur. Vos documents ne sont jamais utilisés pour la formation de modèles publics. Tous les canaux réseau fonctionnent sous un cryptage strict AES-256-GCM avec purge immédiate de la mémoire transitoire à la fin de la session."
        : "All strategic drafts processed in the Crucible are subjected to localized client-side parsing before hitting our server-side API proxy. Your documents are never used for public model training. All network channels operate under strict AES-256-GCM encryption with immediate transient memory purge upon session termination."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  useEffect(() => {
    const handleOpenFAQ = (e: Event) => {
      const customEvent = e as CustomEvent<{ index: number }>;
      if (customEvent.detail && typeof customEvent.detail.index === "number") {
        setOpenIndex(customEvent.detail.index);
        const el = document.getElementById("faq");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    };
    window.addEventListener("open-faq-item", handleOpenFAQ);
    return () => window.removeEventListener("open-faq-item", handleOpenFAQ);
  }, []);

  return (
    <section id="faq" className="py-16 bg-surface px-4 lg:px-8 border-b border-border-structural">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="space-y-2 mb-12 text-center md:text-left">
          <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
            {t("faq_title_sub")}
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl font-bold uppercase text-cotton-lace tracking-tight">
            {t("faq_title")}
          </h2>
          <p className="font-serif text-sm text-cotton-muted max-w-2xl leading-relaxed">
            {t("faq_desc")}
          </p>
        </div>

        {/* Accordion / FAQ Roll */}
        <div className="border border-border-structural bg-obsidian divide-y divide-border-structural">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`transition-all duration-150 ${
                  isOpen ? "bg-surface-teal/10" : "bg-obsidian hover:bg-surface/30"
                }`}
              >
                {/* Accordion Button */}
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full text-left p-5 sm:p-6 flex justify-between items-start gap-4 cursor-pointer focus:outline-none"
                >
                  <div className="space-y-2">
                    <span className="font-mono text-[8px] text-gold-crust/70 tracking-widest block">
                      [{item.label}]
                    </span>
                    <h3 className="font-mono text-xs sm:text-sm font-bold text-cotton-lace tracking-wide uppercase leading-snug">
                      {item.question}
                    </h3>
                  </div>
                  <div className="mt-4 text-cotton-muted hover:text-gold-crust flex-shrink-0 transition-colors">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {/* Accordion Content Panel */}
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isOpen ? "max-h-96 border-t border-border-structural/50" : "max-h-0"
                  }`}
                >
                  <div className="p-5 sm:p-6 bg-surface font-serif text-sm text-cotton-muted leading-relaxed max-w-[64ch]">
                    {item.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
