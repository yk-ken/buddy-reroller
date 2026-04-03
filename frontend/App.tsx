// frontend/App.tsx — 主应用
import { useState, useEffect } from "react";
import type { EnvInfo, CollectionEntry } from "../src/types";
import CompanionDisplay from "./components/CompanionDisplay";
import SearchPanel from "./components/SearchPanel";
import CollectionPanel from "./components/CollectionPanel";
import EncyclopediaPanel from "./components/EncyclopediaPanel";

type Tab = "search" | "collection" | "encyclopedia";

export default function App() {
  const [tab, setTab] = useState<Tab>("search");
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/detect")
      .then(r => r.json())
      .then(data => { setEnv(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center mt-16"><p>Loading...</p></div>;
  }

  return (
    <>
      <header className="header">
        <h1>
          🐥 Buddy Reroller
          {env?.isPro && <span className="pro-badge">PRO</span>}
        </h1>
        <p>Find your perfect Claude Code companion</p>
      </header>

      {env?.currentCompanion && (
        <div className="card">
          <div className="card-title">Current Companion</div>
          <CompanionDisplay companion={env.currentCompanion} />
        </div>
      )}

      <nav className="tabs">
        <button className={`tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>
          🔍 Search
        </button>
        <button className={`tab ${tab === "collection" ? "active" : ""}`} onClick={() => setTab("collection")}>
          📦 Collection
        </button>
        <button className={`tab ${tab === "encyclopedia" ? "active" : ""}`} onClick={() => setTab("encyclopedia")}>
          📖 Encyclopedia
        </button>
      </nav>

      {tab === "search" && <SearchPanel isPro={env?.isPro ?? false} />}
      {tab === "collection" && <CollectionPanel />}
      {tab === "encyclopedia" && <EncyclopediaPanel />}
    </>
  );
}
