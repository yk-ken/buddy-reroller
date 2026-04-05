// frontend/components/CollectionPanel.tsx
import { useState, useEffect, useCallback } from "react";
import type { CollectionEntry } from "../../src/types";
import { useI18n } from "../i18n";
import CompanionDisplay from "./CompanionDisplay";

export default function CollectionPanel() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/collection");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApply = async (id: string) => {
    try {
      const res = await fetch("/api/collection/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Apply failed");
        return;
      }
      load();
      alert(t("search.applied"));
    } catch {
      alert("Failed to connect to server");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("collection.confirmRemove"))) return;
    await fetch("/api/collection", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  if (loading) return <div className="text-center text-dim">{t("collection.loading")}</div>;

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>📦 {t("collection.empty")}</p>
        <p className="text-sm mt-8">{t("collection.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="collection-grid">
      {entries.map(entry => (
        <div className={`collection-card ${entry.rarity.toLowerCase()}`} key={entry.id}>
          <CompanionDisplay companion={entry} />
          <div className="actions">
            {!entry.applied && (
              <button className="btn btn-success btn-sm" onClick={() => handleApply(entry.id)}>
                {t("collection.apply")}
              </button>
            )}
            {entry.applied && <span className="text-sm text-dim">✓ {t("collection.applied")}</span>}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(entry.id)}>
              {t("collection.remove")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
