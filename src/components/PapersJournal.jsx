import { useMemo, useState, useRef, useEffect } from "react";
import {
  Library,
  Calendar,
  Tag as TagIcon,
  Link as LinkIcon,
  Save,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  FileText,
  Clock4,
  Pin,
  PinOff,
  BookOpen,
  X,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  Eye,
  AlertTriangle,
  Layout,
  PenTool,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card, SectionHeader, Field, TextInput, TextArea, Button } from "./ui";
import {
  cx,
  BORDER,
  TEXT_TITLE,
  TEXT_BODY,
  TEXT_SOFT,
  TEXT_MUTED,
  TEXT_EMERALD,
  LABEL_XS,
  LABEL_WIDE,
} from "./constants";
import { uploadFile } from "../lib/supabase";

const DEFAULT_TOPICS = [
  "Macroeconomia",
  "Price Action",
  "Psicologia",
  "ICT Concepts",
  "Liquidez",
  "Inter-Market",
  "Risk Management",
  "Outro",
];

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatRelative(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "agora";
  if (sec < 60) return `há ${sec}s`;
  if (sec < 3600) return `há ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `há ${Math.floor(sec / 3600)} h`;
  return new Date(iso).toLocaleString("pt-BR");
}

function topicTone(topic) {
  const map = {
    Macroeconomia: "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/5",
    "Price Action":
      "border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-500/5",
    Psicologia:
      "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5",
    "ICT Concepts":
      "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
    Liquidez:
      "border-fuchsia-500/40 text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/5",
    "Inter-Market":
      "border-cyan-500/40 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5",
    "Risk Management":
      "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5",
  };
  return (
    map[topic] ||
    "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
  );
}

function emptyDraft() {
  return {
    id: `temp-${Date.now()}`, // Temporary ID for uploads before save
    date: todayKey(),
    title: "",
    topic: "",
    summary: "",
    source: "",
    isPinned: false,
  };
}

// ── Markdown renderer with image support ──────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let buf = [];

  const flushParagraph = () => {
    if (!buf.length) return;
    blocks.push({ type: "p", content: buf.join(" ") });
    buf = [];
  };

  for (const raw of lines) {
    const line = raw;
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    // Headings
    if (/^###\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: "h3", content: line.replace(/^###\s+/, "") });
    } else if (/^##\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: "h2", content: line.replace(/^##\s+/, "") });
    } else if (/^#\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: "h1", content: line.replace(/^#\s+/, "") });
    } 
    // Images: ![alt](url)
    else if (/^!\[.*\]\((.*)\)/.test(line)) {
      flushParagraph();
      const match = line.match(/^!\[.*\]\((.*)\)/);
      blocks.push({ type: "img", url: match[1] });
    }
    // Lists
    else if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      const item = line.replace(/^[-*]\s+/, "");
      if (last && last.type === "ul") last.items.push(item);
      else blocks.push({ type: "ul", items: [item] });
    } 
    // Quotes
    else if (/^>\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: "quote", content: line.replace(/^>\s+/, "") });
    } 
    // Paragraphs
    else {
      buf.push(line);
    }
  }
  flushParagraph();

  const inline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noreferrer" class="text-sky-600 dark:text-sky-400 underline-offset-2 hover:underline">$1</a>',
      );

  return (
    <div className="space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {blocks.map((b, i) => {
        if (b.type === "h1")
          return (
            <h2
              key={i}
              className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
              dangerouslySetInnerHTML={{ __html: inline(b.content) }}
            />
          );
        if (b.type === "h2")
          return (
            <h3
              key={i}
              className="mt-6 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 underline decoration-zinc-200 underline-offset-4 dark:decoration-zinc-800"
              dangerouslySetInnerHTML={{ __html: inline(b.content) }}
            />
          );
        if (b.type === "h3")
          return (
            <h4
              key={i}
              className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-700 dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: inline(b.content) }}
            />
          );
        if (b.type === "img")
          return (
            <img
              key={i}
              src={b.url}
              alt="Estudo"
              className="max-w-full rounded border border-zinc-200 dark:border-zinc-800"
              loading="lazy"
            />
          );
        if (b.type === "ul")
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((it, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inline(it) }} />
              ))}
            </ul>
          );
        if (b.type === "quote")
          return (
            <blockquote
              key={i}
              className="border-l-4 border-zinc-200 bg-zinc-50/50 py-1 pl-4 italic text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400"
              dangerouslySetInnerHTML={{ __html: inline(b.content) }}
            />
          );
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: inline(b.content) }} />
        );
      })}
    </div>
  );
}

// ── Sync status pill ──────────────────────────────────────────────
function SyncBadge({ status, lastSyncedAt }) {
  const map = {
    loading: { Icon: Loader2, label: "Sincronizando", tone: "border-zinc-300 text-zinc-500 dark:border-zinc-700", spin: true },
    synced: { Icon: Check, label: "Sincronizado", tone: `border-emerald-500/40 bg-emerald-500/5 ${TEXT_EMERALD}` },
    offline: { Icon: CloudOff, label: "Offline", tone: "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400" },
    error: { Icon: AlertTriangle, label: "Erro de sync", tone: "border-rose-500/40 bg-rose-500/5 text-rose-600 dark:text-rose-400" },
    idle: { Icon: Cloud, label: "Pronto", tone: "border-zinc-300 text-zinc-500 dark:border-zinc-700" },
  };
  const cfg = map[status] || map.idle;
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${cfg.tone}`}
      title={lastSyncedAt ? `Última sincronização ${formatRelative(lastSyncedAt)}` : undefined}
    >
      <Icon className={`h-3 w-3 ${cfg.spin ? "animate-spin" : ""}`} strokeWidth={2} />
      {cfg.label}
    </span>
  );
}

