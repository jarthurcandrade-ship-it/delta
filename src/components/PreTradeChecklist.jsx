import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  X,
  Check,
  BookOpen,
  ScrollText,
  Target,
  Award,
  Moon,
  HeartPulse,
  Brain,
  Crosshair,
  Activity,
  Sparkles,
  Compass,
} from "lucide-react";

const VERIFICATIONS = [
  {
    id: "panorama",
    label: "Estudou o panorama do mercado?",
    sub: "Macro · DXY · HTF bias · narrativa do dia",
    icon: BookOpen,
  },
  {
    id: "rules",
    label: "Revisou as regras do plano?",
    sub: "Setups válidos · gestão · invalidações",
    icon: ScrollText,
  },
  {
    id: "stop",
    label: "Definiu o stop do dia?",
    sub: "Daily stop em $R · número de trades máx.",
    icon: Target,
  },
];

const ASSESSMENTS = [
  {
    id: "sleep",
    label: "Como você dormiu?",
    sub: "1 = péssimo · 10 = restaurado",
    icon: Moon,
  },
  {
    id: "emotional",
    label: "Como está seu estado emocional?",
    sub: "1 = instável · 10 = sereno",
    icon: HeartPulse,
  },
  {
    id: "focus",
    label: "Qual seu nível de foco hoje?",
    sub: "1 = disperso · 10 = afiado",
    icon: Brain,
  },
  {
    id: "confidence",
    label: "Qual seu nível de confiança no setup?",
    sub: "1 = inseguro · 10 = convicção total",
    icon: Crosshair,
  },
  {
    id: "impact",
    label: "Aconteceu algo que te impactou emocionalmente?",
    sub: "1 = muito impactado · 10 = nenhum impacto",
    icon: Activity,
  },
  {
    id: "body",
    label: "Seu corpo está confortável e descansado?",
    sub: "1 = exausto · 10 = pleno",
    icon: Sparkles,
  },
  {
    id: "clarity",
    label: "Você tem clareza sobre o que vai operar hoje?",
    sub: "1 = nenhuma ideia · 10 = roteiro escrito",
    icon: Compass,
  },
];

// ── Belt progression (mock por consistência) ─────────────────────
const BELTS = [
  { name: "Branca", grade: 0, min: 0, color: "zinc" },
  { name: "Branca", grade: 1, min: 10, color: "zinc" },
  { name: "Branca", grade: 2, min: 25, color: "zinc" },
  { name: "Azul", grade: 0, min: 45, color: "sky" },
  { name: "Azul", grade: 1, min: 70, color: "sky" },
  { name: "Roxa", grade: 0, min: 100, color: "violet" },
  { name: "Marrom", grade: 0, min: 150, color: "amber" },
  { name: "Preta", grade: 0, min: 220, color: "zinc" },
];

const BELT_COLOR = {
  zinc: {
    fill: "bg-zinc-900 dark:bg-zinc-100",
    text: "text-zinc-900 dark:text-zinc-100",
    border: "border-zinc-900 dark:border-zinc-100",
    ring: "bg-zinc-200 dark:bg-zinc-800",
  },
  sky: {
    fill: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500",
    ring: "bg-sky-500/20",
  },
  violet: {
    fill: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500",
    ring: "bg-violet-500/20",
  },
  amber: {
    fill: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500",
    ring: "bg-amber-500/20",
  },
};

function getBeltProgress(consecutiveDays) {
  let current = BELTS[0];
  let next = BELTS[1];
  for (let i = 0; i < BELTS.length; i++) {
    if (consecutiveDays >= BELTS[i].min) {
      current = BELTS[i];
      next = BELTS[i + 1] || null;
    }
  }
  const span = next ? next.min - current.min : 1;
  const into = consecutiveDays - current.min;
  const pct = next ? Math.min(100, Math.round((into / span) * 100)) : 100;
  return { current, next, pct };
}

// ── Dot rating (1 a 10) ──────────────────────────────────────────
function DotScale({ value, onChange }) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="radiogroup"
      aria-label="Escala 1 a 10"
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value >= n;
        const tone =
          value === 0
            ? "border-zinc-300 dark:border-zinc-700"
            : value <= 3
              ? active
                ? "border-rose-500 bg-rose-500"
                : "border-zinc-300 dark:border-zinc-700"
              : value <= 6
                ? active
                  ? "border-amber-500 bg-amber-500"
                  : "border-zinc-300 dark:border-zinc-700"
                : active
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-zinc-300 dark:border-zinc-700";
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
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

