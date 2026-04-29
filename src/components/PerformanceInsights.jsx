import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";
import { 
  TrendingUp, Activity, Moon, Brain, Coffee, Zap, ShieldCheck, AlertCircle, TrendingDown,
  LayoutDashboard, Info
} from "lucide-react";
import { Card, SectionHeader, signedUsd, pnlClass } from "./ui";
import { cx, TEXT_TITLE, TEXT_MUTED, BORDER } from "./constants";
import { metricsApi, tradesApi } from "../lib/supabase";

export default function PerformanceInsights() {
  const [trades, setTrades] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [tData, mData] = await Promise.all([
        tradesApi.getAll('Padrão'), // default account
        metricsApi.getAll()
      ]);
      if (tData) setTrades(tData);
      if (mData) setMetrics(mData);
      setLoading(false);
    };
    fetchData();
  }, []);

  // ── Correlation Data ───────────────────────────────────────────
  const correlationData = useMemo(() => {
    if (!trades.length || !metrics.length) return [];

    // Group PnL by date
    const pnlByDate = trades.reduce((acc, t) => {
      const d = t.date;
      acc[d] = (acc[d] || 0) + (Number(t.pnl) || 0);
      return acc;
    }, {});

    // Map metrics and add PnL
    return metrics
      .map(m => ({
        date: m.date,
        pnl: pnlByDate[m.date] || 0,
        sleep: m.sleep_score,
        focus: m.focus_score,
        emotional: m.emotional_score,
        caffeine: m.caffeine_mg,
        nootropics: m.nootropics ? 1 : 0,
        diet: m.diet_quality,
        totalScore: Math.round((m.sleep_score + m.emotional_score + m.focus_score + m.clarity_score + m.body_score + m.confidence_score + m.impact_score))
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trades, metrics]);

  // ── Significant Insights ───────────────────────────────────────
  const insights = useMemo(() => {
    if (correlationData.length < 3) return [];
    
    const results = [];
    
    // Average PnL when Sleep > 7 vs Sleep <= 7
    const goodSleep = correlationData.filter(d => d.sleep >= 7);
    const badSleep = correlationData.filter(d => d.sleep < 7);
    const avgGoodSleep = goodSleep.length ? goodSleep.reduce((s, d) => s + d.pnl, 0) / goodSleep.length : 0;
    const avgBadSleep = badSleep.length ? badSleep.reduce((s, d) => s + d.pnl, 0) / badSleep.length : 0;

    if (avgGoodSleep > avgBadSleep) {
      const diff = avgGoodSleep - avgBadSleep;
      results.push({
        id: 'sleep',
        title: 'Impacto do Sono',
        message: `Seu PnL médio é ${signedUsd(diff)} maior em dias de sono bom (7+).`,
        tone: 'positive',
        icon: Moon
      });
    }

    // Caffeine Impact
    const highCaffeine = correlationData.filter(d => d.caffeine >= 200);
    const lowCaffeine = correlationData.filter(d => d.caffeine < 200);
    const winRateHigh = highCaffeine.length ? highCaffeine.filter(d => d.pnl > 0).length / highCaffeine.length : 0;
    const winRateLow = lowCaffeine.length ? lowCaffeine.filter(d => d.pnl > 0).length / lowCaffeine.length : 0;

    if (winRateLow > winRateRateHigh) {
      results.push({
        id: 'caffeine',
        title: 'Alerta de Cafeína',
        message: `Sua taxa de acerto cai quando você consome mais de 200mg de cafeína.`,
        tone: 'negative',
        icon: Coffee
      });
    }

    return results;
  }, [correlationData]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Analisando biometria e resultados...</div>;

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h1 className={cx("text-2xl font-bold tracking-tight", TEXT_TITLE)}>Performance Insights</h1>
        <p className={cx("mt-1 text-sm", TEXT_MUTED)}>Correlação entre biometria, biohacking e resultados financeiros.</p>
      </div>

      {/* ───── Insights Banner ───── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {insights.map(i => (
          <div key={i.id} className={cx(
            "flex items-start gap-4 border p-4",
            i.tone === 'positive' ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
          )}>
            <div className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center border",
              i.tone === 'positive' ? "border-emerald-500 text-emerald-500" : "border-rose-500 text-rose-500"
            )}>
              <i.icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <p className={cx("text-sm font-bold uppercase tracking-wide", i.tone === 'positive' ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {i.title}
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{i.message}</p>
            </div>
          </div>
        ))}
        {insights.length === 0 && (
          <div className="col-span-full border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-zinc-500 italic">Dados insuficientes para gerar insights automáticos. Continue logando seu estado diário.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ───── Chart: PnL vs Readiness ───── */}
        <Card padding="p-5">
          <SectionHeader
            icon={<Activity className="h-4 w-4" />}
            title="Readiness vs. PnL"
            subtitle="Correlação entre o score total do dia e o resultado"
          />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.1} />
                <XAxis 
                  type="number" dataKey="totalScore" name="Readiness" 
                  unit="%" domain={[0, 100]}
                  stroke="#71717a" fontSize={11} tickLine={false} axisLine={false}
                />
                <YAxis 
                  type="number" dataKey="pnl" name="PnL" 
                  stroke="#71717a" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '0' }}
                  itemStyle={{ fontSize: '11px', color: '#fff' }}
                />
                <Scatter data={correlationData}>
                  {correlationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ───── Chart: Caffeine impact ───── */}
        <Card padding="p-5">
          <SectionHeader
            icon={<Coffee className="h-4 w-4" />}
            title="Carga de Cafeína"
            subtitle="Influência do estimulante no PnL diário"
          />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} hide />
                <YAxis yAxisId="left" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#d97706" fontSize={11} tickLine={false} axisLine={false} unit="mg" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '0' }}
                />
                <Bar yAxisId="left" dataKey="pnl" fill="#10b981">
                  {correlationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="caffeine" stroke="#d97706" strokeWidth={2} dot={{ r: 4, fill: '#d97706' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ───── Chart: Sleep Quality Impact ───── */}
        <Card padding="p-5">
          <SectionHeader
            icon={<Moon className="h-4 w-4" />}
            title="Qualidade do Sono"
            subtitle="Sono vs. Lucratividade Diária"
          />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="date" hide />
                <YAxis yAxisId="left" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} domain={[0, 10]} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '0' }} />
                <Line yAxisId="left" type="step" dataKey="pnl" stroke="#71717a" strokeDasharray="5 5" />
                <Line yAxisId="right" type="monotone" dataKey="sleep" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5, fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ───── Chart: Focus & Nootropics ───── */}
        <Card padding="p-5">
          <SectionHeader
            icon={<Zap className="h-4 w-4" />}
            title="Foco & Nootrópicos"
            subtitle="Estado mental em dias com vs. sem suplementação"
          />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.1} />
                <XAxis dataKey="date" hide />
                <YAxis domain={[0, 10]} stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '0' }} />
                <Bar dataKey="focus" radius={[2, 2, 0, 0]}>
                  {correlationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.nootropics === 1 ? '#10b981' : '#71717a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center gap-4 justify-center">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#10b981]" />
                <span className="text-[10px] uppercase font-bold text-zinc-500">Com Nootrópico</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#71717a]" />
                <span className="text-[10px] uppercase font-bold text-zinc-500">Sem Nootrópico</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
