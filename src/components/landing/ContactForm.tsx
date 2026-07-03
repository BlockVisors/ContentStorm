"use client";

import React, { useState } from "react";
import { Send, ShieldAlert, Check, Loader2, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ContactForm() {
  const { locale, t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("ADVERSARIAL_PARTNERSHIP");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setStatus("submitting");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, topic, message }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setSuccessMessage(data.message);
        // Clear fields on success
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Adversarial channel rejected the package.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(`Intel transmission interrupted: ${err.message}`);
    }
  };

  return (
    <section id="contact" className="border-b border-border-structural">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border-structural">
        
        {/* Form Container */}
        <div className="bg-surface p-6 sm:p-10 space-y-8">
          <div className="space-y-2">
            <span className="font-mono text-[9px] tracking-[0.3em] text-gold-crust block uppercase">
              {t("contact_title_sub")}
            </span>
            <h3 className="font-sans text-2xl sm:text-3xl font-bold uppercase text-cotton-lace tracking-tight">
              {t("contact_title")}
            </h3>
            <p className="font-serif text-sm text-cotton-muted leading-relaxed">
              {t("contact_desc")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="font-mono text-[9px] text-cotton-muted uppercase block">
                {locale === "DE" ? "ORGANISATION_ODER_RECHTSTRÄGER" : locale === "JA" ? "組織名 / 団体名" : locale === "FR" ? "NOM_DE_L'ENTITÉ / ORGANISATION" : "ENTITY_NAME / ORGANIZATION"}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={locale === "DE" ? "ORGANISATION_ODER_EINZELPERSON_ANGEBEN" : locale === "JA" ? "組織または個人を指定" : locale === "FR" ? "SPÉCIFIER_ORGANISATION_OU_INDIVIDU" : "SPECIFY_ORGANIZATION_OR_INDIVIDUAL"}
                className="w-full bg-surface-container-lowest border border-border-structural p-3 font-mono text-xs text-cotton-lace focus:border-gold-crust focus:ring-0 transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[9px] text-cotton-muted uppercase block">
                {locale === "DE" ? "SICHERER_E-MAIL_ENDPUNKT" : locale === "JA" ? "安全なメールエンドポイント" : locale === "FR" ? "POINT_D'ACCÈS_E-MAIL_SÉCURISÉ" : "SECURE_EMAIL_ENDPOINT"}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="SECURE_ENDPOINT@SECURE_NET.COM"
                className="w-full bg-surface-container-lowest border border-border-structural p-3 font-mono text-xs text-cotton-lace focus:border-gold-crust focus:ring-0 transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[9px] text-cotton-muted uppercase block">
                {locale === "DE" ? "ANFRAGEVEKTOR" : locale === "JA" ? "問い合わせベクトル" : locale === "FR" ? "VECTEUR_DE_DEMANDE" : "VECTOR_OF_INQUIRY"}
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-surface-container-lowest border border-border-structural p-3 font-mono text-xs text-cotton-lace focus:border-gold-crust focus:ring-0 transition-all outline-none cursor-pointer"
              >
                <option value="ADVERSARIAL_PARTNERSHIP">{locale === "DE" ? "GEGNERISCHE_PARTNERSCHAFT" : locale === "JA" ? "敵対的パートナーシップ" : locale === "FR" ? "PARTENARIAT_ADVERSAIRE" : "ADVERSARIAL_PARTNERSHIP"}</option>
                <option value="STRATEGIC_SUPPORT">{locale === "DE" ? "STRATEGISCHE_UNTERSTÜTZUNG" : locale === "JA" ? "戦略的サポート" : locale === "FR" ? "SUPPORT_STRATÉGIQUE" : "STRATEGIC_SUPPORT"}</option>
                <option value="SECURITY_AUDIT">{locale === "DE" ? "SICHERHEITSAUDIT" : locale === "JA" ? "セキュリティ監査" : locale === "FR" ? "AUDIT_DE_SÉCURITÉ" : "SECURITY_AUDIT"}</option>
                <option value="DATA_INTERROGATION">{locale === "DE" ? "DATENABFRAGE" : locale === "JA" ? "データ尋問" : locale === "FR" ? "INTERROGATION_DE_DONNÉES" : "DATA_INTERROGATION"}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[9px] text-cotton-muted uppercase block">
                {locale === "DE" ? "NACHRICHTENÜBERTRAGUNG" : locale === "JA" ? "メッセージ送信" : locale === "FR" ? "TRANSMISSION_DE_MESSAGE" : "MESSAGE_TRANSMISSION"}
              </label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={locale === "DE" ? "VERSCHLÜSSELTE_NACHRICHT_HIER_EINGEBEN..." : locale === "JA" ? "ここに暗号化されたメッセージを入力してください..." : locale === "FR" ? "ENTRER_LE_MESSAGE_CHIFFRÉ_ICI..." : "ENTER_ENCRYPTED_MESSAGE_HERE..."}
                className="w-full bg-surface-container-lowest border border-border-structural p-3 font-mono text-xs text-cotton-lace focus:border-gold-crust focus:ring-0 transition-all outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-gold-crust text-obsidian font-mono text-xs tracking-widest font-bold py-4 hover:bg-cotton-lace transition-colors cursor-pointer uppercase flex items-center justify-center gap-2"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {locale === "DE" ? "ÜBERTRAGUNG_AN_STURM..." : locale === "JA" ? "ストームへ送信中..." : locale === "FR" ? "TRANSMISSION_VERS_LA_TEMPÊTE..." : "TRANSMITTING_TO_STORM..."}
                </>
              ) : (
                <>
                  {locale === "DE" ? "ÜBERTRAGUNG STARTEN" : locale === "JA" ? "送信を開始する" : locale === "FR" ? "COMMENCER LA TRANSMISSION" : "COMMENCE TRANSMISSION"}
                  <Send size={12} />
                </>
              )}
            </button>

            {status === "success" && (
              <div className="border border-teal-bright bg-teal-bright/5 p-4 flex gap-3">
                <Check size={16} className="text-teal-bright flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-teal-bright font-bold uppercase">
                    {locale === "DE" ? "ÜBERTRAGUNG_ERFOLGREICH" : locale === "JA" ? "送信成功" : locale === "FR" ? "TRANSMISSION_RÉUSSIE" : "TRANSMISSION_SUCCESS"}
                  </p>
                  <p className="font-serif text-xs text-cotton-lace">{successMessage}</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="border border-rust bg-rust/5 p-4 flex gap-3">
                <ShieldAlert size={16} className="text-rust flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-rust font-bold uppercase">
                    {locale === "DE" ? "ÜBERTRAGUNGSFEHLER" : locale === "JA" ? "送信失敗" : locale === "FR" ? "ÉCHEC_DE_LA_TRANSMISSION" : "TRANSMISSION_FAILURE"}
                  </p>
                  <p className="font-serif text-xs text-cotton-lace">{errorMessage}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Tactical Atmosphere Visual Display Panel */}
        <div className="bg-obsidian relative hidden md:flex flex-col justify-between p-10 overflow-hidden">
          {/* Scanline Effect Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-15"></div>

          <div className="flex justify-between items-start z-10">
            <div className="space-y-1">
              <span className="font-mono text-[8px] text-gold-crust/60 uppercase tracking-widest block">
                {locale === "DE" ? "SIGNALSTATUS" : locale === "JA" ? "信号状況" : locale === "FR" ? "STATUT_DU_SIGNAL" : "SIGNAL_STATUS"}
              </span>
              <p className="font-mono text-xs text-teal-bright font-bold uppercase">
                {locale === "DE" ? "STABIL // VERBUNDEN" : locale === "JA" ? "安定 // 接続完了" : locale === "FR" ? "STABLE // CONNECTÉ" : "STABLE // CONNECTED"}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <span className="font-mono text-[8px] text-gold-crust/60 uppercase tracking-widest block">
                {locale === "DE" ? "SICHERHEITSFREIGABE" : locale === "JA" ? "セキュリティクリアランス" : locale === "FR" ? "AUTORISATION_DE_SÉCURITÉ" : "SECURITY_CLEARANCE"}
              </span>
              <p className="font-mono text-xs text-gold-crust font-bold uppercase">
                {locale === "DE" ? "LEVEL_09_UMGEHUNG" : locale === "JA" ? "レベル09バイパス" : locale === "FR" ? "BYPASS_NIVEAU_09" : "LEVEL_09_BYPASS"}
              </p>
            </div>
          </div>

          <div className="my-auto py-8 flex flex-col items-center justify-center text-center space-y-4 z-10">
            <Globe className="text-border-structural animate-pulse" size={64} />
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-cotton-lace tracking-widest uppercase">
                {locale === "DE" ? "TAKTIK-KOMMANDOZENTRALE" : locale === "JA" ? "戦術司令センター" : locale === "FR" ? "CENTRE DE COMMANDEMENT TACTIQUE" : "TACTICAL COMMAND CENTRE"}
              </p>
              <p className="font-serif text-xs text-cotton-muted italic">
                {locale === "DE" 
                  ? '"Physische Präsenz ist eine Belastung. Daten sind die einzige Souveränität."' 
                  : locale === "JA" 
                  ? "「物理的な存在は負債である。データのみが唯一の主権である。」" 
                  : locale === "FR" 
                  ? '"La présence physique est un handicap. Les données sont la seule souveraineté."' 
                  : '"Physical presence is a liability. Data is the only sovereignty."'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-border-structural/30 pt-6 z-10">
            <div className="space-y-1">
              <p className="font-mono text-[8px] text-cotton-muted uppercase">
                {locale === "DE" ? "ZENTRALEN_STANDORT" : locale === "JA" ? "センターの所在地" : locale === "FR" ? "EMPLACEMENT_DU_CENTRE" : "CENTRE_LOCATION"}
              </p>
              <p className="font-mono text-[10px] text-cotton-lace uppercase font-bold">
                {locale === "DE" ? "BRUTALISTISCHER TURM, ETAGE 44" : locale === "JA" ? "ブルータリズムタワー、44階" : locale === "FR" ? "TOUR BRUTALISTE, LVL 44" : "BRUTALIST TOWER, LVL 44"}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="font-mono text-[8px] text-cotton-muted uppercase">
                {locale === "DE" ? "SATELLITENKOORDINATEN" : locale === "JA" ? "人工衛星座標" : locale === "FR" ? "COORDONNÉES_SATELLITE" : "SATELLITE_COORDINATES"}
              </p>
              <p className="font-mono text-[10px] text-cotton-lace">
                37.7749° N, 122.4194° W
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
