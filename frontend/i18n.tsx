// frontend/i18n.tsx — Lightweight i18n with React Context
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Lang = "en" | "zh";

export const PURCHASE_URL = "https://ifdian.net/item/0cfbb586300c11f1aa1452540025c377";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Header
    "header.subtitle": "Find your perfect Claude Code companion",
    "header.proPromo": `Unlock <a href="${PURCHASE_URL}" target="_blank" rel="noopener"><strong>PRO</strong></a> to find the strongest version of any species — automatically picks the one with the highest total stats!`,
    "header.currentCompanion": "Current Companion",

    // Tabs
    "tab.search": "Search",
    "tab.collection": "Collection",
    "tab.encyclopedia": "Encyclopedia",
    "tab.settings": "Settings",

    // Search
    "search.title": "Search Criteria",
    "search.species": "Species",
    "search.rarity": "Rarity",
    "search.eye": "Eye",
    "search.hat": "Hat",
    "search.shiny": "Shiny",
    "search.peakStat": "Peak Stat",
    "search.dumpStat": "Dump Stat",
    "search.any": "Any",
    "search.none": "None",
    "search.yes": "Yes",
    "search.no": "No",
    "search.start": "Start Search",
    "search.stop": "Stop Search",
    "search.searching": "Searching...",
    "search.resolving": "Resolving userID…",
    "search.attempts": "attempts",
    "search.found": "Found after {0} attempts ({1}s)!",
    "search.parallel": "4x parallel",
    "search.phase1Done": "✅ Seed matched",
    "search.phase2Hint": "Resolving userID from 4.3 billion IDs — usually takes 1~3 min",
    "search.phase2Attempts": "reverse attempts",
    "search.applied": "Applied! Restart Claude Code and run /buddy",
    "search.collected": "Added to collection!",
    "search.fallbackNotice": "⚠️ userID reverse lookup timed out — companion saved to collection for database fallback.",
    "search.fallbackApplied": "Companion saved to collection (database fallback). Use the collection to apply.",
    "search.proNotice": "Perfect legendary search with peak/dump stats is a Pro feature.",
    "search.buyPro": "Get Pro",
    "search.activateLicense": "Activate License",
    "search.goToSettings": "Go to Settings tab to activate your license key.",
    "search.notFound": "Scanned entire seed space (4.29B seeds) — no match found. Try relaxing your criteria.",
    "search.statExplain.title": "How do stats work?",
    "search.statExplain.intro": "Each companion has 5 stats. One is Peak (highest), one is Dump (lowest), and the other three are normal. The values are determined by rarity and a random seed — you cannot get all 100.",
    "search.statExplain.type": "Type",
    "search.statExplain.range": "Range (Legendary)",
    "search.statExplain.desc": "Description",
    "search.statExplain.peakDesc": "Always reaches max 100 for legendaries. The strongest stat.",
    "search.statExplain.dumpDesc": "Ranges from 40 to 54. This is the trade-off for having a maxed peak stat.",
    "search.statExplain.otherDesc": "Ranges from 50 to 89. Most stats will fall in this range.",
    "search.statExplain.howSearchWorks": "The search scans all 4.29 billion possible seeds and finds the companion with the highest total stats among those matching your filters. So you always get the best possible result!",
    "search.candidates": "{0} candidates · best total: {1}",

    // CompanionDisplay
    "companion.eye": "Eye",
    "companion.hat": "Hat",
    "companion.peak": "Peak",
    "companion.dump": "Dump",
    "companion.apply": "Apply",
    "companion.collect": "Collect",

    // Collection
    "collection.loading": "Loading collection...",
    "collection.empty": "Collection is empty",
    "collection.emptyHint": "Search for companions and collect your favorites!",
    "collection.apply": "Apply",
    "collection.applied": "Applied",
    "collection.remove": "Remove",
    "collection.confirmRemove": "Remove from collection?",

    // Encyclopedia
    "encyclopedia.species": "Species",
    "encyclopedia.rarities": "Rarities",
    "encyclopedia.rarity": "Rarity",
    "encyclopedia.chance": "Chance",
    "encyclopedia.statFloor": "Stat Floor",
    "encyclopedia.hats": "Hats",
    "encyclopedia.eyes": "Eyes",
    "encyclopedia.stats": "Stats",
    "encyclopedia.statsDesc": "Each companion has a peak stat (boosted), a dump stat (lowered), and three normal stats. Values depend on rarity floor + random range.",

    // License
    "license.title": "License Activation",
    "license.activated": "PRO Activated",
    "license.free": "Free Version",
    "license.activateHint": "Activate Pro to unlock all features",
    "license.placeholder": "Enter your BR- license key",
    "license.activating": "Activating...",
    "license.activate": "Activate",
    "license.enterKey": "Please enter a license key",
    "license.info": "License keys start with BR- and unlock Pro features like perfect legendary search with peak/dump stats.",
    "license.getLicense": "Get Activation Code",
    "license.allUnlocked": "All Pro features are now available!",
    "license.issued": "Issued",
    "license.clear": "Clear License",
    "license.confirmClear": "Clear license activation? You will need to enter the key again to re-activate.",

    // General
    "loading": "Loading...",
    "tier": "Tier",
    "unsupported": "Your Claude Code configuration uses accountUUID, which is not supported. Some features may not work correctly.",
  },
  zh: {
    // Header
    "header.subtitle": "找到你的完美 Claude Code 伙伴",
    "header.proPromo": `解锁 <a href="${PURCHASE_URL}" target="_blank" rel="noopener"><strong>PRO</strong></a>，找到指定宠物的最强个体 — 自动为你选出属性总和最高的那一只！`,
    "header.currentCompanion": "当前伙伴",

    // Tabs
    "tab.search": "搜索",
    "tab.collection": "收藏",
    "tab.encyclopedia": "图鉴",
    "tab.settings": "设置",

    // Search
    "search.title": "搜索条件",
    "search.species": "物种",
    "search.rarity": "稀有度",
    "search.eye": "眼睛",
    "search.hat": "帽子",
    "search.shiny": "闪光",
    "search.peakStat": "巅峰属性",
    "search.dumpStat": "短板属性",
    "search.any": "任意",
    "search.none": "无",
    "search.yes": "是",
    "search.no": "否",
    "search.start": "开始搜索",
    "search.stop": "停止搜索",
    "search.searching": "搜索中...",
    "search.resolving": "解析 userID…",
    "search.attempts": "次尝试",
    "search.found": "找到啦！共尝试 {0} 次（{1}秒）！",
    "search.parallel": "4x 并行",
    "search.phase1Done": "✅ 已匹配种子",
    "search.phase2Hint": "正在从 43 亿个 ID 中反向匹配 — 通常 1~3 分钟，请耐心等待",
    "search.phase2Attempts": "次反查",
    "search.applied": "已应用！请重启 Claude Code 并运行 /buddy",
    "search.collected": "已添加到收藏！",
    "search.fallbackNotice": "⚠️ userID 反查超时 — 宠物已保存到收藏，可通过数据库兜底应用。",
    "search.fallbackApplied": "宠物已保存到收藏（数据库兜底）。请从收藏中应用。",
    "search.proNotice": "满属性传奇搜索（指定巅峰/短板属性）是 Pro 功能。",
    "search.buyPro": "获取 Pro",
    "search.activateLicense": "激活许可证",
    "search.goToSettings": "前往设置页面激活你的许可证。",
    "search.notFound": "已扫描全部种子空间（42.9亿）——未找到匹配。请放宽搜索条件。",
    "search.statExplain.title": "属性说明",
    "search.statExplain.intro": "每个伙伴有 5 项属性，其中一个是巅峰属性（最高），一个是短板属性（最低），其余三个为普通属性。属性值由种子和稀有度决定——不可能全部拉满。",
    "search.statExplain.type": "类型",
    "search.statExplain.range": "范围（传说）",
    "search.statExplain.desc": "说明",
    "search.statExplain.peakDesc": "传说级固定为 100，是最强的属性",
    "search.statExplain.dumpDesc": "范围 40~54，这是为了平衡巅峰属性而做的牺牲",
    "search.statExplain.otherDesc": "范围 50~89，大部分属性落在这个区间",
    "search.statExplain.howSearchWorks": "搜索会扫描全部 42.9 亿个种子，在所有满足条件的候选中选出属性总和最高的那一个。所以你永远能得到最好的结果！",
    "search.candidates": "{0} 个候选 · 最高总和: {1}",

    // CompanionDisplay
    "companion.eye": "眼睛",
    "companion.hat": "帽子",
    "companion.peak": "巅峰",
    "companion.dump": "短板",
    "companion.apply": "应用",
    "companion.collect": "收藏",

    // Collection
    "collection.loading": "加载收藏中...",
    "collection.empty": "收藏是空的",
    "collection.emptyHint": "搜索伙伴并收藏你喜欢的吧！",
    "collection.apply": "应用",
    "collection.applied": "已应用",
    "collection.remove": "移除",
    "collection.confirmRemove": "确定从收藏中移除？",

    // Encyclopedia
    "encyclopedia.species": "物种",
    "encyclopedia.rarities": "稀有度",
    "encyclopedia.rarity": "稀有度",
    "encyclopedia.chance": "概率",
    "encyclopedia.statFloor": "属性下限",
    "encyclopedia.hats": "帽子",
    "encyclopedia.eyes": "眼睛",
    "encyclopedia.stats": "属性",
    "encyclopedia.statsDesc": "每个伙伴有一个巅峰属性（增强）、一个短板属性（削弱）和三个普通属性。数值取决于稀有度下限 + 随机范围。",

    // License
    "license.title": "许可证激活",
    "license.activated": "PRO 已激活",
    "license.free": "免费版",
    "license.activateHint": "激活 Pro 以解锁所有功能",
    "license.placeholder": "输入你的 BR- 许可证密钥",
    "license.activating": "激活中...",
    "license.activate": "激活",
    "license.enterKey": "请输入许可证密钥",
    "license.info": "许可证密钥以 BR- 开头，可解锁满属性传奇搜索等 Pro 功能。",
    "license.getLicense": "获取激活码",
    "license.allUnlocked": "所有 Pro 功能已解锁！",
    "license.issued": "签发日期",
    "license.clear": "清除许可证",
    "license.confirmClear": "确定清除许可证激活？你需要重新输入密钥才能再次激活。",

    // General
    "loading": "加载中...",
    "tier": "版本",
    "unsupported": "你的 Claude Code 配置使用了 accountUUID，不受支持。部分功能可能无法正常工作。",
  },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "buddy-reroller-lang";

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh") return stored;
  } catch {}
  // Detect browser language
  const browserLang = navigator.language?.toLowerCase() ?? "";
  if (browserLang.startsWith("zh")) return "zh";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch {}
  }, []);

  const t = useCallback((key: string, ...args: (string | number)[]): string => {
    let str = translations[lang]?.[key] ?? translations.en[key] ?? key;
    args.forEach((arg, i) => {
      str = str.replace(`{${i}}`, String(arg));
    });
    return str;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