export default function PreTradeChecklist({ open, onClose, onStartTrade }) {
  // Mock — em produção virá do streak real do usuário
  const consecutiveDays = 8;
  const belt = useMemo(() => getBeltProgress(consecutiveDays), [consecutiveDays]);

  const [verifications, setVerifications] = useState({
    panorama: false,
    rules: false,
    stop: false,
  });

  const [scores, setScores] = useState(
    ASSESSMENTS.reduce((acc, a) => ({ ...acc, [a.id]: 0 }), {}),
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // ── Score: 30 (verifications) + 70 (assessments) = 100 ───────
  const verificationScore =
    Object.values(verifications).filter(Boolean).length * 10; // 0–30
  const assessmentScore = Object.values(scores).reduce((s, v) => s + v, 0); // 0–70
  const totalScore = verificationScore + assessmentScore;

  const tone =
    totalScore >= 80
      ? "positive"
      : totalScore >= 60
        ? "neutral"
        : "negative";

  const verdict =
    tone === "positive"
      ? {
          icon: ShieldCheck,
          title: "Green Light.",
          message: "Estado mental e técnico alinhados. Execute com disciplina.",
        }
      : tone === "neutral"
        ? {
            icon: ShieldAlert,
            title: "Atenção.",
            message: "Há sinais mistos. Reduza tamanho e escolha apenas A+ setups.",
          }
        : {
            icon: ShieldX,
            title: "Condições desfavoráveis.",
            message: "Recomendamos não operar hoje. Você está abaixo da linha técnica.",
          };

  const verdictClasses = {
    positive: {
      container: "border-emerald-500/40 bg-emerald-500/5",
      iconBox: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
      title: "text-emerald-600 dark:text-emerald-400",
      score: "text-emerald-600 dark:text-emerald-400",
    },
    neutral: {
      container: "border-amber-500/40 bg-amber-500/5",
      iconBox: "border-amber-500/40 text-amber-600 dark:text-amber-400",
      title: "text-amber-600 dark:text-amber-400",
      score: "text-amber-600 dark:text-amber-400",
    },
    negative: {
      container: "border-rose-500/50 bg-rose-500/10",
      iconBox: "border-rose-500/50 text-rose-600 dark:text-rose-400",
      title: "text-rose-600 dark:text-rose-400",
      score: "text-rose-600 dark:text-rose-400",
    },
  };
  const vc = verdictClasses[tone];
  const VIcon = verdict.icon;

  const blocked = totalScore < 60;
  const beltColor = BELT_COLOR[belt.current.color] || BELT_COLOR.zinc;

  const handleStart = () => {
    const payload = {
      verifications: { ...verifications },
      scores: { ...scores },
      verificationScore,
      assessmentScore,
      totalScore,
      verdict: tone,
      belt: `${belt.current.name} ${belt.current.grade}º grau`,
      capturedAt: new Date().toISOString(),
    };
    onStartTrade?.(payload);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-white/70 backdrop-blur-sm dark:bg-black/80"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-zinc-200 bg-white/95 backdrop-blur-md shadow-2xl dark:border-zinc-800 dark:bg-zinc-950/95">
        {/* ───── Gamification header ───── */}
        <div className="border-b border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-5 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-12 w-12 items-center justify-center border ${beltColor.border}`}
              >
                <Award className={`h-6 w-6 ${beltColor.text}`} strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Faixa atual
                </p>
                <p
                  className={`text-base font-bold uppercase tracking-tight ${beltColor.text}`}
                >
                  Faixa {belt.current.name}{" "}
                  <span className="font-mono">{belt.current.grade}º grau</span>
                </p>
                <p className="text-[10px] text-zinc-500">
                  {consecutiveDays} dias de consistência
                  {belt.next
                    ? ` · faltam ${belt.next.min - consecutiveDays} para Faixa ${belt.next.name} ${belt.next.grade}º`
                    : " · grau máximo"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="border border-zinc-300 p-1.5 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Progresso até a próxima graduação
              </span>
              <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                {belt.pct}%
              </span>
            </div>
            <div className="h-[3px] w-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className={`h-full ${beltColor.fill} transition-all`}
                style={{ width: `${belt.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ───── Body ───── */}
        <div className="space-y-6 p-5">
          {/* Verifications */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  01 · Verificações
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Você cumpriu o protocolo do dia?
                </h3>
              </div>
              <span className="font-mono text-[11px] font-semibold text-zinc-500 tabular-nums">
                {verificationScore}
                <span className="text-zinc-400">/30</span>
              </span>
            </div>

            <div className="space-y-2">
              {VERIFICATIONS.map((item) => {
                const Icon = item.icon;
                const checked = verifications[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setVerifications((s) => ({ ...s, [item.id]: !s[item.id] }))
                    }
                    className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition ${
                      checked
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center border transition ${
                        checked
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-zinc-300 text-zinc-500 dark:border-zinc-700"
                      }`}
                    >
                      {checked ? (
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      ) : (
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </span>
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          checked
                            ? "font-bold text-emerald-600 dark:text-emerald-400"
                            : "font-medium text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">{item.sub}</p>
                    </div>
                    <span className="font-mono text-[10px] font-semibold text-zinc-400">
                      +10
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Self-assessment 1-10 */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  02 · Autoavaliação
                </p>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Honestidade radical sobre seu estado.
                </h3>
              </div>
              <span className="font-mono text-[11px] font-semibold text-zinc-500 tabular-nums">
                {assessmentScore}
                <span className="text-zinc-400">/70</span>
              </span>
            </div>

            <div className="divide-y divide-zinc-100 border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
              {ASSESSMENTS.map((q) => {
                const Icon = q.icon;
                const v = scores[q.id];
                return (
                  <div
                    key={q.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center border transition ${
                          v === 0
                            ? "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
                            : v <= 3
                              ? "border-rose-500/40 text-rose-500"
                              : v <= 6
                                ? "border-amber-500/40 text-amber-500"
                                : "border-emerald-500/40 text-emerald-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-tight text-zinc-800 dark:text-zinc-200">
                          {q.label}
                        </p>
                        <p className="text-[10px] text-zinc-500">{q.sub}</p>
                      </div>
                    </div>
                    <div className="pl-11 sm:pl-0">
                      <DotScale
                        value={v}
                        onChange={(n) => setScores((s) => ({ ...s, [q.id]: n }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Verdict */}
          <div className={`border p-4 ${vc.container}`}>
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center border ${vc.iconBox}`}
              >
                <VIcon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <p
                  className={`text-sm font-bold uppercase tracking-wide ${vc.title}`}
                >
                  {verdict.title}
                </p>
                <p className="text-xs text-zinc-500">{verdict.message}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-3xl font-bold tabular-nums leading-none ${vc.score}`}
                >
                  {totalScore}
                </p>
                <p className="text-[10px] text-zinc-400">/100</p>
              </div>
            </div>

            <div className="mt-3 flex h-[3px] w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
              <div
                className={`h-full ${
                  tone === "positive"
                    ? "bg-emerald-500"
                    : tone === "neutral"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${totalScore}%` }}
              />
            </div>
          </div>

          {/* Block banner */}
          {blocked && (
            <div className="border border-rose-500/50 bg-rose-500/10 p-3.5">
              <div className="flex items-start gap-3">
                <ShieldX
                  className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
                    Condições desfavoráveis
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    Recomendamos <strong>não operar hoje</strong>. O custo de
                    forçar é estatisticamente maior que o de esperar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ───── Footer ───── */}
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-zinc-200 bg-white/95 px-5 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
          <p className="text-[10px] text-zinc-500">
            Esc para fechar · checklist é salvo no trade.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="border border-zinc-300 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
            >
              Fechar
            </button>
            <button
              onClick={handleStart}
              className={`px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                blocked
                  ? "border border-rose-500/60 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                  : tone === "positive"
                    ? "border border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              }`}
              title={
                blocked
                  ? "Score abaixo de 60 — operar não é recomendado"
                  : "Iniciar operação"
              }
            >
              {blocked ? "Operar mesmo assim" : "Iniciar Operação"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
