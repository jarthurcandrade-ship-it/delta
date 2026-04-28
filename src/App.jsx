import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DailyHub from "./components/DailyHub";
import Dashboard from "./components/Dashboard";
import TradeTable from "./components/TradeTable";
import NewTradeForm from "./components/NewTradeForm";
import PreTradeChecklist from "./components/PreTradeChecklist";
import TradingCalendar from "./components/TradingCalendar";
import PsychologyJournal from "./components/PsychologyJournal";
import PapersJournal from "./components/PapersJournal";
import AdvancedInsights from "./components/AdvancedInsights";
import { supabase, tradesApi, psychologyApi, papersApi, accountsApi } from "./lib/supabase";

const TRADES_STORAGE_KEY = "tj-trades";
const ACCOUNTS_STORAGE_KEY = "tj-accounts";
const ACTIVE_ACCOUNT_KEY = "tj-active-account";
const PSYCHOLOGY_STORAGE_KEY = "tj-psychology";
const PAPERS_STORAGE_KEY = "tj-papers";

// ── Supabase field mapping (camelCase ↔ snake_case) ──────────────
function toSnake(trade) {
  return {
    id: trade.id,
    account: trade.account || "Padrão",
    date: trade.date,
    entry_time: trade.entryTime,
    exit_time: trade.exitTime,
    asset: trade.asset,
    asset_class: trade.assetClass,
    direction: trade.direction,
    killzone: trade.killzone,
    setup: trade.setup,
    dol: trade.dol,
    confluences: trade.confluences || [],
    macro_events: trade.macroEvents || [],
    dxy_bias: trade.dxyBias,
    sentiment: trade.sentiment,
    rr_planned: trade.rrPlanned,
    rr_realized: trade.rrRealized,
    risk: trade.risk,
    result: trade.result,
    pnl: trade.pnl,
    mistake: trade.mistake,
    emotions: trade.emotions || [],
    htf: trade.htf,
    story: trade.story,
    checklist_data: trade.checklistData,
    psychology_data: trade.psychologyData,
    screenshot_urls: trade.screenshots || {},
  };
}

function toCamel(row) {
  return {
    id: row.id,
    account: row.account || "Padrão",
    date: row.date,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    asset: row.asset,
    assetClass: row.asset_class,
    direction: row.direction,
    killzone: row.killzone,
    setup: row.setup,
    dol: row.dol,
    confluences: row.confluences || [],
    macroEvents: row.macro_events || [],
    dxyBias: row.dxy_bias,
    sentiment: row.sentiment,
    rrPlanned: Number(row.rr_planned),
    rrRealized: Number(row.rr_realized),
    risk: Number(row.risk),
    result: row.result,
    pnl: Number(row.pnl),
    mistake: row.mistake,
    emotions: row.emotions || [],
    htf: row.htf,
    story: row.story,
    checklistData: row.checklist_data,
    psychologyData: row.psychology_data,
    screenshots: row.screenshot_urls || {},
  };
}

function psychToSnake(entry) {
  return {
    id: entry.id,
    date: entry.date,
    pre_market_mindset: entry.premarket,
    post_market_review: entry.postmarket,
    mood: entry.mood,
    emotions: entry.emotions || [],
    error_checklist: entry.errors || [],
  };
}

function psychToCamel(row) {
  return {
    id: row.id,
    date: row.date,
    premarket: row.pre_market_mindset,
    postmarket: row.post_market_review,
    mood: row.mood,
    emotions: row.emotions || [],
    errors: row.error_checklist || [],
  };
}

// ── Papers: camelCase (UI) ↔ snake_case (Supabase) ───────────────
function paperToSnake(paper) {
  const out = {
    date: paper.date,
    topic: paper.topic || null,
    title: paper.title,
    summary: paper.summary || null,
    source: paper.source || null,
    is_pinned: !!paper.isPinned,
  };
  // Só envia id se for um UUID válido — IDs locais (paper-<ts>) deixam o BD
  // gerar um novo via DEFAULT gen_random_uuid().
  if (paper.id && /^[0-9a-f-]{36}$/i.test(paper.id)) {
    out.id = paper.id;
  }
  if (paper.userId) out.user_id = paper.userId;
  return out;
}

