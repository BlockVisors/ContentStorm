"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Locale = "EN" | "DE" | "JA" | "FR";

export interface TranslationDictionary {
  [key: string]: {
    EN: string;
    DE: string;
    JA: string;
    FR: string;
  };
}

export const translations: TranslationDictionary = {
  // Brand name/Navbar
  brand_storm: {
    EN: "STORM",
    DE: "STURM",
    JA: "嵐",
    FR: "TEMPÊTE"
  },
  intel: {
    EN: "INTEL",
    DE: "INTEL",
    JA: "情報",
    FR: "INFOS"
  },
  personas: {
    EN: "PROTOCOL_PERSONAS",
    DE: "PROTOKOLL_PERSONAS",
    JA: "プロトコル・ペルソナ",
    FR: "PROTOCOL_PERSONNES"
  },
  brevities: {
    EN: "BREVITIES",
    DE: "KÜRZEN",
    JA: "要約",
    FR: "BRÈVES"
  },
  testimonials: {
    EN: "SURVIVED_VERDICTS",
    DE: "ÜBERLEBTE_URTEILE",
    JA: "生存評決",
    FR: "VERDICTS_SURVÉCUS"
  },
  citations: {
    EN: "RADAR_CITATIONS",
    DE: "RADAR_ZITATE",
    JA: "レーダー・引用",
    FR: "CITATIONS_RADAR"
  },
  faq: {
    EN: "DIALECTIC_FAQ",
    DE: "DIALEKTISCHE_FAQ",
    JA: "弁証法・FAQ",
    FR: "FAQ_DIALECTIQUE"
  },
  contact: {
    EN: "INTERROGATION",
    DE: "ABFRAGE",
    JA: "尋問",
    FR: "INTERROGATION"
  },
  transmit: {
    EN: "TRANSMIT",
    DE: "ÜBERTRAGEN",
    JA: "送信",
    FR: "TRANSMETTRE"
  },
  subscribe: {
    EN: "SUBSCRIBE",
    DE: "ABONNIEREN",
    JA: "購読",
    FR: "S'ABONNER"
  },
  transmit_feedback: {
    EN: "TRANSMIT FEEDBACK",
    DE: "FEEDBACK ÜBERTRAGEN",
    JA: "フィードバック送信",
    FR: "TRANSMETTRE DES RETOURS"
  },

  // Hero Section
  hero_status: {
    EN: "SYSTEM STATUS: ADVERSARIAL ENGAGEMENT ENGAGED",
    DE: "SYSTEMSTATUS: GEGNERISCHES ENGAGEMENT AKTIVIERT",
    JA: "システム状況: 敵対的エンゲージメント稼働中",
    FR: "STATUT SYSTÈME : ENGAGEMENT ADVERSAIRE ENGAGÉ"
  },
  hero_title_1: {
    EN: "WE DON'T SUMMARIZE.",
    DE: "WIR FASSEN NICHT ZUSAMMEN.",
    JA: "要約はしない。",
    FR: "NOUS NE RÉSUMONS PAS."
  },
  hero_title_2: {
    EN: "WE WEAPONIZE CONTRADICTIONS.",
    DE: "WIR BEWAFFNEN WIDERSPRÜCHE.",
    JA: "矛盾を武器に変える。",
    FR: "NOUS ARMONS LES CONTRADICTIONS."
  },
  hero_desc_1: {
    EN: "Five adversarial AI experts. One provable score.",
    DE: "Fünf gegnerische KI-Experten. Ein beweisbarer Score.",
    JA: "5人の敵対的AI専門家。証明可能な1つのスコア。",
    FR: "Cinq experts IA adverses. Un score prouvable."
  },
  hero_desc_strong: {
    EN: " Zero soft passes.",
    DE: " Null Gefälligkeitsnoten.",
    JA: " 甘い合格は一切なし。",
    FR: " Zéro passe-droit."
  },
  hero_desc_2: {
    EN: " The friction is the feature.",
    DE: " Die Reibung ist das Feature.",
    JA: " 摩擦こそが機能そのものだ。",
    FR: " La friction est la fonctionnalité."
  },
  value_01_num: { EN: "01", DE: "01", JA: "01", FR: "01" },
  value_01_title: {
    EN: "ADVERSARIAL FRICTION",
    DE: "GEGNERISCHE REIBUNG",
    JA: "敵対的摩擦",
    FR: "FRICTION ADVERSE"
  },
  value_01_desc: {
    EN: "True skill mastery is navigating the friction of clashing, non-cooperating expertise. Every module is structurally built on the points of maximum mathematical disagreement across five domain experts.",
    DE: "Wahre Meisterschaft bedeutet, sich durch die Reibung widerstreitender, nicht kooperierender Expertise zu navigieren. Jedes Modul ist strukturell auf den Punkten maximaler mathematischer Uneinigkeit zwischen fünf Fachexperten aufgebaut.",
    JA: "真の熟達とは、対立し協調しない専門知識の摩擦を乗りこなすことです。すべてのモジュールは、5人の専門家の間で数学的に最大の不一致が生じるポイントの上に構造的に構築されています。",
    FR: "La véritable maîtrise consiste à naviguer dans la friction d'expertises contradictoires et non coopératives. Chaque module est structurellement construit sur les points de désaccord mathématique maximal entre cinq experts."
  },
  value_02_num: { EN: "02", DE: "02", JA: "02", FR: "02" },
  value_02_title: {
    EN: "THE SYNTHESIS RESILIENCE SCORE",
    DE: "DER SYNTHESIS RESILIENCE SCORE",
    JA: "シンセシス・レジリエンス・スコア",
    FR: "LE SYNTHESIS RESILIENCE SCORE"
  },
  value_02_desc: {
    EN: "Not a quiz. A real-time adversarial cross-examination that computes a proprietary, auditable, mathematically-grounded proof of critical thinking. Employers verify it directly.",
    DE: "Kein Quiz. Ein Echtzeit-Kreuzverhör, das einen proprietären, auditierbaren, mathematisch fundierten Nachweis kritischen Denkens berechnet. Arbeitgeber verifizieren ihn direkt.",
    JA: "クイズではありません。独自開発の、監査可能で数学的根拠に基づいたクリティカルシンキングの証明をリアルタイムで算出する敵対的尋問です。雇用主はそれを直接検証できます。",
    FR: "Pas un quiz. Un contre-interrogatoire adverse en temps réel qui calcule une preuve propriétaire, vérifiable et mathématiquement fondée de la pensée critique. Les employeurs la vérifient directement."
  },
  value_03_num: { EN: "03", DE: "03", JA: "03", FR: "03" },
  value_03_title: {
    EN: "THE INSTITUTIONAL INTELLIGENCE LAYER",
    DE: "DIE INSTITUTIONAL INTELLIGENCE LAYER",
    JA: "インスティテューショナル・インテリジェンス・レイヤー",
    FR: "LA COUCHE D'INTELLIGENCE INSTITUTIONNELLE"
  },
  value_03_desc: {
    EN: "Self-updating modules. Zero-data-exfiltration enterprise deployment. On-chain verifiable credentials. Content Storm becomes the infrastructure of institutional knowledge.",
    DE: "Selbstaktualisierende Module. Enterprise-Deployment ohne Datenabfluss. On-Chain verifizierbare Zertifikate. Content Storm wird zur Infrastruktur institutionellen Wissens.",
    JA: "自己更新型モジュール。データ流出ゼロのエンタープライズ展開。オンチェーンで検証可能な資格証明。Content Stormは組織的知識のインフラそのものになります。",
    FR: "Modules auto-actualisants. Déploiement entreprise à exfiltration de données nulle. Identifiants vérifiables on-chain. Content Storm devient l'infrastructure du savoir institutionnel."
  },
  hero_cta_1: {
    EN: "JOIN SUBSCRIPTION BREVITIES",
    DE: "ABONNEMENT-KÜRZEN BEITRETEN",
    JA: "購読要約に参加",
    FR: "REJOINDRE LES BRÈVES D'ABONNEMENT"
  },
  hero_cta_2: {
    EN: "TRANSMIT STRATEGIC FEEDBACK",
    DE: "STRATEGISCHES FEEDBACK ÜBERTRAGEN",
    JA: "戦略的フィードバック送信",
    FR: "TRANSMETTRE UN RETOUR STRATÉGIQUE"
  },
  stats_operative: {
    EN: "OPERATIVE_CAPACITY",
    DE: "OPERATIVE_KAPAZITÄT",
    JA: "稼働能力",
    FR: "CAPACITÉ_OPÉRATIONNELLE"
  },
  stats_operative_val: {
    EN: "EXPERT INTERROGATORS",
    DE: "EXPERTEN-ABFRAGER",
    JA: "専門尋問官",
    FR: "INTERROGATEURS EXPERTS"
  },
  stats_alliance: {
    EN: "ALLIANCE_INDEX",
    DE: "ALLIANZ_INDEX",
    JA: "提携指数",
    FR: "INDICE_D'ALLIANCE"
  },
  stats_alliance_val: {
    EN: "ON YOUR SIDE",
    DE: "AUF IHRER SEITE",
    JA: "味方の数",
    FR: "DE VOTRE CÔTÉ"
  },
  stats_mean: {
    EN: "HISTORICAL_MEAN",
    DE: "HISTORISCHER_MITTELWERT",
    JA: "歴史的平均",
    FR: "MOYENNE_HISTORIQUE"
  },
  stats_mean_val: {
    EN: "AVG INITIAL SCORE",
    DE: "DURCHSCHN. ERSTBEWERTUNG",
    JA: "平均初期スコア",
    FR: "SCORE INITIAL MOYEN"
  },
  stats_planes: {
    EN: "SYNTHESIS_PLANES",
    DE: "SYNTHESE_EBENEN",
    JA: "統合平面",
    FR: "PLANS_DE_SYNTHÈSE"
  },
  stats_planes_val: {
    EN: "RESILIENCE VECTORS",
    DE: "RESILIENZ-VEKTOREN",
    JA: "回復力ベクトル",
    FR: "VECTEURS DE RÉSILIENCE"
  },

  // PersonaQuintet Section
  personas_title_sub: {
    EN: "FIVE ADVERSARIAL EXPERTS // ZERO CONSENSUS",
    DE: "FÜNF GEGNERISCHE EXPERTEN // NULL KONSENS",
    JA: "5人の敵対的専門家 // 合意ゼロ",
    FR: "CINQ EXPERTS ADVERSES // ZÉRO CONSENSUS"
  },
  personas_title: {
    EN: "THE ADVERSARIAL QUINTET",
    DE: "DAS GEGNERISCHE QUINTETT",
    JA: "敵対的な5重奏",
    FR: "LE QUINTETTE ADVERSE"
  },
  personas_desc: {
    EN: "Every module is built on the points of maximum disagreement across five domain experts. Select an interrogator to see where consensus breaks — and why that break is the point.",
    DE: "Jedes Modul basiert auf den Punkten maximaler Uneinigkeit zwischen fünf Fachexperten. Wählen Sie einen Befrager, um zu sehen, wo der Konsens bricht — und warum genau das der Sinn der Sache ist.",
    JA: "すべてのモジュールは、5人の専門家の間で意見が最も激しく対立するポイントの上に構築されています。尋問官を選択し、合意がどこで崩れるか——そしてその崩壊こそが本質である理由を確認してください。",
    FR: "Chaque module est construit sur les points de désaccord maximal entre cinq experts. Sélectionnez un interrogateur pour voir où le consensus se brise — et pourquoi cette rupture est précisément le but."
  },
  impact_rate: {
    EN: "IMPACT RATE",
    DE: "AUSWIRKUNGSRATE",
    JA: "影響力評価",
    FR: "TAUX D'IMPACT"
  },
  vulnerability_found: {
    EN: "VULNERABILITY DETECTED",
    DE: "SCHWACHSTELLE ERKANNT",
    JA: "脆弱性の検出",
    FR: "VULNÉRABILITÉ DÉTECTÉE"
  },

  // BlogRoll Section
  blog_title_sub: {
    EN: "INTEL_DISPATCHES // STRATEGIC_FAILURE_INDEX",
    DE: "INTEL_DISPATCHES // STRATEGISCHER_FEHLER_INDEX",
    JA: "情報配信 // 戦略的失敗指標",
    FR: "COMMUNIQUÉS // INDICE_D'ÉCHEC_STRATÉGIQUE"
  },
  blog_title: {
    EN: "THE STORM BREVITIES",
    DE: "DIE STURM-KÜRZEN",
    JA: "ストーム要約",
    FR: "LES BRÈVES DE LA TEMPÊTE"
  },
  blog_desc: {
    EN: "Dispatches from the front lines of cognitive friction. Real analytical breakdowns of real narrative collapses.",
    DE: "Depeschen von den Frontlinien kognitiver Reibung. Echte analytische Aufschlüsselungen realer Zusammenbrüche von Narrativen.",
    JA: "認知的摩擦の最前線からの報告。現実のナラティブ崩壊のリアルな分析内訳。",
    FR: "Communiqués des lignes de front de la friction cognitive. Véritables analyses des effondrements narratifs réels."
  },
  blog_read_time: {
    EN: "READ TIME",
    DE: "LESEZEIT",
    JA: "読了時間",
    FR: "TEMPS DE LECTURE"
  },
  blog_read_btn: {
    EN: "READ FULL CASE",
    DE: "VOLLSTÄNDIGEN FALL LESEN",
    JA: "事例をすべて読む",
    FR: "LIRE LE CAS COMPLET"
  },

  // Newsletter Section
  news_title_sub: {
    EN: "INTELLIGENCE_DISPATCH // SUBSCRIPTION",
    DE: "INTELLIGENZ-DISPATCH // ABONNEMENT",
    JA: "インテリジェンス配信 // 購読",
    FR: "COMMUNIQUÉ_D'INTELLIGENCE // ABONNEMENT"
  },
  news_title: {
    EN: "SUBSCRIBE TO THE STORM",
    DE: "DEN STURM ABONNIEREN",
    JA: "ストームを購読する",
    FR: "S'ABONNER À LA TEMPÊTE"
  },
  news_desc: {
    EN: "Receive weekly adversarial content briefs, deconstructions of popular narrative failures, and telemetry updates. No cheerleading. Only friction.",
    DE: "Erhalten Sie wöchentliche gegnerische Inhaltsberichte, Dekonstruktionen populärer narrativer Fehler und Telemetrie-Updates. Kein Cheerleading. Nur Reibung.",
    JA: "毎週の敵対的なコンテンツ要約、一般的なナラティブの失敗の解体、そしてテレメトリの最新情報を受け取ります。応援はありません。ただ摩擦のみです。",
    FR: "Recevez des briefings hebdomadaires sur les contenus adverses, des déconstructions d'échecs narratifs populaires et des mises à jour de télémétrie. Pas d'encouragement. Seulement de la friction."
  },
  news_email_placeholder: {
    EN: "ENTER EMAIL ADDRESS",
    DE: "E-MAIL-ADRESSE EINGEBEN",
    JA: "メールアドレスを入力",
    FR: "SAISIR L'ADRESSE E-MAIL"
  },
  news_btn: {
    EN: "ESTABLISH CONNECTION",
    DE: "VERBINDUNG HERSTELLEN",
    JA: "接続を確立",
    FR: "ÉTABLIR LA CONNEXION"
  },
  news_success: {
    EN: "CONNECTION ESTABLISHED. PREPARE FOR FRICTION.",
    DE: "VERBINDUNG HERGESTELLT. BEREITEN SIE SICH AUF REIBUNG VOR.",
    JA: "接続が確立されました。摩擦に備えてください。",
    FR: "CONNEXION ÉTABLIE. PRÉPAREZ-VOUS À LA FRICTION."
  },

  // Testimonials Section
  test_title_sub: {
    EN: "STRATEGIC_SURVIVORS // COGNITIVE_PROOF",
    DE: "STRATEGISCHE_ÜBERLEBENDE // KOGNITIVER_BEWEIS",
    JA: "戦略的生存者 // 認知の証明",
    FR: "SURVIVANTS_STRATÉGIQUES // PREUVE_COGNITIVE"
  },
  test_title: {
    EN: "SURVIVED VERDICTS",
    DE: "URTEILE ÜBERLEBT",
    JA: "生存評決",
    FR: "VERDICTS SURVÉCUS"
  },
  test_desc: {
    EN: "Real feedback from executive teams and enterprise strategists who subjected their thesis to the Storm and survived.",
    DE: "Echtes Feedback von Führungsteams und Unternehmensstrategen, die ihre Thesen dem Sturm ausgesetzt und überlebt haben.",
    JA: "彼らの仮説を嵐にさらし、そして生き残った経営陣や企業戦略家からの現実のフィードバック。",
    FR: "Retours réels d'équipes dirigeantes et de stratèges d'entreprise qui ont soumis leur thèse à la Tempête et ont survécu."
  },
  verdict_verification: {
    EN: "VERDICT_VERIFICATION // CASE_0",
    DE: "URTEILS_VERIFIZIERUNG // FALL_0",
    JA: "評決の検証 // ケース_0",
    FR: "VÉRIFICATION_DU_VERDICT // CAS_0"
  },
  survived: {
    EN: "SURVIVED",
    DE: "ÜBERLEBT",
    JA: "生存",
    FR: "SURVÉCU"
  },

  // Citations Feed Section
  citations_title_sub: {
    EN: "CITATIONS_FEED // SOCIAL_PROOF",
    DE: "ZITATE_FEED // SOZIALER_BEWEIS",
    JA: "引用フィード // 社会的証明",
    FR: "FLUX_DE_CITATIONS // PREUVE_SOCIALE"
  },
  citations_title: {
    EN: "EXTERNAL CITATIONS & RADAR MENTIONS",
    DE: "EXTERNE ZITATE & RADAR-ERWÄHNUNGEN",
    JA: "外部引用 & レーダー言及",
    FR: "CITATIONS EXTERNES & MENTIONS RADAR"
  },
  citations_desc: {
    EN: "Real-time dispatches, review indexes, and peer-reviewed journals documenting the impact of the Content Storm pressure-testing pipeline across academic, venture, and technical spaces.",
    DE: "Echtzeit-Depeschen, Bewertungsindizes und von Experten begutachtete Fachzeitschriften, die die Auswirkungen der Druckprüfungs-Pipeline von Content Storm im akademischen, Risiko- und technischen Bereich dokumentieren.",
    JA: "学術、ベンチャー、技術分野におけるContent Stormの圧力テストパイプラインの影響を記録した、リアルタイムの配信、レビューインデックス、査読付きジャーナル。",
    FR: "Dépêches en temps réel, index de révision et revues évaluées par des pairs documentant l'impact du processus de test de pression de Content Storm dans les espaces académiques, de capital-risque et techniques."
  },
  filter_all: {
    EN: "ALL_MENTIONS",
    DE: "ALLE_NENNUNGEN",
    JA: "すべての言及",
    FR: "TOUTES_LES_MENTIONS"
  },
  report_citation: {
    EN: "REPORT A CITATION",
    DE: "ZITAT MELDEN",
    JA: "引用を報告する",
    FR: "SIGNALER UNE CITATION"
  },
  integrity_protocol: {
    EN: "CITATIONS INTEGRITY PROTOCOL ACTIVE // VERIFIED RADAR SCAN: ACTIVE",
    DE: "ZITATE-INTEGRITÄTSPROTOKOLL AKTIV // VERIFIZIERTER RADARSCAN: AKTIV",
    JA: "引用整合性プロトコル有効 // 検証済みレーダースキャン: アクティブ",
    FR: "PROTOCOLE D'INTÉGRITÉ DES CITATIONS ACTIF // SCAN RADAR VÉRIFIÉ : ACTIF"
  },

  // FAQ Section
  faq_title_sub: {
    EN: "RESOLVED_CONTRADICTIONS // KNOWLEDGE",
    DE: "GELÖSTE_WIDERSPRÜCHE // WISSEN",
    JA: "解決された矛盾 // 知識",
    FR: "CONTRADICTIONS_RÉSOLUES // CONNAISSANCE"
  },
  faq_title: {
    EN: "DIALECTIC INQUIRY",
    DE: "DIALEKTISCHE ANFRAGE",
    JA: "弁証法的探究",
    FR: "ENQUÊTE DIALECTIQUE"
  },
  faq_desc: {
    EN: "Before subjecting your materials to our interrogators, read our operational axioms to understand why comfort is the enemy of truth.",
    DE: "Bevor Sie Ihre Materialien unseren Befragern vorlegen, lesen Sie unsere betrieblichen Axiome, um zu verstehen, warum Komfort der Feind der Wahrheit ist.",
    JA: "あなたの資料を私たちの尋問官に提出する前に、なぜ心地よさが真実の敵であるのかを理解するために、私たちの運用上の公理を読んでください。",
    FR: "Avant de soumettre vos documents à nos interrogateurs, lisez nos axiomes opérationnels pour comprendre pourquoi le confort est l'ennemi de la vérité."
  },

  // Contact Form Section
  contact_title_sub: {
    EN: "DIALECTIC_ENGAGEMENT // CONTACT",
    DE: "DIALEKTISCHE_EINBINDUNG // KONTAKT",
    JA: "弁証法的エンゲージメント // お問い合わせ",
    FR: "ENGAGEMENT_DIALECTIQUE // CONTACT"
  },
  contact_title: {
    EN: "INITIATE PRESSURE TEST",
    DE: "DRUCKTEST INITIATION",
    JA: "圧力テストの開始",
    FR: "INITIER LE TEST DE PRESSION"
  },
  contact_desc: {
    EN: "Submit your strategic draft or memorandum. Choose your active interrogator. Prepare to have your assumptions systematically dismantled.",
    DE: "Reichen Sie Ihren strategischen Entwurf oder Ihr Memorandum ein. Wählen Sie Ihren aktiven Befrager. Bereiten Sie sich darauf vor, dass Ihre Annahmen systematisch zerlegt werden.",
    JA: "あなたの戦略の下書きや覚書を送信してください。アクティブな尋問官を選択します。あなたの前提が系統的に解体されるのを覚悟してください。",
    FR: "Soumettez votre projet stratégique ou votre mémorandum. Choisissez votre interrogateur actif. Préparez-vous à voir vos hypothèses systématiquement démantelées."
  },
  contact_field_name: {
    EN: "NAME",
    DE: "NAME",
    JA: "名前",
    FR: "NOM"
  },
  contact_field_email: {
    EN: "EMAIL",
    DE: "E-MAIL",
    JA: "メールアドレス",
    FR: "E-MAIL"
  },
  contact_field_interrogator: {
    EN: "SELECT INTERROGATOR",
    DE: "ABFRAGER AUSWÄHLEN",
    JA: "尋問官を選択",
    FR: "SÉLECTIONNER L'INTERROGATEUR"
  },
  contact_field_text: {
    EN: "TEXT CONTENT TO BE CHALLENGED",
    DE: "HERAUSZUFORDRERNDER TEXTINHALT",
    JA: "挑戦を受けるテキスト内容",
    FR: "CONTENU TEXTUEL À METTRE AU DÉFI"
  },
  contact_btn: {
    EN: "TRANSMIT MEMORANDUM",
    DE: "MEMORANDUM ÜBERTRAGEN",
    JA: "覚書を送信",
    FR: "TRANSMETTRE LE MÉMORANDUM"
  },

  // System Logs Section
  logs_title_sub: {
    EN: "CORE_LOGS // REAL_TIME",
    DE: "CORE_LOGS // ECHTZEIT",
    JA: "コアログ // リアルタイム",
    FR: "LOGS_CENTRAUX // TEMPS_RÉEL"
  },
  logs_title: {
    EN: "SYSTEM TELEMETRY FEED",
    DE: "SYSTEM-TELEMETRIE-FEED",
    JA: "システムテレメトリフィード",
    FR: "FLUX DE TÉLÉMÉTRIE SYSTÈME"
  },
  logs_desc: {
    EN: "Live audit logs of subscribers, processed drafts, and peer computations executing across the global node array.",
    DE: "Live-Audit-Protokolle von Abonnenten, verarbeiteten Entwürfen und Peer-Berechnungen, die im gesamten globalen Knotenarray ausgeführt werden.",
    JA: "世界的なノード配列全体で実行される、購読者、処理済みドラフト、およびピア計算のライブ監査ログ。",
    FR: "Journaux d'audit en direct des abonnés, des brouillons traités et des calculs pairs s'exécutant sur l'ensemble de nœuds mondiaux."
  },
  logs_feed_status: {
    EN: "SYSTEM TELEMETRY: BROADCAST ACTIVE",
    DE: "SYSTEM-TELEMETRIE: ÜBERTRAGUNG AKTIV",
    JA: "システムテレメトリ: 放送中",
    FR: "TÉLÉMÉTRIE SYSTÈME : DIFFUSION ACTIVE"
  },
  logs_loading: {
    EN: "ESTABLISHING CHANNELS...",
    DE: "KANÄLE WERDEN ETABLIERT...",
    JA: "チャネルを確立中...",
    FR: "ÉTABLISSEMENT DES CANAUX..."
  },
  logs_trigger_btn: {
    EN: "TRIGGER DIAGNOSTIC INTERRUPT",
    DE: "DIAGNOSTISCHEN INTERRUPT AUSLÖSEN",
    JA: "診断割り込みのトリガー",
    FR: "DÉCLENCHER UNE INTERRUPTION DE DIAGNOSTIC"
  },
  deploy_new_adversary: {
    EN: "DEPLOY NEW ADVERSARY",
    DE: "NEUEN GEGNER DEPLOYEN",
    JA: "新しい敵対者の展開",
    FR: "DÉPLOYER UN NOUVEL ADVERSAIRE"
  },
  requires_clearance: {
    EN: "REQUIRES LEVEL_07 CLEARANCE",
    DE: "ERFORDERT STUFE 07 FREIGABE",
    JA: "レベル07の権限が必要",
    FR: "REQUIS AUTORISATION NIVEAU_07"
  },
  active_interg: {
    EN: "ACTIVE_INTERROGATION // ",
    DE: "AKTIVE_BEFRAGUNG // ",
    JA: "アクティブな尋問 // ",
    FR: "INTERROGATION_ACTIVE // "
  },
  impact_vector: {
    EN: "IMPACT VECTOR:",
    DE: "AUSWIRKUNGSVEKTOR:",
    JA: "影響ベクトル:",
    FR: "VECTEUR D'IMPACT :"
  },
  pressure_index: {
    EN: "PRESSURE INDEX:",
    DE: "DRUCKINDEX:",
    JA: "圧力指数:",
    FR: "INDICE DE PRESSION :"
  },
  stress_test_vector: {
    EN: "STRESS TEST VECTOR ENGAGED",
    DE: "STRESSTESTVEKTOR AKTIVIERT",
    JA: "ストレス試験ベクトル作動中",
    FR: "VECTEUR DE STRESS TEST ENGAGÉ"
  },
  search_placeholder: {
    EN: "SEARCH DISPATCHES & FAQS (PRESS ESC TO CLOSE)...",
    DE: "DEPESCHEN & FAQS DURCHSUCHEN (ESC ZUM SCHLIESSEN)...",
    JA: "配信とFAQを検索（ESCキーで閉じる）...",
    FR: "RECHERCHER LES COMMUNIQUÉS & FAQS (ESC POUR FERMER)..."
  },
  search_no_results: {
    EN: "NO ADVERSARIAL MATCHES FOUND FOR SPECIFIED VECTOR",
    DE: "KEINE GEGNERISCHEN TREFFER FÜR SPEZIFIZIERTEN VEKTOR GEFUNDEN",
    JA: "指定されたベクトルに一致する敵対的データが見つかりません",
    FR: "AUCUNE CORRESPONDANCE ADVERSE TROUVÉE POUR LE VECTEUR SPÉCIFIÉ"
  },
  search_type_blog: {
    EN: "DISPATCH // CASE_STUDY",
    DE: "DEPESCHE // FALLSTUDIE",
    JA: "情報配信 // ケーススタディ",
    FR: "COMMUNIQUÉ // ÉTUDE_DE_CAS"
  },
  search_type_faq: {
    EN: "DIALECTIC // AXIO_KNOWLEDGE",
    DE: "DIALEKTIK // AXIOM_WISSEN",
    JA: "弁証法 // 運用公理知識",
    FR: "DIALECTIQUE // CONNAISSANCE_AXIOM"
  },
  search_results: {
    EN: "INDEXED PROTOCOLS FOUND",
    DE: "INDEXIERTE PROTOKOLLE GEFUNDEN",
    JA: "インデックスされたプロトコルが検出されました",
    FR: "PROTOCOLES INDEXÉS TROUVÉS"
  },
  search_tip: {
    EN: "NAVIGATE WITH ARROWS // SELECT WITH ENTER",
    DE: "MIT PFEILTASTEN NAVIGIEREN // MIT ENTER AUSWÄHLEN",
    JA: "矢印キーで移動 // ENTERキーで決定",
    FR: "NAVIGUER AVEC LES FLÈCHES // SÉLECTIONNER AVEC ENTRÉE"
  }
};

interface LanguageContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Stable default on every render pass — server and the first client
  // (hydration) pass must produce identical markup, so this can't read
  // localStorage synchronously in the initializer. A saved locale is
  // restored in the effect below, which only ever runs client-side, after
  // hydration has already reconciled against the server-rendered "EN" output.
  const [locale, setLocale] = useState<Locale>("EN");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("content_storm_locale");
      if (saved === "EN" || saved === "DE" || saved === "JA" || saved === "FR") {
        setLocale(saved);
      }
    } catch (e) {
      // Ignore — private browsing / storage denial falls back to EN.
    }
  }, []);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem("content_storm_locale", newLocale);
    } catch (e) {
      // Ignore
    }
  };

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) {
      // Fallback to literal key
      return key;
    }
    return entry[locale] || entry["EN"] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
