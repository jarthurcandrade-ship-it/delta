import { Fragment, useMemo, useState } from "react";
import {
  ArrowUp, ArrowDown, Filter, Search, ChevronRight, Newspaper, Clock4, Zap,
  Layers, Skull, BookOpen, BarChart2, Pencil, Trash2, Image as ImageIcon,
} from "lucide-react";
import {
  Card, SectionHeader, Tag, ToggleChip, Button,
  formatUsd, signedUsd, pnlClass,
} from "./ui";
import { KILLZONES } from "../data/mockTrades";
import {
  cx, BORDER, BORDER_INPUT, BORDER_ROW, SURFACE, SURFACE_MUTED,
  TEXT_TITLE, TEXT_BODY, TEXT_SOFT, TEXT_MUTED, TEXT_EMERALD, TEXT_ROSE,
  LABEL_WIDE, TONE_BADGE, toneOf,
} from "./constants";

const KZ_LABEL = Object.fromEntries(KILLZONES.map((k) => [k.id, k.label]));

const SCREENSHOT_SLOTS = [
  { label: "HTF", sub: "4H / 1H" },
  { label: "LTF", sub: "15m / 5m" },
  { label: "Exec", sub: "1m / tick" },
];

const CELL = `border-b ${BORDER_ROW} px-4 py-3 align-middle`;
const HEAD = "flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]";
const PILL = "inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-semibold";

const RESULT_SYM = { Win: "+", Loss: "−", BE: "=" };
const FILTERS = ["Todos", "Win", "Loss", "BE"];

const Pill = ({ tone, children }) => (
  <span className={cx(PILL, TONE_BADGE[tone])}>{children}</span>
);

const ResultTag = ({ result }) => (
  <Pill tone={toneOf("result", result)}>
    <span className="font-mono">{RESULT_SYM[result]}</span> {result}
  </Pill>
);

