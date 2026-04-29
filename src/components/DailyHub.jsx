import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Moon, HeartPulse, Brain, Crosshair, Activity, Sparkles, Compass,
  ShieldCheck, ShieldAlert, ShieldX, Award, Check,
  BookOpen, Dumbbell, Coffee, Flame, Target, TrendingUp,
  ChevronRight, Sun, Zap,
} from "lucide-react";
import { Card, SectionHeader, signedUsd, pnlClass } from "./ui";
import {
  cx, BORDER, BORDER_INPUT, SURFACE, SURFACE_MUTED,
  TEXT_TITLE, TEXT_BODY, TEXT_SOFT, TEXT_MUTED, TEXT_EMERALD, TEXT_ROSE,
  LABEL_XS, LABEL_WIDE,
} from "./constants";

// ── Assessment questions (same as PreTradeChecklist) ─────────────
const ASSESSMENTS = [
  { id: "sleep",      label: "Como você dormiu?",                          sub: "1 = péssimo · 10 = restaurado",     icon: Moon },
  { id: "emotional",  label: "Estado emocional",                           sub: "1 = instável · 10 = sereno",        icon: HeartPulse },
  { id: "focus",      label: "Nível de foco",                              sub: "1 = disperso · 10 = afiado",        icon: Brain },
  { id: "confidence", label: "Confiança / Clareza",                        sub: "1 = inseguro · 10 = convicção",     icon: Crosshair },
  { id: "impact",     label: "Impacto emocional externo",                  sub: "1 = muito impactado · 10 = nenhum", icon: Activity },
  { id: "body",       label: "Corpo confortável / descansado",             sub: "1 = exausto · 10 = pleno",          icon: Sparkles },
  { id: "clarity",    label: "Clareza sobre objetivos do dia",             sub: "1 = perdido · 10 = roteiro pronto", icon: Compass },
];

// ── Habit items ──────────────────────────────────────────────────
const HABITS = [
  { id: "study_macro",  label: "Estudou panorama macro",      icon: BookOpen },
  { id: "exercise",     label: "Atividade física",            icon: Dumbbell },
  { id: "routine",      label: "Rotina matinal cumprida",     icon: Coffee },
  { id: "review",       label: "Revisão / Backtest do dia",   icon: Target },
];

// ── Belt system (same as PreTradeChecklist) ──────────────────────
const BELTS = [
  { name: "Branca", grade: 0, min: 0,   color: "zinc" },
  { name: "Branca", grade: 1, min: 10,  color: "zinc" },
  { name: "Branca", grade: 2, min: 25,  color: "zinc" },
  { name: "Azul",   grade: 0, min: 45,  color: "sky" },
  { name: "Azul",   grade: 1, min: 70,  color: "sky" },
  { name: "Roxa",   grade: 0, min: 100, color: "violet" },
  { name: "Marrom", grade: 0, min: 150, color: "amber" },
  { name: "Preta",  grade: 0, min: 220, color: "zinc" },
];
const BELT_COLOR = {
  zinc:   { fill: "bg-zinc-900 dark:bg-zinc-100", text: "text-zinc-900 dark:text-zinc-100", border: "border-zinc-900 dark:border-zinc-100", ring: "bg-zinc-200 dark:bg-zinc-800" },
  sky:    { fill: "bg-sky-500",    text: "text-sky-600 dark:text-sky-400",    border: "border-sky-500",    ring: "bg-sky-500/20" },
  violet: { fill: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500", ring: "bg-violet-500/20" },
  amber:  { fill: "bg-amber-500",  text: "text-amber-600 dark:text-amber-400",  border: "border-amber-500",  ring: "bg-amber-500/20" },
};
function getBeltProgress(days) {
  let current = BELTS[0], next = BELTS[1];
  for (let i = 0; i < BELTS.length; i++) {
    if (days >= BELTS[i].min) { current = BELTS[i]; next = BELTS[i + 1] || null; }
  }
  const span = next ? next.min - current.min : 1;
  const pct = next ? Math.min(100, Math.round(((days - current.min) / span) * 100)) : 100;
  return { current, next, pct };
}

// ── DotScale (1-10) ──────────────────────────────────────────────
function DotScale({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Escala 1 a 10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value >= n;
        const tone =
          value === 0 ? "border-zinc-300 dark:border-zinc-700"
          : value <= 3 ? (active ? "border-rose-500 bg-rose-500" : "border-zinc-300 dark:border-zinc-700")
          : value <= 6 ? (active ? "border-amber-500 bg-amber-500" : "border-zinc-300 dark:border-zinc-700")
          : (active ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 dark:border-zinc-700");
        return (
          <button
            key={n} type="button" role="radio" aria-checked={value === n}
            onClick={() => onChange(value === n ? 0 : n)}
            className={`group relative h-5 w-5 rounded-full border transition hover:scale-110 ${tone}`}
            title={`${n}`}
          >
            <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition">
              {n}
            </span>
          </button>
        );
      })}
      <span className="ml-2 w-6 text-right font-mono text-[11px] font-semibold text-zinc-500 tabular-nums">
        {value || "–"}
      </span>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function dayOfWeek() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

const DAILY_KEY = "delta-daily-hub";

function loadToday() {
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.date !== todayKey()) return null; // stale
    return data;
  } catch { return null; }
}