function paperToCamel(row) {
  return {
    id: row.id,
    date: row.date,
    topic: row.topic || "",
    title: row.title || "",
    summary: row.summary || "",
    source: row.source || "",
    isPinned: !!row.is_pinned,
    userId: row.user_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Hooks ────────────────────────────────────────────────────────

function usePersistentDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("tj-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("tj-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

function usePersistentTrades() {
  const [trades, setTrades] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(TRADES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      // Defesa: descarta entradas claramente corrompidas (sem id ou não-objetos).
      const clean = Array.isArray(parsed)
        ? parsed.filter((t) => t && typeof t === "object" && t.id)
        : [];
      if (Array.isArray(parsed) && clean.length !== parsed.length) {
        console.warn(
          `[tj-trades] descartadas ${parsed.length - clean.length} entradas corrompidas no carregamento.`,
        );
      }
      return clean;
    } catch (err) {
      console.error("[tj-trades] falha ao carregar do localStorage:", err);
      return [];
    }
  });

  const synced = useRef(false);

  // Sync from Supabase on first mount — cloud is source of truth
  useEffect(() => {
    if (synced.current || !supabase) return;
    synced.current = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("trades")
          .select("*")
          .order("date", { ascending: false });
        if (error) {
          console.warn("[supabase] fetch trades error:", error.message);
          return; // Keep localStorage as fallback
        }

        if (data) {
          // Cloud is the source of truth — replace localStorage
          const remote = data.map(toCamel);
          console.log(`[supabase] loaded ${remote.length} trades from cloud (replacing local cache)`);
          setTrades(remote);
        }
      } catch (err) {
        console.warn("[supabase] sync failed, using localStorage:", err);
      }
    })();
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      window.localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
    } catch (err) {
      console.error("[tj-trades] falha ao salvar no localStorage:", err);
    }
  }, [trades]);

  return [trades, setTrades];
}

function usePersistentPsychology() {
  const [entries, setEntries] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(PSYCHOLOGY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("[tj-psychology] falha ao carregar do localStorage:", err);
      return [];
    }
  });

  const synced = useRef(false);

  // Sync from Supabase on first mount — cloud is source of truth
  useEffect(() => {
    if (synced.current || !supabase) return;
    synced.current = true;
    (async () => {
      try {
        const data = await psychologyApi.getAll();
        if (data) {
          const remote = data.map(psychToCamel);
          console.log(`[supabase] loaded ${remote.length} psychology entries from cloud (replacing local cache)`);
          setEntries(remote);
        }
      } catch (err) {
        console.warn("[supabase] psychology sync failed, using localStorage:", err);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PSYCHOLOGY_STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.error("[tj-psychology] falha ao salvar no localStorage:", err);
    }
  }, [entries]);
  return [entries, setEntries];
}

function usePersistentPapers() {
  const [papers, setPapers] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(PAPERS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((p) => p && p.id) : [];
    } catch (err) {
      console.error("[tj-papers] falha ao carregar do localStorage:", err);
      return [];
    }
  });

  // syncStatus: "idle" | "loading" | "synced" | "offline" | "error"
  const [syncStatus, setSyncStatus] = useState(supabase ? "loading" : "offline");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const synced = useRef(false);

  // Cloud is the source of truth on first mount
  useEffect(() => {
    if (synced.current || !supabase) return;
    synced.current = true;
    (async () => {
      try {
        const data = await papersApi.getAll();
        if (data) {
          const remote = data.map(paperToCamel);
          console.log(
            `[supabase] loaded ${remote.length} papers from cloud (replacing local cache)`,
          );
          setPapers(remote);
          setLastSyncedAt(new Date().toISOString());
          setSyncStatus("synced");
        } else {
          setSyncStatus("error");
        }
      } catch (err) {
        console.warn("[supabase] papers sync failed, using localStorage:", err);
        setSyncStatus("error");
      }
    })();
  }, []);

  // Cache imediato em localStorage (latência zero)
  useEffect(() => {
    try {
      window.localStorage.setItem(PAPERS_STORAGE_KEY, JSON.stringify(papers));
    } catch (err) {
      console.error("[tj-papers] falha ao salvar no localStorage:", err);
    }
  }, [papers]);

  return { papers, setPapers, syncStatus, setSyncStatus, lastSyncedAt, setLastSyncedAt };
}

