"use client";

import React, { useState } from "react";
import { Mail, ShieldAlert, Check, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Newsletter() {
  const { locale, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [integration, setIntegration] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, firstName, lastName }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message);
        setIntegration(data.integration);
      } else {
        setStatus("error");
        setMessage(data.error || "A severe error was registered by the submission terminal.");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(`Connection failure with adversarial core: ${err.message}`);
    }
  };

  const handleReset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setStatus("idle");
    setMessage("");
    setIntegration("");
  };

  return (
    <section id="newsletter" className="py-16 px-4 lg:px-8 bg-obsidian border-b border-border-structural">
      <div className="max-w-4xl mx-auto border-2 border-gold-crust p-6 sm:p-10 relative">
        <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-gold-crust text-obsidian px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider">
          {locale === "DE" ? "TACTICAL_FEED_01 // SICHERER_BEITRITT" : locale === "JA" ? "戦術的フィード01 // 安全な参加" : locale === "FR" ? "FLUX_TACTIQUE_01 // REJOINDRE_SÉCURISÉ" : "TACTICAL_FEED_01 // SECURE_JOIN"}
        </div>

        <div className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
              {t("newsletter_title_sub")}
            </span>
            <h3 className="font-sans text-2xl sm:text-3xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("newsletter_title")}
            </h3>
            <p className="font-serif text-sm text-cotton-muted leading-relaxed">
              {t("newsletter_desc")}
            </p>
          </div>

          {status !== "success" ? (
            <form onSubmit={handleSubscribe} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-cotton-muted uppercase tracking-wider block">
                    {t("newsletter_first_name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t("newsletter_placeholder_first")}
                    className="w-full bg-surface-container-lowest border border-border-structural p-3 font-mono text-xs text-cotton-lace focus:border-gold-crust focus:ring-0 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-cotton-muted uppercase tracking-wider block">
                    {t("newsletter_last_name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t("newsletter_placeholder_last")}
                    className="w-full bg-surface-container-lowest border border-border-structural p-3 font-mono text-xs text-cotton-lace focus:border-gold-crust focus:ring-0 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[9px] text-cotton-muted uppercase tracking-wider block">
                  {t("newsletter_email")}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("newsletter_placeholder_email")}
                    className="w-full bg-surface-container-lowest border border-border-structural p-3 pl-10 font-mono text-xs text-cotton-lace focus:border-gold-crust focus:ring-0 transition-all outline-none"
                  />
                  <Mail size={14} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-cotton-muted" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full bg-gold-crust text-obsidian font-mono text-xs tracking-widest font-bold py-4 hover:bg-cotton-lace transition-colors cursor-pointer uppercase flex items-center justify-center gap-2"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t("newsletter_submitting")}
                    </>
                  ) : (
                    t("newsletter_submit")
                  )}
                </button>
              </div>

              {status === "error" && (
                <div className="border border-rust/40 bg-rust/5 p-4 flex gap-3">
                  <ShieldAlert size={16} className="text-rust flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] text-rust font-bold uppercase">
                      {locale === "DE" ? "REGISTRIERUNGSFEHLER" : locale === "JA" ? "登録エラー" : locale === "FR" ? "ERREUR_D'INSCRIPTION" : "REGISTRATION_ERROR"}
                    </p>
                    <p className="font-serif text-xs text-cotton-lace">{message}</p>
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="border border-gold-crust bg-surface p-6 space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 bg-gold-crust text-obsidian flex items-center justify-center font-bold">
                  <Check size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-mono text-xs text-gold-crust font-bold uppercase tracking-wider">
                    {locale === "DE" ? "ÜBERTRAGUNG_BESTÄTIGT // REGISTRIERT" : locale === "JA" ? "送信確認 // 登録完了" : locale === "FR" ? "TRANSMISSION_CONFIRMÉE // ENREGISTRÉ" : "TRANSMISSION_ACKNOWLEDGED // REGISTERED"}
                  </h4>
                  <p className="font-serif text-sm text-cotton-lace leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {/* Secure Integration Transparency Notice */}
              <div className="bg-surface-container-low p-4 border border-border-structural space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-cotton-muted">{locale === "DE" ? "ROUTING-VEKTOREN:" : locale === "JA" ? "ルーティングベクトル:" : locale === "FR" ? "VECTEURS DE ROUTAGE :" : "ROUTING VECTORS:"}</span>
                  <span className={`px-1.5 py-0.5 font-bold ${integration === "mailchimp" ? "bg-teal-bright/20 text-teal-bright" : "bg-gold-crust/10 text-gold-crust"}`}>
                    {integration === "mailchimp" ? "MAILCHIMP_API_LIVE" : "LOCAL_BUFFER_STORAGE"}
                  </span>
                </div>
                <p className="font-mono text-[8px] text-cotton-muted leading-relaxed uppercase">
                  {integration === "mailchimp" 
                    ? (locale === "DE" ? "Erfolgreich mit externer Mailchimp-Liste synchronisiert. Automatischer Onboarding-E-Mail-Trigger versendet." : locale === "JA" ? "外部のMailchimpリストと正常に同期されました。自動オンボーディングメールのトリガーがディスパッチされました。" : locale === "FR" ? "Synchronisé avec succès avec la liste externe Mailchimp. Déclencheur d'e-mail d'intégration automatisé envoyé." : "Successfully synchronized with external Mailchimp list. Automated onboarding email trigger dispatched.") 
                    : (locale === "DE" ? "Hinweis: Der Server hat diese E-Mail lokal in der Warteschlange abgelegt. Um echte automatisierte Kampagnen einzurichten, geben Sie MAILCHIMP_API_KEY im Geheimnisse-Panel an." : locale === "JA" ? "注意: サーバーはこのメールをローカルに安全にキューに入れました。実際の自動キャンペーンを確立するには、シークレットパネル内にMAILCHIMP_API_KEYを入力してください。" : locale === "FR" ? "Note : Le serveur a mis cet e-mail en attente localement en toute sécurité. Pour établir de véritables campagnes automatisées, fournissez MAILCHIMP_API_KEY dans le panneau Secrets." : "Note: The server has securely queued this email locally. To establish actual automated campaigns, provide MAILCHIMP_API_KEY inside the Secrets panel.")}
                </p>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={handleReset}
                  className="font-mono text-[9px] tracking-wider text-cotton-muted hover:text-gold-crust uppercase inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={10} />
                  {locale === "DE" ? "WEITEREN ENDPUNKT REGISTRIEREN" : locale === "JA" ? "別のエンドポイントを登録" : locale === "FR" ? "ENREGISTRER UN AUTRE POINT D'ACCÈS" : "REGISTER ANOTHER ENDPOINT"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
