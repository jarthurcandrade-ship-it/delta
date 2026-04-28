// Dataset mockado realista para ICT / Macro.
// As datas ficam ancoradas em TODAY para o painel de sobrevivência fazer sentido.

export const TODAY = "2026-04-21"; // Terça — âncora para os widgets Hoje / Semana.
export const DAILY_STOP_USD = 300;

export const KILLZONES = [
  { id: "asian", label: "Asian", tz: "19:00 – 00:00 NY", color: "indigo" },
  { id: "london", label: "London", tz: "02:00 – 05:00 NY", color: "sky" },
  { id: "ny-am", label: "NY AM", tz: "07:00 – 10:00 NY", color: "violet" },
  { id: "ny-lunch", label: "NY Lunch", tz: "10:00 – 12:00 NY", color: "amber" },
  { id: "ny-pm", label: "NY PM", tz: "13:30 – 16:00 NY", color: "fuchsia" },
];

export const SETUPS = [
  "Silver Bullet",
  "2022 Mentorship Model",
  "Judas Swing",
  "Turtle Soup",
  "OTE (Optimal Trade Entry)",
  "Unicorn Model",
  "Power of Three (AMD)",
];

export const CONFLUENCES = [
  "FVG",
  "IFVG",
  "Bullish OB",
  "Bearish OB",
  "Breaker Block",
  "MSS",
  "BOS",
  "Liquidity Sweep",
  "Equal Highs",
  "Equal Lows",
  "SIBI",
  "BISI",
  "Rejection Block",
];

export const DOL_TARGETS = [
  "BSL (Buyside Liquidity)",
  "SSL (Sellside Liquidity)",
  "Internal Range Liquidity",
  "External Range Liquidity",
  "PDH (Previous Day High)",
  "PDL (Previous Day Low)",
  "Weekly High",
  "Weekly Low",
];

export const MACRO_EVENTS = [
  "NFP",
  "CPI",
  "PPI",
  "FOMC",
  "Fed Chair Speech",
  "Vendas no Varejo (Retail Sales)",
  "PMI",
  "PIB (GDP)",
  "Pedidos de Seguro-Desemprego (Unemployment Claims)",
  "ISM Manufacturing",
  "Sem notícias relevantes",
];

export const MOODS = [
  { key: "Calmo", tone: "positive" },
  { key: "Focado", tone: "positive" },
  { key: "Confiante", tone: "positive" },
  { key: "Disciplinado", tone: "positive" },
  { key: "Ansioso", tone: "negative" },
  { key: "Ganancioso", tone: "negative" },
  { key: "Frustrado", tone: "negative" },
  { key: "Cansado", tone: "negative" },
];

export const EMOTIONS = [
  "Execução Perfeita",
  "FOMO",
  "Hesitação",
  "Overtrading",
  "Revenge Trade",
  "Paciente",
  "Disciplinado",
  "Impulsivo",
];

// Erros registrados apenas em trades Loss — alimentam o Mistake Tracker.
export const MISTAKES = [
  "FOMO",
  "Hesitação",
  "Trade Fora da Killzone",
  "Stop Curto",
  "Overtrading",
  "Revenge Trade",
  "Ignorei Checklist",
  "Sem alinhamento HTF",
  "Entrada antes do MSS",
];

export const ASSETS = [
  { symbol: "EURUSD", class: "Forex" },
  { symbol: "GBPUSD", class: "Forex" },
  { symbol: "USDJPY", class: "Forex" },
  { symbol: "XAUUSD", class: "Metais" },
  { symbol: "NQ", class: "Índices Futuros" },
  { symbol: "ES", class: "Índices Futuros" },
  { symbol: "YM", class: "Índices Futuros" },
  { symbol: "DXY", class: "Índice" },
];

const startingBalance = 50000;

