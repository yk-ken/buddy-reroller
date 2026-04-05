// frontend/components/CompanionDisplay.tsx — Enhanced visual display
import { renderSprite } from "../../src/core/sprites";
import { RARITY_COLORS, STAT_NAMES, type Companion, type StatName } from "../../src/types";
import { useI18n } from "../i18n";

const STAT_COLORS: Record<string, string> = {
  DEBUGGING: "#3b82f6",
  PATIENCE: "#22c55e",
  CHAOS: "#ef4444",
  WISDOM: "#a855f7",
  SNARK: "#f59e0b",
};

interface Props {
  companion: Companion;
  showActions?: boolean;
  onApply?: () => void;
  onCollect?: () => void;
}

export default function CompanionDisplay({ companion, showActions, onApply, onCollect }: Props) {
  const { t } = useI18n();
  const frames = renderSprite(companion.species, companion.hat !== "none" ? companion.hat : undefined);
  const frame = frames[0];
  const rarityColor = RARITY_COLORS[companion.rarity];

  return (
    <div className="companion-box">
      <div className="sprite-box">
        <pre className="sprite-pre">{frame.join("\n")}</pre>
      </div>
      <div className="companion-info">
        <div>
          <span className="name" style={{ textTransform: "capitalize" }}>{companion.species}</span>
          <span className={`rarity-tag ${companion.rarity.toLowerCase()}`}>
            {companion.rarity}
          </span>
          {companion.shiny && <span className="shiny-tag">✨ SHINY</span>}
        </div>
        <div className="text-sm text-dim mt-8">
          {t("companion.eye")}: {companion.eye} · {t("companion.hat")}: {companion.hat}
          {" · "}{t("companion.peak")}: <strong style={{ color: "var(--success)" }}>{companion.peakStat}</strong>
          {" · "}{t("companion.dump")}: <strong style={{ color: "var(--danger)" }}>{companion.dumpStat}</strong>
        </div>
        <div className="stats-grid">
          {STAT_NAMES.map(stat => {
            const val = companion.stats[stat];
            const isPeak = stat === companion.peakStat;
            const isDump = stat === companion.dumpStat;
            return (
              <div className={`stat-bar ${isPeak ? "peak" : ""} ${isDump ? "dump" : ""}`} key={stat}>
                <span className="label">{stat.slice(0, 3)}</span>
                <div className="bar">
                  <div
                    className="bar-fill"
                    style={{
                      "--target-width": `${val}%`,
                      width: `${val}%`,
                      background: STAT_COLORS[stat] ?? "#888",
                    } as React.CSSProperties}
                  />
                </div>
                <span className="value">{val}</span>
              </div>
            );
          })}
        </div>
        {showActions && (
          <div className="flex gap-8 mt-8">
            {onApply && <button className="btn btn-success btn-sm" onClick={onApply}>{t("companion.apply")}</button>}
            {onCollect && <button className="btn btn-outline btn-sm" onClick={onCollect}>{t("companion.collect")}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
