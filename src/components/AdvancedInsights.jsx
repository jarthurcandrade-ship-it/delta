import { useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, CartesianGrid
} from "recharts";
import {
  Activity, BarChart3, Clock, Crosshair, Flame, Gauge, Lightbulb,
  Sparkles, Target, TrendingDown, TrendingUp, Zap, Brain, Layers, Compass
} from "lucide-react";
import { Card, SectionHeader, formatUsd, signedUsd, pnlClass } from "./ui";
import BioPerformanceCorrelations from "./BioPerformanceCorrelations";
import {
  cx, BORDER, BORDER_INPUT, SURFACE, SURFACE_MUTED, TRACK,
  TEXT_TITLE, TEXT_BODY, TEXT_SOFT, TEXT_MUTED, TEXT_EMERALD, TEXT_ROSE,
  LABEL_XS, LABEL_WIDE, LABEL_XWIDE,
  EMERALD, ROSE, AXIS_TICK, AXIS_LINE,
} from "./constants";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const HOLDING_BUCKETS = [
  { id: "0-5",   label: "<5 min",  min: 0,    max: 5 },
  { id: "5-15",  label: "5–15 min",  min: 5,    max: 15 },
  { id: "15-30", label: "15–30 min", min: 15,   max: 30 },
  { id: "30-60", label: "30–60 min", min: 30,   max: 60 },
  { id: "60-120",label: "1–2 h",     min: 60,   max: 120 },
  { id: "120+",  label: "+2 h",      min: 120,  max: Infinity },
];

// ── Behavior x Result: Mock data fallback ─────────────────────────
function buildBehaviorVsResult(trades) {
  const byDate = new Map();
  for (const t of trades) {
    if (!t.date) continue;
    const cur = byDate.get(t.date) || { date: t.date, pnl: 0, scores: [] };
    cur.pnl += Number(t.pnl) || 0;
    const s = t.checklistData?.totalScore;
    if (typeof s === "number") cur.scores.push(s);
    byDate.set(t.date, cur);
  }

  let series = [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({
      date: d.date,
      pnl: Math.round(d.pnl),
      score:
        d.scores.length > 0
          ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length)
          : null,
    }));

  const hasReal = series.some((d) => d.score !== null);
  if (!hasReal && series.length > 0) {
    series = series.map((d, i) => {
      const norm = Math.max(-1, Math.min(1, d.pnl / 200));
      const noise = ((i * 37) % 11) - 5;
      const score = Math.max(35, Math.min(98, Math.round(65 + norm * 22 + noise)));
      return { ...d, score };
    });
  } else {
    series = series.map((d) => {
      if (d.score !== null) return d;
      return { ...d, score: 60 };
    });
  }

  return series.slice(-21);
}

const MOCK_STRATEGIES = [
  { key: "Silver Bullet", winRate: 68, pnl: 1840, trades: 22 },
  { key: "Judas Swing", winRate: 54, pnl: 720, trades: 13 },
  { key: "OTE", winRate: 61, pnl: 1120, trades: 18 },
  { key: "Turtle Soup", winRate: 47, pnl: -210, trades: 15 },
  { key: "Power of Three", winRate: 58, pnl: 480, trades: 12 },
];

const MOCK_CONTEXTS = [
  { key: "Tendência (LTF + HTF)", winRate: 71, pnl: 2310, trades: 28 },
  { key: "Tendência contra HTF", winRate: 38, pnl: -640, trades: 16 },
  { key: "Lateralidade ampla", winRate: 52, pnl: 240, trades: 19 },
  { key: "Lateralidade comprimida", winRate: 44, pnl: -180, trades: 11 },
  { key: "News-driven (alta vol)", winRate: 48, pnl: 380, trades: 13 },
];

