import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  PolarAngleAxis, Radar, RadarChart, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Target, Activity, Crosshair, Zap, BarChart3, Trophy, Gauge, DollarSign,
  LineChart as LineChartIcon, Clock4, AlertOctagon, X, Flame, Skull,
  Calendar, CalendarRange, Wallet, ArrowUp, ArrowDown,
} from "lucide-react";
import { Card, SectionHeader, Tag, formatUsd, signedUsd, pnlClass } from "./ui";
import TradingCalendar from "./TradingCalendar";
import {
  aggregateBy, buildEquityCurve, computeMetrics, weekdayPerformance,
  getTodayStats, getWeekStats, getMistakeStats, KILLZONES, DAILY_STOP_USD,
} from "../data/mockTrades";
import {
  cx, BORDER, BORDER_INPUT, SURFACE, TRACK,
  TEXT_TITLE, TEXT_BODY, TEXT_SOFT, TEXT_MUTED, TEXT_EMERALD, TEXT_ROSE,
  LABEL_XS, LABEL_WIDE, LABEL_XWIDE,
  TONE_TEXT, TONE_FILL, TONE_BADGE, pnlTone,
  EMERALD, ROSE, AXIS_TICK, AXIS_LINE,
} from "./constants";

const KZ_LABEL = Object.fromEntries(KILLZONES.map((k) => [k.id, k.label]));
const ICON_BOX = `flex h-8 w-8 items-center justify-center border ${BORDER} ${TEXT_SOFT}`;
const BTN_OUTLINE = `border ${BORDER_INPUT} ${TEXT_SOFT} transition hover:border-zinc-900 hover:text-zinc-900 dark:hover:border-zinc-100 dark:hover:text-zinc-100`;

const DeltaMark = ({ positive, className = "" }) => {
  const Icon = positive ? ArrowUp : ArrowDown;
  return <Icon className={`h-3 w-3 ${className}`} strokeWidth={1.75} />;
};

function KpiCard({ icon, label, value, sub, trend, valueTone }) {
  return (
    <Card padding="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className={ICON_BOX}>{icon}</span>
          <span className={LABEL_XS}>{label}</span>
        </div>
        {trend && (
          <span className={cx(
            "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold",
            TONE_BADGE[trend.positive ? "positive" : "negative"],
          )}>
            <DeltaMark positive={trend.positive} />
            {trend.label}
          </span>
        )}
      </div>
      <p className={cx("mt-4 text-3xl font-bold tracking-tight tabular-nums", valueTone || TEXT_TITLE)}>
        {value}
      </p>
      {sub && <p className={`mt-1 text-xs ${TEXT_MUTED}`}>{sub}</p>}
    </Card>
  );
}