// ── Papers background sync helpers (fire-and-forget) ─────────────
function syncPaperToSupabase(paper, callbacks = {}) {
  if (!supabase) return;
  papersApi
    .upsert(paperToSnake(paper))
    .then((row) => {
      if (row && callbacks.onSuccess) {
        callbacks.onSuccess(paperToCamel(row));
      }
    })
    .catch((err) => {
      console.warn("[supabase] background sync failed for paper:", paper.id, err);
      callbacks.onError?.(err);
    });
}

function syncDeletePaperFromSupabase(id) {
  if (!supabase) return;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return; // só sincroniza IDs UUID válidos
  papersApi
    .remove(id)
    .catch((err) =>
      console.warn("[supabase] background delete failed for paper:", id, err),
    );
}

// ── Supabase background sync helpers (fire-and-forget) ───────────
function syncTradeToSupabase(trade) {
  if (!supabase) return;
  tradesApi.upsert(toSnake(trade)).catch((err) =>
    console.warn("[supabase] background sync failed for trade:", trade.id, err),
  );
}

function syncDeleteTradeFromSupabase(id) {
  if (!supabase) return;
  tradesApi.remove(id).catch((err) =>
    console.warn("[supabase] background delete failed for trade:", id, err),
  );
}

function syncPsychologyToSupabase(entry) {
  if (!supabase) return;
  psychologyApi.upsert(psychToSnake(entry)).catch((err) =>
    console.warn("[supabase] background sync failed for psychology:", entry.id, err),
  );
}

function syncDeletePsychologyFromSupabase(id) {
  if (!supabase) return;
  psychologyApi.remove(id).catch((err) =>
    console.warn("[supabase] background delete failed for psychology:", id, err),
  );
}

function usePersistentAccounts() {
  const [accounts, setAccounts] = useState(() => {
    if (typeof window === "undefined") return ["Padrão"];
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : ["Padrão"];
  });
  const [activeAccount, setActiveAccount] = useState(() => {
    if (typeof window === "undefined") return "Padrão";
    return window.localStorage.getItem(ACTIVE_ACCOUNT_KEY) || "Padrão";
  });

  const synced = useRef(false);

  // Sync accounts from Supabase on mount — cloud is source of truth
  useEffect(() => {
    if (synced.current || !supabase) return;
    synced.current = true;
    (async () => {
      try {
        const data = await accountsApi.getAll();
        if (data && data.length > 0) {
          const remoteNames = data.map((a) => a.name);
          console.log(`[supabase] loaded ${remoteNames.length} accounts from cloud`);
          setAccounts((local) => {
            const merged = [...new Set([...remoteNames, ...local])];
            return merged;
          });
        }
      } catch (err) {
        console.warn("[supabase] accounts sync failed:", err);
      }
    })();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccount);
  }, [activeAccount]);

  // Wrapped setAccounts that also syncs to Supabase
  const setAccountsWithSync = useCallback((updater) => {
    setAccounts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Sync new accounts to Supabase
      const added = next.filter((a) => !prev.includes(a));
      added.forEach((name) => {
        accountsApi.upsert({ name }).catch((err) =>
          console.warn("[supabase] account sync failed:", name, err)
        );
      });
      // Remove deleted accounts from Supabase
      const removed = prev.filter((a) => !next.includes(a));
      removed.forEach((name) => {
        accountsApi.remove(name).catch((err) =>
          console.warn("[supabase] account delete failed:", name, err)
        );
      });
      return next;
    });
  }, []);

  return { accounts, setAccounts: setAccountsWithSync, activeAccount, setActiveAccount };
}

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function findTodaysPsychologyHint(trades, psychologyEntries) {
  const today = todayKey();

  const tradesToday = trades
    .filter((t) => t.date === today && t.psychologyData)
    .sort((a, b) => (a.entryTime || "").localeCompare(b.entryTime || ""));
  const lastTradePsych = tradesToday[tradesToday.length - 1]?.psychologyData;
  if (lastTradePsych && (lastTradePsych.mindset || lastTradePsych.mood)) {
    return {
      source: "trade",
      mindset: lastTradePsych.mindset || "",
      mood: lastTradePsych.mood || "",
      emotions: lastTradePsych.emotions || [],
    };
  }

  const journalToday = psychologyEntries.find((e) => e.date === today);
  if (journalToday && (journalToday.premarket || journalToday.mood)) {
    return {
      source: "journal",
      mindset: journalToday.premarket || "",
      mood: journalToday.mood || "",
      emotions: [],
    };
  }
  return null;
}

