import { cloneElement, useEffect, useState } from "react";
import {
  ArrowUp, ArrowDown, CalendarDays, Clock, ImagePlus, Target, Layers, Brain,
  NotebookPen, Newspaper, Save, X, CheckCircle2, ChevronDown, ChevronUp, Skull,
  Clipboard, Trash2, Image as ImageIcon, Zap, ShieldCheck, ShieldAlert, ShieldX,
  Sparkles,
} from "lucide-react";
import {
  Card, SectionHeader, Field, TextInput, Select, TextArea, Button,
  ToggleChip, Tag, Divider, pnlClass, signedUsd,
} from "./ui";
import {
  ASSETS, KILLZONES, SETUPS, CONFLUENCES, DOL_TARGETS, MACRO_EVENTS,
  EMOTIONS, MISTAKES, MOODS,
} from "../data/mockTrades";
import {
  cx, BORDER, BORDER_INPUT, SURFACE,
  TEXT_TITLE, TEXT_BODY, TEXT_SOFT, TEXT_MUTED, TEXT_EMERALD, TEXT_ROSE,
  toneOf,
} from "./constants";

const SCREENSHOT_SLOTS = [
  { key: "htf", label: "HTF", sub: "4H / 1H" },
  { key: "ltf", label: "LTF", sub: "15m / 5m" },
  { key: "exec", label: "Exec", sub: "1m / tick" },
];

const RESULT_SYM = { Win: "+", Loss: "−", BE: "=" };
const DIR_ICON = { Long: ArrowUp, Short: ArrowDown };
const POS_EMOTIONS = new Set(["Perfect Execution", "Patient", "Rule-Based"]);
const NEG_EMOTIONS = new Set(["FOMO", "Revenge Trade", "Overtrading", "Impulsive"]);
const emotionTone = (e) => (POS_EMOTIONS.has(e) ? "positive" : NEG_EMOTIONS.has(e) ? "negative" : "neutral");

const SEG_TONES = {
  neutral: {
    on: "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900",
    off: "border-zinc-300 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-zinc-100",
  },
  positive: {
    on: `border-emerald-500 bg-emerald-500/10 ${TEXT_EMERALD}`,
    off: "border-zinc-300 text-zinc-500 hover:border-emerald-500 hover:text-emerald-600 dark:border-zinc-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400",
  },
  negative: {
    on: `border-rose-500 bg-rose-500/10 ${TEXT_ROSE}`,
    off: "border-zinc-300 text-zinc-500 hover:border-rose-500 hover:text-rose-600 dark:border-zinc-700 dark:hover:border-rose-500 dark:hover:text-rose-400",
  },
};

function SegButton({ active, onClick, children, tone = "neutral" }) {
  const t = SEG_TONES[tone] || SEG_TONES.neutral;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex items-center justify-center gap-1.5 border px-3 py-2 text-sm font-semibold transition",
        active ? t.on : t.off,
      )}
    >
      {children}
    </button>
  );
}

const ICON_IN_INPUT = `pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${TEXT_MUTED}`;

const IconInputWrap = ({ icon, children }) => (
  <div className="relative">
    {cloneElement(icon, { className: ICON_IN_INPUT, strokeWidth: 1.5 })}
    {children}
  </div>
);

function smartDefaults() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const entryTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const exitDate = new Date(now.getTime() + 12 * 60 * 1000);
  const exitTime = `${pad(exitDate.getHours())}:${pad(exitDate.getMinutes())}`;
  return { date, entryTime, exitTime };
}

const VERDICT_ICON = { green: ShieldCheck, yellow: ShieldAlert, red: ShieldX };
const VERDICT_COPY = {
  green: { title: "Green Light", msg: "Você passou pelos 3 filtros antes da entrada." },
  yellow: { title: "Cuidado", msg: "Apenas 2 de 3 filtros — registre e siga atento." },
  red: { title: "Atenção", msg: "Checklist incompleto — reveja na pós-mortem." },
};
const VERDICT_TONE = {
  green: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  yellow: "border-zinc-300 dark:border-zinc-700",
  red: "border-rose-500/40 bg-rose-500/5 text-rose-600 dark:text-rose-400",
};
const CHECKLIST_LABELS = {
  killzone: "Killzone",
  liquidity: "Liquidez HTF",
  stop: "Stop & Risco",
};