function TooltipBox({ active, payload, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`border ${BORDER} ${SURFACE} px-3 py-2 text-xs`}>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={TEXT_MUTED}>{p.name}</span>
          <span className={`font-mono font-semibold ${TEXT_BODY}`}>
            {formatter ? formatter(p.value, p.payload) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DrawdownBanner({ today, onDismiss }) {
  return (
    <div className="border border-rose-500/40 bg-rose-500/5 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center border border-rose-500/50 ${TEXT_ROSE}`}>
            <AlertOctagon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="border border-rose-500 bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Daily Stop Batido
              </span>
              <span className={`text-[10px] uppercase tracking-[0.2em] ${TEXT_MUTED}`}>
                {today.streak >= 2 ? `${today.streak} losses seguidos` : `Limite ${formatUsd(-DAILY_STOP_USD)}`}
              </span>
            </div>
            <p className={`text-lg font-bold tracking-tight ${TEXT_TITLE}`}>
              Feche as telas e vá viver.
            </p>
            <p className={`mt-0.5 text-xs ${TEXT_MUTED}`}>
              Hoje:{" "}
              <span className={`font-mono font-semibold ${pnlClass(today.pnl)}`}>
                {signedUsd(today.pnl)}
              </span>{" "}
              · {today.losses}L · {today.wins}W · {today.be} BE · continuar agora é estatisticamente negativo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            className={cx(BTN_OUTLINE, "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]")}
          >
            Vou fechar
          </button>
          <button onClick={onDismiss} className={cx(BTN_OUTLINE, "p-2")} aria-label="Dismiss">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SurvivalCard({ icon, label, value, valueTone, sub, meter, meterTone }) {
  return (
    <div className={`flex-1 border ${BORDER} p-4`}>
      <div className={`flex items-center gap-2 ${LABEL_WIDE}`}>
        <span className={TEXT_SOFT}>{icon}</span>
        {label}
      </div>
      <p className={cx("mt-2 font-mono text-2xl font-semibold tabular-nums", valueTone || TEXT_TITLE)}>
        {value}
      </p>
      {sub && <p className={`mt-1 text-[11px] ${TEXT_MUTED}`}>{sub}</p>}
      {meter && (
        <div className={`mt-3 h-[2px] w-full ${TRACK}`}>
          <div className={`h-full ${TONE_FILL[meterTone] || TONE_FILL.neutral}`} style={{ width: `${meter.pct}%` }} />
        </div>
      )}
    </div>
  );
}

function SurvivalBar({ today, week, balance, onOpenChecklist }) {
  const dailyPct = Math.min((Math.abs(today.pnl) / DAILY_STOP_USD) * 100, 100);
  const pnlRow = (v) => v !== 0 && <DeltaMark positive={v > 0} />;

  const cards = [
    {
      icon: <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />,
      label: "PnL Hoje",
      value: <span className="inline-flex items-center gap-1">{pnlRow(today.pnl)}{signedUsd(today.pnl)}</span>,
      valueTone: pnlClass(today.pnl),
      sub: `${today.count} trades · ${today.wins}W ${today.losses}L${today.be ? ` ${today.be}BE` : ""}`,
      meter: today.pnl !== 0 ? { pct: dailyPct } : null,
      meterTone: pnlTone(today.pnl),
    },
    {
      icon: <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.5} />,
      label: "PnL Semana",
      value: <span className="inline-flex items-center gap-1">{pnlRow(week.pnl)}{signedUsd(week.pnl)}</span>,
      valueTone: pnlClass(week.pnl),
      sub: `${week.count} trades · ${week.wins}W ${week.losses}L`,
    },
    {
      icon: <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />,
      label: "Losses seguidos",
      value: `${today.streak}`,
      valueTone: today.streak >= 2 ? TEXT_ROSE : undefined,
      sub: today.streak >= 2 ? "Pausa obrigatória" : "Dentro do limite",
    },
    {
      icon: <Wallet className="h-3.5 w-3.5" strokeWidth={1.5} />,
      label: "Conta",
      value: formatUsd(balance),
      sub: "Saldo corrente",
    },
  ];

  return (
    <Card padding="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className={LABEL_XWIDE}>Sobrevivência Diária</p>
          <p className={`mt-0.5 text-sm font-medium ${TEXT_BODY}`}>
            Gestão psicológica primeiro. Execução depois.
          </p>
        </div>
        <button
          onClick={onOpenChecklist}
          className={`border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${TEXT_EMERALD} transition hover:bg-emerald-500/20`}
        >
          Abrir Checklist
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => <SurvivalCard key={c.label} {...c} />)}
      </div>
    </Card>
  );
}

function MistakesPanel({ trades }) {
  const mistakes = getMistakeStats(trades);
  const total = mistakes.reduce((s, m) => s + m.drain, 0);
  const top = mistakes.slice(0, 5);

  if (!top.length) {
    return (
      <Card>
        <SectionHeader
          icon={<Skull className="h-4 w-4" />}
          title="Erros que drenam seu capital"
          subtitle="Registre o erro em cada loss para ativar"
        />
        <div className={`flex h-[220px] items-center justify-center text-sm ${TEXT_MUTED}`}>
          Sem dados. Nenhum erro registrado em losses.
        </div>
      </Card>
    );
  }

  const max = top[0].drain;
  return (
    <Card>
      <SectionHeader
        icon={<Skull className="h-4 w-4" />}
        title="Erros que drenam seu capital"
        subtitle={
          <>
            Total perdido:{" "}
            <span className={`font-mono font-semibold ${TEXT_ROSE}`}>{formatUsd(-total)}</span>
          </>
        }
      />
      <div className="space-y-3">
        {top.map((m) => {
          const pct = (m.drain / max) * 100;
          const share = Math.round((m.drain / total) * 100);
          return (
            <div key={m.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${TEXT_BODY}`}>{m.key}</span>
                  <span className={`border ${BORDER} px-1.5 py-0.5 font-mono text-[10px] ${TEXT_MUTED}`}>
                    ×{m.count}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-sm font-bold ${TEXT_ROSE}`}>{formatUsd(-m.drain)}</span>
                  <span className={`ml-2 text-[10px] ${TEXT_MUTED}`}>{share}%</span>
                </div>
              </div>
              <div className={`h-[2px] w-full ${TRACK}`}>
                <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-5 border ${BORDER} p-3 text-[11px] ${TEXT_SOFT}`}>
        <span className="font-bold">Padrão detectado:</span> seu maior dreno é{" "}
        <span className="font-semibold">{top[0].key}</span> — considere uma regra no checklist para neutralizá-lo.
      </div>
    </Card>
  );
}

function Row({ label, value, tone, bold = false }) {
  const toneClass = tone === "positive" ? TEXT_EMERALD : tone === "negative" ? TEXT_ROSE : TEXT_BODY;
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-900">
      <span className={`text-xs ${TEXT_MUTED}`}>{label}</span>
      <span className={cx("font-mono text-sm tabular-nums", toneClass, bold ? "font-bold" : "font-normal")}>
        {value}
      </span>
    </div>
  );
}


export default function Dashboard({ trades, onOpenChecklist }) {
  const metrics = computeMetrics(trades);
  const equityData = buildEquityCurve(trades);
  const byKillzone = aggregateBy(trades, "killzone");
  const bySetup = aggregateBy(trades, "setup");
  const byDol = aggregateBy(trades, "dol");
  const weekday = weekdayPerformance(trades);
  const today = getTodayStats(trades);
  const week = getWeekStats(trades);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const showBanner = today.dailyStopHit && !bannerDismissed;

  const maxSetupPnl = Math.max(...bySetup.map((s) => Math.abs(s.pnl)), 1);
  const winRateRadial = [{ name: "Win Rate", value: Math.round(metrics.winRate) }];



  const kpis = [
    {
      icon: <DollarSign className="h-4 w-4" strokeWidth={1.5} />,
      label: "PnL Líquido",
      value: (
        <span className="inline-flex items-center gap-1">
          {metrics.netPnl !== 0 && <DeltaMark positive={metrics.netPnl >= 0} />}
          {signedUsd(metrics.netPnl)}
        </span>
      ),
      valueTone: pnlClass(metrics.netPnl),
      sub: `Saldo ${formatUsd(metrics.currentBalance)}`,
      trend: {
        positive: metrics.netPnl >= 0,
        label: `${((metrics.netPnl / metrics.startingBalance) * 100).toFixed(2)}%`,
      },
    },
    {
      icon: <Target className="h-4 w-4" strokeWidth={1.5} />,
      label: "Taxa de Acerto",
      value: `${metrics.winRate.toFixed(1)}%`,
      sub: `${metrics.wins}W · ${metrics.losses}L · ${metrics.be} BE`,
    },
    {
      icon: <Gauge className="h-4 w-4" strokeWidth={1.5} />,
      label: "Fator de Lucro",
      value: metrics.profitFactor.toFixed(2),
      valueTone: metrics.profitFactor >= 1 ? TEXT_EMERALD : TEXT_ROSE,
      sub: `RR Médio ${metrics.avgRR.toFixed(2)}R`,
    },
    {
      icon: <Activity className="h-4 w-4" strokeWidth={1.5} />,
      label: "Expectativa",
      value: signedUsd(metrics.expectancy, { decimals: 0 }),
      valueTone: pnlClass(metrics.expectancy),
      sub: `por trade · ${metrics.total} registrados`,
    },
  ];

  return (
    <div className="space-y-6">
      {showBanner && <DrawdownBanner today={today} onDismiss={() => setBannerDismissed(true)} />}

      <SurvivalBar
        today={today}
        week={week}
        balance={metrics.currentBalance}
        onOpenChecklist={onOpenChecklist}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2" padding="p-5">
          <SectionHeader
            icon={<LineChartIcon className="h-4 w-4" />}
            title="Curva de Patrimônio"
            subtitle="Saldo acumulado ao longo dos trades"
            right={
              <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider ${TEXT_MUTED}`}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-emerald-500" /> Patrimônio
                </span>
              </div>
            }
          />
          <div className="h-[260px] w-full">
            <ResponsiveContainer>
              <AreaChart data={equityData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={EMERALD} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="currentColor" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} />
                <YAxis
                  stroke="currentColor"
                  tick={AXIS_TICK}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                  tickLine={false}
                  axisLine={false}
                  domain={["dataMin - 500", "dataMax + 500"]}
                />
                <Tooltip
                  content={<TooltipBox formatter={(v, p) => `${formatUsd(v)}  (${p.id} · ${p.asset})`} />}
                  cursor={{ stroke: "currentColor", strokeOpacity: 0.2, strokeDasharray: "2 2" }}
                />
                <Area
                  type="monotone" dataKey="equity" name="Equity" stroke={EMERALD}
                  strokeWidth={1.5} fill="url(#equityFill)" dot={false}
                  activeDot={{ r: 3, fill: EMERALD, stroke: "none" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding="p-5">
          <SectionHeader
            icon={<Trophy className="h-4 w-4" />}
            title="Taxa de Acerto"
            subtitle="Breakdown & trade médio"
          />
          <div className="flex items-center gap-4">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="78%" outerRadius="100%" data={winRateRadial} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar
                    dataKey="value"
                    background={{ fill: "currentColor", fillOpacity: 0.08 }}
                    fill={EMERALD}
                    cornerRadius={0}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className={`text-3xl font-bold tracking-tight tabular-nums ${TEXT_TITLE}`}>
                  {metrics.winRate.toFixed(0)}
                  <span className={`text-base font-normal ${TEXT_MUTED}`}>%</span>
                </p>
                <p className={`text-[9px] uppercase tracking-[0.2em] ${TEXT_MUTED}`}>Acerto</p>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              <Row label="Ganho Médio" value={signedUsd(metrics.avgWin)} tone="positive" bold />
              <Row label="Perda Média" value={signedUsd(-metrics.avgLoss)} tone="negative" bold />
              <Row
                label="P/L Bruto"
                value={
                  <>
                    <span className={TEXT_EMERALD}>{formatUsd(metrics.grossProfit)}</span>
                    {" / "}
                    <span className={TEXT_ROSE}>{formatUsd(-metrics.grossLoss)}</span>
                  </>
                }
              />
              <Row label="Operações" value={String(metrics.total)} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <SectionHeader
            icon={<Clock4 className="h-4 w-4" />}
            title="Win Rate por Killzone"
            subtitle="Segmentação ICT de sessão"
          />
          <div className="space-y-3">
            {byKillzone.sort((a, b) => b.winRate - a.winRate).map((k) => (
              <div key={k.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Tag size="xs">{KZ_LABEL[k.key] || k.key}</Tag>
                    <span className={TEXT_MUTED}>{k.total} trades</span>
                  </div>
                  <span className={`font-mono font-semibold ${TEXT_BODY}`}>{k.winRate}%</span>
                </div>
                <div className={`h-[2px] w-full ${TRACK}`}>
                  <div
                    className={`h-full ${k.winRate >= 50 ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${k.winRate}%` }}
                  />
                </div>
                <div className={`flex items-center justify-between text-[10px] ${TEXT_MUTED}`}>
                  <span>{k.wins}W · {k.losses}L · {k.be}BE</span>
                  <span className={`font-mono font-semibold ${pnlClass(k.pnl)}`}>{signedUsd(k.pnl)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            icon={<Crosshair className="h-4 w-4" />}
            title="PnL por Entry Model"
            subtitle="Performance do playbook ICT"
          />
          <div className="space-y-3">
            {bySetup.sort((a, b) => b.pnl - a.pnl).map((s) => {
              const pct = (s.pnl / maxSetupPnl) * 100;
              const pos = s.pnl >= 0;
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <DeltaMark positive={pos} className={pos ? "text-emerald-500" : "text-rose-500"} />
                      <span className={`font-medium ${TEXT_BODY}`}>{s.key}</span>
                    </div>
                    <span className={`font-mono font-bold ${pnlClass(s.pnl)}`}>{signedUsd(s.pnl)}</span>
                  </div>
                  <div className="relative flex h-4 items-center">
                    <div className="absolute left-1/2 h-full w-px bg-zinc-200 dark:bg-zinc-800" />
                    <div
                      className={`absolute top-1/2 h-[3px] -translate-y-1/2 ${pos ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{
                        width: `calc(${Math.min(Math.abs(pct), 100) / 2}%)`,
                        ...(pos ? { left: "50%" } : { right: "50%" }),
                      }}
                    />
                  </div>
                  <div className={`mt-1 flex items-center gap-2 text-[10px] ${TEXT_MUTED}`}>
                    <span>{s.total} trades</span>
                    <span>·</span>
                    <span>{s.winRate}% WR</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader
            icon={<Zap className="h-4 w-4" />}
            title="Draw on Liquidity"
            subtitle="Onde seu edge mira"
          />
          <div className={`h-[240px] w-full ${TEXT_BODY}`}>
            <ResponsiveContainer>
              <RadarChart
                data={byDol.map((d) => ({ target: d.key.split(" (")[0], winRate: d.winRate, total: d.total }))}
                outerRadius="80%"
              >
                <PolarAngleAxis dataKey="target" tick={{ fill: "currentColor", fontSize: 10, opacity: 0.7 }} />
                <Radar dataKey="winRate" stroke={EMERALD} strokeWidth={1.5} fill={EMERALD} fillOpacity={0.12} />
                <Tooltip content={<TooltipBox formatter={(v) => `${v}% WR`} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>



      <TradingCalendar
        trades={trades}
        onSelectDay={(dateKey, stats) => {
          console.log("dia selecionado", dateKey, stats);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionHeader
            icon={<BarChart3 className="h-4 w-4" />}
            title="Consistência por Dia da Semana"
            subtitle="PnL diário — melhores e piores sessões"
          />
          <div className={`h-[240px] w-full ${TEXT_BODY}`}>
            <ResponsiveContainer>
              <BarChart data={weekday} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <XAxis dataKey="day" stroke="currentColor" tick={{ ...AXIS_TICK, fontSize: 11 }} tickLine={false} axisLine={AXIS_LINE} />
                <YAxis
                  stroke="currentColor"
                  tick={{ ...AXIS_TICK, fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<TooltipBox formatter={(v, p) => `${formatUsd(v)} (${p.total} trades · ${p.winRate}% WR)`} />}
                  cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
                />
                <Bar dataKey="pnl" radius={[0, 0, 0, 0]}>
                  {weekday.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? EMERALD : ROSE} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <MistakesPanel trades={trades} />
      </div>
    </div>
  );
}