// ── Reading drawer ───────────────────────────────────────────────
function ReadingDrawer({ paper, onClose, onEdit, onTogglePin }) {
  if (!paper) return null;
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm dark:bg-black/70" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-3xl flex-col border-l border-zinc-200 bg-white/95 backdrop-blur-md shadow-2xl dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className={cx("flex h-8 w-8 items-center justify-center border", BORDER, TEXT_SOFT)}>
              <BookOpen className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className={LABEL_XS}>Modo Leitura</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onTogglePin?.(paper.id)}
              className="border border-zinc-300 p-1.5 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
              title={paper.isPinned ? "Desafixar" : "Fixar"}
            >
              {paper.isPinned ? <PinOff className="h-4 w-4" strokeWidth={1.5} /> : <Pin className="h-4 w-4" strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => onEdit?.(paper)}
              className="border border-zinc-300 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
            >
              Editar
            </button>
            <button
              onClick={onClose}
              className="border border-zinc-300 p-1.5 text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-10 sm:px-12">
          <article className="mx-auto max-w-prose">
            <div className="mb-4 flex items-center gap-2 text-[10px]">
              <Calendar className="h-3 w-3 text-zinc-400" />
              <span className="font-mono uppercase tracking-wider text-zinc-500">{formatDateBR(paper.date)}</span>
              {paper.topic && <span className={`border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${topicTone(paper.topic)}`}>{paper.topic}</span>}
              {paper.isPinned && (
                <span className="inline-flex items-center gap-1 border border-amber-500/40 bg-amber-500/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Pin className="h-2.5 w-2.5" strokeWidth={2} /> Fixado
                </span>
              )}
            </div>

            <h1 className="mb-8 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{paper.title}</h1>

            {renderMarkdown(paper.summary)}

            {paper.source && (
              <div className="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <p className={LABEL_WIDE}>Fonte</p>
                <a href={paper.source} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-xs text-sky-600 hover:underline dark:text-sky-400">
                  <ExternalLink className="h-3 w-3" />
                  {paper.source}
                </a>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function PapersJournal({
  papers = [],
  onSave,
  onDelete,
  onTogglePin,
  syncStatus = "idle",
  lastSyncedAt = null,
}) {
  const [viewMode, setViewMode] = useState("feed"); // "feed" | "editor"
  const [draft, setDraft] = useState(emptyDraft);
  const [query, setQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [readingPaper, setReadingPaper] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const textareaRef = useRef(null);
  const isEditing = Boolean(draft.id && !draft.id.startsWith("temp-"));

  // Sort & Filter
  const sorted = useMemo(() => {
    return [...papers].sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.date) - new Date(a.date);
    });
  }, [papers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((p) => {
      if (topicFilter && p.topic !== topicFilter) return false;
      if (!q) return true;
      return (
        p.title?.toLowerCase().includes(q) ||
        p.topic?.toLowerCase().includes(q) ||
        p.summary?.toLowerCase().includes(q)
      );
    });
  }, [sorted, query, topicFilter]);

  const topicsInUse = useMemo(() => [...new Set(papers.map((p) => p.topic).filter(Boolean))].sort(), [papers]);

  // Handlers
  const handleSave = (e) => {
    e?.preventDefault?.();
    if (!draft.title.trim() || !draft.summary.trim()) return;
    
    // If it's a new paper with temp ID, we strip the temp ID before saving
    const payload = { ...draft };
    if (payload.id && payload.id.startsWith("temp-")) delete payload.id;
    
    onSave?.(payload);
    setDraft(emptyDraft());
    setViewMode("feed");
  };

  const handleNew = () => {
    setDraft(emptyDraft());
    setViewMode("editor");
  };

  const handleEdit = (paper) => {
    setDraft({ ...paper });
    setViewMode("editor");
    setReadingPaper(null);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) continue;

        setIsUploading(true);
        const timestamp = Date.now();
        const paperId = draft.id || "temp-paste";
        const filePath = `papers/${paperId}/${timestamp}.png`;
        
        const url = await uploadFile("screenshots", filePath, blob);
        if (url) {
          const imageMarkdown = `\n![screenshot](${url})\n`;
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          const text = draft.summary;
          const newSummary = text.substring(0, start) + imageMarkdown + text.substring(end);
          setDraft(d => ({ ...d, summary: newSummary }));
        }
        setIsUploading(false);
      }
    }
  };

  const wordCount = (draft.summary.match(/\S+/g) || []).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className={cx("flex h-12 w-12 items-center justify-center border", BORDER, TEXT_SOFT)}>
            <Library className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <div>
            <p className={LABEL_XS}>Research Lab</p>
            <h1 className={cx("text-2xl font-bold tracking-tight", TEXT_TITLE)}>Papers & Estudos</h1>
            <div className="mt-1 flex items-center gap-3">
              <SyncBadge status={syncStatus} lastSyncedAt={lastSyncedAt} />
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">{papers.length} estudos registrados</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-zinc-200 p-1 dark:border-zinc-800">
            <button
              onClick={() => setViewMode("feed")}
              className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                viewMode === "feed" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Layout className="h-3.5 w-3.5" /> Feed
            </button>
            <button
              onClick={() => setViewMode("editor")}
              className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                viewMode === "editor" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <PenTool className="h-3.5 w-3.5" /> Editor
            </button>
          </div>
          <button
            onClick={handleNew}
            className="flex h-10 items-center gap-2 bg-emerald-600 px-4 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>
      </div>

      {/* ── View: Editor ── */}
      {viewMode === "editor" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card padding="p-0">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                    className="bg-transparent text-xs font-mono font-bold uppercase outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex items-center gap-2">
                  <TagIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <input
                    list="editor-topics"
                    value={draft.topic}
                    onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
                    placeholder="Tópico"
                    className="bg-transparent text-xs font-bold uppercase outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                  <datalist id="editor-topics">
                    {[...DEFAULT_TOPICS, ...topicsInUse].map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 lg:flex dark:hover:text-zinc-100"
                >
                  {showPreview ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {showPreview ? "Esconder Preview" : "Ver Preview"}
                </button>
                <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden lg:block" />
                <Button variant="success" size="sm" onClick={handleSave} icon={<Save className="h-3.5 w-3.5" />}>
                  Publicar
                </Button>
              </div>
            </div>

            <div className="px-6 py-4">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Título do estudo..."
                className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-200 dark:placeholder:text-zinc-800"
              />
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="url"
                    value={draft.source}
                    onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                    placeholder="Link da fonte (opcional)"
                    className="bg-transparent text-xs outline-none text-zinc-500 dark:text-zinc-400 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 w-64"
                  />
                </div>
                <button
                  onClick={() => setDraft(d => ({ ...d, isPinned: !d.isPinned }))}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition ${
                    draft.isPinned ? "text-amber-500" : "text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  {draft.isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                  {draft.isPinned ? "Fixado" : "Fixar"}
                </button>
              </div>
            </div>

            <div className={cx("grid min-h-[500px] border-t border-zinc-200 dark:border-zinc-800", showPreview ? "lg:grid-cols-2" : "grid-cols-1")}>
              <div className="relative border-r border-zinc-200 dark:border-zinc-800">
                <textarea
                  ref={textareaRef}
                  value={draft.summary}
                  onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                  onPaste={handlePaste}
                  placeholder="Escreva livremente aqui... Suporta Markdown. Dica: Cole imagens do clipboard (Ctrl+V) para anexar prints."
                  className="h-full w-full resize-none bg-transparent p-6 font-mono text-[13px] leading-relaxed outline-none text-zinc-800 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-800"
                />
                {isUploading && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/80 px-3 py-1.5 text-[10px] text-white backdrop-blur-md rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" /> Subindo imagem...
                  </div>
                )}
                <div className="absolute bottom-4 left-6 flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                  <span>{wordCount} palavras</span>
                  <span>|</span>
                  <span className="flex items-center gap-1.5"><ImageIcon className="h-3 w-3" /> Cole prints aqui</span>
                </div>
              </div>
              {showPreview && (
                <div className="hidden bg-zinc-50/50 p-8 lg:block dark:bg-zinc-950/20 overflow-y-auto">
                  <div className="max-w-prose">
                    <p className={cx(LABEL_XS, "mb-4 opacity-50")}>Preview</p>
                    {renderMarkdown(draft.summary) || <p className="italic text-zinc-400">Nenhum conteúdo para visualizar...</p>}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── View: Feed ── */}
      {viewMode === "feed" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar estudos..."
                className="w-full border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-zinc-900 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTopicFilter("")}
                className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  topicFilter === "" ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 text-zinc-500 hover:border-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100"
                }`}
              >
                Todos
              </button>
              {topicsInUse.map(t => (
                <button
                  key={t}
                  onClick={() => setTopicFilter(t === topicFilter ? "" : t)}
                  className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    topicFilter === t ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-200 text-zinc-500 hover:border-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center gap-4 border border-zinc-200 py-32 dark:border-zinc-800">
                <span className="flex h-16 w-16 items-center justify-center border border-zinc-200 text-zinc-300 dark:border-zinc-800 dark:text-zinc-800">
                  <Library className="h-8 w-8" strokeWidth={1} />
                </span>
                <div className="text-center">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Nenhum estudo encontrado</p>
                  <p className="mt-1 text-xs text-zinc-500">Tente buscar por outros termos ou crie um novo estudo.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleNew}>Criar Primeiro Estudo</Button>
             </div>
          ) : (
            <div className="space-y-8">
              {filtered.map((p) => {
                // Extract first image from markdown for cover
                const imgMatch = p.summary?.match(/!\[.*\]\((.*)\)/);
                const coverUrl = imgMatch ? imgMatch[1] : null;
                const cleanSummary = p.summary?.replace(/!\[.*\]\(.*\)/g, "").trim();

                return (
                  <article 
                    key={p.id} 
                    className={cx(
                      "group relative flex flex-col gap-6 overflow-hidden border border-zinc-200 bg-white transition hover:border-zinc-900 sm:flex-row dark:border-zinc-800 dark:bg-black dark:hover:border-zinc-100",
                      p.isPinned && "border-amber-500/50 bg-amber-500/5 dark:border-amber-500/30 dark:bg-amber-500/5"
                    )}
                  >
                    {coverUrl && (
                      <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-auto sm:w-64 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800">
                        <img src={coverUrl} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/10 transition group-hover:bg-transparent" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">{formatDateBR(p.date)}</span>
                          {p.topic && <span className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${topicTone(p.topic)}`}>{p.topic}</span>}
                          {p.isPinned && (
                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-500">
                              <Pin className="h-2.5 w-2.5" /> Fixado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                           <button onClick={() => onTogglePin?.(p.id)} className="text-zinc-400 hover:text-amber-500" title="Fixar/Desafixar"><Pin className="h-3.5 w-3.5" /></button>
                           <button onClick={() => handleEdit(p)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" title="Editar"><PenTool className="h-3.5 w-3.5" /></button>
                           <button onClick={() => { if(window.confirm("Apagar estudo?")) onDelete?.(p.id); }} className="text-zinc-400 hover:text-rose-500" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>

                      <h2 className="mb-3 text-xl font-bold tracking-tight text-zinc-900 group-hover:underline dark:text-zinc-50">
                        <button onClick={() => setReadingPaper(p)} className="text-left">{p.title || "(Sem Título)"}</button>
                      </h2>

                      <div className="mb-6 line-clamp-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                         {cleanSummary}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-900">
                        <div className="flex items-center gap-4">
                           <button 
                            onClick={() => setReadingPaper(p)}
                            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-900 hover:underline dark:text-zinc-100"
                           >
                             Continuar Lendo <ChevronRight className="h-3.5 w-3.5" />
                           </button>
                           {p.source && (
                             <a href={p.source} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-sky-500">
                               <ExternalLink className="h-3 w-3" /> Fonte
                             </a>
                           )}
                        </div>
                        {p.updatedAt && <span className="text-[10px] text-zinc-400 italic">Atualizado {formatRelative(p.updatedAt)}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ReadingDrawer
        paper={readingPaper}
        onClose={() => setReadingPaper(null)}
        onEdit={handleEdit}
        onTogglePin={onTogglePin}
      />
    </div>
  );
}