// Datas reposicionadas para que alguns trades sejam HOJE (2026-04-21) — dispara o daily stop.
const rawTrades = [
  // HOJE — 2 losses seguidos, daily stop batido.
  {
    id: "TJ-0233",
    date: "2026-04-21",
    entryTime: "10:12",
    exitTime: "10:18",
    asset: "EURUSD",
    assetClass: "Forex",
    direction: "Long",
    killzone: "ny-am",
    setup: "Judas Swing",
    dol: "SSL (Sellside Liquidity)",
    confluences: ["Liquidity Sweep", "Bearish OB"],
    macroEvents: ["Vendas no Varejo (Retail Sales)"],
    dxyBias: "Bullish",
    sentiment: "Risk-Off",
    rrPlanned: 3.0,
    rrRealized: -1.0,
    risk: 250,
    result: "Loss",
    pnl: -250,
    mistake: "Revenge Trade",
    emotions: ["Revenge Trade"],
    htf: "Peguei um segundo setup depois do primeiro loss, sem sweep novo.",
    story:
      "Revenge trade depois que o TJ-0232 me estopou. Entrei sem esperar um MSS limpo. Deveria ter fechado a plataforma.",
  },
  {
    id: "TJ-0232",
    date: "2026-04-21",
    entryTime: "09:42",
    exitTime: "09:50",
    asset: "NQ",
    assetClass: "Índices Futuros",
    direction: "Long",
    killzone: "ny-am",
    setup: "Silver Bullet",
    dol: "BSL (Buyside Liquidity)",
    confluences: ["FVG", "MSS"],
    macroEvents: ["Vendas no Varejo (Retail Sales)"],
    dxyBias: "Neutral",
    sentiment: "Risk-On",
    rrPlanned: 3.5,
    rrRealized: -1.0,
    risk: 200,
    result: "Loss",
    pnl: -200,
    mistake: "FOMO",
    emotions: ["FOMO"],
    htf: "Diário em premium, o bias tinha que ser short.",
    story:
      "Entrei long na janela do Silver Bullet sem esperar confirmação. Corri atrás do movimento. Estopado no swing low anterior.",
  },
  // Ontem (segunda, mesma semana) — um grande win.
  {
    id: "TJ-0231",
    date: "2026-04-20",
    entryTime: "09:48",
    exitTime: "10:06",
    asset: "NQ",
    assetClass: "Índices Futuros",
    direction: "Long",
    killzone: "ny-am",
    setup: "Silver Bullet",
    dol: "BSL (Buyside Liquidity)",
    confluences: ["Liquidity Sweep", "MSS", "FVG", "BISI"],
    macroEvents: ["Sem notícias relevantes"],
    dxyBias: "Bearish",
    sentiment: "Risk-On",
    rrPlanned: 4.0,
    rrRealized: 3.7,
    risk: 250,
    result: "Win",
    pnl: 925,
    emotions: ["Execução Perfeita", "Paciente"],
    htf: "Order block bullish no 4H tocado na abertura de NY, PD array bullish ainda válida no semanal.",
    story:
      "Sweep das máximas da sessão asiática na abertura de NY, MSS confirmado no 1m. Entrada dentro do FVG de 1m deixado pelo deslocamento em direção à PDH.",
  },
  // Semana passada
  {
    id: "TJ-0230",
    date: "2026-04-17",
    entryTime: "14:08",
    exitTime: "15:22",
    asset: "ES",
    assetClass: "Índices Futuros",
    direction: "Long",
    killzone: "ny-pm",
    setup: "Power of Three (AMD)",
    dol: "Internal Range Liquidity",
    confluences: ["FVG", "Bullish OB", "BOS"],
    macroEvents: ["CPI"],
    dxyBias: "Bullish",
    sentiment: "Risk-On",
    rrPlanned: 2.5,
    rrRealized: 2.5,
    risk: 300,
    result: "Win",
    pnl: 750,
    emotions: ["Paciente", "Disciplinado"],
    htf: "Setup de reversão NY PM — acumulação no lunch seguida de manipulação nas mínimas.",
    story:
      "AMD clássico — acumulação no lunch, manipulação abaixo das mínimas do lunch, distribuição até a NWOG diária.",
  },
  {
    id: "TJ-0229",
    date: "2026-04-17",
    entryTime: "10:14",
    exitTime: "10:23",
    asset: "EURUSD",
    assetClass: "Forex",
    direction: "Short",
    killzone: "ny-am",
    setup: "Judas Swing",
    dol: "SSL (Sellside Liquidity)",
    confluences: ["Liquidity Sweep", "Bearish OB", "MSS"],
    macroEvents: ["CPI"],
    dxyBias: "Bullish",
    sentiment: "Risk-Off",
    rrPlanned: 3.0,
    rrRealized: -1.0,
    risk: 200,
    result: "Loss",
    pnl: -200,
    mistake: "Stop Curto",
    emotions: ["Disciplinado"],
    htf: "Surpresa no CPI para cima, DXY subiu e o EU falhou no OB bearish diário.",
    story:
      "Short depois do Judas Swing acima das máximas asiáticas, entrada no OB bearish de 15m. O preço voltou e pegou o stop antes de despencar. Modelo estava certo, mas o stop ficou curto.",
  },
  {
    id: "TJ-0228",
    date: "2026-04-16",
    entryTime: "03:18",
    exitTime: "04:10",
    asset: "GBPUSD",
    assetClass: "Forex",
    direction: "Long",
    killzone: "london",
    setup: "Turtle Soup",
    dol: "BSL (Buyside Liquidity)",
    confluences: ["Liquidity Sweep", "Equal Lows", "FVG"],
    macroEvents: ["Sem notícias relevantes"],
    dxyBias: "Bearish",
    sentiment: "Risk-On",
    rrPlanned: 3.5,
    rrRealized: 3.1,
    risk: 220,
    result: "Win",
    pnl: 682,
    emotions: ["Execução Perfeita"],
    htf: "Diário bullish, semanal buscando buyside. London varreu os equal lows asiáticos.",
    story:
      "Turtle Soup nos equal lows asiáticos, recuperação do range, long buscando a buy side de London.",
  },
  {
    id: "TJ-0227",
    date: "2026-04-15",
    entryTime: "10:02",
    exitTime: "10:04",
    asset: "NQ",
    assetClass: "Índices Futuros",
    direction: "Short",
    killzone: "ny-am",
    setup: "Silver Bullet",
    dol: "SSL (Sellside Liquidity)",
    confluences: ["IFVG", "MSS", "BISI"],
    macroEvents: ["FOMC"],
    dxyBias: "Bullish",
    sentiment: "Risk-Off",
    rrPlanned: 4.0,
    rrRealized: 0.0,
    risk: 250,
    result: "BE",
    pnl: 0,
    emotions: ["Hesitação"],
    htf: "Dia de FOMC. Mantive risco baixo, só caçando a janela do SB.",
    story:
      "Peguei entrada, mas ajustei para BE cedo demais na volatilidade do FOMC. Foi 3R depois que saí.",
  },
  {
    id: "TJ-0226",
    date: "2026-04-14",
    entryTime: "09:52",
    exitTime: "10:31",
    asset: "XAUUSD",
    assetClass: "Metais",
    direction: "Long",
    killzone: "ny-am",
    setup: "2022 Mentorship Model",
    dol: "External Range Liquidity",
    confluences: ["MSS", "Bullish OB", "FVG"],
    macroEvents: ["Sem notícias relevantes"],
    dxyBias: "Bearish",
    sentiment: "Risk-On",
    rrPlanned: 5.0,
    rrRealized: 4.6,
    risk: 180,
    result: "Win",
    pnl: 828,
    emotions: ["Paciente", "Disciplinado"],
    htf: "Ouro no semanal em premium delivery, diário buscando buyside externa.",
    story: "2022 Model no manual — sweep, MSS, retração para o FVG de 15m dentro do OB.",
  },
  {
    id: "TJ-0225",
    date: "2026-04-11",
    entryTime: "10:48",
    exitTime: "10:59",
    asset: "EURUSD",
    assetClass: "Forex",
    direction: "Long",
    killzone: "ny-am",
    setup: "OTE (Optimal Trade Entry)",
    dol: "PDH (Previous Day High)",
    confluences: ["FVG", "Bullish OB"],
    macroEvents: ["NFP"],
    dxyBias: "Bearish",
    sentiment: "Risk-On",
    rrPlanned: 3.0,
    rrRealized: -1.0,
    risk: 200,
    result: "Loss",
    pnl: -200,
    mistake: "FOMO",
    emotions: ["FOMO"],
    htf: "Dia de NFP, deveria ter ficado de fora dos primeiros 15m.",
    story:
      "Peguei o OTE cedo demais pós-NFP, ainda na perna de manipulação. Quebrou a regra: sem entradas nos primeiros 15m do NFP.",
  },
  {
    id: "TJ-0224",
    date: "2026-04-10",
    entryTime: "15:14",
    exitTime: "15:58",
    asset: "ES",
    assetClass: "Índices Futuros",
    direction: "Short",
    killzone: "ny-pm",
    setup: "Silver Bullet",
    dol: "SSL (Sellside Liquidity)",
    confluences: ["IFVG", "MSS", "Liquidity Sweep"],
    macroEvents: ["Sem notícias relevantes"],
    dxyBias: "Bullish",
    sentiment: "Risk-Off",
    rrPlanned: 3.5,
    rrRealized: 3.3,
    risk: 300,
    result: "Win",
    pnl: 990,
    emotions: ["Execução Perfeita", "Disciplinado"],
    htf: "Buscando sellside até a PDL, janela do SB de NY PM alinhada.",
    story: "Short do SB NY PM — sweep da máxima intraday, MSS no 1m e short do IFVG de 2m.",
  },
  {
    id: "TJ-0223",
    date: "2026-04-09",
    entryTime: "09:38",
    exitTime: "09:48",
    asset: "NQ",
    assetClass: "Índices Futuros",
    direction: "Long",
    killzone: "ny-am",
    setup: "Unicorn Model",
    dol: "BSL (Buyside Liquidity)",
    confluences: ["FVG", "Breaker Block", "MSS"],
    macroEvents: ["PPI"],
    dxyBias: "Neutral",
    sentiment: "Risk-On",
    rrPlanned: 2.5,
    rrRealized: 2.2,
    risk: 250,
    result: "Win",
    pnl: 550,
    emotions: ["Paciente"],
    htf: "Breaker confirmado na abertura de NY depois de varrer as máximas de London.",
    story: "Unicorn — breaker sobreposto com FVG no 5m, long na buy side intraday na PDH.",
  },
  {
    id: "TJ-0222",
    date: "2026-04-08",
    entryTime: "10:22",
    exitTime: "10:40",
    asset: "USDJPY",
    assetClass: "Forex",
    direction: "Short",
    killzone: "ny-am",
    setup: "2022 Mentorship Model",
    dol: "SSL (Sellside Liquidity)",
    confluences: ["MSS", "Bearish OB"],
    macroEvents: ["Fed Chair Speech"],
    dxyBias: "Bearish",
    sentiment: "Risk-Off",
    rrPlanned: 3.0,
    rrRealized: -1.0,
    risk: 200,
    result: "Loss",
    pnl: -200,
    mistake: "Revenge Trade",
    emotions: ["Revenge Trade"],
    htf: "Revenge trade depois de perder o setup anterior, modelo ainda incompleto.",
    story:
      "Antecipei a entrada antes da confirmação do MSS. Ignorei o checklist. Revenge trade depois de perder o setup limpo 30 min antes.",
  },
  {
    id: "TJ-0221",
    date: "2026-04-07",
    entryTime: "03:34",
    exitTime: "04:50",
    asset: "GBPUSD",
    assetClass: "Forex",
    direction: "Short",
    killzone: "london",
    setup: "Judas Swing",
    dol: "PDL (Previous Day Low)",
    confluences: ["Bearish OB", "Equal Highs", "MSS"],
    macroEvents: ["Sem notícias relevantes"],
    dxyBias: "Bullish",
    sentiment: "Risk-Off",
    rrPlanned: 4.0,
    rrRealized: 3.9,
    risk: 220,
    result: "Win",
    pnl: 858,
    emotions: ["Execução Perfeita", "Disciplinado"],
    htf: "Diário bearish, semanal buscando sellside.",
    story: "Judas de London perfeito — short do OB bearish de 15m depois do sweep das máximas asiáticas.",
  },
  {
    id: "TJ-0220",
    date: "2026-04-06",
    entryTime: "14:02",
    exitTime: "15:15",
    asset: "NQ",
    assetClass: "Índices Futuros",
    direction: "Long",
    killzone: "ny-pm",
    setup: "Power of Three (AMD)",
    dol: "External Range Liquidity",
    confluences: ["FVG", "MSS", "Bullish OB"],
    macroEvents: ["Sem notícias relevantes"],
    dxyBias: "Neutral",
    sentiment: "Risk-On",
    rrPlanned: 4.0,
    rrRealized: 3.8,
    risk: 250,
    result: "Win",
    pnl: 950,
    emotions: ["Paciente"],
    htf: "Reversão NY PM, semanal buscando buyside, AMD limpa.",
    story: "Acumulação no lunch, manipulação até a mínima do lunch, distribuição até a máxima semanal.",
  },
  {
    id: "TJ-0219",
    date: "2026-04-03",
    entryTime: "09:58",
    exitTime: "10:06",
    asset: "NQ",
    assetClass: "Índices Futuros",
    direction: "Long",
    killzone: "ny-am",
    setup: "Silver Bullet",
    dol: "BSL (Buyside Liquidity)",
    confluences: ["FVG"],
    macroEvents: ["Sem notícias relevantes"],
    dxyBias: "Neutral",
    sentiment: "Risk-On",
    rrPlanned: 3.0,
    rrRealized: -1.0,
    risk: 250,
    result: "Loss",
    pnl: -250,
    mistake: "Trade Fora da Killzone",
    emotions: ["Impulsivo"],
    htf: "Ignorei que estava fora da janela do SB quando entrei.",
    story:
      "Entrei 8 minutos antes da janela do SB abrir oficialmente — o setup até se formou, mas o preço não tinha deslocamento.",
  },
];

