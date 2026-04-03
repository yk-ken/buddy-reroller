// frontend/components/CompanionDisplay.tsx
import { renderSprite } from "../../src/core/sprites";
import { RARITY_COLORS, STAT_NAMES, type Companion, type StatName } from "../../src/types";

const STAT_COLORS: Record<string, string> = {
  DEBUGGING: "#3b82f6",
  PATIENCE: "#22c55e",
  CHAOS: "#ef4444",
  WISDOM: "#a855f7",
  SNACK: "#f59e0b",
};

interface Props {
  companion: Companion;
  showActions?: boolean;
  onApply?: () => void;
  onCollect?: () => void;
}

export default function CompanionDisplay({ companion, showActions, onApply, onCollect }: Props) {
  const frames = renderSprite(companion.species, companion.hat !== "none" ? companion.hat : undefined);
  const frame = frames[0];
  const rarityColor = RARITY_COLORS[companion.rarity];

  return (
    <div className="companion-box">
      <pre className="sprite-pre">{frame.join("\n")}</pre>
      <div className="companion-info">
        <div>
          <span className="name" style={{ textTransform: "capitalize" }}>{companion.species}</span>
          <span className="rarity-tag" style={{ background: rarityColor, color: "#fff" }}>
            {companion.rarity}
          </span>
          {companion.shiny && <span className="shiny-tag">✨ SHINY</span>}
        </div>
        <div className="text-sm text-dim mt-8">
          Eye: {companion.eye} · Hat: {companion.hat}
          {" · Peak: "}<strong>{companion.peakStat}</strong>
          {" · Dump: "}<strong>{companion.dumpStat}</strong>
        </div>
        <div className="stats-grid">
          {STAT_NAMES.map(stat => {
            const val = companion.stats[stat];
            const isPeak = stat === companion.peakStat;
            const isDump = stat === companion.dumpStat;
            return (
              <div className="stat-bar" key={stat}>
                <span className="label" style={{ color: isPeak ? "#22c55e" : isDump ? "#ef4444" : undefined }}>
                  {stat.slice(0, 3)}
                </span>
                <div className="bar">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${val}%`,
                      background: STAT_COLORS[stat] ?? "#888",
                    }}
                  />
                </div>
                <span className="value">{val}</span>
              </div>
            );
          })}
        </div>
        {showActions && (
          <div className="flex gap-8 mt-8">
            {onApply && <button className="btn btn-success btn-sm" onClick={onApply}>Apply</button>}
            {onCollect && <button className="btn btn-primary btn-sm" onClick={onCollect}>Collect</button>}
          </div>
        )}
      </div>
    </div>
  );
}