const VALID_DIRECTIONS = new Set(["Long", "Short"]);
const VALID_RESULTS = new Set(["Win", "Loss", "BE"]);
const VALID_DXY = new Set(["Bullish", "Bearish", "Neutral"]);
const VALID_SENTIMENT = new Set(["Risk-On", "Risk-Off", "Neutral"]);
const ASSET_SYMBOLS = new Set(ASSETS.map((a) => a.symbol));
const KILLZONE_IDS = new Set(KILLZONES.map((k) => k.id));
const SETUP_SET = new Set(SETUPS);
const DOL_SET = new Set(DOL_TARGETS);

const arrOr = (v, fallback) => (Array.isArray(v) ? v : fallback);
const numOr = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const oneOf = (set, v, fallback) => (v && set.has(v) ? v : fallback);

export default function NewTradeForm({
  initialTrade,
  pendingChecklist,
  todaysPsychologyHint,
  onCancel,
  onSave,
  onDelete,
}) {
  const [defaults] = useState(smartDefaults);
  const seed = initialTrade ?? {};
  const seedPsych = seed.psychologyData ?? {};

  const [direction, setDirection] = useState(oneOf(VALID_DIRECTIONS, seed.direction, "Long"));
  const [result, setResult] = useState(oneOf(VALID_RESULTS, seed.result, "Win"));
  const [killzone, setKillzone] = useState(oneOf(KILLZONE_IDS, seed.killzone, "ny-am"));
  const [setup, setSetup] = useState(oneOf(SETUP_SET, seed.setup, SETUPS[0]));
  const [asset, setAsset] = useState(oneOf(ASSET_SYMBOLS, seed.asset, "NQ"));
  const [risk, setRisk] = useState(numOr(seed.risk, 250));
  const [rrPlanned, setRrPlanned] = useState(numOr(seed.rrPlanned, 3.0));
  const [rrRealized, setRrRealized] = useState(numOr(seed.rrRealized, 2.8));
  const [confluences, setConfluences] = useState(arrOr(seed.confluences, []));
  const [emotions, setEmotions] = useState(
    arrOr(seedPsych.emotions, arrOr(seed.emotions, [])),
  );
  const [macro, setMacro] = useState(arrOr(seed.macroEvents, []));
  const [dxy, setDxy] = useState(oneOf(VALID_DXY, seed.dxyBias, "Neutral"));
  const [sentiment, setSentiment] = useState(oneOf(VALID_SENTIMENT, seed.sentiment, "Risk-On"));
  const [dol, setDol] = useState(oneOf(DOL_SET, seed.dol, DOL_TARGETS[0]));
  const [story, setStory] = useState(typeof seed.story === "string" ? seed.story : "");
  const [htf, setHtf] = useState(typeof seed.htf === "string" ? seed.htf : "");
  const [mistake, setMistake] = useState(seed.mistake ?? null);
  const [date, setDate] = useState(seed.date ?? defaults.date);
  const [entryTime, setEntryTime] = useState(seed.entryTime ?? defaults.entryTime);
  const [exitTime, setExitTime] = useState(seed.exitTime ?? defaults.exitTime);
  const [expanded, setExpanded] = useState(false);

  const [mindset, setMindset] = useState(typeof seedPsych.mindset === "string" ? seedPsych.mindset : "");
  const [mood, setMood] = useState(typeof seedPsych.mood === "string" ? seedPsych.mood : "");
  const [psychOpen, setPsychOpen] = useState(
    Boolean(pendingChecklist || todaysPsychologyHint || seed.psychologyData),
  );
  const [hintImported, setHintImported] = useState(false);

  const [screenshots, setScreenshots] = useState(() => {
    // Load existing screenshots from the trade being edited
    const saved = seed.screenshots ?? {};
    return saved;
  });
  const [pasteFlash, setPasteFlash] = useState(false);

  const importBias = () => {
    if (!todaysPsychologyHint) return;
    if (todaysPsychologyHint.mindset) setMindset(todaysPsychologyHint.mindset);
    if (todaysPsychologyHint.mood) setMood(todaysPsychologyHint.mood);
    if (todaysPsychologyHint.emotions?.length) setEmotions(todaysPsychologyHint.emotions);
    setHintImported(true);
    setPsychOpen(true);
  };

  useEffect(() => {
    if (result !== "Loss") setMistake(null);
  }, [result]);

  // Read image from clipboard and convert to base64
  const readImageFromClipboard = (clipboardData) => {
    if (!clipboardData?.items) return null;
    for (const item of clipboardData.items) {
      if (item.type.startsWith("image/")) {
        return item.getAsFile();
      }
    }
    return null;
  };

  const addScreenshotFromFile = (file, targetKey) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setScreenshots((s) => ({
        ...s,
        [targetKey]: {
          dataUrl,
          stamp: new Date().toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          }),
          label: SCREENSHOT_SLOTS.find((x) => x.key === targetKey)?.label ?? targetKey,
        },
      }));
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 700);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const onPaste = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input") return;

      const imageFile = readImageFromClipboard(e.clipboardData);
      if (!imageFile) return;

      e.preventDefault();
      const target = SCREENSHOT_SLOTS.find((s) => !screenshots[s.key])?.key || null;
      if (!target) return;
      addScreenshotFromFile(imageFile, target);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenshots]);

  const addScreenshotToNextSlot = (forcedKey = null) => {
    // When clicking a slot manually, open a file picker
    const target = forcedKey || SCREENSHOT_SLOTS.find((s) => !screenshots[s.key])?.key || null;
    if (!target) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) addScreenshotFromFile(file, target);
    };
    input.click();
  };

  const removeScreenshot = (key) =>
    setScreenshots((s) => {
      const n = { ...s };
      delete n[key];
      return n;
    });

  const toggleList = (list, setter) => (item) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const estPnl = result === "Loss" ? -risk : result === "BE" ? 0 : rrRealized * risk;
  const filledSlots = Object.keys(screenshots).length;
  const dirTone = toneOf("direction", direction);
  const resTone = toneOf("result", result);

  const rrFields = [
    { label: "Risco ($)", value: risk, setter: setRisk, step: undefined },
    { label: "RR Planejado", value: rrPlanned, setter: setRrPlanned, step: "0.1" },
    { label: "RR Real", value: rrRealized, setter: setRrRealized, step: "0.1" },
  ];

  const buildPayload = () => {
    const psychologyData =
      mindset.trim() || mood || emotions.length
        ? { mindset: mindset.trim(), mood, emotions }
        : null;
    const checklistData =
      seed.checklistData ?? pendingChecklist ?? null;
    return {
      ...(seed.id ? { id: seed.id } : {}),
      date,
      entryTime,
      exitTime,
      asset,
      assetClass: ASSETS.find((a) => a.symbol === asset)?.class || seed.assetClass,
      direction,
      killzone,
      setup,
      dol,
      confluences,
      macroEvents: macro,
      dxyBias: dxy,
      sentiment,
      rrPlanned,
      rrRealized,
      risk,
      result,
      pnl: estPnl,
      mistake,
      emotions,
      htf,
      story,
      checklistData,
      psychologyData,
      screenshots,
    };
  };

  const checklistView = pendingChecklist || seed.checklistData || null;

  return (
    <div className="space-y-6">
      <Card padding="p-0">
        <div className={`border-b ${BORDER} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center border border-zinc-900 ${TEXT_BODY} dark:border-zinc-100`}>
                <NotebookPen className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <h2 className={`text-lg font-bold tracking-tight ${TEXT_TITLE}`}>Registro Rápido</h2>
                <p className={`text-xs ${TEXT_MUTED}`}>
                  {expanded
                    ? "Deep journaling — capture Macro, ICT e psicologia."
                    : "Só o essencial. Expanda para adicionar contexto."}
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Tag tone={dirTone} icon={direction === "Long" ? <ArrowUp /> : <ArrowDown />}>
                {direction} {asset}
              </Tag>
              <Tag tone={resTone} icon={<Target />}>{result}</Tag>
            </div>
          </div>
        </div>

        {checklistView && (() => {
          const VIcon = VERDICT_ICON[checklistView.verdict] || ShieldAlert;
          const copy = VERDICT_COPY[checklistView.verdict] || VERDICT_COPY.yellow;
          return (
            <div className={cx("border-b px-6 py-3", BORDER)}>
              <div className={cx("flex flex-wrap items-center gap-3 border px-4 py-2.5", VERDICT_TONE[checklistView.verdict] || VERDICT_TONE.yellow)}>
                <VIcon className="h-4 w-4" strokeWidth={1.5} />
                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                  <p className="text-xs font-bold uppercase tracking-[0.15em]">
                    Pre-Trade Checklist · {copy.title}
                  </p>
                  <p className={cx("text-[11px]", TEXT_MUTED)}>{copy.msg}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {Object.entries(checklistView.items || {}).map(([k, v]) => (
                    <span
                      key={k}
                      className={cx(
                        "border px-1.5 py-0.5 text-[10px] font-medium",
                        v
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-zinc-300 text-zinc-500 dark:border-zinc-700",
                      )}
                    >
                      {v ? "✓" : "·"} {CHECKLIST_LABELS[k] || k}
                    </span>
                  ))}
                  <span className={cx("ml-1 font-mono text-xs font-bold", TEXT_BODY)}>
                    {checklistView.count}/3
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="p-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6 md:col-span-3">
              <Field label="Data" hint="auto">
                <IconInputWrap icon={<CalendarDays />}>
                  <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-8" />
                </IconInputWrap>
              </Field>
            </div>
            <div className="col-span-6 md:col-span-2">
              <Field label="Ativo">
                <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
                  {ASSETS.map((a) => <option key={a.symbol}>{a.symbol}</option>)}
                </Select>
              </Field>
            </div>
            <div className="col-span-12 md:col-span-3">
              <Field label="Direção">
                <div className="grid grid-cols-2 gap-2">
                  {["Long", "Short"].map((d) => {
                    const Icon = DIR_ICON[d];
                    return (
                      <SegButton
                        key={d}
                        active={direction === d}
                        onClick={() => setDirection(d)}
                        tone={toneOf("direction", d)}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                        {d}
                      </SegButton>
                    );
                  })}
                </div>
              </Field>
            </div>
            <div className="col-span-12 md:col-span-4">
              <Field label="Setup">
                <Select value={setup} onChange={(e) => setSetup(e.target.value)}>
                  {SETUPS.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>

            {rrFields.map((f) => (
              <div key={f.label} className="col-span-4 md:col-span-2">
                <Field label={f.label}>
                  <TextInput
                    type="number"
                    step={f.step}
                    value={f.value}
                    onChange={(e) => f.setter(Number(e.target.value))}
                  />
                </Field>
              </div>
            ))}

            <div className="col-span-12 md:col-span-4">
              <Field label="Resultado">
                <div className="grid grid-cols-3 gap-2">
                  {["Win", "Loss", "BE"].map((r) => (
                    <SegButton
                      key={r}
                      active={result === r}
                      onClick={() => setResult(r)}
                      tone={toneOf("result", r)}
                    >
                      <span className="font-mono">{RESULT_SYM[r]}</span>
                      {r}
                    </SegButton>
                  ))}
                </div>
              </Field>
            </div>
            <div className="col-span-12 md:col-span-2">
              <Field label="PnL Estimado">
                <div className={cx(
                  `flex h-[38px] items-center justify-end border ${BORDER_INPUT} ${SURFACE} px-3 font-mono text-sm font-bold tabular-nums`,
                  pnlClass(estPnl),
                )}>
                  {signedUsd(estPnl)}
                </div>
              </Field>
            </div>
          </div>

          {result === "Loss" && (
            <div className="mt-5 border border-rose-500/30 bg-rose-500/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center border border-rose-500/40 ${TEXT_ROSE}`}>
                  <Skull className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div>
                  <p className={`text-xs font-bold ${TEXT_ROSE}`}>Qual foi o erro?</p>
                  <p className={`text-[11px] ${TEXT_MUTED}`}>
                    Registrar o erro é o que transforma o loss em lição.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MISTAKES.map((m) => (
                  <ToggleChip
                    key={m}
                    tone="negative"
                    active={mistake === m}
                    onClick={() => setMistake(mistake === m ? null : m)}
                  >
                    {m}
                  </ToggleChip>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`border-t ${BORDER} px-6`}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between py-3 text-left transition hover:opacity-80"
          >
            <div className="flex items-center gap-2.5">
              <span className={cx(
                "flex h-7 w-7 items-center justify-center border transition",
                expanded
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
              )}>
                {expanded
                  ? <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                  : <ChevronDown className="h-4 w-4" strokeWidth={1.5} />}
              </span>
              <div>
                <p className={`text-sm font-semibold ${TEXT_BODY}`}>
                  {expanded ? "Recolher detalhes" : "Expandir Detalhes (Opcional)"}
                </p>
                <p className={`text-[11px] ${TEXT_MUTED}`}>
                  {expanded
                    ? "Horário, Killzone, Macro, DOL, Confluências, Psicologia, Mídia e Narrativa."
                    : "Adicione contexto ICT + Macro, psicologia e screenshots."}
                </p>
              </div>
            </div>
            {!expanded && (
              <span className={`hidden sm:inline-flex items-center gap-2 border ${BORDER} px-3 py-1 text-[10px] font-medium ${TEXT_MUTED}`}>
                opcional · recomendado p/ revisão semanal
              </span>
            )}
          </button>
        </div>

        {expanded && (
          <div className={`grid grid-cols-1 xl:grid-cols-3 gap-0 border-t ${BORDER} divide-zinc-200 xl:divide-x dark:divide-zinc-800`}>
            <div className="space-y-5 p-6">
              <SectionHeader icon={<Clock className="h-4 w-4" />} title="Timing" subtitle="Horário + sessão (auto)" />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Entrada", value: entryTime, setter: setEntryTime },
                  { label: "Saída", value: exitTime, setter: setExitTime },
                ].map((f) => (
                  <Field key={f.label} label={f.label}>
                    <IconInputWrap icon={<Clock />}>
                      <TextInput type="time" value={f.value} onChange={(e) => f.setter(e.target.value)} className="pl-8" />
                    </IconInputWrap>
                  </Field>
                ))}
              </div>

              <Field label="Killzone">
                <div className="grid grid-cols-5 gap-1.5">
                  {KILLZONES.map((kz) => (
                    <ToggleChip key={kz.id} active={killzone === kz.id} onClick={() => setKillzone(kz.id)}>
                      {kz.label}
                    </ToggleChip>
                  ))}
                </div>
                <p className={`mt-1.5 text-[10px] ${TEXT_MUTED}`}>
                  {KILLZONES.find((k) => k.id === killzone)?.tz}
                </p>
              </Field>

              <Divider label="Macro Context" />

              <Field label="Eventos Econômicos">
                <div className="flex flex-wrap gap-1.5">
                  {MACRO_EVENTS.map((e) => (
                    <ToggleChip
                      key={e}
                      active={macro.includes(e)}
                      onClick={() => toggleList(macro, setMacro)(e)}
                    >
                      {e}
                    </ToggleChip>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Viés DXY", value: dxy, setter: setDxy, opts: ["Bullish", "Bearish", "Neutral"] },
                  { label: "Sentimento", value: sentiment, setter: setSentiment, opts: ["Risk-On", "Risk-Off", "Neutral"] },
                ].map((f) => (
                  <Field key={f.label} label={f.label}>
                    <Select value={f.value} onChange={(e) => f.setter(e.target.value)}>
                      {f.opts.map((x) => <option key={x}>{x}</option>)}
                    </Select>
                  </Field>
                ))}
              </div>
            </div>

            <div className="space-y-5 p-6">
              <SectionHeader icon={<Zap className="h-4 w-4" />} title="ICT Framework" subtitle="DOL + confluências" />

              <Field label="Draw on Liquidity (DOL)" hint="Directional target">
                <Select value={dol} onChange={(e) => setDol(e.target.value)}>
                  {DOL_TARGETS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>

              <Field label="Confluences">
                <div className="flex flex-wrap gap-1.5">
                  {CONFLUENCES.map((c) => (
                    <ToggleChip
                      key={c}
                      active={confluences.includes(c)}
                      onClick={() => toggleList(confluences, setConfluences)(c)}
                    >
                      {c}
                    </ToggleChip>
                  ))}
                </div>
              </Field>
            </div>

            <div className="space-y-5 p-6">
              <SectionHeader icon={<Brain className="h-4 w-4" />} title="Narrativa & Mídia" subtitle="HTF / Story / Ctrl+V screenshots" />

              <Field label="Viés HTF / Narrativa">
                <TextArea
                  rows={2}
                  value={htf}
                  onChange={(e) => setHtf(e.target.value)}
                  placeholder="Ex.: Weekly bullish into external range liquidity, daily seeking BSL at PDH…"
                />
              </Field>

              <Field label="História do Trade">
                <TextArea
                  rows={4}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Descreva: sweep → MSS → entrada em FVG dentro do OB → target em PDL…"
                />
              </Field>

              <Divider label="Screenshots · Ctrl+V p/ colar" />

              <div className={cx(
                "border border-dashed p-3 transition",
                pasteFlash ? "border-emerald-500" : BORDER_INPUT,
              )}>
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px]">
                  <div className={`flex items-center gap-2 ${TEXT_MUTED}`}>
                    <Clipboard className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {filledSlots === 0
                      ? "Tire o print e pressione Ctrl+V em qualquer lugar."
                      : `${filledSlots}/${SCREENSHOT_SLOTS.length} capturas anexadas`}
                  </div>
                  {filledSlots > 0 && (
                    <button
                      type="button"
                      onClick={() => setScreenshots({})}
                      className={`flex items-center gap-1 text-[10px] ${TEXT_MUTED} hover:text-rose-500`}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} /> limpar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {SCREENSHOT_SLOTS.map((slot) => {
                    const shot = screenshots[slot.key];
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => shot ? removeScreenshot(slot.key) : addScreenshotToNextSlot(slot.key)}
                        className={cx(
                          "group relative flex aspect-[4/3] flex-col items-center justify-center gap-1 border transition",
                          shot
                            ? "border-emerald-500 bg-emerald-500/5"
                            : "border-dashed border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100",
                        )}
                      >
                        {shot ? (
                          <>
                            {shot.dataUrl && (
                              <img
                                src={shot.dataUrl}
                                alt={slot.label}
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/20" />
                            <div className={`absolute left-1.5 top-1.5 z-10 flex items-center gap-1 border border-emerald-500/50 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold ${TEXT_EMERALD} backdrop-blur-sm`}>
                              <ImageIcon className="h-3 w-3" strokeWidth={1.5} /> {slot.label}
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex items-center justify-between">
                              <span className={`border ${BORDER} ${SURFACE} px-1 font-mono text-[9px] text-zinc-600 dark:text-zinc-400 backdrop-blur-sm`}>
                                {shot.stamp}
                              </span>
                              <span className="border border-rose-500/40 bg-rose-500/10 p-1 text-rose-500 opacity-0 transition group-hover:opacity-100">
                                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <ImagePlus
                              className={`h-5 w-5 ${TEXT_MUTED} group-hover:text-zinc-900 dark:group-hover:text-zinc-100`}
                              strokeWidth={1.5}
                            />
                            <span className={`text-[11px] font-semibold ${TEXT_SOFT}`}>{slot.label}</span>
                            <span className={`text-[9px] ${TEXT_MUTED}`}>{slot.sub}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`border-t ${BORDER} px-6`}>
          <button
            type="button"
            onClick={() => setPsychOpen((v) => !v)}
            className="flex w-full items-center justify-between py-3 text-left transition hover:opacity-80"
          >
            <div className="flex items-center gap-2.5">
              <span className={cx(
                "flex h-7 w-7 items-center justify-center border transition",
                psychOpen
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
              )}>
                {psychOpen
                  ? <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                  : <ChevronDown className="h-4 w-4" strokeWidth={1.5} />}
              </span>
              <div>
                <p className={`text-sm font-semibold ${TEXT_BODY}`}>
                  Psicologia do Trade {psychOpen ? "" : "(opcional)"}
                </p>
                <p className={`text-[11px] ${TEXT_MUTED}`}>
                  {psychOpen
                    ? "Mindset, humor e emoções específicos desta operação."
                    : todaysPsychologyHint
                      ? "Há um viés salvo para hoje — clique para importar."
                      : "Adicione contexto emocional para revisar depois."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {todaysPsychologyHint && !psychOpen && (
                <span className={`hidden sm:inline-flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold ${TEXT_EMERALD}`}>
                  <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                  Viés disponível
                </span>
              )}
              {(mood || mindset || emotions.length > 0) && !psychOpen && (
                <span className={`hidden sm:inline-flex items-center gap-2 border ${BORDER} px-3 py-1 text-[10px] font-medium ${TEXT_MUTED}`}>
                  preenchido
                </span>
              )}
            </div>
          </button>
        </div>

        {psychOpen && (
          <div className={`border-t ${BORDER} p-6`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={cx(
                  "flex h-8 w-8 items-center justify-center border",
                  BORDER, TEXT_SOFT,
                )}>
                  <Brain className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className={`text-sm font-semibold tracking-tight ${TEXT_TITLE}`}>
                    Psicologia desta Operação
                  </h3>
                  <p className={`text-xs ${TEXT_MUTED}`}>
                    Registro próprio do trade — separado do diário diário.
                  </p>
                </div>
              </div>
              {todaysPsychologyHint && (
                <button
                  type="button"
                  onClick={importBias}
                  disabled={hintImported}
                  className={cx(
                    "inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition",
                    hintImported
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {hintImported
                    ? "Viés importado"
                    : todaysPsychologyHint.source === "journal"
                      ? "Importar Viés do Diário"
                      : "Importar Viés de Hoje"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Field label="Mindset Pré-Entrada" hint="O que está passando na sua cabeça agora?">
                <TextArea
                  rows={4}
                  value={mindset}
                  onChange={(e) => setMindset(e.target.value)}
                  placeholder="Ex.: Calmo, com plano definido. Apenas A+ setup — passo se não vier."
                />
              </Field>

              <div className="space-y-5">
                <Field label="Humor Predominante" hint="Selecione um único estado">
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((m) => (
                      <ToggleChip
                        key={m.key}
                        tone={m.tone}
                        active={mood === m.key}
                        onClick={() => setMood(mood === m.key ? "" : m.key)}
                      >
                        {m.key}
                      </ToggleChip>
                    ))}
                  </div>
                </Field>

                <Field label="Estado Emocional" hint="Tags ICT — multi-select">
                  <div className="flex flex-wrap gap-1.5">
                    {EMOTIONS.map((e) => (
                      <ToggleChip
                        key={e}
                        tone={emotionTone(e)}
                        active={emotions.includes(e)}
                        onClick={() => toggleList(emotions, setEmotions)(e)}
                      >
                        {e}
                      </ToggleChip>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </div>
        )}

        <div className={`flex items-center justify-between gap-3 border-t ${BORDER} px-6 py-4`}>
          <div className={`flex items-center gap-2 text-xs ${TEXT_MUTED}`}>
            <span className="font-mono text-emerald-500">→</span>
            <span>
              {expanded
                ? "Pro-tip: registre até os trades BE — consistência bate intensidade."
                : "Quick Log em <10s. Expanda depois p/ post-mortem."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
                Excluir
              </Button>
            )}
            <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={onCancel}>Cancelar</Button>
            <Button
              variant="success"
              icon={<Save className="h-4 w-4" />}
              onClick={() => onSave?.(buildPayload())}
            >
              Salvar Trade
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Prévia do Resumo"
          subtitle="Snapshot do que você está prestes a salvar"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={dirTone} icon={direction === "Long" ? <ArrowUp /> : <ArrowDown />}>
            {direction} {asset}
          </Tag>
          <Tag>{setup}</Tag>
          <Tag tone={resTone} icon={<Target />}>
            {result} · {(Number(rrRealized) || 0).toFixed(1)}R · {signedUsd(estPnl)}
          </Tag>
          {mistake && (
            <Tag tone="negative" size="xs" icon={<Skull />}>{mistake}</Tag>
          )}
          {expanded && (
            <>
              <Tag>{KILLZONES.find((k) => k.id === killzone)?.label || "—"}</Tag>
              <Tag>DOL: {(dol || "").split(" (")[0] || "—"}</Tag>
              <Tag tone={toneOf("dxy", dxy)}>DXY {dxy}</Tag>
              <Tag tone={toneOf("sentiment", sentiment)}>{sentiment}</Tag>
              {macro.map((m) => <Tag key={m} size="xs" icon={<Newspaper />}>{m}</Tag>)}
              {confluences.map((c) => <Tag key={c} size="xs" icon={<Layers />}>{c}</Tag>)}
              {filledSlots > 0 && (
                <Tag tone="positive" size="xs" icon={<ImageIcon />}>
                  {filledSlots} screenshot{filledSlots > 1 ? "s" : ""}
                </Tag>
              )}
            </>
          )}
          {mood && (
            <Tag
              tone={MOODS.find((m) => m.key === mood)?.tone || "neutral"}
              size="xs"
              icon={<Brain />}
            >
              {mood}
            </Tag>
          )}
          {emotions.map((e) => (
            <Tag key={e} tone={emotionTone(e)} size="xs" icon={<Brain />}>{e}</Tag>
          ))}
          {checklistView && (
            <Tag
              tone={checklistView.verdict === "green" ? "positive" : checklistView.verdict === "red" ? "negative" : "neutral"}
              size="xs"
              icon={<CheckCircle2 />}
            >
              Checklist {checklistView.count}/3
            </Tag>
          )}
        </div>
      </Card>
    </div>
  );
}