function nextTradeId(trades) {
  const max = trades.reduce((m, t) => {
    const match = /^TJ-(\d+)$/.exec(t.id || "");
    return match ? Math.max(m, Number(match[1])) : m;
  }, 218);
  return `TJ-${String(max + 1).padStart(4, "0")}`;
}

export default function App() {
  const [trades, setTrades] = usePersistentTrades();
  const [psychologyEntries, setPsychologyEntries] = usePersistentPsychology();
  const {
    papers,
    setPapers,
    syncStatus: papersSyncStatus,
    setSyncStatus: setPapersSyncStatus,
    lastSyncedAt: papersLastSyncedAt,
    setLastSyncedAt: setPapersLastSyncedAt,
  } = usePersistentPapers();
  const { accounts, setAccounts, activeAccount, setActiveAccount } = usePersistentAccounts();

  const handleSavePaper = useCallback(
    (draft) => {
      const now = new Date().toISOString();
      const isNew = !draft.id;
      const localId = draft.id || `paper-${Date.now()}`;
      const candidate = {
        id: localId,
        date: draft.date,
        topic: draft.topic || "",
        title: draft.title,
        summary: draft.summary || "",
        source: draft.source || "",
        isPinned: !!draft.isPinned,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      };

      // Optimistic update no cache local
      setPapers((prev) => {
        if (isNew) return [candidate, ...prev];
        return prev.map((p) => (p.id === candidate.id ? { ...p, ...candidate } : p));
      });

      if (supabase) setPapersSyncStatus("loading");

      syncPaperToSupabase(candidate, {
        onSuccess: (saved) => {
          // Substitui o registro local pelo retornado do BD (assim o id local
          // "paper-<ts>" é trocado pelo UUID definitivo).
          setPapers((prev) =>
            prev.map((p) => (p.id === candidate.id ? { ...p, ...saved } : p)),
          );
          setPapersLastSyncedAt(new Date().toISOString());
          setPapersSyncStatus("synced");
        },
        onError: () => setPapersSyncStatus("error"),
      });

      return candidate;
    },
    [setPapers, setPapersSyncStatus, setPapersLastSyncedAt],
  );

  const handleDeletePaper = useCallback(
    (id) => {
      setPapers((prev) => prev.filter((p) => p.id !== id));
      syncDeletePaperFromSupabase(id);
    },
    [setPapers],
  );

  const handleTogglePinPaper = useCallback(
    (id) => {
      const target = papers.find((p) => p.id === id);
      if (!target) return;
      const updated = {
        ...target,
        isPinned: !target.isPinned,
        updatedAt: new Date().toISOString(),
      };
      setPapers((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (supabase) setPapersSyncStatus("loading");
      syncPaperToSupabase(updated, {
        onSuccess: (saved) => {
          setPapers((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...saved } : p)),
          );
          setPapersLastSyncedAt(new Date().toISOString());
          setPapersSyncStatus("synced");
        },
        onError: () => setPapersSyncStatus("error"),
      });
    },
    [papers, setPapers, setPapersSyncStatus, setPapersLastSyncedAt],
  );
  const [view, setView] = useState("personal");
  const [personalTab, setPersonalTab] = useState("daily");
  const [tradingTab, setTradingTab] = useState("dashboard");
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [pendingChecklist, setPendingChecklist] = useState(null);
  const [dark, toggleDark] = usePersistentDarkMode();

  // Auto-detect accounts from trades (important for new devices)
  useEffect(() => {
    if (trades.length === 0) return;
    const tradeAccounts = [...new Set(trades.map((t) => t.account || "Padrão"))];
    setAccounts((prev) => {
      const merged = [...new Set([...prev, ...tradeAccounts])];
      if (merged.length !== prev.length) {
        console.log("[accounts] detected new accounts from trades:", tradeAccounts);
      }
      return merged;
    });
  }, [trades, setAccounts]);

  const filteredTrades = trades.filter((t) => (t.account || "Padrão") === activeAccount);
  const todaysPsychologyHint = findTodaysPsychologyHint(filteredTrades, psychologyEntries);

  const openNewTrade = () => {
    setEditingTrade(null);
    setPendingChecklist(null);
    setView("trading");
    setTradingTab("new");
  };

  const handleStartTradeFromChecklist = (checklistData) => {
    setEditingTrade(null);
    setPendingChecklist(checklistData);
    setView("trading");
    setTradingTab("new");
  };

  const openEditTrade = (trade) => {
    setEditingTrade(trade);
    setTradingTab("new");
  };

  const closeForm = () => {
    setEditingTrade(null);
    setPendingChecklist(null);
    setTradingTab("dashboard");
  };

  const handleSaveTrade = (payload) => {
    try {
      if (!payload || typeof payload !== "object") {
        console.error("[handleSaveTrade] payload inválido:", payload);
        return;
      }
      const finalPayload = {
        ...payload,
        checklistData: payload.checklistData ?? pendingChecklist ?? null,
      };
      setTrades((prev) => {
        let savedTrade;
        // Find-and-update por id quando existir; senão append com novo id.
        if (finalPayload.id && prev.some((t) => t.id === finalPayload.id)) {
          savedTrade = { ...prev.find((t) => t.id === finalPayload.id), ...finalPayload };
          // Background sync to Supabase (inside callback so savedTrade is guaranteed)
          syncTradeToSupabase(savedTrade);
          return prev.map((t) =>
            t.id === finalPayload.id ? savedTrade : t,
          );
        }
        const id = finalPayload.id || nextTradeId(prev);
        savedTrade = { ...finalPayload, id, account: activeAccount };
        // Background sync to Supabase (inside callback so savedTrade is guaranteed)
        syncTradeToSupabase(savedTrade);
        return [...prev, savedTrade];
      });
      setEditingTrade(null);
      setPendingChecklist(null);
      setView("journal");
    } catch (err) {
      console.error("[handleSaveTrade] erro ao salvar trade:", err, payload);
    }
  };

  const handleImportTrades = (importedTrades, targetAccount) => {
    if (!accounts.includes(targetAccount)) {
      setAccounts((prev) => [...prev, targetAccount]);
    }
    let newTrades = [];
    setTrades((prev) => {
      const startId = nextTradeId(prev);
      const withIds = importedTrades.map((t, i) => {
        const num = parseInt(startId.split("-")[1]) + i;
        return { ...t, id: `TJ-${String(num).padStart(4, "0")}`, account: targetAccount };
      });
      newTrades = withIds;
      return [...prev, ...withIds];
    });
    // Background sync all imported trades to Supabase
    newTrades.forEach((t) => syncTradeToSupabase(t));
    setActiveAccount(targetAccount);
    setView("journal");
  };

  const handleDeleteTrade = (id) => {
    try {
      if (!id) {
        console.error("[handleDeleteTrade] id inválido:", id);
        return;
      }
      setTrades((prev) => prev.filter((t) => t.id !== id));
      // Background delete from Supabase
      syncDeleteTradeFromSupabase(id);
    } catch (err) {
      console.error("[handleDeleteTrade] erro ao remover trade:", err, id);
    }
  };

  // Tab bar config
  const PERSONAL_TABS = [
    { id: "daily",      label: "Meu Dia" },
    { id: "psychology", label: "Psicologia" },
    { id: "papers",     label: "Estudos" },
  ];
  const TRADING_TABS = [
    { id: "dashboard",  label: "Painel" },
    { id: "journal",    label: "Diário" },
    { id: "analytics",  label: "Diagnóstico" },
    { id: "calendar",   label: "Calendário" },
  ];

  const activeTab = view === "personal" ? personalTab : tradingTab;
  const setActiveTab = view === "personal" ? setPersonalTab : setTradingTab;
  const tabs = view === "personal" ? PERSONAL_TABS : TRADING_TABS;

  return (
    <div className="relative flex min-h-screen w-full bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      <Sidebar 
        active={view} 
        onNavigate={setView} 
        accounts={accounts}
        activeAccount={activeAccount}
        onSelectAccount={setActiveAccount}
        onAddAccount={(name) => setAccounts(prev => [...prev, name])}
        onRenameAccount={(oldName, newName) => {
          if (!newName.trim() || oldName === newName) return;
          setAccounts(prev => prev.map(a => a === oldName ? newName.trim() : a));
          setTrades(prev => {
            const updated = prev.map(t => 
              (t.account || "Padrão") === oldName ? { ...t, account: newName.trim() } : t
            );
            updated.filter(t => t.account === newName.trim()).forEach(t => syncTradeToSupabase(t));
            return updated;
          });
          if (activeAccount === oldName) setActiveAccount(newName.trim());
        }}
        onDeleteAccount={(name) => {
          setAccounts(prev => prev.filter(a => a !== name));
          setTrades(prev => {
            const toDelete = prev.filter(t => (t.account || "Padrão") === name);
            toDelete.forEach(t => syncDeleteTradeFromSupabase(t.id));
            return prev.filter(t => (t.account || "Padrão") !== name);
          });
          if (activeAccount === name) setActiveAccount(accounts[0] === name ? (accounts[1] || "Padrão") : accounts[0]);
        }}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          onNewTrade={openNewTrade}
          onOpenChecklist={() => setChecklistOpen(true)}
          hub={view}
          activeView={activeTab}
          dark={dark}
          onToggleTheme={toggleDark}
          activeAccount={activeAccount}
          onImport={handleImportTrades}
        />

        {/* ── Internal tab bar ── */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-black">
          <div className="flex items-center gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  activeTab === tab.id
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 h-[2px] w-full bg-zinc-900 dark:bg-zinc-100" />
                )}
              </button>
            ))}
          </div>
          {view === "trading" && tradingTab !== "new" && (
            <button
              onClick={openNewTrade}
              className="flex items-center gap-1.5 border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              + Novo Trade
            </button>
          )}
        </div>

        <main className="relative flex-1 overflow-auto px-6 py-6">
          {/* ── Personal Hub ── */}
          {view === "personal" && personalTab === "daily" && (
            <DailyHub trades={filteredTrades} onNavigate={(id) => {
              if (["new", "journal", "analytics", "papers"].includes(id)) {
                if (id === "papers") { setView("personal"); setPersonalTab("papers"); }
                else { setView("trading"); setTradingTab(id === "new" ? "new" : id); }
              }
            }} />
          )}
          {view === "personal" && personalTab === "psychology" && (
            <PsychologyJournal
              entries={psychologyEntries}
              setEntries={setPsychologyEntries}
              syncToSupabase={syncPsychologyToSupabase}
              syncDeleteFromSupabase={syncDeletePsychologyFromSupabase}
            />
          )}
          {view === "personal" && personalTab === "papers" && (
            <PapersJournal
              papers={papers}
              onSave={handleSavePaper}
              onDelete={handleDeletePaper}
              onTogglePin={handleTogglePinPaper}
              syncStatus={papersSyncStatus}
              lastSyncedAt={papersLastSyncedAt}
            />
          )}

          {/* ── Trading Hub ── */}
          {view === "trading" && tradingTab === "dashboard" && (
            <div className="space-y-6">
              <Dashboard trades={filteredTrades} onOpenChecklist={() => setChecklistOpen(true)} />
              <TradeTable
                trades={filteredTrades}
                onEdit={openEditTrade}
                onDelete={handleDeleteTrade}
              />
            </div>
          )}
          {view === "trading" && tradingTab === "new" && (
            <NewTradeForm
              initialTrade={editingTrade}
              pendingChecklist={pendingChecklist}
              todaysPsychologyHint={todaysPsychologyHint}
              onCancel={closeForm}
              onSave={handleSaveTrade}
              onDelete={
                editingTrade
                  ? () => {
                      handleDeleteTrade(editingTrade.id);
                      closeForm();
                    }
                  : null
              }
            />
          )}
          {view === "trading" && tradingTab === "journal" && (
            <TradeTable
              trades={filteredTrades}
              onEdit={openEditTrade}
              onDelete={handleDeleteTrade}
            />
          )}
          {view === "trading" && tradingTab === "analytics" && (
            <AdvancedInsights trades={filteredTrades} />
          )}
          {view === "trading" && tradingTab === "calendar" && (
            <TradingCalendar
              trades={filteredTrades}
              onSelectDay={(dateKey, stats) => {
                console.log("dia selecionado", dateKey, stats);
              }}
            />
          )}
        </main>
      </div>

      <PreTradeChecklist
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        onStartTrade={handleStartTradeFromChecklist}
      />
    </div>
  );
}
