// frontend/App.tsx — Main app with license state + i18n
import { useState, useEffect } from "react";
import type { EnvInfo, CollectionEntry } from "../src/types";
import { I18nProvider, useI18n } from "./i18n";
import CompanionDisplay from "./components/CompanionDisplay";
import SearchPanel from "./components/SearchPanel";
import CollectionPanel from "./components/CollectionPanel";
import EncyclopediaPanel from "./components/EncyclopediaPanel";
import LicensePanel from "./components/LicensePanel";

type Tab = "search" | "collection" | "encyclopedia" | "settings";

interface LicenseStatus {
  activated: boolean;
  payload?: {
    tier: string;
    issued: number;
    features: string[];
  };
}

function AppContent() {
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<Tab>("search");
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>({ activated: false });
  const [showLicensePrompt, setShowLicensePrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/detect").then(r => r.json()),
      fetch("/api/license/status").then(r => r.json()).catch(() => ({ activated: false })),
    ]).then(([envData, licenseData]) => {
      setEnv(envData);
      setLicenseStatus(licenseData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleLicenseChange = (activated: boolean) => {
    setLicenseStatus(prev => ({ ...prev, activated }));
    fetch("/api/detect")
      .then(r => r.json())
      .then(setEnv)
      .catch(() => {});
  };

  const refreshEnv = () => {
    fetch("/api/detect")
      .then(r => r.json())
      .then(setEnv)
      .catch(() => {});
  };

  const isEffectivePro = (env?.isPro ?? false) || licenseStatus.activated;

  if (loading) {
    return <div className="text-center mt-16"><p>{t("loading")}</p></div>;
  }

  const tabs: { key: Tab; emoji: string; labelKey: string }[] = [
    { key: "search", emoji: "🔍", labelKey: "tab.search" },
    { key: "collection", emoji: "📦", labelKey: "tab.collection" },
    { key: "encyclopedia", emoji: "📖", labelKey: "tab.encyclopedia" },
    { key: "settings", emoji: "⚙️", labelKey: "tab.settings" },
  ];

  return (
    <>
      <header className="header">
        <h1>
          🐥 Buddy Reroller
          {isEffectivePro && <span className="pro-badge">PRO</span>}
        </h1>
        <p>{t("header.subtitle")}</p>
        {!isEffectivePro && (
          <p className="pro-promo" dangerouslySetInnerHTML={{ __html: t("header.proPromo") }} />
        )}
        <button
          className="lang-toggle"
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
          title={lang === "en" ? "切换到中文" : "Switch to English"}
        >
          {lang === "en" ? "中文" : "EN"}
        </button>
      </header>

      {env?.isSupported === false && (
        <div className="pro-notice" style={{ borderColor: "var(--warning)", background: "rgba(245, 158, 11, 0.1)", marginBottom: "16px" }}>
          ⚠️ {t("unsupported")}
        </div>
      )}

      {env?.currentCompanion && (
        <div className="card">
          <div className="card-title">{t("header.currentCompanion")}</div>
          <CompanionDisplay companion={env.currentCompanion} />
        </div>
      )}

      <nav className="tabs">
        {tabs.map(({ key, emoji, labelKey }) => (
          <button key={key} className={`tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            {emoji} {t(labelKey)}
          </button>
        ))}
      </nav>

      <div style={{ display: tab === "search" ? "block" : "none" }}>
        <SearchPanel
          isPro={env?.isPro ?? false}
          isLicenseActive={licenseStatus.activated}
          showLicensePrompt={showLicensePrompt}
          onShowLicensePrompt={() => setTab("settings")}
          onApply={refreshEnv}
        />
      </div>
      {tab === "collection" && <CollectionPanel onApply={refreshEnv} />}
      {tab === "encyclopedia" && <EncyclopediaPanel />}
      {tab === "settings" && (
        <div className="card">
          <LicensePanel onLicenseChange={handleLicenseChange} />
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
