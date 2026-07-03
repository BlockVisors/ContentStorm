"use client";

import React, { useEffect, useState } from "react";
import { Terminal, RefreshCw, ShieldCheck, Activity } from "lucide-react";
import { ActivityLog } from "@/types/landing";
import { useLanguage } from "@/context/LanguageContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

// Generate 30 days of high-fidelity pressure testing volume
const generatePressureTestData = () => {
  const data = [];
  const baseVal = 130;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const dayOfMonth = d.getDate();
    
    // Weekend volume drops, weekday rises
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const modifier = isWeekend ? -45 : 35;
    const cyclicFriction = Math.floor(Math.sin(dayOfMonth * 0.4) * 20);
    const noise = Math.floor(Math.random() * 15);
    
    const totalTests = Math.max(30, baseVal + modifier + cyclicFriction + noise + i);
    const passed = Math.floor(totalTests * (0.18 + Math.sin(dayOfMonth * 0.5) * 0.04));
    const rejected = totalTests - passed;
    
    const dayStr = d.getDate().toString().padStart(2, "0");
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthStr = months[d.getMonth()];
    
    data.push({
      date: `${dayStr}_${monthStr}`,
      tests: totalTests,
      passed: passed,
      rejected: rejected
    });
  }
  return data;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  locale?: string;
}

const CustomTooltip = ({ active, payload, label, locale }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border-2 border-gold-crust p-3 font-mono text-[10px] space-y-1">
        <p className="text-cotton-lace font-bold border-b border-border-structural pb-1 mb-1">
          {locale === "DE" ? "ZEITFENSTER" : locale === "JA" ? "時間枠" : locale === "FR" ? "PÉRIODE" : "TIMEFRAME"}: {label}
        </p>
        <p className="text-gold-crust uppercase">
          ● {locale === "DE" ? "TOTAL_BELASTUNGSLÄUFE" : locale === "JA" ? "総ストレス実行数" : locale === "FR" ? "RUNS_DE_STRESS_TOTAL" : "TOTAL_STRESS_RUNS"}: <span className="font-bold">{payload[0].value}</span>
        </p>
        <p className="text-teal-bright uppercase">
          ● {locale === "DE" ? "BESTANDEN_RESILIENT" : locale === "JA" ? "合格（回復力あり）" : locale === "FR" ? "RÉUSSI_RÉSILIENT" : "PASSED_RESILIENT"}: <span className="font-bold">{payload[1]?.value || 0}</span>
        </p>
        <p className="text-rust uppercase">
          ● {locale === "DE" ? "ZERBROCHEN_REJEKT" : locale === "JA" ? "破損（拒否）" : locale === "FR" ? "BRISÉ_REJET" : "SHATTERED_REJECT"}: <span className="font-bold">{payload[2]?.value || 0}</span>
        </p>
      </div>
    );
  }
  return null;
};

interface TypingLogEntryProps {
  key?: string;
  log: ActivityLog;
  statusColor: string;
  shouldType: boolean;
}

