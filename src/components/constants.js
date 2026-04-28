export const cx = (...parts) => parts.filter(Boolean).join(" ");

export const BORDER = "border-zinc-200 dark:border-zinc-800";
export const BORDER_INPUT = "border-zinc-300 dark:border-zinc-700";
export const BORDER_ROW = "border-zinc-100 dark:border-zinc-900";
export const SURFACE = "bg-white dark:bg-zinc-950";
export const SURFACE_MUTED = "bg-zinc-50 dark:bg-zinc-900/40";
export const TRACK = "bg-zinc-100 dark:bg-zinc-900";

export const TEXT_TITLE = "text-zinc-900 dark:text-zinc-50";
export const TEXT_BODY = "text-zinc-900 dark:text-zinc-100";
export const TEXT_SOFT = "text-zinc-700 dark:text-zinc-300";
export const TEXT_MUTED = "text-zinc-500";
export const TEXT_EMERALD = "text-emerald-600 dark:text-emerald-400";
export const TEXT_ROSE = "text-rose-600 dark:text-rose-400";

export const LABEL_XS = `text-[10px] font-semibold uppercase tracking-[0.15em] ${TEXT_MUTED}`;
export const LABEL_WIDE = `text-[10px] font-semibold uppercase tracking-[0.2em] ${TEXT_MUTED}`;
export const LABEL_XWIDE = `text-[10px] font-semibold uppercase tracking-[0.25em] ${TEXT_MUTED}`;

export const TONE_TEXT = {
  positive: TEXT_EMERALD,
  negative: TEXT_ROSE,
  neutral: TEXT_MUTED,
};

export const TONE_FILL = {
  positive: "bg-emerald-500",
  negative: "bg-rose-500",
  neutral: "bg-zinc-500",
};

export const TONE_BADGE = {
  positive: `border-emerald-500/30 bg-emerald-500/10 ${TEXT_EMERALD}`,
  negative: `border-rose-500/30 bg-rose-500/10 ${TEXT_ROSE}`,
  neutral: `border-zinc-300 ${TEXT_MUTED} dark:border-zinc-700`,
};

const TONE_KIND = {
  direction: { Long: "positive", Short: "negative" },
  result: { Win: "positive", Loss: "negative", BE: "neutral" },
  dxy: { Bullish: "positive", Bearish: "negative" },
  sentiment: { "Risk-On": "positive", "Risk-Off": "negative" },
};
export const toneOf = (kind, v) => TONE_KIND[kind]?.[v] ?? "neutral";

export const pnlTone = (v) => (v > 0 ? "positive" : v < 0 ? "negative" : "neutral");

export const EMERALD = "#10b981";
export const ROSE = "#f43f5e";

export const AXIS_TICK = { fontSize: 10, fill: "currentColor", opacity: 0.5 };
export const AXIS_LINE = { stroke: "currentColor", strokeOpacity: 0.15 };