// Helpers derivados dos trades.
export function getTrades() {
  return rawTrades.map((t) => ({ ...t }));
}

export function buildEquityCurve(trades) {
  let balance = startingBalance;
  const sorted = [...trades].sort(
    (a, b) => new Date(a.date + "T" + a.entryTime).getTime() - new Date(b.date + "T" + b.entryTime).getTime(),
  );
  return sorted.map((t) => {
    balance += t.pnl;
    return {
      date: t.date,
      id: t.id,
      equity: Math.round(balance),
      pnl: t.pnl,
      result: t.result,
      asset: t.asset,
    };
  });
}

export function aggregateBy(trades, key, accessor) {
  const map = new Map();
  for (const t of trades) {
    const rawKey = accessor ? accessor(t) : t[key];
    const keys = Array.isArray(rawKey) ? rawKey : [rawKey];
    for (const k of keys) {
      if (!k) continue;
      const entry = map.get(k) || {
        key: k,
        total: 0,
        wins: 0,
        losses: 0,
        be: 0,
        pnl: 0,
      };
      entry.total += 1;
      entry.pnl += t.pnl;
      if (t.result === "Win") entry.wins += 1;
      else if (t.result === "Loss") entry.losses += 1;
      else entry.be += 1;
      map.set(k, entry);
    }
  }
  return [...map.values()].map((e) => ({
    ...e,
    winRate: e.total ? Math.round((e.wins / e.total) * 100) : 0,
  }));
}

