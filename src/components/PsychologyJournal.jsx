import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, CalendarDays, NotebookPen, Sparkles, Sunrise, Moon,
  Trash2, History, Save, Check, LineChart, Brain,
} from "lucide-react";
import { Card, SectionHeader, Field, TextArea, Button, ToggleChip } from "./ui";
import {
  cx, BORDER, BORDER_ROW, SURFACE_MUTED,
  TEXT_BODY, TEXT_SOFT, TEXT_MUTED, TEXT_EMERALD,
} from "./constants";
import { MOODS } from "../data/mockTrades";

const SESSION_ERRORS = [
  "Entrada por FOMO",
  "Aumentou a mão no loss",
  "Hesitação na entrada",
  "Revenge trade",
  "Quebrou o stop",
  "Overtrading",
  "Ignorei o checklist",
  "Operei fora do plano",
];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatLongDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const emptyDraft = (date) => ({
  date,
  mood: "",
  premarket: "",
  postmarket: "",
  technicalReview: "",
  errors: [],
});

function MoodPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((m) => (
        <ToggleChip
          key={m.key}
          tone={m.tone}
          active={value === m.key}
          onClick={() => onChange(value === m.key ? "" : m.key)}
        >
          {m.key}
        </ToggleChip>
      ))}
    </div>
  );
}

function ErrorChecklist({ value, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SESSION_ERRORS.map((m) => {
        const active = value.includes(m);
        return (
          <button
            type="button"
            key={m}
            onClick={() => onToggle(m)}
            className={cx(
              "inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-medium tracking-wide transition",
              active
                ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-zinc-300 text-zinc-600 hover:border-rose-500/60 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-rose-400",
            )}
          >
            {active && <Check className="h-3 w-3" strokeWidth={2} />}
            {m}
          </button>
        );
      })}
    </div>
  );
}

