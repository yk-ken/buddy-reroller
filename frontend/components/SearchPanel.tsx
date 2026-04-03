// frontend/components/SearchPanel.tsx
import { useState, useRef, useCallback } from "react";
import { SPECIES, RARITIES, EYES, HATS, STAT_NAMES, type Companion, type SearchCriteria, type StatName } from "../../src/types";
import CompanionDisplay from "./CompanionDisplay";

interface Props {
  isPro: boolean;
}

export default function SearchPanel({ isPro }: Props) {
  const [criteria, setCriteria] = useState<SearchCriteria>({});
  const [peakStat, setPeakStat] = useState<StatName | "">("");
  const [dumpStat, setDumpStat] = useState<StatName | "">("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<{ userID: string; companion: Companion; attempts: number; elapsed: number } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const isProSearch = !!(peakStat || dumpStat);

  const startSearch = useCallback(() => {
    setFound(null);
    setError("");
    setSearching(true);
    setAttempts(0);
    setElapsed(0);

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
      } else if (data.type === "found") {
        setFound(data);
        setSearching(false);
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
    await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userID: found.userID }),
    });
    alert("Applied! Restart Claude Code and run /buddy");
  };

  const handleCollect = async () => {
    if (!found) return;
    await fetch("/api/collection/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userID: found.userID,
        ...found.companion,
        searchAttempts: found.attempts,
      }),
    });
    alert("Added to collection!");
  };

  return (
    <div className="card">
      <div className="card-title">🔍 Search Criteria</div>

      <div className="form-row">
        <div className="form-group">
          <label>Species</label>
          <select value={criteria.species ?? ""} onChange={e => setCriteria({ ...criteria, species: (e.target.value || undefined) as any })}>
            <option value="">Any</option>
            {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Rarity</label>
          <select value={criteria.rarity ?? ""} onChange={e => setCriteria({ ...criteria, rarity: (e.target.value || undefined) as any })}>
            <option value="">Any</option>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Eye</label>
          <select value={criteria.eye ?? ""} onChange={e => setCriteria({ ...criteria, eye: (e.target.value || undefined) as any })}>
            <option value="">Any</option>
            {EYES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Hat</label>
          <select value={criteria.hat ?? ""} onChange={e => setCriteria({ ...criteria, hat: (e.target.value || undefined) as any })}>
            <option value="">Any</option>
            {HATS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Shiny</label>
          <select value={criteria.shiny === undefined ? "" : criteria.shiny ? "yes" : "no"}
            onChange={e => setCriteria({ ...criteria, shiny: e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined })}>
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div className="form-row mt-8">
        <div className="form-group">
          <label>Peak Stat {isProSearch && "🔒"}</label>
          <select value={peakStat} onChange={e => setPeakStat(e.target.value as StatName | "")}>
            <option value="">None</option>
            {STAT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Dump Stat {isProSearch && "🔒"}</label>
          <select value={dumpStat} onChange={e => setDumpStat(e.target.value as StatName | "")}>
            <option value="">None</option>
            {STAT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {isProSearch && !isPro && (
        <div className="pro-notice">
          <span className="lock">🔒</span>
          Perfect legendary search is a Pro feature. Build with <code>pro-impl.ts</code> to enable.
        </div>
      )}

      <div className="flex gap-8 mt-16">
        {!searching ? (
          <button className="btn btn-primary" onClick={startSearch} disabled={isProSearch && !isPro}>
            Start Search
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopSearch}>
            Stop
          </button>
        )}
      </div>

      {searching && (
        <div className="mt-8">
          <div className="progress-text">
            Searching... {attempts.toLocaleString()} attempts ({(elapsed / 1000).toFixed(1)}s)
          </div>
          <div className="progress-bar">
            <div className="bar-fill" style={{ width: "100%", background: "var(--accent)", animation: "pulse 1s infinite" }} />
          </div>
        </div>
      )}

      {error && <div className="pro-notice" style={{ borderColor: "var(--danger)" }}>{error}</div>}

      {found && (
        <div className="mt-16">
          <div className="card-title">
            🎉 Found after {found.attempts.toLocaleString()} attempts ({(found.elapsed / 1000).toFixed(1)}s)!
          </div>
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
