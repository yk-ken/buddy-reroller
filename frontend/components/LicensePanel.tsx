// frontend/components/LicensePanel.tsx — License activation UI
import { useState, useEffect } from "react";
import { useI18n, PURCHASE_URL } from "../i18n";

interface LicenseStatus {
  activated: boolean;
  payload?: {
    tier: string;
    issued: number;
    features: string[];
  };
}

interface Props {
  onLicenseChange: (activated: boolean) => void;
}

export default function LicensePanel({ onLicenseChange }: Props) {
  const { t } = useI18n();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/license/status")
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        onLicenseChange(data.activated);
      })
      .catch(() => {
        setStatus({ activated: false });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeactivate = async () => {
    if (!confirm(t("license.confirmClear"))) return;

    try {
      await fetch("/api/license", { method: "DELETE" });
      setStatus({ activated: false });
      onLicenseChange(false);
    } catch {}
  };

  const handleActivate = async () => {
    if (!key.trim()) {
      setError(t("license.enterKey"));
      return;
    }

    setActivating(true);
    setError("");

    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus({
          activated: true,
          payload: data.payload,
        });
        onLicenseChange(true);
        setKey("");
      } else {
        setError(data.error || "Activation failed");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setActivating(false);
    }
  };

  if (!status) {
    return <div className="text-center text-dim">{t("loading")}</div>;
  }

  return (
    <div className="license-panel">
      <div className="card-title">🔑 {t("license.title")}</div>

      <div className={`license-status ${status.activated ? "activated" : "not-activated"}`}>
        {status.activated ? (
          <>
            <span className="license-badge">✓ {t("license.activated")}</span>
            <span className="text-sm">
              {status.payload && (
                <>{t("tier")}: <strong>{status.payload.tier}</strong></>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="text-dim">🔒 {t("license.free")}</span>
            <span className="text-sm">{t("license.activateHint")}</span>
          </>
        )}
      </div>

      {!status.activated && (
        <>
          <div className="license-input-group">
            <input
              type="text"
              className="license-input"
              placeholder={t("license.placeholder")}
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleActivate()}
            />
            <button
              className="btn btn-primary"
              onClick={handleActivate}
              disabled={activating || !key.trim()}
            >
              {activating ? t("license.activating") : t("license.activate")}
            </button>
          </div>

          {error && (
            <div className="text-sm" style={{ color: "var(--danger)", marginTop: "8px" }}>
              ⚠️ {error}
            </div>
          )}

          <div className="license-info">
            📌 {t("license.info")}
          </div>

          <div className="mt-8">
            <a href={PURCHASE_URL} target="_blank" rel="noopener" className="btn btn-primary btn-sm">
              {t("license.getLicense")}
            </a>
          </div>
        </>
      )}

      {status.activated && status.payload && (
        <>
          <div className="license-info">
            ✅ {t("license.allUnlocked")} {t("license.issued")}:{" "}
            {new Date(status.payload.issued * 1000).toLocaleDateString()}
          </div>
          <div className="mt-8">
            <button className="btn btn-outline btn-sm" onClick={handleDeactivate}>
              {t("license.clear")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
