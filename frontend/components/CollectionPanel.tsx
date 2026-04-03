// frontend/components/CollectionPanel.tsx
import { useState, useEffect, useCallback } from "react";
import type { CollectionEntry } from "../../src/types";
import CompanionDisplay from "./CompanionDisplay";

export default function CollectionPanel() {
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
    await fetch("/api/collection/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
    alert("Applied! Restart Claude Code and run /buddy");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove from collection?")) return;
    await fetch("/api/collection", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  if (loading) return <div className="text-center text-dim">Loading collection...</div>;

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <p>📦 Collection is empty</p>
        <p className="text-sm mt-8">Search for companions and collect your favorites!</p>
      </div>
    );
  }

  return (
    <div className="collection-grid">
      {entries.map(entry => (
        <div className="collection-card" key={entry.id}>
          <CompanionDisplay companion={entry} />
          <div className="actions">
            {!entry.applied && (
              <button className="btn btn-success btn-sm" onClick={() => handleApply(entry.id)}>
                Apply
              </button>
            )}
            {entry.applied && <span className="text-sm text-dim">✓ Applied</span>}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(entry.id)}>
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
