import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Moon, HeartPulse, Brain, Crosshair, Activity, Sparkles, Compass,
  ShieldCheck, ShieldAlert, ShieldX, Award, Check,
  BookOpen, Dumbbell, Coffee, Flame, Target, TrendingUp,
  ChevronRight, Sun, Zap, Plus, Minus, Beaker, Timer
} from "lucide-react";
import { Card, SectionHeader, signedUsd, pnlClass, Button } from "./ui";
import {
  cx, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED,
  LABEL_XS, LABEL_WIDE,
} from "./constants";
import { metricsApi } from "../lib/supabase";

const ASSESSMENTS = [
  { id: "sleep",      label: "Como você dormiu?",                          sub: "1 = péssimo · 10 = restaurado",     icon: Moon },
  { id: "emotional",  label: "Estado emocional",                           sub: "1 = instável · 10 = sereno",        icon: HeartPulse },
  { id: "focus",      label: "Nível de foco",                              sub: "1 = disperso · 10 = afiado",        icon: Brain },
  { id: "confidence", label: "Confiança / Clareza",                        sub: "1 = inseguro · 10 = convicção",     icon: Crosshair },
  { id: "impact",     label: "Impacto emocional externo",                  sub: "1 = muito impactado · 10 = nenhum", icon: Activity },
  { id: "body",       label: "Corpo confortável / descansado",             sub: "1 = exausto · 10 = pleno",          icon: Sparkles },
  { id: "clarity",    label: "Clareza sobre objetivos do dia",             sub: "1 = perdido · 10 = roteiro pronto", icon: Compass },
];

const HABITS = [
  { id: "study_macro",  label: "Estudou panorama macro",      icon: BookOpen },
  { id: "exercise",     label: "Atividade física",            icon: Dumbbell },
  { id: "routine",      label: "Rotina matinal cumprida",     icon: Coffee },
  { id: "review",       label: "Revisão / Backtest do dia",   icon: Target },
];

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