function saveToday(data) {
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify({ ...data, date: todayKey() }));
  } catch {}
}

// ── ScoreRing (SVG animated) ─────────────────────────────────────
function ScoreRing({ score, max = 100, size = 80, colorClass }) {
  const [animated, setAnimated] = useState(false);
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / max, 1);
  const offset = circ * (1 - (animated ? pct : 0));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, [score]);

  const strokeColor =
    colorClass === "positive" ? "#10b981"
    : colorClass === "neutral" ? "#f59e0b"
    : "#f43f5e";

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={5}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth={5}
        strokeLinecap="square"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text
        x={size / 2} y={size / 2 - 3}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.24} fontWeight={700}
        fill="currentColor"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {Math.round(score)}
      </text>
      <text
        x={size / 2} y={size / 2 + size * 0.2}
        textAnchor="middle"
        fontSize={size * 0.11} fill="currentColor" opacity={0.4}
        fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.08em"
      >
        /100
      </text>
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function DailyHub({ trades = [], onNavigate }) {
  const consecutiveDays = 8; // mock
  const belt = useMemo(() => getBeltProgress(consecutiveDays), [consecutiveDays]);
  const beltColor = BELT_COLOR[belt.current.color] || BELT_COLOR.zinc;

  const [scores, setScores] = useState(() => {
    const saved = loadToday();
    return saved?.scores || ASSESSMENTS.reduce((acc, a) => ({ ...acc, [a.id]: 0 }), {});
  });

  const [habits, setHabits] = useState(() => {
    const saved = loadToday();
    return saved?.habits || HABITS.reduce((acc, h) => ({ ...acc, [h.id]: false }), {});
  });

  // Persist on change
  useEffect(() => {
    saveToday({ scores, habits });
  }, [scores, habits]);

  // Compute readiness
  const assessmentScore = Object.values(scores).reduce((s, v) => s + v, 0); // 0-70
  const habitScore = Object.values(habits).filter(Boolean).length * 7.5; // 0-30
  const totalScore = Math.round(assessmentScore + habitScore);
  const filled = Object.values(scores).some((v) => v > 0);

  const tone = totalScore >= 80 ? "positive" : totalScore >= 60 ? "neutral" : "negative";

  const verdictMap = {
    positive: { icon: ShieldCheck, title: "Dia Verde.", message: "Estado mental e hábitos alinhados. Você está pronto." },
    neutral:  { icon: ShieldAlert, title: "Dia Amarelo.", message: "Há sinais mistos. Reduza a carga e priorize o essencial." },
    negative: { icon: ShieldX,     title: "Dia Vermelho.", message: "Condições desfavoráveis. Proteja-se, não force." },
  };
  const verdict = verdictMap[tone];
  const VIcon = verdict.icon;

  const toneClasses = {
    positive: { container: "border-emerald-500/40 bg-emerald-500/5", icon: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400", title: "text-emerald-600 dark:text-emerald-400", score: "text-emerald-600 dark:text-emerald-400" },
    neutral:  { container: "border-amber-500/40 bg-amber-500/5",     icon: "border-amber-500/40 text-amber-600 dark:text-amber-400",     title: "text-amber-600 dark:text-amber-400",     score: "text-amber-600 dark:text-amber-400" },
    negative: { container: "border-rose-500/50 bg-rose-500/10",      icon: "border-rose-500/50 text-rose-600 dark:text-rose-400",       title: "text-rose-600 dark:text-rose-400",       score: "text-rose-600 dark:text-rose-400" },
  };
  const vc = toneClasses[tone];

  // Today's trading performance
  const today = todayKey();
  const todayTrades = trades.filter((t) => t.date === today);
  const todayPnl = todayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const todayWins = todayTrades.filter((t) => t.result === "Win").length;
  const todayLosses = todayTrades.filter((t) => t.result === "Loss").length;

  // Weekly
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekKey = weekStart.toISOString().slice(0, 10);
  const weekTrades = trades.filter((t) => t.date >= weekKey);
  const weekPnl = weekTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);

  const habitsDone = Object.values(habits).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ───── Page header ───── */}
      <div className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <p className={LABEL_XS}>{dayOfWeek()}</p>
          <h1 className={cx("mt-1 text-2xl font-bold tracking-tight", TEXT_TITLE)}>
            {greeting()}, Joel.
          </h1>
          <p className={cx("mt-1 text-sm", TEXT_MUTED)}>
            Como está o seu dia? Avalie-se antes de tomar qualquer decisão.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Belt badge */}
          <div className="flex items-center gap-2.5">
            <span className={cx("flex h-10 w-10 items-center justify-center border", beltColor.border)}>
              <Award className={cx("h-5 w-5", beltColor.text)} strokeWidth={1.5} />
            </span>
            <div className="text-right">
              <p className={cx("text-sm font-bold uppercase tracking-tight", beltColor.text)}>
                {belt.current.name} {belt.current.grade}º
              </p>
              <p className={cx("text-[10px]", TEXT_MUTED)}>
                {consecutiveDays} dias · {belt.pct}% próxima
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Verdict card ───── */}
      {filled && (
        <div className={cx("border p-4", vc.container)}>
          <div className="flex items-center gap-4">
            <ScoreRing score={totalScore} colorClass={tone} size={80} />
            <div className="flex-1 min-w-0">
              <p className={cx("text-sm font-bold uppercase tracking-wide", vc.title)}>{verdict.title}</p>
              <p className={cx("mt-1 text-xs", TEXT_MUTED)}>{verdict.message}</p>
              <div className="mt-3 h-[2px] w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full transition-all duration-1000 ease-out ${tone === "positive" ? "bg-emerald-500" : tone === "neutral" ? "bg-amber-500" : "bg-rose-500"}`}
                  style={{ width: `${totalScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ───── Left: Self-assessment ───── */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="p-5">
            <SectionHeader
              icon={<Brain className="h-4 w-4" />}
              title="Estado Diário"
              subtitle="Honestidade radical · reseta a cada novo dia"
              right={
                <span className={cx("font-mono text-sm font-bold tabular-nums", TEXT_BODY)}>
                  {assessmentScore}<span className={TEXT_MUTED}>/70</span>
                </span>
              }
            />
            <div className="divide-y divide-zinc-100 border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
              {ASSESSMENTS.map((q) => {
                const Icon = q.icon;
                const v = scores[q.id];
                return (
                  <div key={q.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center border transition",
                        v === 0 ? "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
                        : v <= 3 ? "border-rose-500/40 text-rose-500"
                        : v <= 6 ? "border-amber-500/40 text-amber-500"
                        : "border-emerald-500/40 text-emerald-500"
                      )}>
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0">
                        <p className={cx("text-[13px] font-medium leading-tight", TEXT_BODY)}>{q.label}</p>
                        <p className={cx("text-[10px]", TEXT_MUTED)}>{q.sub}</p>
                      </div>
                    </div>
                    <div className="pl-11 sm:pl-0">
                      <DotScale value={v} onChange={(n) => setScores((s) => ({ ...s, [q.id]: n }))} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ───── Habits checklist ───── */}
          <Card padding="p-5">
            <SectionHeader
              icon={<Flame className="h-4 w-4" />}
              title="Hábitos do Dia"
              subtitle="Disciplina gera consistência"
              right={
                <span className={cx("font-mono text-sm font-bold tabular-nums", TEXT_BODY)}>
                  {habitsDone}<span className={TEXT_MUTED}>/{HABITS.length}</span>
                </span>
              }
            />
            <div className="space-y-2">
              {HABITS.map((h) => {
                const Icon = h.icon;
                const done = habits[h.id];
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHabits((s) => ({ ...s, [h.id]: !s[h.id] }))}
                    className={cx(
                      "flex w-full items-center gap-3 border px-4 py-3 text-left transition",
                      done
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
                    )}
                  >
                    <span className={cx(
                      "flex h-9 w-9 shrink-0 items-center justify-center border transition",
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
                    )}>
                      {done
                        ? <Check className="h-4 w-4" strokeWidth={2.5} />
                        : <Icon className="h-4 w-4" strokeWidth={1.5} />}
                    </span>
                    <p className={cx(
                      "text-sm",
                      done ? "font-bold text-emerald-600 dark:text-emerald-400" : "font-medium text-zinc-700 dark:text-zinc-300"
                    )}>
                      {h.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ───── Right sidebar: Quick stats ───── */}
        <div className="space-y-6">
          {/* Today */}
          <Card padding="p-5">
            <SectionHeader
              icon={<Sun className="h-4 w-4" />}
              title="Hoje"
              subtitle={today}
            />
            <div className="space-y-4">
              <div className={cx("border p-4", BORDER)}>
                <p className={LABEL_WIDE}>PnL do Dia</p>
                <p className={cx("mt-1 font-mono text-3xl font-bold tabular-nums", pnlClass(todayPnl))}>
                  {signedUsd(todayPnl)}
                </p>
                <p className={cx("mt-1 text-[11px]", TEXT_MUTED)}>
                  {todayTrades.length} trades · {todayWins}W / {todayLosses}L
                </p>
              </div>
              <div className={cx("border p-4", BORDER)}>
                <p className={LABEL_WIDE}>PnL da Semana</p>
                <p className={cx("mt-1 font-mono text-2xl font-bold tabular-nums", pnlClass(weekPnl))}>
                  {signedUsd(weekPnl)}
                </p>
                <p className={cx("mt-1 text-[11px]", TEXT_MUTED)}>
                  {weekTrades.length} trades
                </p>
              </div>
            </div>
          </Card>

          {/* Quick nav */}
          <Card padding="p-5">
            <SectionHeader
              icon={<Zap className="h-4 w-4" />}
              title="Acesso Rápido"
            />
            <div className="space-y-1.5">
              {[
                { id: "new",       label: "Novo Trade",   icon: Target },
                { id: "journal",   label: "Diário",       icon: BookOpen },
                { id: "analytics", label: "Diagnóstico",  icon: TrendingUp },
                { id: "papers",    label: "Estudos",      icon: BookOpen },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate?.(item.id)}
                    className={cx(
                      "flex w-full items-center justify-between gap-3 border px-3 py-2.5 text-sm transition",
                      "border-zinc-200 hover:border-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100",
                      TEXT_BODY
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 opacity-60" strokeWidth={1.5} />
                      <span className="font-medium">{item.label}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-40" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Belt progress */}
          <Card padding="p-5">
            <SectionHeader
              icon={<Award className="h-4 w-4" />}
              title="Consistência"
              subtitle="Sistema de faixas"
            />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={cx("flex h-12 w-12 items-center justify-center border", beltColor.border)}>
                  <Award className={cx("h-6 w-6", beltColor.text)} strokeWidth={1.5} />
                </span>
                <div>
                  <p className={cx("text-base font-bold uppercase tracking-tight", beltColor.text)}>
                    Faixa {belt.current.name} {belt.current.grade}º
                  </p>
                  <p className={cx("text-[10px]", TEXT_MUTED)}>
                    {consecutiveDays} dias de consistência
                    {belt.next ? ` · faltam ${belt.next.min - consecutiveDays} para ${belt.next.name}` : " · grau máximo"}
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className={cx("text-[9px] font-semibold uppercase tracking-[0.2em]", TEXT_MUTED)}>Progresso</span>
                  <span className={cx("font-mono text-[10px] tabular-nums", TEXT_MUTED)}>{belt.pct}%</span>
                </div>
                <div className="h-[3px] w-full bg-zinc-200 dark:bg-zinc-800">
                  <div className={cx("h-full transition-all", beltColor.fill)} style={{ width: `${belt.pct}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
