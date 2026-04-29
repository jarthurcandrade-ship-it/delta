import { useState } from "react";
import {
  Home,
  LayoutDashboard,
  Settings,
  Pencil,
  Trash2,
  Check,
  X,
  PlusCircle,
  Activity,
} from "lucide-react";

const ITEMS = [
  { id: "personal", label: "Pessoal", icon: Home },
  { id: "trading",  label: "Trading", icon: LayoutDashboard },
  { id: "insights", label: "Insights", icon: Activity },
];

export default function Sidebar({ 
  active, 
  onNavigate, 
  accounts = ["Padrão"], 
  activeAccount = "Padrão", 
  onSelectAccount,
  onAddAccount,
  onRenameAccount,
  onDeleteAccount,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [editingAccount, setEditingAccount] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newAccountName.trim()) {
      onAddAccount(newAccountName.trim());
      setNewAccountName("");
      setIsAdding(false);
    }
  };

  const startEdit = (acc) => {
    setEditingAccount(acc);
    setEditName(acc);
    setConfirmDelete(null);
  };

  const saveEdit = () => {
    if (editName.trim() && editName.trim() !== editingAccount) {
      onRenameAccount?.(editingAccount, editName.trim());
    }
    setEditingAccount(null);
    setEditName("");
  };

  const cancelEdit = () => {
    setEditingAccount(null);
    setEditName("");
  };

  const handleDelete = (acc) => {
    if (confirmDelete === acc) {
      onDeleteAccount?.(acc);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(acc);
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmDelete((prev) => (prev === acc ? null : prev)), 3000);
    }
  };

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <span className="flex h-8 w-8 items-center justify-center border border-black text-base font-bold text-black dark:border-white dark:text-white">
          Δ
        </span>
        <div className="leading-tight">
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Personal
          </p>
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            DELTA
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* ─── Accounts Section (Only visible in Trading hub) ─── */}
        {active === "trading" && (
          <div className="px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
              Contas de Trade
            </p>
            <div className="space-y-1">
              {accounts.map((acc) => (
                <div key={acc} className="group relative">
                  {editingAccount === acc ? (
                    /* ─── Inline rename ─── */
                    <form
                      onSubmit={(e) => { e.preventDefault(); saveEdit(); }}
                      className="flex items-center gap-1 px-2 py-1.5"
                    >
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
                        className="flex-1 bg-transparent text-sm outline-none border-b border-zinc-300 dark:border-zinc-700 py-0.5 text-zinc-900 dark:text-zinc-100"
                      />
                      <button type="submit" className="p-0.5 text-emerald-500 hover:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={cancelEdit} className="p-0.5 text-rose-500 hover:text-rose-400">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : confirmDelete === acc ? (
                    /* ─── Delete confirmation ─── */
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded">
                      <span className="flex-1 text-xs text-red-400 font-medium">Apagar conta?</span>
                      <button
                        onClick={() => handleDelete(acc)}
                        className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    /* ─── Normal row ─── */
                    <div className="flex items-center justify-between gap-1 group">
                      <button
                        onClick={() => onSelectAccount?.(acc)}
                        className={`flex flex-1 items-center gap-3 px-3 py-2 text-xs font-medium transition ${
                          activeAccount === acc
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                            : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeAccount === acc
                              ? "bg-emerald-500"
                              : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                        />
                        {acc}
                      </button>

                      {/* Hover actions */}
                      <div className="flex opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => startEdit(acc)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                          title="Renomear"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Account Trigger */}
              {isAdding ? (
                <form onSubmit={handleAdd} className="px-3 py-1">
                  <input
                    autoFocus
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    onBlur={() => !newAccountName && setIsAdding(false)}
                    placeholder="Nome..."
                    className="w-full bg-transparent text-xs outline-none border-b border-zinc-200 dark:border-zinc-800 py-1"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 transition hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Nova Conta
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Navigation Section ─── */}
        <nav className="space-y-0.5 px-3 py-4 border-t border-zinc-100 dark:border-zinc-900">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Navegação
          </p>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className={`group relative flex w-full items-center gap-3 px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-950 dark:hover:text-zinc-100"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 h-full w-[2px] bg-black dark:bg-white" />
                )}
                <Icon
                  className={isActive ? "h-4 w-4" : "h-4 w-4 opacity-70"}
                  strokeWidth={1.5}
                />
                <span className={`tracking-tight ${isActive ? "font-semibold" : "font-normal"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-emerald-500" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
              DELTA Online
            </p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Personal Mastery Hub
          </p>
        </div>
        <button className="mt-3 flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          <Settings className="h-4 w-4" strokeWidth={1.5} />
          Preferências
        </button>
      </div>
    </aside>
  );
}
