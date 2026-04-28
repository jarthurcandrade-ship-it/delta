import {
  Search,
  Bell,
  PlusCircle,
  ChevronDown,
  ShieldCheck,
  Sun,
  Moon,
  Upload,
} from "lucide-react";
import { useState } from "react";
import ImportModal from "./ImportModal";

export default function Topbar({ 
  onNewTrade, 
  onOpenChecklist, 
  activeView, 
  hub,
  dark, 
  onToggleTheme,
  activeAccount,
  onImport
}) {
  const [importOpen, setImportOpen] = useState(false);
  const titles = {
    home: { title: "Meu Dia", sub: "Avaliação pessoal e hábitos" },
    daily: { title: "Meu Dia", sub: "Avaliação pessoal e hábitos" },
    dashboard: { title: "Trading", sub: "Visão geral de performance" },
    new: { title: "Novo Trade", sub: "Registre uma execução com contexto completo" },
    journal: { title: "Diário", sub: "Todo trade, todo contexto" },
    analytics: { title: "Diagnóstico", sub: "Inteligência de performance segmentada" },
    psychology: { title: "Psicologia", sub: "Rastreamento do edge comportamental" },
    papers: { title: "Estudos", sub: "Papers & pesquisas macroeconômicas" },
    calendar: { title: "Calendário", sub: "Heatmap de PnL diário" },
  };
  const meta = titles[activeView] || titles.home;

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            <span>DELTA</span>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-100">{activeAccount}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {meta.title}
            <span className="ml-2 font-normal text-zinc-500">— {meta.sub}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {hub === "trading" && (
            <>
              <div className="hidden lg:flex items-center gap-2 border border-zinc-200 px-3 py-2 text-xs text-zinc-500 min-w-[260px] dark:border-zinc-800">
                <Search className="h-4 w-4" strokeWidth={1.5} />
                <input
                  className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-zinc-900 dark:placeholder:text-zinc-600 dark:text-zinc-100"
                  placeholder="Buscar trades, setups, tags…"
                />
                <span className="border border-zinc-200 px-1.5 py-0.5 font-mono text-[10px] dark:border-zinc-800">
                  ⌘K
                </span>
              </div>

              <button
                onClick={onOpenChecklist}
                className="hidden md:inline-flex items-center gap-2 border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600 transition hover:bg-emerald-500/10 dark:text-emerald-400"
              >
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                Checklist
              </button>
            </>
          )}

          <button
            onClick={onToggleTheme}
            aria-label="Alternar tema"
            className="flex items-center justify-center border border-zinc-200 p-2 text-zinc-700 transition hover:border-black hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-white dark:hover:text-zinc-100"
          >
            {dark ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>

          <button className="relative border border-zinc-200 p-2 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:text-zinc-100">
            <Bell className="h-4 w-4" strokeWidth={1.5} />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 bg-rose-500" />
          </button>

          <button className="flex items-center gap-2 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:text-zinc-100">
            <span className="flex h-6 w-6 items-center justify-center border border-zinc-900 text-[10px] font-bold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100">
              JA
            </span>
            <span className="hidden sm:inline">j.arthurc@…</span>
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          {hub === "trading" && (
            <>
              <button
                onClick={onNewTrade}
                className="flex items-center gap-2 border border-zinc-900 bg-zinc-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <PlusCircle className="h-4 w-4" strokeWidth={1.5} />
                Novo Trade
              </button>

              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 border border-zinc-200 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-950"
              >
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                Importar
              </button>
            </>
          )}
        </div>
      </div>

      <ImportModal 
        open={importOpen} 
        onClose={() => setImportOpen(false)} 
        onImport={(trades, account) => {
          onImport(trades, account);
          setImportOpen(false);
        }}
      />
    </header>
  );
}