export function computeMetrics(trades) {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "Win");
  const losses = trades.filter((t) => t.result === "Loss");
  const be = trades.filter((t) => t.result === "BE");
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
  const avgRR =
    trades.filter((t) => t.result !== "BE").reduce((s, t) => s + t.rrRealized, 0) /
      Math.max(1, trades.filter((t) => t.result !== "BE").length);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = winRate / 100 * avgWin - (1 - winRate / 100) * avgLoss;

  return {
    total,
    wins: wins.length,
    losses: losses.length,
    be: be.length,
    grossProfit,
    grossLoss,
    netPnl,
    profitFactor,
    avgRR,
    winRate,
    avgWin,
    avgLoss,
    expectancy,
    startingBalance,
    currentBalance: startingBalance + netPnl,
  };
}

export function weekdayPerformance(trades) {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const buckets = labels.map((d) => ({ day: d, pnl: 0, total: 0, wins: 0 }));
  for (const t of trades) {
    const idx = new Date(t.date + "T00:00:00").getDay();
    buckets[idx].pnl += t.pnl;
    buckets[idx].total += 1;
    if (t.result === "Win") buckets[idx].wins += 1;
  }
  return buckets.map((b) => ({
    ...b,
    winRate: b.total ? Math.round((b.wins / b.total) * 100) : 0,
  }));
}