function TypingLogEntry({ log, statusColor, shouldType }: TypingLogEntryProps) {
  const [displayedText, setDisplayedText] = useState(shouldType ? "" : log.message);
  const fullText = log.message;

  useEffect(() => {
    if (!shouldType) {
      setDisplayedText(fullText);
      return;
    }

    let index = 0;
    setDisplayedText("");
    
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 12); // 12ms per character for an ultra-slick look

    return () => clearInterval(interval);
  }, [fullText, shouldType]);

  return (
    <div className="border-b border-border-structural/20 pb-1.5 hover:bg-surface-teal/20 transition-all space-y-0.5 animate-terminal-flicker">
      <div className="flex justify-between text-[8px] text-cotton-muted select-none">
        <span>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
        <span className={`font-bold ${statusColor}`}>
          {log.type} // {log.status}
        </span>
      </div>
      <div className="text-cotton-lace break-all font-mono min-h-[1.2em] flex flex-wrap items-center">
        <span>{displayedText}</span>
        {shouldType && displayedText.length < fullText.length && (
          <span className="inline-block w-1 h-3 bg-gold-crust ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default function SystemLogs() {
  const { locale, t } = useLanguage();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  // Empty initial state, not generatePressureTestData() directly — that call
  // uses Math.random()/new Date(), which would produce a different dataset on
  // the server render vs. the client hydration pass and trigger a React
  // hydration mismatch. Populated client-side only, in the effect below.
  const [chartData, setChartData] = useState<ReturnType<typeof generatePressureTestData>>([]);
  const [seenLogIds, setSeenLogIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setChartData(generatePressureTestData());
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Could not fetch adversarial system logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update seenLogIds when logs are fetched
  useEffect(() => {
    if (logs.length > 0) {
      if (seenLogIds.size === 0) {
        // Initial load: mark all loaded logs as seen to prevent full-terminal typewriter spam
        const initialIds = new Set(logs.map((l) => l.id));
        setSeenLogIds(initialIds);
      } else {
        // Subsequent loads: identify newly added logs
        const newIds = logs.filter((l) => !seenLogIds.has(l.id)).map((l) => l.id);
        if (newIds.length > 0) {
          setSeenLogIds((prev) => {
            const updated = new Set(prev);
            newIds.forEach((id) => updated.add(id));
            return updated;
          });
        }
      }
    }
  }, [logs]);

  const getStatusColor = (status: ActivityLog["status"]) => {
    switch (status) {
      case "SUCCESS":
        return "text-teal-bright";
      case "WARNING":
        return "text-gold-crust";
      case "CRITICAL":
        return "text-rust";
      default:
        return "text-cotton-muted";
    }
  };

  return (
    <section className="py-12 bg-obsidian border-b border-border-structural">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-6">
        
        {/* Header of terminal logs */}
        <div className="flex justify-between items-center border-b border-border-structural pb-4">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-gold-crust" />
            <h3 className="font-mono text-xs text-cotton-lace tracking-widest uppercase font-bold">
              {locale === "DE" 
                ? "GEGNERISCHER_AKTIVITÄTSMONITOR // SICHERER_KANAL_V1.0" 
                : locale === "JA" 
                ? "敵対的アクティビティモニター // セキュアチャネル V1.0" 
                : locale === "FR" 
                ? "MONITEUR_D'ACTIVITÉ_ADVERSAIRE // CANAL_SÉCURISÉ_V1.0" 
                : "ADVERSARIAL_ACTIVITY_MONITOR // SECURE_CHANNEL_V1.0"}
            </h3>
          </div>
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="font-mono text-[9px] text-cotton-muted hover:text-gold-crust inline-flex items-center gap-1 cursor-pointer uppercase"
          >
            <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
            {locale === "DE" ? "TERMINAL_AKTUALISIEREN" : locale === "JA" ? "ターミナルを更新" : locale === "FR" ? "RAFRAÎCHIR_LE_TERMINAL" : "REFRESH_TERMINAL"}
          </button>
        </div>

        {/* High-density grid layout pairing Recharts visualization with actual log console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Side: Recharts Stress Test Volume Tracker */}
          <div className="lg:col-span-7 bg-surface border border-border-structural p-5 flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity size={14} className="text-gold-crust" />
                  <span className="font-mono text-[9px] text-gold-crust font-bold tracking-widest uppercase">
                    {locale === "DE" 
                      ? "METRISCHER_VEKTOR // DRUCKTESTS_30T" 
                      : locale === "JA" 
                      ? "メトリックベクトル // 圧力テスト30日間" 
                      : locale === "FR" 
                      ? "VECTEUR_MÉTRIQUE // TESTS_DE_PRESSION_30J" 
                      : "METRIC_VECTOR // PRESSURE_TESTS_30D"}
                  </span>
                </div>
                <span className="font-mono text-[8px] text-cotton-muted uppercase">
                  {locale === "DE" ? "AKTIVE SENSOREN: 05/05" : locale === "JA" ? "アクティブなセンサー: 05/05" : locale === "FR" ? "CAPTEURS ACTIFS : 05/05" : "ACTIVE_SENSORS: 05/05"}
                </span>
              </div>
              <p className="font-serif text-xs text-cotton-muted">
                {locale === "DE" 
                  ? "Zeigt die täglich durchgeführten gegnerischen Belastungstests. Die durchschnittliche Fehlerrate liegt bei etwa " 
                  : locale === "JA" 
                  ? "毎日実施される敵対的ストレステストの総数を示しています。平均失敗率は約 " 
                  : locale === "FR" 
                  ? "Affiche le nombre total de tests de résistance contradictoires menés quotidiennement. Le taux d'échec moyen oscille autour de " 
                  : "Showing total adversarial stress tests conducted daily. Average failure rate hovers around "}
                <strong className="text-rust">81.4%</strong>
                {locale === "DE" 
                  ? ", da das Quintett aktiv Konsens-Slop filtert." 
                  : locale === "JA" 
                  ? " で推移しており、5人組が積極的に合意的な無駄情報を除去しています。" 
                  : locale === "FR" 
                  ? " alors que le Quintette filtre activement le gaspillage de consensus." 
                  : " as the Quintet actively filters consensus slop."}
              </p>
            </div>

            {/* Area Chart Container */}
            <div className="w-full h-64 font-mono text-[9px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A24B" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#C9A24B" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E6F6A" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2E6F6A" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B5563A" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#B5563A" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C3A38" vertical={false} />
                  
                  <XAxis 
                    dataKey="date" 
                    stroke="#9FB0AC" 
                    tickLine={false}
                    axisLine={{ stroke: "#1C3A38" }}
                  />
                  
                  <YAxis 
                    stroke="#9FB0AC" 
                    tickLine={false}
                    axisLine={{ stroke: "#1C3A38" }}
                  />
                  
                  <Tooltip content={<CustomTooltip locale={locale} />} cursor={{ stroke: "#C9A24B", strokeWidth: 1 }} />
                  
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="rect"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: "0px", paddingBottom: "10px" }}
                  />

                  <Area 
                    name="TOTAL_TESTS" 
                    type="monotone" 
                    dataKey="tests" 
                    stroke="#C9A24B" 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#colorTests)" 
                  />
                  <Area 
                    name="PASSED_RESILIENT" 
                    type="monotone" 
                    dataKey="passed" 
                    stroke="#2E6F6A" 
                    strokeWidth={1.2}
                    fillOpacity={1} 
                    fill="url(#colorPassed)" 
                  />
                  <Area 
                    name="SHATTERED_REJECT" 
                    type="monotone" 
                    dataKey="rejected" 
                    stroke="#B5563A" 
                    strokeWidth={1.2}
                    fillOpacity={1} 
                    fill="url(#colorRejected)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Side: Log console terminal */}
          <div className="lg:col-span-5 bg-surface border border-border-structural p-5 flex flex-col justify-between">
            <div className="space-y-1 mb-4">
              <span className="font-mono text-[9px] text-gold-crust font-bold tracking-widest uppercase">
                {locale === "DE" ? "KONSOLEN_FEED // RECON_PROTOKOLLE" : locale === "JA" ? "コンソールフィード // 偵察ログ" : locale === "FR" ? "FLUX_DE_CONSOLE // JOURNAUX_DE_RECON" : "CONSOLE_FEED // RECON_LOGS"}
              </span>
              <p className="font-serif text-xs text-cotton-muted">
                {locale === "DE" 
                  ? "Systemereignisse und interaktive Handshakes werden unten im Rohformat angezeigt." 
                  : locale === "JA" 
                  ? "システムイベントとインタラクティブなハンドシェイクが以下に未加工のフォーマットで表示されます。" 
                  : locale === "FR" 
                  ? "Événements système et handshakes interactifs affichés ci-dessous au format brut." 
                  : "System events and interactive handshakes displayed below in raw format."}
              </p>
            </div>

            <div className="bg-surface-container-lowest border border-border-structural/50 p-4 font-mono text-[10px] leading-relaxed space-y-2 h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-border-structural scrollbar-track-obsidian">
              {logs.length === 0 ? (
                <div className="text-cotton-muted italic animate-pulse">
                  {locale === "DE" 
                    ? "[SYSTEM] Socket-Synchronisierung mit dem Adversary-Kern wird hergestellt..." 
                    : locale === "JA" 
                    ? "[システム] 敵対的コアとのソケット同期を確立中..." 
                    : locale === "FR" 
                    ? "[SYSTÈME] Établissement de la synchronisation de socket avec le cœur adverse..." 
                    : "[SYSTEM] Establishing socket sync with the Adversarial Core..."}
                </div>
              ) : (
                logs.map((log) => (
                  <TypingLogEntry 
                    key={log.id} 
                    log={log} 
                    statusColor={getStatusColor(log.status)} 
                    shouldType={!seenLogIds.has(log.id)} 
                  />
                ))
              )}
            </div>
          </div>

        </div>

        {/* Bottom indicator */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-cotton-muted gap-2 border-t border-border-structural/30 pt-4">
          <p className="uppercase">
            {locale === "DE" 
              ? "PROFITIPP: GEBEN SIE DATEN IM KONTAKTFORMULAR ODER NEWSLETTER-FELD EIN, UM SOFORTIGE PROTOKOLL-UPDATES ZU SEHEN." 
              : locale === "JA" 
              ? "プロのアドバイス：お問い合わせフォームまたはニュースレターボックスからデータを送信すると、エージェントログの即時更新が確認できます。" 
              : locale === "FR" 
              ? "CONSEIL : SOUMETTEZ DES DONNÉES SUR LE FORMULAIRE DE CONTACT OU L'ENCADRÉ NEWSLETTER POUR VOIR UNE MISE À JOUR IMMÉDIATE DU JOURNAL." 
              : "PROTIP: SUBMIT DATA ON THE CONTACT FORM OR NEWSLETTER BOX TO WITNESS IMMEDIATE AGENT LOG UPDATE."}
          </p>
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-teal-bright" />
            <span className="text-teal-bright uppercase">
              {locale === "DE" ? "VERSCHLÜSSELUNGSPROTOKOLL" : locale === "JA" ? "暗号化プロトコル" : locale === "FR" ? "PROTOCOLE DE CHIFFREMENT" : "ENCRYPTION PROTOCOL"}: TLS_1.3_AES_GCM_256
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