function TimelineEntry({ entry, isActive, onSelect, onDelete }) {
  const moodTone = MOODS.find((m) => m.key === entry.mood)?.tone || "neutral";
  const moodColor =
    moodTone === "positive"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : moodTone === "negative"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : `border-zinc-300 ${TEXT_MUTED} dark:border-zinc-700`;

  const snippet = (entry.postmarket || entry.technicalReview || entry.premarket || "").trim();

  return (
    <div
      className={cx(
        "group border p-3 transition cursor-pointer",
        BORDER,
        isActive
          ? "border-zinc-900 dark:border-zinc-100"
          : "hover:border-zinc-400 dark:hover:border-zinc-600",
      )}
      onClick={() => onSelect(entry.date)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className={cx("h-3.5 w-3.5", TEXT_SOFT)} strokeWidth={1.5} />
          <span className={cx("font-mono text-xs tabular-nums", TEXT_BODY)}>{entry.date}</span>
          {entry.mood && (
            <span className={cx("border px-1.5 py-0.5 text-[10px] font-medium", moodColor)}>
              {entry.mood}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.date);
          }}
          className={cx(
            "opacity-0 transition group-hover:opacity-100",
            "p-1 text-zinc-400 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400",
          )}
          aria-label="Excluir entrada"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {snippet && (
        <p className={cx("line-clamp-2 text-xs leading-relaxed", TEXT_SOFT)}>{snippet}</p>
      )}

      {entry.errors?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.errors.slice(0, 3).map((m) => (
            <span
              key={m}
              className={cx(
                "border border-rose-500/30 bg-rose-500/5 px-1.5 py-0.5 text-[9px]",
                "text-rose-600 dark:text-rose-400",
              )}
            >
              {m}
            </span>
          ))}
          {entry.errors.length > 3 && (
            <span className={cx("text-[10px]", TEXT_MUTED)}>
              +{entry.errors.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function PsychologyJournal({ entries = [], setEntries, syncToSupabase, syncDeleteFromSupabase }) {
  const [editingDate, setEditingDate] = useState(() => todayKey());
  const [draft, setDraft] = useState(() => emptyDraft(todayKey()));
  const [savedFlash, setSavedFlash] = useState(false);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries],
  );

  useEffect(() => {
    const existing = entries.find((e) => e.date === editingDate);
    setDraft(
      existing
        ? { ...emptyDraft(editingDate), ...existing }
        : emptyDraft(editingDate),
    );
  }, [editingDate, entries]);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 1600);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const isDirty = useMemo(() => {
    const existing = entries.find((e) => e.date === editingDate);
    if (!existing) {
      return Boolean(
        draft.mood ||
          draft.premarket.trim() ||
          draft.postmarket.trim() ||
          draft.technicalReview.trim() ||
          draft.errors.length,
      );
    }
    return (
      existing.mood !== draft.mood ||
      (existing.premarket || "") !== draft.premarket ||
      (existing.postmarket || "") !== draft.postmarket ||
      (existing.technicalReview || "") !== draft.technicalReview ||
      JSON.stringify(existing.errors || []) !== JSON.stringify(draft.errors || [])
    );
  }, [draft, editingDate, entries]);

  const updateField = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const toggleError = (m) =>
    setDraft((d) => ({
      ...d,
      errors: d.errors.includes(m)
        ? d.errors.filter((x) => x !== m)
        : [...d.errors, m],
    }));

  const handleSave = () => {
    if (!isDirty) return;
    const payload = {
      ...draft,
      id: draft.id || `tp-${editingDate}`,
      date: editingDate,
      updatedAt: new Date().toISOString(),
    };
    setEntries((prev) => {
      const exists = prev.some((e) => e.date === editingDate);
      if (exists) {
        const updated = prev.map((e) => (e.date === editingDate ? { ...e, ...payload } : e));
        const savedEntry = updated.find((e) => e.date === editingDate);
        if (syncToSupabase && savedEntry) syncToSupabase(savedEntry);
        return updated;
      }
      if (syncToSupabase) syncToSupabase(payload);
      return [...prev, payload];
    });
    setSavedFlash(true);
  };

  const handleDelete = (date) => {
    const entry = entries.find((e) => e.date === date);
    if (entry && entry.id && syncDeleteFromSupabase) syncDeleteFromSupabase(entry.id);
    setEntries((prev) => prev.filter((e) => e.date !== date));
    if (date === editingDate) setDraft(emptyDraft(date));
  };

  const handleNewToday = () => setEditingDate(todayKey());

  const isEditingToday = editingDate === todayKey();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card padding="p-6">
          <SectionHeader
            icon={<BookOpen className="h-4 w-4" />}
            title={isEditingToday ? "Página de Hoje" : "Editando página"}
            subtitle={formatLongDate(editingDate)}
            right={
              !isEditingToday && (
                <button
                  type="button"
                  onClick={handleNewToday}
                  className={cx(
                    "border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition",
                    "border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900",
                    "dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100",
                  )}
                >
                  Voltar para Hoje
                </button>
              )
            }
          />

          <div className="space-y-6">
            <Field label="Data" hint="Use para revisar ou registrar dias passados">
              <input
                type="date"
                value={editingDate}
                max={todayKey()}
                onChange={(e) => e.target.value && setEditingDate(e.target.value)}
                className={cx(
                  "w-full border px-3 py-2 text-sm outline-none transition",
                  "border-zinc-300 bg-white text-zinc-900 focus:border-zinc-900",
                  "dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100",
                )}
              />
            </Field>

            <Field
              label="Estado emocional"
              hint={
                <span className="inline-flex items-center gap-1">
                  <Brain className="h-3 w-3" strokeWidth={1.5} /> humor predominante da sessão
                </span>
              }
            >
              <MoodPicker
                value={draft.mood}
                onChange={(mood) => updateField({ mood })}
              />
            </Field>

            <Field
              label="Mindset Pré-Mercado"
              hint={
                <span className="inline-flex items-center gap-1">
                  <Sunrise className="h-3 w-3" strokeWidth={1.5} /> antes da abertura
                </span>
              }
            >
              <TextArea
                rows={4}
                placeholder="Como você está se sentindo? O que precisa lembrar antes de operar?"
                value={draft.premarket}
                onChange={(e) => updateField({ premarket: e.target.value })}
              />
            </Field>

            <Field
              label="Review Técnico da Sessão"
              hint={
                <span className="inline-flex items-center gap-1">
                  <LineChart className="h-3 w-3" strokeWidth={1.5} /> execução, setups e contexto de mercado
                </span>
              }
            >
              <TextArea
                rows={5}
                placeholder="Quais setups apareceram? Como foi a leitura de fluxo, killzones e contexto macro? O que executou bem tecnicamente?"
                value={draft.technicalReview}
                onChange={(e) => updateField({ technicalReview: e.target.value })}
              />
            </Field>

            <Field
              label="Review Pós-Mercado"
              hint={
                <span className="inline-flex items-center gap-1">
                  <Moon className="h-3 w-3" strokeWidth={1.5} /> ao fechar a sessão
                </span>
              }
            >
              <TextArea
                rows={5}
                placeholder="O que executou bem? O que você deixaria de fazer? Qual a lição?"
                value={draft.postmarket}
                onChange={(e) => updateField({ postmarket: e.target.value })}
              />
            </Field>

            <Field
              label="Erros da sessão"
              hint="Marque tudo que aconteceu — honestidade radical"
            >
              <ErrorChecklist value={draft.errors} onToggle={toggleError} />
            </Field>

            <div className={cx("flex items-center justify-between border-t pt-4", BORDER_ROW)}>
              <p className={cx("text-[11px]", TEXT_MUTED)}>
                {savedFlash ? (
                  <span className={cx("inline-flex items-center gap-1.5", TEXT_EMERALD)}>
                    <Sparkles className="h-3 w-3" strokeWidth={1.5} /> Página salva
                  </span>
                ) : isDirty ? (
                  "Alterações não salvas"
                ) : (
                  "Tudo sincronizado"
                )}
              </p>
              <Button
                variant={isDirty ? "primary" : "secondary"}
                icon={<Save className="h-3.5 w-3.5" />}
                onClick={handleSave}
                disabled={!isDirty}
              >
                Salvar
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card padding="p-5">
          <SectionHeader
            icon={<History className="h-4 w-4" />}
            title="Histórico"
            subtitle={
              sorted.length
                ? `${sorted.length} ${sorted.length === 1 ? "página" : "páginas"}`
                : "Nenhuma página ainda"
            }
          />

          {sorted.length === 0 ? (
            <div
              className={cx(
                "flex flex-col items-center justify-center gap-2 border border-dashed py-10 text-center",
                BORDER,
                SURFACE_MUTED,
              )}
            >
              <NotebookPen className={cx("h-5 w-5", TEXT_MUTED)} strokeWidth={1.5} />
              <p className={cx("text-xs", TEXT_MUTED)}>
                Suas páginas aparecerão aqui após o primeiro salvamento.
              </p>
            </div>
          ) : (
            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {sorted.map((entry) => (
                <TimelineEntry
                  key={entry.date}
                  entry={entry}
                  isActive={entry.date === editingDate}
                  onSelect={setEditingDate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