// --- Helpers de sobrevivência + erros ---

export function getTodayStats(trades, today = TODAY) {
  const todays = trades
    .filter((t) => t.date === today)
    .sort(
      (a, b) =>
        new Date(a.date + "T" + a.entryTime).getTime() -
        new Date(b.date + "T" + b.entryTime).getTime(),
    );
  const pnl = todays.reduce((s, t) => s + t.pnl, 0);

  // Maior sequência de losses terminando hoje.
  let streak = 0;
  for (const t of todays) {
    if (t.result === "Loss") streak += 1;
    else if (t.result === "Win") streak = 0;
  }

  const wins = todays.filter((t) => t.result === "Win").length;
  const losses = todays.filter((t) => t.result === "Loss").length;
  const be = todays.filter((t) => t.result === "BE").length;

  const dailyStopHit = pnl <= -DAILY_STOP_USD || streak >= 2;
  return { pnl, count: todays.length, wins, losses, be, streak, dailyStopHit };
}

export function getWeekStats(trades, today = TODAY) {
  const d = new Date(today + "T00:00:00");
  const dayOfWeek = d.getDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekTrades = trades.filter((t) => {
    const td = new Date(t.date + "T00:00:00").getTime();
    return td >= monday.getTime() && td <= sunday.getTime();
  });

  const pnl = weekTrades.reduce((s, t) => s + t.pnl, 0);
  const wins = weekTrades.filter((t) => t.result === "Win").length;
  const losses = weekTrades.filter((t) => t.result === "Loss").length;
  return { pnl, count: weekTrades.length, wins, losses };
}

export function getMistakeStats(trades) {
  const map = new Map();
  for (const t of trades) {
    if (t.result !== "Loss" || !t.mistake) continue;
    const entry = map.get(t.mistake) || { key: t.mistake, count: 0, drain: 0 };
    entry.count += 1;
    entry.drain += Math.abs(t.pnl);
    map.set(t.mistake, entry);
  }
  return [...map.values()].sort((a, b) => b.drain - a.drain);
}
