// frontend/components/SearchPanel.tsx — Search with parallel progress and license gate
import { useState, useRef, useCallback } from "react";
import { SPECIES, RARITIES, EYES, HATS, STAT_NAMES, type Companion, type SearchCriteria, type StatName } from "../../src/types";
import { useI18n, PURCHASE_URL } from "../i18n";
import CompanionDisplay from "./CompanionDisplay";

interface Props {
  isPro: boolean;
  isLicenseActive?: boolean;
  showLicensePrompt?: boolean;
  onShowLicensePrompt?: () => void;
  onApply?: () => void;
}

export default function SearchPanel({
  isPro,
  isLicenseActive = false,
  showLicensePrompt = false,
  onShowLicensePrompt,
  onApply,
}: Props) {
  const { t } = useI18n();
  const [criteria, setCriteria] = useState<SearchCriteria>({ rarity: "legendary", shiny: true });
  const [peakStat, setPeakStat] = useState<StatName | "">("");
  const [dumpStat, setDumpStat] = useState<StatName | "">("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<{ userID: string | null; companion: Companion; attempts: number; elapsed: number; totalStats?: number; candidatesFound?: number; fallback?: boolean; seed?: number; source?: string } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [phase, setPhase] = useState<1 | 2>(1);
  const [phase2Attempts, setPhase2Attempts] = useState(0);
  const [phase2Elapsed, setPhase2Elapsed] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [proLockedNotice, setProLockedNotice] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const phase1ElapsedRef = useRef(0);

  const isProSearch = !!(peakStat || dumpStat);
  const isEffectivePro = isPro || isLicenseActive;

  const startSearch = useCallback(async () => {
    setFound(null);
    setError("");
    setSearching(true);
    setAttempts(0);
    setElapsed(0);
    setProgressPct(0);
    setPhase(1);
    setPhase2Attempts(0);
    setPhase2Elapsed(0);
    phase1ElapsedRef.current = 0;
    setNotFound(false);

    // Step 1: Check pre-computed database first
    try {
      const dbRes = await fetch("/api/search/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria, peakStat: peakStat || undefined, dumpStat: dumpStat || undefined }),
      });
      const dbData = await dbRes.json();
      if (dbData.found) {
        setFound({
          userID: dbData.userID,
          companion: dbData.companion,
          totalStats: dbData.totalStats,
          candidatesFound: 1,
          attempts: 0,
          elapsed: 0,
          source: "database",
        });
        setSearching(false);
        return;
      }
    } catch {
      // Database lookup failed, continue to real-time search
    }

    // Step 2: Real-time WebSocket search
    const ws = new WebSocket(`ws://${location.host}/ws/search`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "start",
        criteria,
        peakStat: peakStat || undefined,
        dumpStat: dumpStat || undefined,
      }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "progress") {
        setAttempts(data.attempts);
        setElapsed(data.elapsed);
        if (data.phase) setPhase(data.phase);
        if (data.phase === 2 && phase1ElapsedRef.current === 0) {
          phase1ElapsedRef.current = data.elapsed;
        }
        const pct = parseFloat(data.progressPct ?? "0");
        setProgressPct(isNaN(pct) ? -1 : pct);
        if (data.phase2Attempts != null) setPhase2Attempts(data.phase2Attempts);
        if (data.phase === 2) setPhase2Elapsed(Math.max(0, data.elapsed - phase1ElapsedRef.current));
      } else if (data.type === "found") {
        setFound(data);
        setSearching(false);
        setNotFound(false);
        ws.close();
      } else if (data.type === "not_found") {
        setNotFound(true);
        setSearching(false);
        setAttempts(data.attempts);
        ws.close();
      } else if (data.type === "error") {
        setError(data.message);
        setSearching(false);
        ws.close();
      } else if (data.type === "stopped") {
        setSearching(false);
        setAttempts(data.attempts);
      }
    };

    ws.onerror = () => {
      setError("Connection error");
      setSearching(false);
    };
  }, [criteria, peakStat, dumpStat]);

  const stopSearch = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "stop" }));
  }, []);

  const handleApply = async () => {
    if (!found) return;
    if (!found.userID) {
      // Fallback: save to collection, then instruct user
      try {
        const res = await fetch("/api/collection/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userID: `__seed_${found.seed?.toString(16)}`,
            ...found.companion,
            searchAttempts: found.attempts,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Failed to save to collection");
          return;
        }
        alert(t("search.fallbackApplied"));
      } catch {
        alert("Failed to connect to server");
      }
      return;
    }
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID: found.userID }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Apply failed");
        return;
      }
      alert(t("search.applied"));
      onApply?.();
    } catch {
      alert("Failed to connect to server");
    }
  };

  const handleCollect = async () => {
    if (!found) return;
    try {
      const res = await fetch("/api/collection/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userID: found.userID ?? `__seed_${found.seed?.toString(16)}`,
          ...found.companion,
          searchAttempts: found.attempts,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to save to collection");
        return;
      }
      alert(t("search.collected"));
    } catch {
      alert("Failed to connect to server");
    }
  };

  const attemptsPerSec = elapsed > 0 ? Math.round(attempts / (elapsed / 1000)) : 0;
  const phase2AttemptsPerSec = phase2Elapsed > 0 ? Math.round(phase2Attempts / (phase2Elapsed / 1000)) : 0;

  return (
    <div className="card">
      <div className="card-title">🔍 {t("search.title")}</div>

      <div className="form-row">
        <div className="form-group">
          <label>{t("search.species")}</label>
          <select value={criteria.species ?? ""} onChange={e => setCriteria({ ...criteria, species: (e.target.value || undefined) as any })}>
            <option value="">{t("search.any")}</option>
            {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t("search.rarity")}</label>
          <select value={criteria.rarity ?? ""} onChange={e => setCriteria({ ...criteria, rarity: (e.target.value || undefined) as any })}>
            <option value="">{t("search.any")}</option>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t("search.eye")}</label>
          <select value={criteria.eye ?? ""} onChange={e => setCriteria({ ...criteria, eye: (e.target.value || undefined) as any })}>
            <option value="">{t("search.any")}</option>
            {EYES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t("search.hat")}</label>
          <select value={criteria.hat ?? ""} onChange={e => setCriteria({ ...criteria, hat: (e.target.value || undefined) as any })}>
            <option value="">{t("search.any")}</option>
            {HATS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t("search.shiny")}</label>
          <select value={criteria.shiny === undefined ? "" : criteria.shiny ? "yes" : "no"}
            onChange={e => setCriteria({ ...criteria, shiny: e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined })}>
            <option value="">{t("search.any")}</option>
            <option value="yes">{t("search.yes")}</option>
            <option value="no">{t("search.no")}</option>
          </select>
        </div>
      </div>

      <div className="form-row mt-8">
        <div className="form-group">
          <label>{t("search.peakStat")} {isProSearch && !isEffectivePro && "🔒"}</label>
          <select value={peakStat} onChange={e => { const v = e.target.value as StatName | ""; if (v && !isEffectivePro) { setProLockedNotice(true); return; } setProLockedNotice(false); setPeakStat(v); }}>
            <option value="">{t("search.any")}</option>
            {STAT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t("search.dumpStat")} {isProSearch && !isEffectivePro && "🔒"}</label>
          <select value={dumpStat} onChange={e => { const v = e.target.value as StatName | ""; if (v && !isEffectivePro) { setProLockedNotice(true); return; } setProLockedNotice(false); setDumpStat(v); }}>
            <option value="">{t("search.any")}</option>
            {STAT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="stat-explanation mt-8">
        <details>
          <summary className="cursor-pointer text-dim text-sm">{t("search.statExplain.title")}</summary>
          <div className="stat-explain-body mt-4 text-sm">
            <p>{t("search.statExplain.intro")}</p>
            <table className="stat-table">
              <thead><tr><th>{t("search.statExplain.type")}</th><th>{t("search.statExplain.range")}</th><th>{t("search.statExplain.desc")}</th></tr></thead>
              <tbody>
                <tr><td>🏔️ Peak</td><td>50~100</td><td>{t("search.statExplain.peakDesc")}</td></tr>
                <tr><td>📉 Dump</td><td>40~54</td><td>{t("search.statExplain.dumpDesc")}</td></tr>
                <tr><td>📊 Others</td><td>50~89</td><td>{t("search.statExplain.otherDesc")}</td></tr>
              </tbody>
            </table>
            <p className="text-dim">{t("search.statExplain.howSearchWorks")}</p>
          </div>
        </details>
      </div>

      {(proLockedNotice || (isProSearch && !isEffectivePro)) && (
        <div className="pro-notice">
          <span className="lock">🔒</span>
          {t("search.proNotice")}
          <a
            href={PURCHASE_URL}
            target="_blank"
            rel="noopener"
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "12px" }}
          >
            {t("search.buyPro")}
          </a>
          {!showLicensePrompt && onShowLicensePrompt && (
            <button
              className="btn btn-outline btn-sm"
              style={{ marginLeft: "8px" }}
              onClick={onShowLicensePrompt}
            >
              {t("search.activateLicense")}
            </button>
          )}
          {showLicensePrompt && (
            <span className="text-sm" style={{ marginLeft: "12px" }}>
              {t("search.goToSettings")}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-8 mt-16">
        {!searching ? (
          <button
            className="btn btn-primary"
            onClick={startSearch}
            disabled={isProSearch && !isEffectivePro}
          >
            {t("search.start")}
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopSearch}>
            {t("search.stop")}
          </button>
        )}
      </div>

      {searching && (
        <div className="mt-16">
          {phase === 2 ? (
            <>
              <div className="progress-text">
                <span>{t("search.phase1Done")}</span>
                <span className="parallel-badge">{t("search.parallel")}</span>
              </div>
              <div className="progress-text" style={{ marginTop: 8 }}>
                <span>{t("search.resolving")} {phase2Attempts.toLocaleString()} {t("search.phase2Attempts")}</span>
                <span className="text-dim">·</span>
                <span>{(phase2Elapsed / 1000).toFixed(1)}s</span>
                <span className="text-dim">·</span>
                <span>{phase2AttemptsPerSec.toLocaleString()}/s</span>
              </div>
              <div className="progress-bar">
                <div className="bar-fill indeterminate" />
              </div>
              <div className="text-dim text-sm" style={{ marginTop: 4 }}>{t("search.phase2Hint")}</div>
            </>
          ) : (
            <>
              <div className="progress-text">
                <span>{t("search.searching")} {attempts.toLocaleString()} {t("search.attempts")}</span>
                <span className="text-dim">·</span>
                <span>{(elapsed / 1000).toFixed(1)}s</span>
                <span className="text-dim">·</span>
                <span>{attemptsPerSec.toLocaleString()}/s</span>
                <span className="text-dim">·</span>
                <span>{progressPct >= 0 ? progressPct.toFixed(1) + '%' : '—'}</span>
                <span className="parallel-badge">{t("search.parallel")}</span>
              </div>
              <div className="progress-bar">
                <div className={`bar-fill ${progressPct < 0 ? 'indeterminate' : ''}`} style={progressPct >= 0 ? { width: `${Math.min(progressPct, 100)}%` } : undefined} />
              </div>
            </>
          )}
        </div>
      )}

      {notFound && (
        <div className="pro-notice" style={{ borderColor: "var(--warning)", background: "rgba(245, 158, 11, 0.1)" }}>
          {t("search.notFound")}
        </div>
      )}

      {error && <div className="pro-notice" style={{ borderColor: "var(--danger)", background: "rgba(239, 68, 68, 0.1)" }}>{error}</div>}

      {found && (
        <div className="mt-16 found-celebration">
          <div className="card-title">
            {found.source === "database"
              ? `⚡ ${t("search.dbHit")}`
              : `🔍 ${t("search.found", found.attempts.toLocaleString(), (found.elapsed / 1000).toFixed(1))}`}
          </div>
          {found.fallback && (
            <div className="pro-notice" style={{ marginBottom: 8, borderColor: "var(--warning)", background: "rgba(245,158,11,0.1)" }}>
              {t("search.fallbackNotice")}
            </div>
          )}
          {found.candidatesFound != null && (
            <div className="progress-text" style={{ marginBottom: 8 }}>
              <span>{t("search.candidates", found.candidatesFound ?? 0, found.totalStats ?? 0)}</span>
            </div>
          )}
          <CompanionDisplay
            companion={found.companion}
            showActions
            onApply={handleApply}
            onCollect={handleCollect}
          />
        </div>
      )}
    </div>
  );
}
