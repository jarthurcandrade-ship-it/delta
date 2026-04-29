import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Calendar, Check, Droplets, Flame, Lightbulb, ListTodo,
  Moon, NotebookPen, Plus, Sparkles, Tag, Trash2, X,
} from "lucide-react";
import { Card, SectionHeader, Field, TextArea, Button } from "./ui";
import {
  cx, BORDER, BORDER_ROW, SURFACE_MUTED,
  TEXT_TITLE, TEXT_BODY, TEXT_SOFT, TEXT_MUTED, TEXT_EMERALD,
  LABEL_XS, LABEL_WIDE,
} from "./constants";
import { metricsApi, ideasApi, reflectionsApi, supabase } from "../lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────
const formatDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayKey = () => formatDate(new Date());

function mondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = (dow + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const TAG_PRESETS = [
  { id: "trade",  label: "Trade",   color: "emerald" },
  { id: "estudo", label: "Estudo",  color: "sky" },
  { id: "habito", label: "Hábito",  color: "violet" },
  { id: "vida",   label: "Vida",    color: "amber" },
];

const TAG_COLORS = {
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  sky:     "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet:  "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber:   "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  zinc:    "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
};

const colorForTag = (id) =>
  TAG_COLORS[TAG_PRESETS.find((t) => t.id === id)?.color] || TAG_COLORS.zinc;

// Soma os 7 sliders de Estado Diário (0-70).
function readinessOf(m) {
  if (!m) return null;
  return (
    (m.sleep_score || 0) + (m.emotional_score || 0) + (m.focus_score || 0) +
    (m.clarity_score || 0) + (m.body_score || 0) + (m.confidence_score || 0) +
    (m.impact_score || 0)
  );
}

function heatColor(score) {
  if (score == null) return "bg-zinc-100 dark:bg-zinc-900";
  if (score === 0) return "bg-zinc-100 dark:bg-zinc-900";
  if (score <= 20) return "bg-rose-500/40 dark:bg-rose-500/30";
  if (score <= 40) return "bg-amber-500/40 dark:bg-amber-500/30";
  if (score <= 55) return "bg-emerald-500/40 dark:bg-emerald-500/40";
  return "bg-emerald-500 dark:bg-emerald-500";
}

// Streak: dias consecutivos retroagindo a partir do dia logado mais recente.
function calcStreak(metrics, predicate) {
  if (!metrics.length) return 0;
  const map = new Map(metrics.map((m) => [m.date, m]));
  const today = new Date();
  const cursor = new Date(today);
  // Se hoje não foi logado ainda, começa pelo dia anterior.
  if (!map.has(formatDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const m = map.get(formatDate(cursor));
    if (!m || !predicate(m)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Heatmap de prontidão ─────────────────────────────────────────
function ReadinessHeatmap({ metrics }) {
  const weeks = useMemo(() => {
    const map = new Map(metrics.map((m) => [m.date, m]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDow = today.getDay();
    const totalCols = 13;
    const w = [];
    for (let col = 0; col < totalCols; col++) {
      const week = [];
      for (let row = 0; row < 7; row++) {
        const colsBack = totalCols - 1 - col;
        const dayOffset = colsBack * 7 + (todayDow - row);
        if (dayOffset < 0) {
          week.push({ future: true });
        } else {
          const d = new Date(today);
          d.setDate(d.getDate() - dayOffset);
          const key = formatDate(d);
          const m = map.get(key);
          week.push({
            date: key,
            dow: row,
            score: readinessOf(m),
          });
        }
      }
      w.push(week);
    }
    return w;
  }, [metrics]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1">
        {/* Day labels (Mon, Wed, Fri only) */}
        <div className="mr-1 hidden flex-col gap-[2px] py-0 text-[9px] text-zinc-400 sm:flex">
          {["", "S", "", "Q", "", "S", ""].map((l, i) => (
            <div key={i} className="flex h-2.5 w-2.5 items-center justify-center font-mono">
              {l}
            </div>
          ))}
        </div>
        <div className="flex flex-1 gap-[2px] overflow-x-auto">
          {weeks.map((week, ci) => (
            <div key={ci} className="flex flex-col gap-[2px]">
              {week.map((cell, ri) =>
                cell.future ? (
                  <div key={ri} className="h-2.5 w-2.5 opacity-0" />
                ) : (
                  <div
                    key={ri}
                    className={cx("h-2.5 w-2.5", heatColor(cell.score))}
                    title={`${cell.date}${cell.score != null ? ` · ${cell.score}/70` : " · não logado"}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={cx("flex items-center justify-end gap-2 text-[9px]", TEXT_MUTED)}>
        <span>menos</span>
        <span className="h-2 w-2 bg-zinc-100 dark:bg-zinc-900" />
        <span className="h-2 w-2 bg-rose-500/40" />
        <span className="h-2 w-2 bg-amber-500/40" />
        <span className="h-2 w-2 bg-emerald-500/40" />
        <span className="h-2 w-2 bg-emerald-500" />
        <span>mais</span>
      </div>
    </div>
  );
}

// ── Streak card ──────────────────────────────────────────────────
function StreakCard({ icon: Icon, label, value, hint }) {
  const tone = value >= 7 ? "emerald" : value >= 3 ? "amber" : "zinc";
  const toneClasses = {
    emerald: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
    amber:   "border-amber-500/40 text-amber-600 dark:text-amber-400",
    zinc:    cx(BORDER, TEXT_MUTED),
  };
  return (
    <div className={cx("border p-3", toneClasses[tone])}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        <p className={cx("text-[10px] font-semibold uppercase tracking-[0.15em]", TEXT_MUTED)}>
          {label}
        </p>
      </div>
      <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">
        {value}
        <span className={cx("ml-1 text-xs font-normal", TEXT_MUTED)}>
          {value === 1 ? "dia" : "dias"}
        </span>
      </p>
      <p className={cx("text-[10px]", TEXT_MUTED)}>{hint}</p>
    </div>
  );
}

// ── Banco de Ideias ──────────────────────────────────────────────
function IdeasInbox({ ideas, onCreate, onToggle, onDelete }) {
  const [text, setText] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [filterTag, setFilterTag] = useState(null);
  const inputRef = useRef(null);

  const submit = (e) => {
    e?.preventDefault?.();
    const trimmed = text.trim();
    if (!trimmed) return;
    onCreate({ text: trimmed, tags: activeTags });
    setText("");
    setActiveTags([]);
    inputRef.current?.focus();
  };

  const toggleTag = (id) =>
    setActiveTags((cur) =>
      cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id],
    );

  const visible = useMemo(() => {
    let list = [...ideas].sort((a, b) =>
      a.done === b.done ? 0 : a.done ? 1 : -1,
    );
    if (filterTag) list = list.filter((i) => (i.tags || []).includes(filterTag));
    return list;
  }, [ideas, filterTag]);

  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<Lightbulb className="h-4 w-4" />}
        title="Banco de Ideias"
        subtitle="Captura rápida — uma linha por ideia"
        right={
          <span className={cx("font-mono text-xs tabular-nums", TEXT_MUTED)}>
            {ideas.filter((i) => !i.done).length} abertas
          </span>
        }
      />

      <form onSubmit={submit} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Capturar ideia... (Enter para salvar)"
            className={cx(
              "flex-1 border px-3 py-2 text-sm outline-none transition",
              "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-900",
              "dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100",
            )}
          />
          <Button
            type="submit"
            variant={text.trim() ? "primary" : "secondary"}
            icon={<Plus className="h-3.5 w-3.5" />}
            disabled={!text.trim()}
          >
            Capturar
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TAG_PRESETS.map((t) => {
            const active = activeTags.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className={cx(
                  "border px-2 py-0.5 text-[10px] font-medium tracking-wide transition",
                  active ? colorForTag(t.id) : cx(BORDER, TEXT_MUTED, "hover:border-zinc-400 dark:hover:border-zinc-600"),
                )}
              >
                #{t.label}
              </button>
            );
          })}
        </div>
      </form>

      <div className={cx("mt-4 border-t pt-3", BORDER_ROW)}>
        <div className="mb-2 flex items-center gap-2">
          <Tag className={cx("h-3 w-3", TEXT_MUTED)} strokeWidth={1.5} />
          <span className={cx("text-[10px] uppercase tracking-wider", TEXT_MUTED)}>
            Filtrar:
          </span>
          <button
            type="button"
            onClick={() => setFilterTag(null)}
            className={cx(
              "border px-1.5 py-0.5 text-[10px] font-medium transition",
              filterTag === null
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : cx(BORDER, TEXT_MUTED, "hover:border-zinc-400 dark:hover:border-zinc-600"),
            )}
          >
            todas
          </button>
          {TAG_PRESETS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setFilterTag(filterTag === t.id ? null : t.id)}
              className={cx(
                "border px-1.5 py-0.5 text-[10px] font-medium transition",
                filterTag === t.id ? colorForTag(t.id) : cx(BORDER, TEXT_MUTED),
              )}
            >
              #{t.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div
            className={cx(
              "flex flex-col items-center justify-center gap-2 border border-dashed py-8 text-center",
              BORDER, SURFACE_MUTED,
            )}
          >
            <NotebookPen className={cx("h-4 w-4", TEXT_MUTED)} strokeWidth={1.5} />
            <p className={cx("text-xs", TEXT_MUTED)}>
              {filterTag ? "Nenhuma ideia nessa tag." : "Capture sua primeira ideia."}
            </p>
          </div>
        ) : (
          <ul className="max-h-[400px] space-y-1.5 overflow-y-auto pr-1">
            {visible.map((idea) => (
              <li
                key={idea.id}
                className={cx(
                  "group flex items-start gap-2 border p-2 transition",
                  BORDER,
                  idea.done && "opacity-50",
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggle(idea)}
                  className={cx(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition",
                    idea.done
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-zinc-300 hover:border-emerald-500 dark:border-zinc-700",
                  )}
                  aria-label={idea.done ? "Marcar como aberta" : "Marcar como feita"}
                >
                  {idea.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cx("text-[13px] leading-snug", TEXT_BODY, idea.done && "line-through")}>
                    {idea.text}
                  </p>
                  {(idea.tags || []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {idea.tags.map((tagId) => (
                        <span
                          key={tagId}
                          className={cx(
                            "border px-1.5 py-0.5 text-[9px] font-medium",
                            colorForTag(tagId),
                          )}
                        >
                          #{TAG_PRESETS.find((t) => t.id === tagId)?.label || tagId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(idea)}
                  className="opacity-0 transition group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500"
                  aria-label="Excluir ideia"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ── Reflexão Semanal ─────────────────────────────────────────────
function WeeklyReflectionCard({ reflection, onSave, weekLabel }) {
  const [draft, setDraft] = useState({
    energized: "",
    drained: "",
    win: "",
    next_focus: "",
  });
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (reflection) {
      setDraft({
        energized: reflection.energized || "",
        drained: reflection.drained || "",
        win: reflection.win || "",
        next_focus: reflection.next_focus || "",
      });
    } else {
      setDraft({ energized: "", drained: "", win: "", next_focus: "" });
    }
  }, [reflection]);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 1600);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const isDirty = useMemo(() => {
    const cur = reflection || { energized: "", drained: "", win: "", next_focus: "" };
    return (
      (cur.energized || "") !== draft.energized ||
      (cur.drained || "") !== draft.drained ||
      (cur.win || "") !== draft.win ||
      (cur.next_focus || "") !== draft.next_focus
    );
  }, [draft, reflection]);

  const handleSave = () => {
    if (!isDirty) return;
    onSave(draft);
    setSavedFlash(true);
  };

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<Calendar className="h-4 w-4" />}
        title="Reflexão da Semana"
        subtitle={weekLabel}
      />
      <div className="space-y-4">
        <Field
          label="O que mais te energizou?"
          hint={<span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" strokeWidth={1.5} /> momentos, pessoas, atividades</span>}
        >
          <TextArea
            rows={2}
            placeholder="..."
            value={draft.energized}
            onChange={(e) => update({ energized: e.target.value })}
          />
        </Field>
        <Field label="O que drenou?" hint="ruídos, hábitos, decisões">
          <TextArea
            rows={2}
            placeholder="..."
            value={draft.drained}
            onChange={(e) => update({ drained: e.target.value })}
          />
        </Field>
        <Field label="Vitória da semana" hint="por menor que pareça">
          <TextArea
            rows={2}
            placeholder="..."
            value={draft.win}
            onChange={(e) => update({ win: e.target.value })}
          />
        </Field>
        <Field label="Foco da próxima semana" hint="uma frase">
          <TextArea
            rows={2}
            placeholder="..."
            value={draft.next_focus}
            onChange={(e) => update({ next_focus: e.target.value })}
          />
        </Field>

        <div className={cx("flex items-center justify-between border-t pt-3", BORDER_ROW)}>
          <p className={cx("text-[11px]", TEXT_MUTED)}>
            {savedFlash ? (
              <span className={cx("inline-flex items-center gap-1.5", TEXT_EMERALD)}>
                <Check className="h-3 w-3" strokeWidth={2} /> Reflexão salva
              </span>
            ) : isDirty ? (
              "Alterações não salvas"
            ) : (
              "Tudo sincronizado"
            )}
          </p>
          <Button
            variant={isDirty ? "primary" : "secondary"}
            disabled={!isDirty}
            onClick={handleSave}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Página ───────────────────────────────────────────────────────
export default function PerformanceInsights() {
  const [metrics, setMetrics] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [reflection, setReflection] = useState(null);
  const [loading, setLoading] = useState(true);

  const weekStartDate = useMemo(() => mondayOf(new Date()), []);
  const weekStartKey = formatDate(weekStartDate);

  const weekLabel = useMemo(() => {
    const start = weekStartDate;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [weekStartDate]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, i, r] = await Promise.all([
        metricsApi.getAll(),
        ideasApi.getAll(),
        reflectionsApi.getOne(weekStartKey),
      ]);
      if (cancelled) return;
      if (m) setMetrics(m);
      if (i) setIdeas(i);
      if (r) setReflection(r);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [weekStartKey]);

  // Streaks
  const streaks = useMemo(() => ({
    hydration: calcStreak(metrics, (m) => (m.hydration_cups || 0) >= 1),
    sleep:     calcStreak(metrics, (m) => Number(m.sleep_hours || 0) >= 7),
    macro:     calcStreak(metrics, (m) => m.habits_json?.study_macro === true),
    readiness: calcStreak(metrics, (m) => readinessOf(m) >= 49), // 49/70 ≈ média 7
  }), [metrics]);

  // Ideias handlers
  const handleCreateIdea = async ({ text, tags }) => {
    if (!supabase) return;
    const created = await ideasApi.insert({ text, tags, done: false });
    if (created) setIdeas((prev) => [created, ...prev]);
  };
  const handleToggleIdea = async (idea) => {
    const updated = await ideasApi.update(idea.id, { done: !idea.done });
    if (updated) setIdeas((prev) => prev.map((i) => (i.id === idea.id ? updated : i)));
  };
  const handleDeleteIdea = async (idea) => {
    const ok = await ideasApi.remove(idea.id);
    if (ok) setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
  };

  // Reflexão handler (auto-save por botão)
  const handleSaveReflection = async (draft) => {
    const saved = await reflectionsApi.upsert({
      week_start: weekStartKey,
      ...draft,
    });
    if (saved) setReflection(saved);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Carregando seu progresso...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h1 className={cx("text-2xl font-bold tracking-tight", TEXT_TITLE)}>
          Insights Pessoais
        </h1>
        <p className={cx("mt-1 text-sm", TEXT_MUTED)}>
          Progresso, ideias e reflexões — o que move o seu dia.
        </p>
      </div>

      {/* ───── Heatmap de Prontidão ───── */}
      <Card padding="p-5">
        <SectionHeader
          icon={<Activity className="h-4 w-4" />}
          title="Prontidão · 90 dias"
          subtitle="Soma diária do Estado Diário (0–70)"
        />
        <ReadinessHeatmap metrics={metrics} />
      </Card>

      {/* ───── Streaks ───── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StreakCard
          icon={Droplets}
          label="Hidratação"
          value={streaks.hydration}
          hint="dias com ≥1 copo logado"
        />
        <StreakCard
          icon={Moon}
          label="Sono 7h+"
          value={streaks.sleep}
          hint="horas reais ≥ 7"
        />
        <StreakCard
          icon={ListTodo}
          label="Macro estudada"
          value={streaks.macro}
          hint="hábito Pré-Mercado"
        />
        <StreakCard
          icon={Flame}
          label="Estado 7+"
          value={streaks.readiness}
          hint="média geral ≥ 7"
        />
      </div>

      {/* ───── Ideias + Reflexão ───── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <IdeasInbox
            ideas={ideas}
            onCreate={handleCreateIdea}
            onToggle={handleToggleIdea}
            onDelete={handleDeleteIdea}
          />
        </div>
        <div className="lg:col-span-2">
          <WeeklyReflectionCard
            reflection={reflection}
            onSave={handleSaveReflection}
            weekLabel={weekLabel}
          />
        </div>
      </div>
    </div>
  );
}
