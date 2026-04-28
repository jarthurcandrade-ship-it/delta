import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, SectionHeader, formatUsd, signedUsd, pnlClass } from "./ui";
import {
  cx, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_SOFT, TEXT_MUTED,
  TEXT_EMERALD, TEXT_ROSE, LABEL_WIDE,
} from "./constants";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const toKey = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const parseDateKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function aggregateByDay(trades) {
  const map = new Map();
  for (const t of trades) {
    if (!t?.date) continue;
    const cur = map.get(t.date) || { pnl: 0, count: 0, wins: 0, losses: 0 };
    cur.pnl += t.pnl || 0;
    cur.count += 1;
    if (t.pnl > 0) cur.wins += 1;
    else if (t.pnl < 0) cur.losses += 1;
    map.set(t.date, cur);
  }
  return map;
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    const prev = new Date(year, month, -startOffset + i + 1);
    cells.push({
      key: toKey(prev.getFullYear(), prev.getMonth(), prev.getDate()),
      day: prev.getDate(),
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: toKey(year, month, d), day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = parseDateKey(cells[cells.length - 1].key);
    last.setDate(last.getDate() + 1);
    cells.push({
      key: toKey(last.getFullYear(), last.getMonth(), last.getDate()),
      day: last.getDate(),
      inMonth: false,
    });
    if (cells.length >= 42) break;
  }
  return cells;
}

function dayBackground(pnl, intensity, inMonth) {
  if (!inMonth) return "";
  if (pnl === 0 || intensity === 0) return "";
  // Glassmorphic tint using emerald/rose at low opacity, scaled by intensity (0..1).
  const alpha = (0.06 + intensity * 0.22).toFixed(3);
  const color = pnl > 0 ? "16, 185, 129" : "239, 68, 68"; // emerald-500 / red-500
  return `rgba(${color}, ${alpha})`;
}

function NavButton({ onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cx(
        "inline-flex h-8 w-8 items-center justify-center border transition",
        "border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900",
        "dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100",
      )}
    >
      {children}
    </button>
  );
}

