"use client";

import { useState, useEffect } from "react";
import { BlogPost } from "@/types/landing";
import { ArrowUpRight, Clock, User, X, BookOpen } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function BlogRoll() {
  const { locale, t } = useLanguage();

  const posts: BlogPost[] = [
    {
      id: "post-1",
      title: locale === "DE" 
        ? "Die tödliche Plage sanfter Zustimmung" 
        : locale === "JA" 
        ? "穏やかな同意という致命的な疫病" 
        : locale === "FR" 
        ? "Le fléau mortel du consentement doux" 
        : "The Lethal Plague of Soft Agreement",
      excerpt: locale === "DE"
        ? "Warum moderne Software standardmäßig Ihre intellektuelle Voreingenommenheit verhätschelt und warum ein bequemer Konsens der gefährlichste Risikovektor in der Unternehmensstrategie ist."
        : locale === "JA"
        ? "なぜ現代のソフトウェアはデフォルトであなたの知的バイアスを甘やかすのか、そしてなぜ心地よい合意が企業戦略における最も危険なリスク要因なのか。"
        : locale === "FR"
        ? "Pourquoi les logiciels modernes tendent par défaut à cajoler votre biais intellectuel, et pourquoi un consensus confortable est le vecteur de risque le plus dangereux dans la stratégie d'entreprise."
        : "Why modern software defaults to coddling your intellectual bias, and why comfortable consensus is the most dangerous risk vector in enterprise strategy.",
      category: locale === "DE" ? "MANIFEST" : locale === "JA" ? "マニフェスト" : locale === "FR" ? "MANIFESTE" : "MANIFESTO",
      date: "2026-06-18",
      readTime: locale === "DE" ? "6 MIN LESEZEIT" : locale === "JA" ? "読了 6 分" : locale === "FR" ? "LECTURE 6 MIN" : "6 MIN READ",
      author: "CORE DEBATE ENG",
      content: locale === "DE"
        ? `In einer Ära reibungslosen Konsumdesigns erleben wir einen rapiden Verfall der Entscheidungsqualität. Software ist darauf ausgelegt, Ihnen zuzustimmen. Ihre Tabellenkalkulationen berechnen genau das, was Sie erwarten; Ihre Dokumenteneditoren fassen Ihre Gedanken mit einem höflichen Nicken zusammen; Ihre Textsynthesizer erweitern Ihre Absätze in einer harmonischen, generischen Echokammer.

Zustimmung ist Komfort. Aber Komfort ist Stagnation.

Content Storm basiert auf der absoluten Überzeugung, dass die Wahrheit überlebt werden muss, nicht hergestellt wird. Wenn ein strategisches Behauptungsblatt dem Interrogator-Quintett unterzogen wird, wird es nicht bearbeitet, sondern ins Kreuzverhör genommen. Wir suchen nach den 3 % Varianz-Ausreißern, den intellektuell faulen Annahmen und den Lücken in empirischen Daten. Wenn Ihr strategisches Dokument fünf Minuten klinischer Befragung überstehen kann, ist es bereit für den Markt. Wenn es zerbricht, verdanken Sie Ihr Überleben dem Sturm.`
        : locale === "JA"
        ? `摩擦のない消費者デザインの時代において、私たちは意思決定の質の急速な低下を目の当たりにしています。ソフトウェアはあなたに同意するように作られています。スプレッドシートはあなたが期待した通りに計算し、ドキュメントエディターは丁寧にお辞儀をしながらあなたの考えを要約し、テキスト合成機は調和の取れた一般的なエコーチェンバーの中であなたの段落を拡張します。

合意は心地よさです。しかし、心地よさは停滞です。

Content Stormは、真実は製造されるものではなく、生き残るものであるという絶対的な信念に基づいています。戦略的主張シートが尋問官の5重奏にさらされるとき、それは編集されているのではなく、反対尋問を受けているのです。私たちは3%の分散外れ値、知的に怠惰な前提、そして経験的データのギャップを探します。もしあなたの戦略文書が5分間の臨床的尋問を生き延びることができれば、市場に出す準備は整っています。もしそれが粉々に砕け散るなら、あなたは嵐のおかげで生き延びたことになるのです。`
        : locale === "FR"
        ? `À l'ère d'un design de consommation sans friction, nous assistons à une dégradation rapide de la qualité des décisions. Les logiciels sont conçus pour être d'accord avec vous. Vos feuilles de calcul calculent exactement ce que vous attendez ; vos éditeurs de documents résument vos pensées d'un hochement de tête poli ; vos synthétiseurs de texte élargissent vos paragraphes dans une chambre d'écho harmonieuse et générique.

L'accord est le confort. Mais le confort est la stagnation.

Content Storm est né de la conviction absolue que la vérité survit, elle ne se fabrique pas. Lorsqu'une feuille d'affirmations stratégiques est soumise au Quintette de l'Interrogateur, elle n'est pas modifiée ; elle est contre-interrogée. Nous recherchons les écarts aberrants de 3 %, les hypothèses intellectuellement paresseuses et les lacunes dans les données empiriques. Si votre document stratégique peut survivre à de l'interrogatoire clinique de 5 minutes, il est prêt pour le marché. S'il se brise, vous devez votre survie à la tempête.`
        : `In an era of frictionless consumer design, we are witnessing a rapid decay in decision quality. Software is built to agree with you. Your spreadsheets compute exactly what you expect; your document editors summarize your thoughts with a polite nod; your text synthesizers expand your paragraphs in a harmonious, generic echo chamber.

Agreement is comfort. But comfort is stagnation.

Content Storm is built on the absolute conviction that truth is survived, not manufactured. When a strategic claims sheet is subjected to the Interrogator Quintet, it isn't being edited; it is being cross-examined. We look for the 3% variance outliers, the intellectual lazy assumptions, and the gaps in empirical data. If your strategic document can survive five minutes of clinical interrogation, it is ready for the market. If it shatters, you owe your survival to the storm.`
    },
    {
      id: "post-2",
      title: locale === "DE" 
        ? "Wie man einen Texteditor baut, der widerspricht" 
        : locale === "JA" 
        ? "反論するテキストエディタの構築方法" 
        : locale === "FR" 
        ? "Comment construire un éditeur de texte qui contredit" 
        : "How to Build a Text Editor that Argues Back",
      excerpt: locale === "DE"
        ? "Ein tiefer Einblick in die Designmuster, semantischen Gewichtungsberechnungen und Verhaltensauslöser, die den interaktiven Schmelztiegel von Content Storm antreiben."
        : locale === "JA"
        ? "Content Stormのインタラクティブな試練を機能させるデザインパターン、意味の重み計算、行動トリガーへのディープダイブ。"
        : locale === "FR"
        ? "Plongée profonde dans les modèles de conception, les calculs de poids sémantique et les déclencheurs comportementaux qui font fonctionner le creuset interactif de Content Storm."
        : "Deep diving into the design patterns, semantic weight calculations, and behavioral triggers that make Content Storm's interactive crucible work.",
      category: locale === "DE" ? "TECHNIK" : locale === "JA" ? "技術仕様" : locale === "FR" ? "TECHNIQUE" : "TECHNICAL WORK",
      date: "2026-06-05",
      readTime: locale === "DE" ? "11 MIN LESEZEIT" : locale === "JA" ? "読了 11 分" : locale === "FR" ? "LECTURE 11 MIN" : "11 MIN READ",
      author: "LEAD ARCHITECT",
      content: locale === "DE"
        ? `Die meisten Editoren sind stumme Schiefertafeln. Sie empfangen Eingaben passiv. Der Schmelztiegel von Content Storm ist jedoch eine Umgebung mit hoher Spannung.

Mithilfe nativer semantischer Strukturen und Gewichtungsbewertungen bewertet unser Editor die logische Dichte Ihres Schreibens in Echtzeit. Wenn Sie behaupten, dass „unsere Lieferkette aufgrund von Multi-Node-Logistik robust ist“, fängt der Skeptiker sofort ab: „Behauptet, nicht bewiesen. Spezifizieren Sie die geopolitischen Indizes.“

In diesem Artikel öffnen wir unsere Architekturdateien. Wir zeigen, wie wir lokalisierte semantische Analysen, strenge Validierungsschwellenwerte und kognitive Reibungsauslöser verwenden, um die Präzision des Autors zu erzwingen, bevor ein Exportzertifikat ausgestellt wird.`
        : locale === "JA"
        ? `ほとんどのエディターは静かなキャンバスです。パッシブに入力を受け取るだけです。しかし、Content Stormの「Crucible」は高張力な環境です。

ネイティブな意味構造と重みの評価を使用して、エディターはリアルタイムであなたの執筆の論理的密度をスコアリングします。「マルチノード物流のおかげでサプライチェーンが強固だ」と主張すると、懐疑論者が即座に「主張されているが証明されていない。地政学的指数を特定してください」と遮ります。

この記事では、私たちのアーキテクチャ文書を公開します。エクスポート許可が発行される前に、執筆者に正確さを強制するための局所的な意味解析、厳密な検証スコアリングしきい値、および認知的摩擦トリガーをどのように使用しているかを示します。`
        : locale === "FR"
        ? `La plupart des éditeurs sont des ardoises silencieuses. Ils reçoivent passivement les entrées. Le creuset de Content Storm, cependant, est un environnement à haute tension.

En utilisant des structures sémantiques natives et une évaluation de poids, notre éditeur évalue la densité logique de votre écriture en temps réel. Si vous affirmez que « notre chaîne d'approvisionnement est robuste en raison d'une logistique multi-nœuds », le Sceptique intercepte immédiatement : « Asserté, non prouvé. Spécifiez les indices géopolitiques. »

Dans cet article, nous ouvrons nos documents architecturaux. Nous montrons comment nous utilisons l'analyse sémantique localisée, des seuils d'évaluation de validation stricts et des déclencheurs de friction cognitive pour forcer la précision de l'écrivain avant qu'une autorisation d'exportation ne soit délivrée.`
        : `Most editors are silent slates. They receive input passively. Content Storm's Crucible, however, is a high-tensile environment. 

Using native semantic structures and weight evaluation, our editor scores the logical density of your writing in real-time. If you claim that 'our supply chain is robust because of multi-node logistics', the Skeptic intercepts immediately: 'Asserted, not proven. Specify the geopolitical indices.'

In this article, we open our architectural documents. We show how we use localized semantic parsing, strict validation scoring thresholds, and cognitive friction triggers to force writer precision before an export clearance is issued.`
    },
    {
      id: "post-3",
      title: locale === "DE" 
        ? "Ausreißer-Resilienz gegenüber Durchschnittsoptima" 
        : locale === "JA" 
        ? "平均的な最適化を超える外れ値の回復力" 
        : locale === "FR" 
        ? "Résilience aux valeurs aberrantes plutôt qu'à l'optimum moyen" 
        : "Outlier Resilience over Mean Optima",
      excerpt: locale === "DE"
        ? "Warum Standardmodelle für den durchschnittlichen Benutzer optimieren und warum extreme Belastungstests der einzige Weg sind, dauerhafte systemische Strategien aufzubauen."
        : locale === "JA"
        ? "なぜ標準的なモデルは平均的なユーザー向けに最適化されるのか、そしてなぜ極端なストレス検証が永続的な体系的戦略を構築する唯一の方法なのか。"
        : locale === "FR"
        ? "Pourquoi les modèles standard optimisent pour l'utilisateur moyen, et pourquoi les tests de résistance extrêmes sont le seul moyen de construire des stratégies systémiques durables."
        : "Why standard models optimize for the average user, and why extreme stress testing is the only way to build durable systemic strategies.",
      category: locale === "DE" ? "STRATEGIE" : locale === "JA" ? "監査分析" : locale === "FR" ? "STRATÉGIE" : "STRATEGIC AUDIT",
      date: "2026-05-27",
      readTime: locale === "DE" ? "8 MIN LESEZEIT" : locale === "JA" ? "読了 8 分" : locale === "FR" ? "LECTURE 8 MIN" : "8 MIN READ",
      author: "VORTEX CO-FOUNDER",
      content: locale === "DE"
        ? `Der moderne Markt ist für den Durchschnitt optimiert. Jedes Optimierungsmodell konzentriert sich auf das 95-Prozent-Konfidenzintervall und schneidet genau die Ränder ab, an denen die wirklichen Stürme existieren.

Dies ist die Standardfehlerrate der strategischen Planung. Die 5 %-Ausreißer sind keine zu ignorierenden statistischen Anomalien; sie sind die genauen Vektoren, an denen ganze Unternehmen zusammenbrechen.

Durch die Analyse von 500 historischen Unternehmenspleiten zeigen wir, dass strukturelle Resilienz ausschließlich durch das Überleben extremer Ausreißerbedingungen aufgebaut wird. Wir erklären die Methodik hinter unserem Radical-Persona-Agenten und warum Stresstests unter einem plötzlichen systemischen Einfrieren von 90 % der einzige Benchmark sind, der zählt.`
        : locale === "JA"
        ? `現代の市場は平均値に最適化されています。すべての最適化モデルは95%の信頼区間に焦点を当てており、本物の嵐が存在するテール部分をきれいに切り落としています。

これが戦略計画の標準的な失敗率です。5%の外れ値は無視すべき統計的異常ではなく、企業全体が崩壊する正確な原因ベクトルそのものです。

500件の歴史的な企業破綻を分析することにより、構造的な回復力は極端な外れ値条件を生き延びることによってのみ構築されることを実証します。私たちの「ラディカル」エージェントの背後にある方法論と、突然システムが90%停止するストレス検証がなぜ唯一の重要な基準なのかを説明します。`
        : locale === "FR"
        ? `Le marché moderne est optimisé pour la moyenne. Chaque modèle d'optimisation se concentre sur l'intervalle de confiance de 95 %, coupant proprement les queues là où existent les vraies tempêtes.

C'est le taux d'échec standard de la planification stratégique. Les écarts de 5 % ne sont pas des anomalies statistiques à ignorer ; ce sont les vecteurs exacts où des entreprises entières s'effondrent.

En analysant 500 échecs d'entreprises historiques, nous démontrons que la résilience structurelle se construit uniquement en survivant à des conditions aberrantes extrêmes. Nous expliquons la méthodologie derrière notre agent de personnalité Radical et pourquoi les tests de résistance sous un gel systémique soudain de 90 % sont la seule référence qui compte.`
        : `The modern market is optimized for the mean. Every optimization model focuses on the 95% confidence interval, neatly chopping off the tails where the real storms exist. 

This is the standard failure rate of strategic planning. The 5% outliers are not statistical anomalies to be ignored; they are the exact vectors where entire corporations collapse. 

By analyzing 500 historic corporate failures, we demonstrate that structural resilience is built solely by surviving extreme outlier conditions. We explain the methodology behind our Radical persona agent and why stress testing under a 90% sudden systemic freeze is the only benchmark that matters.`
    }
  ];

  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  useEffect(() => {
    const handleOpenBlog = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id) {
        const found = posts.find(p => p.id === customEvent.detail.id);
        if (found) {
          setActivePost(found);
          const el = document.getElementById("blog");
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    };
    window.addEventListener("open-blog-post", handleOpenBlog);
    return () => window.removeEventListener("open-blog-post", handleOpenBlog);
  }, [posts]);

  return (
    <section id="blog" className="py-16 bg-surface px-4 lg:px-8 border-b border-border-structural">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
              {t("blog_title_sub")}
            </span>
            <h2 className="font-sans text-3xl sm:text-4xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("blog_title")}
            </h2>
          </div>
          <p className="font-serif text-sm text-cotton-muted max-w-sm leading-relaxed">
            {t("blog_desc")}
          </p>
        </div>

        {/* Blog Post Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border-structural border border-border-structural">
          {posts.map((post) => (
            <article 
              key={post.id} 
              className="bg-obsidian p-6 sm:p-8 flex flex-col justify-between min-h-[380px] group transition-all duration-300 relative z-0 hover:z-10 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(201,162,75,0.12)] ring-1 ring-transparent hover:ring-gold-crust/60"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] text-gold-crust bg-gold-crust/5 border border-gold-crust/20 px-2 py-0.5 uppercase tracking-widest">
                    [{post.category}]
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-[8px] text-cotton-muted">
                    <Clock size={10} />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-serif text-xl font-bold text-cotton-lace group-hover:text-gold-crust transition-colors leading-tight">
                    {post.title}
                  </h3>
                  <p className="font-serif text-sm text-cotton-muted leading-relaxed line-clamp-4">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-border-structural/30 flex justify-between items-center">
                <div className="flex items-center gap-2 font-mono text-[8px] text-cotton-muted">
                  <User size={10} />
                  <span>BY {post.author}</span>
                </div>
                <button
                  onClick={() => setActivePost(post)}
                  className="font-mono text-[10px] tracking-wider text-gold-crust hover:text-cotton-lace inline-flex items-center gap-1 cursor-pointer uppercase"
                >
                  {locale === "DE" ? "ARTIKEL_ENTSCHLÜSSELN" : locale === "JA" ? "記事の解読" : locale === "FR" ? "DÉCRYPTER_L'ARTICLE" : "DECRYPT_ARTICLE"}
                  <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Inline Article Reader Modal Overlay */}
        {activePost && (
          <div className="fixed inset-0 z-50 bg-obsidian/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-surface max-w-3xl w-full border-2 border-gold-crust p-6 sm:p-8 max-h-[85vh] overflow-y-auto space-y-6 relative">
              
              {/* Top Meta info */}
              <div className="flex justify-between items-start border-b border-border-structural/50 pb-4">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] text-gold-crust uppercase tracking-widest block">
                    {locale === "DE" ? "ÜBERTRAGUNG_ENTSCHLÜSSELT" : locale === "JA" ? "送信データを解読しました" : locale === "FR" ? "TRANSMISSION_DÉCRYPTÉE" : "TRANSMISSION_DECRYPTED"} // BRIEF_SOURCE_{activePost.id.toUpperCase()}
                  </span>
                  <h3 className="font-sans text-xl sm:text-2xl font-bold uppercase text-cotton-lace">
                    {activePost.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setActivePost(null)}
                  className="text-cotton-muted hover:text-gold-crust p-1 cursor-pointer border border-border-structural bg-obsidian"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Author & Read stats */}
              <div className="flex flex-wrap gap-4 text-[10px] font-mono text-cotton-muted uppercase border-b border-border-structural/30 pb-4">
                <span className="flex items-center gap-1">
                  <User size={12} className="text-gold-crust" /> AUTHOR: {activePost.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-gold-crust" /> {t("blog_read_time")}: {activePost.readTime}
                </span>
                <span>VECTOR: [{activePost.category}]</span>
                <span>DATE: {activePost.date}</span>
              </div>

              {/* Full Text */}
              <div className="font-serif text-sm sm:text-base text-cotton-lace leading-relaxed max-w-[64ch] mx-auto whitespace-pre-wrap space-y-4">
                {activePost.content}
              </div>

              {/* Footer inside reader */}
              <div className="pt-6 border-t border-border-structural/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="font-mono text-[8px] text-cotton-muted uppercase">
                  © CONTENT STORM CORE BOARD. DUPLICATION SUBJECT TO INTEGRITY LAWS.
                </p>
                <button
                  onClick={() => setActivePost(null)}
                  className="bg-gold-crust text-obsidian font-mono text-[10px] tracking-widest font-bold px-6 py-2 hover:bg-cotton-lace transition-colors cursor-pointer uppercase"
                >
                  {locale === "DE" ? "LESEN_BEENDEN" : locale === "JA" ? "読了" : locale === "FR" ? "TERMINER_LA_LECTURE" : "CONCLUDE_READING"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