const DirectionTag = ({ direction }) => {
  if (direction !== "Long" && direction !== "Short") {
    return (
      <Pill tone="neutral">
        <span className="font-mono">—</span>
        {direction || "?"}
      </Pill>
    );
  }
  const Icon = direction === "Long" ? ArrowUp : ArrowDown;
  return (
    <Pill tone={toneOf("direction", direction)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {direction}
    </Pill>
  );
};

const H = ({ icon, children, tone }) => (
  <h4 className={cx(HEAD, "pt-1", tone || TEXT_MUTED)}>
    {icon} {children}
  </h4>
);

const Panel = ({ text, strong }) => (
  <p className={`border ${BORDER} ${SURFACE} px-3 py-2.5 text-xs leading-relaxed ${strong ? TEXT_BODY : "text-zinc-600 dark:text-zinc-400"}`}>
    {text || "—"}
  </p>
);

function ExpandedRow({ trade, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dolLabel = (trade.dol || "").split(" (")[0] || "—";
  const confluences = Array.isArray(trade.confluences) ? trade.confluences : [];
  const macroEvents = Array.isArray(trade.macroEvents) ? trade.macroEvents : [];
  const rrPlanned = Number.isFinite(trade.rrPlanned) ? trade.rrPlanned : 0;
  const rrRealized = Number.isFinite(trade.rrRealized) ? trade.rrRealized : 0;
  const risk = Number.isFinite(trade.risk) ? trade.risk : 0;
  const psych = trade.psychologyData;
  const checklist = trade.checklistData;

  const handleConfirmDelete = () => {
    if (!trade?.id || typeof onDelete !== "function") {
      console.error("TradeTable: cannot delete — missing trade.id or onDelete handler", trade);
      setConfirmDelete(false);
      return;
    }
    onDelete(trade.id);
    setConfirmDelete(false);
  };

  return (
    <div className={`border-b ${BORDER} ${SURFACE_MUTED} px-6 py-5`}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-3">
          <H icon={<Clock4 className="h-3 w-3" strokeWidth={1.5} />}>Contexto</H>
          <div className="flex flex-wrap gap-1.5">
            <Tag size="xs">{KZ_LABEL[trade.killzone] || trade.killzone || "—"}</Tag>
            <Tag size="xs" icon={<Zap />}>DOL: {dolLabel}</Tag>
            {macroEvents.map((m) => (
              <Tag key={m} size="xs" icon={<Newspaper />}>{m}</Tag>
            ))}
            {trade.dxyBias && (
              <Tag size="xs" tone={toneOf("dxy", trade.dxyBias)}>DXY {trade.dxyBias}</Tag>
            )}
            {trade.sentiment && (
              <Tag size="xs" tone={toneOf("sentiment", trade.sentiment)}>{trade.sentiment}</Tag>
            )}
          </div>

          <H icon={<Layers className="h-3 w-3" strokeWidth={1.5} />}>Confluências</H>
          <div className="flex flex-wrap gap-1.5">
            {confluences.length === 0 ? (
              <span className={`text-[11px] ${TEXT_MUTED}`}>Nenhuma registrada</span>
            ) : (
              confluences.map((c) => <Tag key={c} size="xs">{c}</Tag>)
            )}
          </div>

          {trade.mistake && (
            <>
              <H icon={<Skull className="h-3 w-3" strokeWidth={1.5} />} tone={TEXT_ROSE}>
                Erro identificado
              </H>
              <div className={`border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs font-semibold ${TEXT_ROSE}`}>
                {trade.mistake}
              </div>
            </>
          )}

          {checklist && (
            <>
              <H icon={<Layers className="h-3 w-3" strokeWidth={1.5} />}>Checklist</H>
              <div className={`border ${BORDER} px-3 py-2 text-[11px] ${TEXT_SOFT}`}>
                <span className="font-mono font-semibold">{checklist.count ?? 0}/3</span>
                {" · "}
                <span className="uppercase tracking-wider">{checklist.verdict || "—"}</span>
              </div>
            </>
          )}

          {psych && (psych.mindset || psych.mood) && (
            <>
              <H icon={<BookOpen className="h-3 w-3" strokeWidth={1.5} />}>Psicologia</H>
              <div className={`border ${BORDER} px-3 py-2 text-[11px] ${TEXT_SOFT}`}>
                {psych.mood && (
                  <span className="mr-2 font-semibold">{psych.mood}</span>
                )}
                {psych.mindset && <span>{psych.mindset}</span>}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <H icon={<BookOpen className="h-3 w-3" strokeWidth={1.5} />}>HTF Bias</H>
          <Panel text={trade.htf} />
          <H icon={<BarChart2 className="h-3 w-3" strokeWidth={1.5} />}>Trade Story</H>
          <Panel text={trade.story} strong />
        </div>

        <div className="space-y-3">
          <H icon={<ImageIcon className="h-3 w-3" strokeWidth={1.5} />}>Screenshots</H>
          <div className="grid grid-cols-3 gap-2">
            {SCREENSHOT_SLOTS.map((s) => {
              const shot = trade.screenshots?.[s.key];
              return (
                <div
                  key={s.label}
                  className={`relative flex aspect-[4/3] flex-col items-center justify-center gap-1 border ${shot?.dataUrl ? "border-emerald-500/50" : "border-dashed border-zinc-300 dark:border-zinc-800"} ${SURFACE} overflow-hidden`}
                >
                  {shot?.dataUrl ? (
                    <>
                      <img
                        src={shot.dataUrl}
                        alt={s.label}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/10" />
                      <div className={`absolute left-1 top-1 z-10 flex items-center gap-1 border border-emerald-500/50 bg-emerald-500/10 px-1 py-0.5 text-[9px] font-semibold ${TEXT_EMERALD} backdrop-blur-sm`}>
                        <ImageIcon className="h-2.5 w-2.5" strokeWidth={1.5} /> {s.label}
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                      <span className={`text-[10px] font-semibold ${TEXT_SOFT}`}>{s.label}</span>
                      <span className={`text-[9px] ${TEXT_MUTED}`}>{s.sub}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className={`border ${BORDER} px-3 py-2 text-[10px] ${TEXT_MUTED}`}>
            <span className={`font-mono ${TEXT_SOFT}`}>RR</span>{" "}
            {rrPlanned.toFixed(1)}R →{" "}
            <span className={`font-mono font-bold ${rrRealized >= 0 ? TEXT_EMERALD : TEXT_ROSE}`}>
              {rrRealized.toFixed(1)}R
            </span>
            <span className={`ml-2 ${TEXT_MUTED}`}>· risco {formatUsd(risk)}</span>
          </div>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div
          className={`mt-5 flex items-center justify-between gap-3 border-t ${BORDER} pt-4`}
          onClick={(e) => e.stopPropagation()}
        >
          <p className={`text-[11px] ${TEXT_MUTED}`}>
            Trade <span className={`font-mono ${TEXT_SOFT}`}>{trade.id || "(sem id)"}</span>
          </p>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => onEdit(trade)}>
                Editar
              </Button>
            )}
            {onDelete && (confirmDelete ? (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-rose-500">
                  Apagar este trade?
                </span>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                <Button
                  variant="danger"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={handleConfirmDelete}
                >
                  Confirmar
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => setConfirmDelete(true)}
              >
                Apagar
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TradeTable({ trades, defaultExpand = false, onEdit, onDelete }) {
  const [filter, setFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lc = (v) => (typeof v === "string" ? v.toLowerCase() : "");
    const matchQuery = (t) => {
      if (!q) return true;
      const confluences = Array.isArray(t.confluences) ? t.confluences : [];
      return (
        lc(t.asset).includes(q) ||
        lc(t.setup).includes(q) ||
        lc(t.id).includes(q) ||
        lc(t.mistake).includes(q) ||
        confluences.some((c) => lc(c).includes(q))
      );
    };

    const tsOf = (t) => {
      const d = new Date(`${t.date || "1970-01-01"}T${t.entryTime || "00:00"}`).getTime();
      return Number.isFinite(d) ? d : 0;
    };

    return trades
      .filter((t) => t && t.id) // descartar trades corrompidos
      .filter((t) => filter === "Todos" || t.result === filter)
      .filter(matchQuery)
      .sort((a, b) => tsOf(b) - tsOf(a));
  }, [trades, filter, query]);

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));
  const filterTone = { Win: "positive", Loss: "negative", BE: "neutral", Todos: "neutral" };

  const headers = ["", "Data", "Ativo", "Dir", "Setup", "Resultado", "PnL"];

  return (
    <Card padding="p-0">
      <div className={`flex flex-col gap-3 border-b ${BORDER} px-5 py-4 lg:flex-row lg:items-center lg:justify-between`}>
        <SectionHeader
          icon={<Filter className="h-4 w-4" />}
          title="Diário de Trades"
          subtitle={`${filtered.length} de ${trades.length} trades · clique para expandir`}
        />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <ToggleChip
                key={f}
                active={filter === f}
                onClick={() => setFilter(f)}
                tone={filterTone[f]}
              >
                {f}
              </ToggleChip>
            ))}
          </div>
          <div className="relative">
            <Search
              className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${TEXT_MUTED}`}
              strokeWidth={1.5}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ativo, setup, erro…"
              className={`h-8 w-56 border ${BORDER_INPUT} ${SURFACE} pl-8 pr-2 text-xs ${TEXT_BODY} placeholder:text-zinc-400 outline-none focus:border-zinc-900 dark:placeholder:text-zinc-600 dark:focus:border-zinc-100`}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className={`text-[10px] uppercase tracking-[0.15em] ${TEXT_MUTED}`}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cx(`border-b ${BORDER} px-4 py-3 text-left font-semibold`, h === "PnL" && "text-right")}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const open = expandedId === t.id;
              return (
                <Fragment key={t.id}>
                  <tr
                    onClick={() => toggle(t.id)}
                    className={cx(
                      "cursor-pointer transition",
                      open ? "bg-zinc-50 dark:bg-zinc-900/50" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30",
                    )}
                  >
                    <td className={`${CELL} w-10`}>
                      <ChevronRight
                        className={cx("h-4 w-4 transition-transform", TEXT_MUTED, open && `rotate-90 ${TEXT_BODY}`)}
                        strokeWidth={1.5}
                      />
                    </td>
                    <td className={CELL}>
                      <div className="flex flex-col">
                        <span className={`text-xs font-medium ${TEXT_BODY}`}>{t.date || "—"}</span>
                        <span className={`font-mono text-[10px] ${TEXT_MUTED}`}>
                          {t.entryTime || "--:--"} → {t.exitTime || "--:--"}
                        </span>
                      </div>
                    </td>
                    <td className={CELL}>
                      <div className={`text-sm font-semibold ${TEXT_BODY}`}>{t.asset || "—"}</div>
                      <div className={`text-[10px] uppercase tracking-[0.15em] ${TEXT_MUTED}`}>{t.assetClass || ""}</div>
                    </td>
                    <td className={CELL}><DirectionTag direction={t.direction} /></td>
                    <td className={CELL}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${TEXT_BODY}`}>{t.setup || "—"}</span>
                        {t.killzone && (
                          <Tag size="xs">{KZ_LABEL[t.killzone] || t.killzone}</Tag>
                        )}
                      </div>
                    </td>
                    <td className={CELL}>
                      <div className="flex items-center gap-2">
                        <ResultTag result={t.result} />
                        {t.mistake && (
                          <span className="hidden sm:inline text-[10px] italic text-rose-500">
                            · {t.mistake}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${CELL} text-right`}>
                      <span className={`font-mono text-sm font-bold tabular-nums ${pnlClass(Number(t.pnl) || 0)}`}>
                        {signedUsd(Number(t.pnl) || 0)}
                      </span>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <ExpandedRow trade={t} onEdit={onEdit} onDelete={onDelete} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className={`flex flex-col items-center justify-center gap-1 border-t ${BORDER_ROW} px-4 py-12 text-center`}>
            <p className={`text-sm font-semibold ${TEXT_SOFT}`}>
              {trades.length === 0 ? "Nenhum trade registrado ainda." : "Nenhum trade encontrado."}
            </p>
            <p className={`text-xs ${TEXT_MUTED}`}>
              {trades.length === 0
                ? "Use o botão “Novo Trade” para registrar sua primeira execução."
                : "Ajuste o filtro ou a busca para ver mais resultados."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
