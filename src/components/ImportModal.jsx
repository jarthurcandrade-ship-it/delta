import { useState } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { parseBalanceHistory } from "../utils/csvParser";

export default function ImportModal({ open, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [accountName, setAccountName] = useState("futuros");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const trades = parseBalanceHistory(text);
        setPreview(trades);
      } catch (err) {
        setError("Erro ao processar o arquivo CSV. Verifique o formato.");
        console.error(err);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirm = () => {
    if (preview.length > 0) {
      onImport(preview, accountName);
      setFile(null);
      setPreview([]);
      setAccountName("futuros");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">Importar Histórico de Saldo</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Nome da Conta de Destino
            </label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Ex: futuros, prop-firm-1..."
              className="w-full border border-zinc-200 dark:border-zinc-800 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-black dark:focus:border-white transition"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Arquivo CSV
            </label>
            <div className="relative group">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 py-10 transition group-hover:border-zinc-400 dark:group-hover:border-zinc-600">
                {file ? (
                  <>
                    <FileText className="mb-2 h-8 w-8 text-black dark:text-white" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-zinc-500">Clique para alterar o arquivo</p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm font-medium">Selecione o arquivo CSV</p>
                    <p className="text-xs text-zinc-500">Ou arraste e solte aqui</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Prévia ({preview.length} trades encontrados)
                </p>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">Formato Válido</span>
                </div>
              </div>
              <div className="max-h-40 overflow-auto border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-3 py-2 font-bold uppercase text-zinc-500">Data</th>
                      <th className="px-3 py-2 font-bold uppercase text-zinc-500">Ativo</th>
                      <th className="px-3 py-2 font-bold uppercase text-zinc-500">Dir</th>
                      <th className="px-3 py-2 font-bold uppercase text-zinc-500">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {preview.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono">{t.date}</td>
                        <td className="px-3 py-2 font-semibold">{t.asset}</td>
                        <td className="px-3 py-2">{t.direction}</td>
                        <td className={`px-3 py-2 font-mono ${t.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {t.pnl.toFixed(2)} USD
                        </td>
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50">
                          E mais {preview.length - 10} trades...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancelar
          </button>
          <button
            disabled={preview.length === 0}
            onClick={handleConfirm}
            className="flex items-center gap-2 bg-black px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Confirmar Importação
          </button>
        </div>
      </div>
    </div>
  );
}