function MonthSummary({ pnl, dayCount, winDays, lossDays }) {
  const items = [
    { label: "PnL do mês", value: signedUsd(pnl), tone: pnlClass(pnl) },
    { label: "Dias operados", value: String(dayCount), tone: TEXT_BODY },
    { label: "Dias verdes", value: String(winDays), tone: TEXT_EMERALD },
    { label: "Dias vermelhos", value: String(lossDays), tone: TEXT_ROSE },
  ];
  return (
    <div className={cx("grid grid-cols-2 sm:grid-cols-4 gap-px border", BORDER)}>
      {items.map((it) => (
        <div
          key={it.label}
          className="bg-white/60 px-3 py-2 backdrop-blur-sm dark:bg-zinc-950/60"
        >
          <p className={LABEL_WIDE}>{it.label}</p>
          <p className={cx("mt-1 font-mono text-sm font-semibold tabular-nums", it.tone)}>
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function TradingCalendar({ trades = [], onSelectDay, initialDate }) {
  const todayKey = useMemo(() => {
    const d = new Date();
    return toKey(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const [cursor, setCursor] = useState(() => {
    const base = initialDate ? parseDateKey(initialDate) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [selectedKey, setSelectedKey] = useState(null);

  const byDay = useMemo(() => aggregateByDay(trades), [trades]);
  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const monthMaxAbs = useMemo(() => {
    let max = 0;
    for (const c of cells) {
      if (!c.inMonth) continue;
      const v = byDay.get(c.key);
      if (v && Math.abs(v.pnl) > max) max = Math.abs(v.pnl);
    }
    return max || 1;
  }, [cells, byDay]);

  const summary = useMemo(() => {
    let pnl = 0, dayCount = 0, winDays = 0, lossDays = 0;
    for (const c of cells) {
      if (!c.inMonth) continue;
      const v = byDay.get(c.key);
      if (!v) continue;
      pnl += v.pnl;
      dayCount += 1;
      if (v.pnl > 0) winDays += 1;
      else if (v.pnl < 0) lossDays += 1;
    }
    return { pnl, dayCount, winDays, lossDays };
  }, [cells, byDay]);

  const goPrev = () =>
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  const goNext = () =>
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const handleSelect = (cell) => {
    if (!cell.inMonth) return;
    const stats = byDay.get(cell.key) || null;
    setSelectedKey(cell.key);
    onSelectDay?.(cell.key, stats);
  };

  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<CalendarDays className="h-4 w-4" />}
        title="Calendário de Performance"
        subtitle={`${MONTHS[cursor.month]} ${cursor.year}`}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className={cx(
                "border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition",
                "border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900",
                "dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100",
              )}
            >
              Hoje
            </button>
            <NavButton onClick={goPrev} ariaLabel="Mês anterior">
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </NavButton>
            <NavButton onClick={goNext} ariaLabel="Próximo mês">
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </NavButton>
          </div>
        }
      />

      <div className="mb-4">
        <MonthSummary {...summary} />
      </div>

      <div className={cx("grid grid-cols-7 gap-px border", BORDER)}>
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className={cx(
              "bg-white/60 px-2 py-1.5 text-center backdrop-blur-sm dark:bg-zinc-950/60",
              LABEL_WIDE,
            )}
          >
            {w}
          </div>
        ))}

        {cells.map((cell) => {
          const stats = byDay.get(cell.key);
          const pnl = stats?.pnl || 0;
          const intensity = stats ? Math.min(Math.abs(pnl) / monthMaxAbs, 1) : 0;
          const bg = dayBackground(pnl, intensity, cell.inMonth);
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedKey;
          const isPos = pnl > 0;
          const isNeg = pnl < 0;

          return (
            <button
              type="button"
              key={cell.key}
              onClick={() => handleSelect(cell)}
              disabled={!cell.inMonth}
              style={bg ? { backgroundColor: bg } : undefined}
              className={cx(
                "group relative flex min-h-[78px] flex-col justify-between p-2 text-left",
                "backdrop-blur-sm transition-all duration-200",
                "border border-transparent",
                cell.inMonth
                  ? "bg-white/40 dark:bg-zinc-950/40 hover:-translate-y-px hover:shadow-sm cursor-pointer"
                  : "bg-zinc-50/40 dark:bg-zinc-900/20 opacity-40 cursor-default",
                cell.inMonth && isPos && "hover:border-emerald-500/50",
                cell.inMonth && isNeg && "hover:border-rose-500/50",
                cell.inMonth && !stats && "hover:border-zinc-300 dark:hover:border-zinc-700",
                isToday && "ring-1 ring-inset ring-zinc-900 dark:ring-zinc-100",
                isSelected && "border-zinc-900 dark:border-zinc-100",
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cx(
                    "font-mono text-xs tabular-nums",
                    cell.inMonth ? TEXT_BODY : TEXT_MUTED,
                    isToday && "font-bold",
                  )}
                >
                  {String(cell.day).padStart(2, "0")}
                </span>
                {stats && (
                  <span
                    className={cx(
                      "border px-1 py-0 font-mono text-[9px] leading-tight tabular-nums",
                      "border-zinc-200/70 bg-white/70 text-zinc-600",
                      "dark:border-zinc-800/70 dark:bg-zinc-950/70 dark:text-zinc-400",
                    )}
                  >
                    {stats.count}
                  </span>
                )}
              </div>

              {stats && cell.inMonth && (
                <div className="mt-auto">
                  <p
                    className={cx(
                      "font-mono text-[11px] font-semibold tabular-nums leading-tight",
                      pnlClass(pnl),
                    )}
                  >
                    {signedUsd(pnl)}
                  </p>
                  <p className={cx("text-[9px] leading-tight", TEXT_MUTED)}>
                    {stats.wins}W · {stats.losses}L
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={cx("mt-4 flex items-center justify-between text-[10px]", TEXT_MUTED)}>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.28)" }}
            />
            Dia verde
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.28)" }}
            />
            Dia vermelho
          </span>
        </div>
        <span className="uppercase tracking-[0.15em]">Clique em um dia para detalhar</span>
      </div>
    </Card>
  );
}