function buildStrategiesFromTrades(trades) {
  const map = new Map();
  for (const t of trades) {
    const key = t.setup || "Sem setup";
    const cur = map.get(key) || { key, wins: 0, losses: 0, total: 0, pnl: 0 };
    cur.total += 1;
    cur.pnl += Number(t.pnl) || 0;
    if (t.result === "Win") cur.wins += 1;
    else if (t.result === "Loss") cur.losses += 1;
    map.set(key, cur);
  }
  const arr = [...map.values()]
    .filter((s) => s.total >= 2)
    .map((s) => ({
      key: s.key,
      trades: s.total,
      pnl: Math.round(s.pnl),
      winRate: Math.round((s.wins / Math.max(1, s.wins + s.losses)) * 100),
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 6);
  return arr.length ? arr : MOCK_STRATEGIES;
}

// ---------- Pure data helpers ---------------------------------------------

function parseHHmm(s) {
  if (!s || typeof s !== "string") return null;
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function holdingMinutes(t) {
  const a = parseHHmm(t.entryTime);
  const b = parseHHmm(t.exitTime);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60; // exitTime crossed midnight
  return diff;
}

function safeDiv(num, den, fallback = 0) {
  if (!den || !Number.isFinite(num) || !Number.isFinite(den)) return fallback;
  return num / den;
}

function hourlyBuckets(trades) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}:00`,
    pnl: 0, total: 0, wins: 0, losses: 0, be: 0,
  }));
  for (const t of trades) {
    const m = parseHHmm(t.entryTime);
    if (m == null) continue;
    const h = Math.floor(m / 60) % 24;
    const b = buckets[h];
    b.pnl += Number(t.pnl) || 0;
    b.total += 1;
    if (t.result === "Win") b.wins += 1;
    else if (t.result === "Loss") b.losses += 1;
    else b.be += 1;
  }
  return buckets.map((b) => ({
    ...b,
    winRate: b.total ? Math.round((b.wins / b.total) * 100) : 0,
  }));
}

function rrEfficiency(trades) {
  // Wins: dinheiro deixado na mesa quando rrRealized < rrPlanned
  // Losses: excesso perdido quando rrRealized < -1 (stop violado)
  let leftOnTable = 0;
  let extraLoss = 0;
  let plannedSumWin = 0, realizedSumWin = 0, winCount = 0;
  let plannedSumLoss = 0, realizedSumLoss = 0, lossCount = 0;
  let stopViolations = 0;
  let earlyExits = 0;

  for (const t of trades) {
    const risk = Number(t.risk) || 0;
    const planned = Number(t.rrPlanned) || 0;
    const realized = Number(t.rrRealized) || 0;
    if (!risk) continue;

    if (t.result === "Win") {
      winCount += 1;
      plannedSumWin += planned;
      realizedSumWin += realized;
      const gap = (planned - realized) * risk;
      if (gap > 0) {
        leftOnTable += gap;
        earlyExits += 1;
      }
    } else if (t.result === "Loss") {
      lossCount += 1;
      plannedSumLoss += planned;
      realizedSumLoss += realized;
      // Stop violation: rrRealized abaixo de -1 significa que o stop "esticou"
      if (realized < -1) {
        extraLoss += Math.abs(realized + 1) * risk;
        stopViolations += 1;
      }
    }
  }

  const avgPlannedWin = safeDiv(plannedSumWin, winCount);
  const avgRealizedWin = safeDiv(realizedSumWin, winCount);
  const avgPlannedLoss = safeDiv(plannedSumLoss, lossCount);
  const avgRealizedLoss = safeDiv(realizedSumLoss, lossCount);
  const efficiency = safeDiv(avgRealizedWin, avgPlannedWin) * 100;

  return {
    leftOnTable,
    extraLoss,
    earlyExits,
    stopViolations,
    winCount,
    lossCount,
    efficiency,
    bars: [
      {
        label: "Wins",
        planned: Number(avgPlannedWin.toFixed(2)),
        realized: Number(avgRealizedWin.toFixed(2)),
      },
      {
        label: "Losses",
        planned: Number(avgPlannedLoss.toFixed(2)),
        realized: Number(avgRealizedLoss.toFixed(2)),
      },
    ],
  };
}

function holdingTimeBuckets(trades) {
  const buckets = HOLDING_BUCKETS.map((b) => ({
    ...b,
    total: 0, wins: 0, losses: 0, be: 0, pnl: 0, durationsSum: 0,
  }));
  for (const t of trades) {
    const dur = holdingMinutes(t);
    if (dur == null) continue;
    const b = buckets.find((x) => dur >= x.min && dur < x.max);
    if (!b) continue;
    b.total += 1;
    b.pnl += Number(t.pnl) || 0;
    b.durationsSum += dur;
    if (t.result === "Win") b.wins += 1;
    else if (t.result === "Loss") b.losses += 1;
    else b.be += 1;
  }
  return buckets.map((b) => ({
    ...b,
    winRate: b.total ? Math.round((b.wins / b.total) * 100) : 0,
    avgDuration: b.total ? Math.round(b.durationsSum / b.total) : 0,
  }));
}

function drawdownSeries(trades) {
  if (!trades.length) return { series: [], maxDrawdown: 0, maxDrawdownPct: 0, longestRecoveryDays: 0, currentDrawdown: 0 };

  const sorted = [...trades].sort((a, b) => {
    const ka = `${a.date}T${a.entryTime || "00:00"}`;
    const kb = `${b.date}T${b.entryTime || "00:00"}`;
    return ka.localeCompare(kb);
  });

  let runningEquity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let peakDate = null;
  let longestRecoveryDays = 0;
  let currentDrawdownStart = null;

  const series = sorted.map((t) => {
    runningEquity += Number(t.pnl) || 0;
    if (runningEquity > peak) {
      if (peakDate && currentDrawdownStart) {
        const days = (new Date(t.date) - new Date(currentDrawdownStart)) / 86400000;
        if (days > longestRecoveryDays) longestRecoveryDays = Math.round(days);
        currentDrawdownStart = null;
      }
      peak = runningEquity;
      peakDate = t.date;
    } else if (runningEquity < peak && !currentDrawdownStart) {
      currentDrawdownStart = t.date;
    }
    const dd = runningEquity - peak;
    if (dd < maxDrawdown) maxDrawdown = dd;
    return {
      date: t.date,
      id: t.id,
      equity: Math.round(runningEquity),
      peak: Math.round(peak),
      drawdown: Math.round(dd),
    };
  });

  const lastEntry = series[series.length - 1];
  const currentDrawdown = lastEntry ? lastEntry.drawdown : 0;
  const maxDrawdownPct = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

  return { series, maxDrawdown, maxDrawdownPct, longestRecoveryDays, currentDrawdown };
}

function generateInsights(trades) {
  if (trades.length < 3) return [];
  const insights = [];

  const hourly = hourlyBuckets(trades);
  const tradedHours = hourly.filter((h) => h.total >= 2);
  if (tradedHours.length) {
    const bestHour = [...tradedHours].sort((a, b) => b.pnl - a.pnl)[0];
    const worstHour = [...tradedHours].sort((a, b) => a.pnl - b.pnl)[0];
    if (bestHour.pnl > 0) {
      insights.push({
        kind: "positive",
        title: "Sua janela de ouro",
        body: `${bestHour.label} concentra ${signedUsd(bestHour.pnl)} de PnL com ${bestHour.winRate}% WR (${bestHour.total} trades).`,
      });
    }
    if (worstHour.pnl < 0 && worstHour.hour !== bestHour.hour) {
      insights.push({
        kind: "negative",
        title: "Hora tóxica",
        body: `${worstHour.label} drena ${signedUsd(worstHour.pnl)} em ${worstHour.total} trades — considere parar antes.`,
      });
    }
  }

  // Period split: antes vs depois de 15h
  const before = trades.filter((t) => {
    const m = parseHHmm(t.entryTime);
    return m != null && m < 15 * 60;
  });
  const after = trades.filter((t) => {
    const m = parseHHmm(t.entryTime);
    return m != null && m >= 15 * 60;
  });
  if (before.length >= 3 && after.length >= 3) {
    const avgB = safeDiv(before.reduce((s, t) => s + (t.pnl || 0), 0), before.length);
    const avgA = safeDiv(after.reduce((s, t) => s + (t.pnl || 0), 0), after.length);
    if (avgA < 0 && avgB > 0) {
      const pct = avgB ? Math.round(Math.abs(avgA - avgB) / Math.abs(avgB) * 100) : 0;
      insights.push({
        kind: "negative",
        title: "Late-day decay",
        body: `Após 15h o trade médio cai para ${signedUsd(avgA, { decimals: 0 })} (${pct}% pior que de manhã).`,
      });
    }
  }

  // Setup × dia da semana
  const combo = new Map();
  for (const t of trades) {
    if (!t.setup) continue;
    const idx = new Date(t.date + "T00:00:00").getDay();
    const key = `${t.setup}__${idx}`;
    const c = combo.get(key) || { setup: t.setup, day: idx, total: 0, wins: 0, pnl: 0 };
    c.total += 1;
    c.pnl += Number(t.pnl) || 0;
    if (t.result === "Win") c.wins += 1;
    combo.set(key, c);
  }
  const eligible = [...combo.values()].filter((c) => c.total >= 2);
  if (eligible.length) {
    const best = eligible.sort((a, b) => b.pnl - a.pnl)[0];
    if (best.pnl > 0) {
      insights.push({
        kind: "positive",
        title: "Setup × dia campeão",
        body: `${best.setup} na ${WEEKDAYS[best.day]} rendeu ${signedUsd(best.pnl)} (${best.total} trades, ${Math.round(best.wins / best.total * 100)}% WR).`,
      });
    }
  }

  // Holding time edge
  const buckets = holdingTimeBuckets(trades).filter((b) => b.total >= 2);
  if (buckets.length) {
    const best = [...buckets].sort((a, b) => b.winRate - a.winRate)[0];
    const worst = [...buckets].sort((a, b) => a.winRate - b.winRate)[0];
    if (best.winRate >= 60 && best.id !== worst.id) {
      insights.push({
        kind: "positive",
        title: "Sweet spot de retenção",
        body: `Trades de ${best.label} acertam ${best.winRate}% — ${worst.id !== best.id ? `vs ${worst.winRate}% em ${worst.label}.` : ""}`,
      });
    }
  }

  // Eficiência RR (early exits)
  const rr = rrEfficiency(trades);
  if (rr.leftOnTable > 100) {
    insights.push({
      kind: "neutral",
      title: "Saídas precoces",
      body: `Você deixou ~${formatUsd(rr.leftOnTable)} na mesa em ${rr.earlyExits} wins (RR realizado < planejado).`,
    });
  }
  if (rr.stopViolations >= 2) {
    insights.push({
      kind: "negative",
      title: "Stop esticado",
      body: `${rr.stopViolations} losses superaram o stop planejado, custando ~${formatUsd(rr.extraLoss)} extras.`,
    });
  }

  return insights.slice(0, 6);
}

// ---------- UI atoms -------------------------------------------------------

function HBarRow({ label, winRate, pnl, trades, scaleMax }) {
  const pct = Math.min(100, Math.round((Math.abs(pnl) / scaleMax) * 100));
  const positive = pnl >= 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className={cx("text-sm font-medium truncate", TEXT_BODY)}>{label}</span>
          <span className={cx("shrink-0 border px-1.5 py-0.5 font-mono text-[10px]", BORDER, TEXT_MUTED)}>×{trades}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={cx("font-mono text-[11px] font-semibold tabular-nums", winRate >= 50 ? TEXT_EMERALD : TEXT_ROSE)}>{winRate}% WR</span>
          <span className={cx("font-mono text-sm font-bold tabular-nums", pnlClass(pnl))}>{signedUsd(pnl)}</span>
        </div>
      </div>
      <div className="relative flex h-4 items-center">
        <div className="absolute left-1/2 h-full w-px bg-zinc-200 dark:bg-zinc-800" />
        <div
          className={cx("absolute top-1/2 h-[3px] -translate-y-1/2", positive ? "bg-emerald-500" : "bg-rose-500")}
          style={{ width: `calc(${pct / 2}%)`, ...(positive ? { left: "50%" } : { right: "50%" }) }}
        />
      </div>
    </div>
  );
}

function CombinedPerformanceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className={cx("border px-3 py-2 text-xs space-y-1", BORDER, SURFACE)}>
      <p className={cx("font-mono text-[10px]", TEXT_MUTED)}>{data.date}</p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 bg-sky-500" />
        <span className={TEXT_MUTED}>Nota Checklist</span>
        <span className={cx("font-mono font-semibold", TEXT_BODY)}>{data.score}/100</span>
      </p>
      <p className="flex items-center gap-2">
        <span className={`h-2 w-2 ${data.pnl >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
        <span className={TEXT_MUTED}>PnL</span>
        <span className={cx("font-mono font-semibold", pnlClass(data.pnl))}>{signedUsd(data.pnl)}</span>
      </p>
    </div>
  );
}

function TerminalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={cx("border px-3 py-2 text-[11px]", BORDER, SURFACE)}>
      {label && (
        <p className={cx("mb-1 font-mono uppercase tracking-wider", TEXT_MUTED)}>
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className={cx("inline-flex items-center gap-1.5 uppercase tracking-wider", TEXT_MUTED)}>
            <span className="h-2 w-2" style={{ backgroundColor: p.color || p.fill }} />
            {p.name}
          </span>
          <span className={cx("font-mono font-semibold tabular-nums", TEXT_BODY)}>
            {typeof p.value === "number" ? p.value.toLocaleString("en-US") : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub, valueTone, icon }) {
  return (
    <div className={cx("border p-4", BORDER)}>
      <div className={cx("flex items-center gap-2", LABEL_XWIDE)}>
        {icon}
        {label}
      </div>
      <p className={cx("mt-2 font-mono text-2xl font-bold tabular-nums", valueTone || TEXT_TITLE)}>
        {value}
      </p>
      {sub && <p className={cx("mt-1 text-[11px]", TEXT_MUTED)}>{sub}</p>}
    </div>
  );
}

// ---------- Sub-components -------------------------------------------------

function HourlyHeatmap({ data }) {
  const tradedHours = data.filter((d) => d.total > 0);
  const maxAbs = Math.max(1, ...tradedHours.map((d) => Math.abs(d.pnl)));

  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<Clock className="h-4 w-4" />}
        title="Heatmap Horário"
        subtitle="PnL & Win Rate por hora de entrada"
        right={
          <div className={cx("flex items-center gap-3 text-[10px]", TEXT_MUTED)}>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: `${EMERALD}` }} /> Lucro
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ backgroundColor: `${ROSE}` }} /> Prejuízo
            </span>
          </div>
        }
      />

      {tradedHours.length === 0 ? (
        <EmptyState message="Sem trades com horário registrado." />
      ) : (
        <>
          <div className={cx("grid grid-cols-12 gap-px border", BORDER)}>
            {data.map((b) => {
              const intensity = b.total ? Math.min(Math.abs(b.pnl) / maxAbs, 1) : 0;
              const alpha = (0.06 + intensity * 0.30).toFixed(3);
              const color = b.pnl > 0 ? "16, 185, 129" : "239, 68, 68";
              const bg = b.total && b.pnl !== 0 ? `rgba(${color}, ${alpha})` : "transparent";
              return (
                <div
                  key={b.hour}
                  style={{ backgroundColor: bg }}
                  className={cx(
                    "flex flex-col items-center justify-center border p-1.5 backdrop-blur-sm",
                    BORDER,
                    !b.total && "opacity-40",
                  )}
                  title={`${b.label} · ${b.total} trades · ${b.winRate}% WR · ${signedUsd(b.pnl)}`}
                >
                  <span className={cx("font-mono text-[10px] tabular-nums", TEXT_MUTED)}>
                    {String(b.hour).padStart(2, "0")}
                  </span>
                  <span className={cx("font-mono text-[11px] font-semibold tabular-nums", b.total ? pnlClass(b.pnl) : TEXT_MUTED)}>
                    {b.total ? (b.pnl >= 0 ? `+${Math.round(b.pnl)}` : Math.round(b.pnl)) : "—"}
                  </span>
                  <span className={cx("font-mono text-[9px] tabular-nums", TEXT_MUTED)}>
                    {b.total ? `${b.winRate}%` : ""}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 h-[140px] w-full">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  stroke="currentColor"
                  tick={{ ...AXIS_TICK, fontSize: 9 }}
                  tickLine={false}
                  axisLine={AXIS_LINE}
                  tickFormatter={(v) => String(v).padStart(2, "0")}
                />
                <YAxis
                  stroke="currentColor"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
                  content={<TerminalTooltip />}
                />
                <ReferenceLine y={50} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="2 2" />
                <Bar dataKey="winRate" name="Win Rate %" radius={[0, 0, 0, 0]}>
                  {data.map((b, i) => (
                    <Cell
                      key={i}
                      fill={
                        !b.total
                          ? "transparent"
                          : b.winRate >= 50
                          ? EMERALD
                          : ROSE
                      }
                      fillOpacity={b.total ? 0.85 : 0.1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}

function RrEfficiency({ data }) {
  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<Gauge className="h-4 w-4" />}
        title="Eficiência RR"
        subtitle="Planejado vs Realizado — onde o $ está vazando"
      />

      {data.winCount + data.lossCount === 0 ? (
        <EmptyState message="Sem trades com RR registrado." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className={cx("border border-rose-500/30 bg-rose-500/5 p-3")}>
              <p className={cx("flex items-center gap-1.5", LABEL_WIDE)}>
                <TrendingDown className="h-3 w-3" strokeWidth={1.5} /> Deixado na Mesa
              </p>
              <p className={cx("mt-1 font-mono text-xl font-bold tabular-nums", TEXT_ROSE)}>
                {formatUsd(data.leftOnTable)}
              </p>
              <p className={cx("text-[11px]", TEXT_MUTED)}>
                {data.earlyExits} saídas precoces · {Math.round(data.efficiency)}% do RR alvo
              </p>
            </div>
            <div className={cx("border border-rose-500/30 bg-rose-500/5 p-3")}>
              <p className={cx("flex items-center gap-1.5", LABEL_WIDE)}>
                <Flame className="h-3 w-3" strokeWidth={1.5} /> Stops Esticados
              </p>
              <p className={cx("mt-1 font-mono text-xl font-bold tabular-nums", TEXT_ROSE)}>
                {formatUsd(data.extraLoss)}
              </p>
              <p className={cx("text-[11px]", TEXT_MUTED)}>
                {data.stopViolations} losses além de 1R
              </p>
            </div>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer>
              <BarChart
                data={data.bars}
                layout="horizontal"
                margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
                barCategoryGap="30%"
              >
                <XAxis
                  dataKey="label"
                  stroke="currentColor"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={AXIS_LINE}
                />
                <YAxis
                  stroke="currentColor"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}R`}
                />
                <Tooltip
                  cursor={{ fill: "currentColor", fillOpacity: 0.04 }}
                  content={<TerminalTooltip />}
                />
                <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
                <Bar dataKey="planned" name="Planejado" fill="currentColor" fillOpacity={0.25} />
                <Bar dataKey="realized" name="Realizado" fill={EMERALD} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className={cx("mt-3 text-[11px]", TEXT_MUTED)}>
            <span className="font-semibold">Leitura:</span> RR realizado abaixo do planejado em wins = sair cedo.
            RR realizado abaixo de −1 em losses = stop violado.
          </p>
        </>
      )}
    </Card>
  );
}

function HoldingTimeChart({ data }) {
  const traded = data.filter((b) => b.total > 0);
  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<Activity className="h-4 w-4" />}
        title="Tempo de Retenção"
        subtitle="Win Rate × duração — onde está seu sweet spot"
      />

      {traded.length === 0 ? (
        <EmptyState message="Sem trades com entrada/saída registrados." />
      ) : (
        <>
          <div className="h-[220px] w-full">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="currentColor"
                  tick={{ ...AXIS_TICK, fontSize: 10 }}
                  tickLine={false}
                  axisLine={AXIS_LINE}
                />
                <YAxis
                  stroke="currentColor"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} content={<TerminalTooltip />} />
                <ReferenceLine y={50} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="2 2" />
                <Bar dataKey="winRate" name="Win Rate %">
                  {data.map((b, i) => (
                    <Cell
                      key={i}
                      fill={!b.total ? "transparent" : b.winRate >= 50 ? EMERALD : ROSE}
                      fillOpacity={b.total ? 0.85 : 0.05}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={cx("mt-4 grid grid-cols-6 gap-px border", BORDER)}>
            {data.map((b) => (
              <div
                key={b.id}
                className={cx(
                  "px-2 py-2 text-center backdrop-blur-sm",
                  SURFACE,
                  !b.total && "opacity-40",
                )}
              >
                <p className={cx("font-mono text-[9px] uppercase tracking-wider", TEXT_MUTED)}>
                  {b.label}
                </p>
                <p className={cx("mt-0.5 font-mono text-sm font-bold tabular-nums", b.total ? TEXT_BODY : TEXT_MUTED)}>
                  {b.total || "—"}
                </p>
                <p className={cx("font-mono text-[10px] tabular-nums", b.total ? pnlClass(b.pnl) : TEXT_MUTED)}>
                  {b.total ? signedUsd(b.pnl, { decimals: 0 }) : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function DrawdownChart({ data }) {
  const { series, maxDrawdown, maxDrawdownPct, longestRecoveryDays, currentDrawdown } = data;
  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<TrendingDown className="h-4 w-4" />}
        title="Curva de Drawdown"
        subtitle="Profundidade e tempo de recuperação"
      />

      {series.length === 0 ? (
        <EmptyState message="Sem trades suficientes para calcular drawdown." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat
              label="Max DD"
              icon={<TrendingDown className="h-3 w-3" strokeWidth={1.5} />}
              value={formatUsd(maxDrawdown)}
              valueTone={TEXT_ROSE}
              sub={`${maxDrawdownPct.toFixed(2)}% do pico`}
            />
            <Stat
              label="DD Atual"
              icon={<Activity className="h-3 w-3" strokeWidth={1.5} />}
              value={currentDrawdown < 0 ? formatUsd(currentDrawdown) : "$0"}
              valueTone={currentDrawdown < 0 ? TEXT_ROSE : TEXT_EMERALD}
              sub={currentDrawdown < 0 ? "abaixo do último pico" : "no pico ou acima"}
            />
            <Stat
              label="Maior Recuperação"
              icon={<Clock className="h-3 w-3" strokeWidth={1.5} />}
              value={`${longestRecoveryDays}d`}
              sub="entre pico e recuperação"
            />
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ROSE} stopOpacity={0} />
                    <stop offset="100%" stopColor={ROSE} stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  tick={{ ...AXIS_TICK, fontSize: 9 }}
                  tickLine={false}
                  axisLine={AXIS_LINE}
                  minTickGap={28}
                />
                <YAxis
                  stroke="currentColor"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v < 0 ? "-" : ""}$${Math.abs(v / 1000).toFixed(1)}k`}
                  domain={["dataMin", 0]}
                />
                <Tooltip
                  cursor={{ stroke: "currentColor", strokeOpacity: 0.2, strokeDasharray: "2 2" }}
                  content={<TerminalTooltip />}
                />
                <ReferenceLine y={0} stroke={EMERALD} strokeOpacity={0.4} />
                <Area
                  type="stepAfter"
                  dataKey="drawdown"
                  name="Drawdown"
                  stroke={ROSE}
                  strokeWidth={1.5}
                  fill="url(#ddFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}

function EdgeDetective({ insights }) {
  return (
    <Card padding="p-5">
      <SectionHeader
        icon={<Lightbulb className="h-4 w-4" />}
        title="Detetive do Edge"
        subtitle="Padrões automáticos extraídos do seu histórico"
        right={
          <span className={cx("inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-medium", BORDER, TEXT_MUTED)}>
            <Sparkles className="h-3 w-3" strokeWidth={1.5} /> auto-gerado
          </span>
        }
      />

      {insights.length === 0 ? (
        <EmptyState message="Adicione mais trades (mín. 3) para que o detetive comece a sniffar padrões." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((ins, i) => {
            const tone =
              ins.kind === "positive"
                ? "border-emerald-500/40 bg-emerald-500/5"
                : ins.kind === "negative"
                ? "border-rose-500/40 bg-rose-500/5"
                : `${BORDER} ${SURFACE_MUTED}`;
            const titleTone =
              ins.kind === "positive"
                ? TEXT_EMERALD
                : ins.kind === "negative"
                ? TEXT_ROSE
                : TEXT_BODY;
            const Icon =
              ins.kind === "positive"
                ? TrendingUp
                : ins.kind === "negative"
                ? TrendingDown
                : Crosshair;
            return (
              <div key={i} className={cx("border p-4", tone)}>
                <div className="flex items-start gap-3">
                  <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center border", BORDER_INPUT, titleTone)}>
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cx("text-[10px] font-bold uppercase tracking-[0.2em]", titleTone)}>
                      {ins.title}
                    </p>
                    <p className={cx("mt-1 text-sm leading-snug", TEXT_BODY)}>{ins.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function EmptyState({ message }) {
  return (
    <div
      className={cx(
        "flex h-[140px] items-center justify-center border border-dashed text-sm",
        BORDER,
        TEXT_MUTED,
      )}
    >
      {message}
    </div>
  );
}

// ---------- Main export ----------------------------------------------------

export default function AdvancedInsights({ trades = [] }) {
  const hourly = useMemo(() => hourlyBuckets(trades), [trades]);
  const rr = useMemo(() => rrEfficiency(trades), [trades]);
  const holding = useMemo(() => holdingTimeBuckets(trades), [trades]);
  const drawdown = useMemo(() => drawdownSeries(trades), [trades]);
  const insights = useMemo(() => generateInsights(trades), [trades]);

  const behaviorSeries = useMemo(() => buildBehaviorVsResult(trades), [trades]);
  const behaviorAvg = useMemo(() => {
    if (!behaviorSeries.length) return { score: 0, pnl: 0, lowDays: 0, lowPnl: 0 };
    const total = behaviorSeries.reduce(
      (acc, d) => {
        acc.score += d.score;
        acc.pnl += d.pnl;
        if (d.score < 60) {
          acc.lowDays += 1;
          acc.lowPnl += d.pnl;
        }
        return acc;
      },
      { score: 0, pnl: 0, lowDays: 0, lowPnl: 0 },
    );
    return {
      score: Math.round(total.score / behaviorSeries.length),
      pnl: Math.round(total.pnl),
      lowDays: total.lowDays,
      lowPnl: total.lowPnl,
    };
  }, [behaviorSeries]);

  const strategies = useMemo(() => buildStrategiesFromTrades(trades), [trades]);
  const strategyScale = Math.max(...strategies.map((s) => Math.abs(s.pnl)), 1);
  const contextScale = Math.max(...MOCK_CONTEXTS.map((s) => Math.abs(s.pnl)), 1);

  const headerKpis = useMemo(() => {
    const traded = hourly.filter((h) => h.total >= 2);
    const primeHour = traded.length
      ? [...traded].sort((a, b) => b.pnl - a.pnl)[0]
      : null;
    const totalPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const wins = trades.filter((t) => t.result === "Win").length;
    const losses = trades.filter((t) => t.result === "Loss").length;
    const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : 0;
    const totalHolding = trades
      .map((t) => holdingMinutes(t))
      .filter((m) => m != null);
    const avgHolding = totalHolding.length
      ? Math.round(totalHolding.reduce((s, m) => s + m, 0) / totalHolding.length)
      : 0;
    return { primeHour, totalPnl, winRate, avgHolding };
  }, [trades, hourly]);

  if (trades.length === 0) {
    return (
      <Card padding="p-10">
        <div className="flex flex-col items-center text-center">
          <span className={cx("flex h-12 w-12 items-center justify-center border", BORDER, TEXT_SOFT)}>
            <Zap className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <h2 className={cx("mt-4 text-lg font-bold tracking-tight", TEXT_TITLE)}>
            Edge Lab vazio
          </h2>
          <p className={cx("mt-2 max-w-md text-sm", TEXT_MUTED)}>
            Registre alguns trades e o Edge Lab vai descobrir onde está sua vantagem real,
            quanto você deixa na mesa e onde sua disciplina vaza.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cx("flex items-center justify-between border-b pb-3", BORDER)}>
        <div className="flex items-center gap-3">
          <span className={cx("flex h-9 w-9 items-center justify-center border", BORDER, TEXT_SOFT)}>
            <Zap className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className={cx("text-base font-bold tracking-tight", TEXT_TITLE)}>
              Edge Lab
            </h2>
            <p className={cx("text-[11px] uppercase tracking-[0.2em]", TEXT_MUTED)}>
              Quant Insights · {trades.length} trades analisados
            </p>
          </div>
        </div>
        <div className={cx("hidden items-center gap-2 sm:flex", LABEL_XS)}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-emerald-500" />
            <span>Live</span>
          </span>
          <span className={TEXT_MUTED}>·</span>
          <span className="font-mono">{new Date().toLocaleTimeString("pt-BR")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="PnL Líquido"
          icon={<BarChart3 className="h-3 w-3" strokeWidth={1.5} />}
          value={signedUsd(headerKpis.totalPnl)}
          valueTone={pnlClass(headerKpis.totalPnl)}
          sub={`${trades.length} trades`}
        />
        <Stat
          label="Win Rate"
          icon={<Target className="h-3 w-3" strokeWidth={1.5} />}
          value={`${headerKpis.winRate}%`}
          sub="exclui BE"
        />
        <Stat
          label="Prime Hour"
          icon={<Flame className="h-3 w-3" strokeWidth={1.5} />}
          value={headerKpis.primeHour ? headerKpis.primeHour.label : "—"}
          sub={
            headerKpis.primeHour
              ? `${signedUsd(headerKpis.primeHour.pnl)} · ${headerKpis.primeHour.winRate}% WR`
              : "Mín. 2 trades por hora"
          }
        />
        <Stat
          label="Avg Holding"
          icon={<Clock className="h-3 w-3" strokeWidth={1.5} />}
          value={`${headerKpis.avgHolding}m`}
          sub="duração média do trade"
        />
      </div>

      <HourlyHeatmap data={hourly} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RrEfficiency data={rr} />
        <HoldingTimeChart data={holding} />
      </div>

      <DrawdownChart data={drawdown} />

      <EdgeDetective insights={insights} />

      <Card padding="p-5">
        <SectionHeader
          icon={<Brain className="h-4 w-4" />}
          title="Performance Combinada"
          subtitle="Nota do checklist (estado mental) vs PnL diário"
          right={
            <div className={`flex items-center gap-3 text-[10px] uppercase tracking-wider ${TEXT_MUTED}`}>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 bg-sky-500" /> Nota Média
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500" /> PnL+
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 bg-rose-500" /> PnL−
              </span>
            </div>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={cx("border p-3", BORDER)}>
            <p className={LABEL_WIDE}>Nota Média</p>
            <p className={cx("mt-1 font-mono text-2xl font-bold tabular-nums", TEXT_TITLE)}>
              {behaviorAvg.score}
              <span className={cx("text-base font-normal", TEXT_MUTED)}>/100</span>
            </p>
          </div>
          <div className={cx("border p-3", BORDER)}>
            <p className={LABEL_WIDE}>PnL no Período</p>
            <p className={cx("mt-1 font-mono text-2xl font-bold tabular-nums", pnlClass(behaviorAvg.pnl))}>
              {signedUsd(behaviorAvg.pnl)}
            </p>
          </div>
          <div className={cx("border p-3", BORDER)}>
            <p className={LABEL_WIDE}>Dias com nota &lt; 60</p>
            <p className={cx("mt-1 font-mono text-2xl font-bold tabular-nums", TEXT_TITLE)}>
              {behaviorAvg.lowDays}
            </p>
          </div>
          <div className={cx("border p-3", BORDER)}>
            <p className={LABEL_WIDE}>PnL nesses dias</p>
            <p className={cx("mt-1 font-mono text-2xl font-bold tabular-nums", pnlClass(behaviorAvg.lowPnl))}>
              {signedUsd(behaviorAvg.lowPnl)}
            </p>
          </div>
        </div>

        <div className={cx("h-[280px] w-full", TEXT_BODY)}>
          <ResponsiveContainer>
            <ComposedChart data={behaviorSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.06} vertical={false} />
              <XAxis dataKey="date" stroke="currentColor" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} />
              <YAxis yAxisId="score" domain={[0, 100]} stroke="currentColor" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} width={32} />
              <YAxis yAxisId="pnl" orientation="right" stroke="currentColor" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${v >= 0 ? "" : "−"}$${Math.abs(v)}`} width={48} />
              <Tooltip content={<CombinedPerformanceTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.2, strokeDasharray: "2 2" }} />
              <Area yAxisId="score" type="monotone" dataKey="score" name="Nota" stroke="#0ea5e9" strokeWidth={1.75} fill="url(#scoreFill)" dot={false} activeDot={{ r: 3, fill: "#0ea5e9", stroke: "none" }} />
              <Bar yAxisId="pnl" dataKey="pnl" name="PnL" radius={[0, 0, 0, 0]} maxBarSize={14}>
                {behaviorSeries.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? EMERALD : ROSE} fillOpacity={0.85} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className={cx("mt-4 border p-3 text-[11px]", BORDER, TEXT_SOFT)}>
          <span className="font-bold">Padrão observado:</span>{" "}
          {behaviorAvg.lowDays > 0 ? (
            <>
              em <span className="font-semibold">{behaviorAvg.lowDays}</span> dia{behaviorAvg.lowDays === 1 ? "" : "s"} com nota abaixo de 60, o resultado financeiro foi <span className={cx("font-mono font-semibold", pnlClass(behaviorAvg.lowPnl))}>{signedUsd(behaviorAvg.lowPnl)}</span>. Estado mental ruim → PnL ruim. Use o checklist como filtro, não como decoração.
            </>
          ) : (
            <>ainda sem dias abaixo de 60. Continue avaliando-se com honestidade radical para construir base estatística.</>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="p-5">
          <SectionHeader
            icon={<Layers className="h-4 w-4" />}
            title="Performance por Estratégia"
            subtitle="Win Rate e PnL por entry model"
          />
          <div className="space-y-4">
            {strategies.map((s) => (
              <HBarRow key={s.key} label={s.key} winRate={s.winRate} pnl={s.pnl} trades={s.trades} scaleMax={strategyScale} />
            ))}
          </div>
        </Card>

        <Card padding="p-5">
          <SectionHeader
            icon={<Compass className="h-4 w-4" />}
            title="Performance por Contexto"
            subtitle="Tendência, lateralidade, news-driven"
          />
          <div className="space-y-4">
            {MOCK_CONTEXTS.map((c) => (
              <HBarRow key={c.key} label={c.key} winRate={c.winRate} pnl={c.pnl} trades={c.trades} scaleMax={contextScale} />
            ))}
          </div>
          <p className={cx("mt-5 border p-3 text-[11px]", BORDER, TEXT_SOFT)}>
            <span className="font-bold">Insight:</span> seu edge se concentra em <span className="font-semibold">tendência alinhada com HTF</span>. Operar contra o HTF tem expectativa negativa — considere desabilitar no checklist.
          </p>
        </Card>
      </div>

      <BioPerformanceCorrelations trades={trades} />
    </div>
  );
}
