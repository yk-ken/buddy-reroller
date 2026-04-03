// frontend/components/EncyclopediaPanel.tsx
import { SPECIES, HATS, RARITIES, EYES, STAT_NAMES, RARITY_FLOOR, RARITY_WEIGHTS } from "../../src/types";
import { renderSprite } from "../../src/core/sprites";

export default function EncyclopediaPanel() {
  return (
    <div>
      <div className="card">
        <div className="card-title">🐾 Species ({SPECIES.length})</div>
        <div className="encyclopedia-grid">
          {SPECIES.map(species => {
            const frames = renderSprite(species);
            return (
              <div className="species-card" key={species}>
                <pre className="sprite-pre">{frames[0].join("\n")}</pre>
                <div className="name">{species}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-title">⭐ Rarities ({RARITIES.length})</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "6px", color: "var(--text-dim)", fontSize: 12 }}>Rarity</th>
              <th style={{ textAlign: "right", padding: "6px", color: "var(--text-dim)", fontSize: 12 }}>Chance</th>
              <th style={{ textAlign: "right", padding: "6px", color: "var(--text-dim)", fontSize: 12 }}>Stat Floor</th>
            </tr>
          </thead>
          <tbody>
            {RARITIES.map(r => (
              <tr key={r} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "6px", textTransform: "capitalize" }}>{r}</td>
                <td style={{ textAlign: "right", padding: "6px" }}>{RARITY_WEIGHTS[r]}%</td>
                <td style={{ textAlign: "right", padding: "6px" }}>{RARITY_FLOOR[r]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-16">
        <div className="card-title">🎩 Hats ({HATS.length})</div>
        <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
          {HATS.map(h => (
            <span key={h} className="text-sm" style={{
              padding: "4px 10px",
              background: "var(--surface2)",
              borderRadius: 4,
              textTransform: "capitalize",
            }}>
              {h}
            </span>
          ))}
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-title">👁 Eyes ({EYES.length})</div>
        <div className="flex gap-8">
          {EYES.map(e => (
            <span key={e} style={{ fontSize: 20, padding: "4px 8px", background: "var(--surface2)", borderRadius: 4 }}>
              {e}
            </span>
          ))}
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-title">📊 Stats ({STAT_NAMES.length})</div>
        <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
          {STAT_NAMES.map(s => (
            <span key={s} className="text-sm" style={{
              padding: "4px 10px",
              background: "var(--surface2)",
              borderRadius: 4,
            }}>
              {s}
            </span>
          ))}
        </div>
        <p className="text-sm text-dim mt-8">
          Each companion has a peak stat (boosted), a dump stat (lowered), and three normal stats.
          Values depend on rarity floor + random range.
        </p>
      </div>
    </div>
  );
}