export default function DailyHub({ trades = [], onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState(ASSESSMENTS.reduce((acc, a) => ({ ...acc, [a.id]: 0 }), {}));
  const [habits, setHabits] = useState(HABITS.reduce((acc, h) => ({ ...acc, [h.id]: false }), {}));
  
  // Biohacking state
  const [caffeine, setCaffeine] = useState(0);
  const [nootropics, setNootropics] = useState(false);
  const [fasting, setFasting] = useState(0);
  const [diet, setDiet] = useState(0);

  const consecutiveDays = 8; // mock
  const belt = useMemo(() => getBeltProgress(consecutiveDays), [consecutiveDays]);
  const beltColor = BELT_COLOR[belt.current.color] || BELT_COLOR.zinc;

  // Load from Supabase
  useEffect(() => {
    const fetchMetrics = async () => {
      const today = todayKey();
      const data = await metricsApi.getToday(today);
      if (data) {
        setScores({
          sleep: data.sleep_score,
          emotional: data.emotional_score,
          focus: data.focus_score,
          clarity: data.clarity_score,
          body: data.body_score,
          confidence: data.confidence_score,
          impact: data.impact_score,
        });
        setHabits(data.habits_json || {});
        setCaffeine(data.caffeine_mg);
        setNootropics(data.nootropics);
        setFasting(data.fasting_hours);
        setDiet(data.diet_quality);
      }
      setLoading(false);
    };
    fetchMetrics();
  }, []);

  // Save to Supabase (debounce or on click? Let's do simple useEffect for now with a slight delay)
  const saveTimeout = useRef(null);
  useEffect(() => {
    if (loading) return;
    
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    
    saveTimeout.current = setTimeout(async () => {
      const today = todayKey();
      await metricsApi.upsert({
        date: today,
        sleep_score: scores.sleep,
        emotional_score: scores.emotional,
        focus_score: scores.focus,
        clarity_score: scores.clarity,
        body_score: scores.body,
        confidence_score: scores.confidence,
        impact_score: scores.impact,
        habits_json: habits,
        caffeine_mg: caffeine,
        nootropics: nootropics,
        fasting_hours: fasting,
        diet_quality: diet
      });
    }, 1000);

    return () => clearTimeout(saveTimeout.current);
  }, [scores, habits, caffeine, nootropics, fasting, diet, loading]);

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

  const toneClasses = {
    positive: { container: "border-emerald-500/40 bg-emerald-500/5", title: "text-emerald-600 dark:text-emerald-400" },
    neutral:  { container: "border-amber-500/40 bg-amber-500/5",     title: "text-amber-600 dark:text-amber-400" },
    negative: { container: "border-rose-500/50 bg-rose-500/10",      title: "text-rose-600 dark:text-rose-400" },
  };
  const vc = toneClasses[tone];

  const today = todayKey();
  const todayTrades = trades.filter((t) => t.date === today);
  const todayPnl = todayTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const habitsDone = Object.values(habits).filter(Boolean).length;

  if (loading) return <div className="p-8 text-center text-zinc-500">Sincronizando com a nuvem...</div>;

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
            Como está o seu dia? Biohacking e Performance em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              <div className="mt-3 h-[2px] w-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={cx("h-full transition-all duration-1000 ease-out", tone === "positive" ? "bg-emerald-500" : tone === "neutral" ? "bg-amber-500" : "bg-rose-500")}
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
              subtitle="Sincronizado com a nuvem"
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

          {/* ───── Biohacking Section (New) ───── */}
          <Card padding="p-5">
            <SectionHeader
              icon={<Beaker className="h-4 w-4" />}
              title="Biohacking & Suplementação"
              subtitle="Otimização química para o terminal"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Caffeine Counter */}
              <div className="border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Cafeína</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-amber-600">{caffeine}mg</span>
                </div>
                <div className="flex gap-2">
                  {[50, 100, 200].map(mg => (
                    <button
                      key={mg}
                      onClick={() => setCaffeine(c => c + mg)}
                      className="flex-1 border border-zinc-200 py-1.5 text-[10px] font-bold transition hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
                    >
                      +{mg}
                    </button>
                  ))}
                  <button
                    onClick={() => setCaffeine(0)}
                    className="px-2 border border-zinc-200 text-zinc-400 hover:text-rose-500 dark:border-zinc-800"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Fasting / Timer */}
              <div className="border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Jejum</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-sky-600">{fasting}h</span>
                </div>
                <div className="flex gap-2">
                  {[1, 4, 8].map(h => (
                    <button
                      key={h}
                      onClick={() => setFasting(f => f + h)}
                      className="flex-1 border border-zinc-200 py-1.5 text-[10px] font-bold transition hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
                    >
                      +{h}h
                    </button>
                  ))}
                  <button
                    onClick={() => setFasting(0)}
                    className="px-2 border border-zinc-200 text-zinc-400 hover:text-rose-500 dark:border-zinc-800"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Nootropics Toggle */}
              <button
                onClick={() => setNootropics(!nootropics)}
                className={cx(
                  "flex items-center justify-between border p-4 transition",
                  nootropics ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-200 dark:border-zinc-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <Zap className={cx("h-4 w-4", nootropics ? "text-emerald-500" : "text-zinc-400")} />
                  <span className={cx("text-xs font-bold uppercase tracking-wider", nootropics ? "text-emerald-600" : "text-zinc-500")}>
                    Nootrópicos
                  </span>
                </div>
                {nootropics && <Check className="h-4 w-4 text-emerald-500" />}
              </button>

              {/* Diet Quality */}
              <div className="border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Qualidade Dieta</span>
                  <span className="font-mono text-sm font-bold text-zinc-500">{diet}/10</span>
                </div>
                <input
                  type="range" min="0" max="10" value={diet}
                  onChange={(e) => setDiet(parseInt(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ───── Right sidebar: Stats ───── */}
        <div className="space-y-6">
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
              </div>
              <div className={cx("border p-4", BORDER)}>
                <p className={LABEL_WIDE}>Hábitos Cumpridos</p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {habitsDone}<span className="text-zinc-400">/{HABITS.length}</span>
                </p>
              </div>
            </div>
          </Card>

          <Card padding="p-5">
            <SectionHeader
              icon={<TrendingUp className="h-4 w-4" />}
              title="Ações"
            />
            <div className="space-y-2">
              <Button
                variant="secondary" className="w-full justify-start"
                onClick={() => onNavigate("insights")}
                icon={<Activity className="h-4 w-4" />}
              >
                Ver Correlações
              </Button>
              <Button
                variant="secondary" className="w-full justify-start"
                onClick={() => onNavigate("new")}
                icon={<Plus className="h-4 w-4" />}
              >
                Novo Trade
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
