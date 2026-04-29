import { cloneElement } from "react";

const TAG_TONES = {
  neutral: {
    off: "border-zinc-200 bg-transparent text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
    on: "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black",
  },
  positive: {
    off: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    on: "border-emerald-500 bg-emerald-500 text-white",
  },
  negative: {
    off: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    on: "border-rose-500 bg-rose-500 text-white",
  },
};

export function Tag({ children, icon, size = "sm", active = false, onClick, tone = "neutral" }) {
  const t = TAG_TONES[tone] || TAG_TONES.neutral;
  const sizes = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  const base = "inline-flex items-center gap-1 border font-medium tracking-wide";
  const state = active ? t.on : t.off;
  const interactive = onClick ? "cursor-pointer" : "";
  return (
    <span onClick={onClick} className={`${base} ${state} ${sizes} ${interactive}`}>
      {icon && cloneElement(icon, { className: "h-3 w-3", strokeWidth: 1.5 })}
      {children}
    </span>
  );
}

export function Card({ children, className = "", padding = "p-5" }) {
  return (
    <div
      className={`relative border border-zinc-200 bg-white transition-colors dark:border-zinc-800 dark:bg-zinc-950 ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ icon, title, subtitle, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            {cloneElement(icon, { strokeWidth: 1.5 })}
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          {label}
        </span>
        {hint && <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const FIELD_BASE =
  "w-full border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-100";

export function TextInput(props) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${FIELD_BASE} ${className}`} />;
}

export function Select({ children, className = "", ...props }) {
  return (
    <select {...props} className={`${FIELD_BASE} ${className}`}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${FIELD_BASE} resize-none ${className}`} />;
}

export function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      {label && (
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      )}
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export function Button({ children, variant = "primary", icon, className = "", ...rest }) {
  const variants = {
    primary:
      "bg-zinc-900 text-white border border-zinc-900 hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 dark:hover:bg-white",
    secondary:
      "bg-transparent text-zinc-700 border border-zinc-300 hover:border-zinc-900 hover:text-zinc-900 active:scale-[0.98] dark:text-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-zinc-100",
    ghost: "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
    success:
      "bg-emerald-500 text-white border border-emerald-500 hover:bg-emerald-600 hover:border-emerald-600 active:scale-[0.98]",
    danger:
      "bg-transparent text-rose-600 border border-rose-500/40 hover:bg-rose-500/10 dark:text-rose-400",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-150 ${variants[variant]} ${className}`}
    >
      {icon && cloneElement(icon, { strokeWidth: 1.5 })}
      {children}
    </button>
  );
}

const CHIP_TONES = {
  neutral: {
    off: "border-zinc-300 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100",
    on: "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900",
  },
  positive: {
    off: "border-zinc-300 text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400",
    on: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  negative: {
    off: "border-zinc-300 text-zinc-600 hover:border-rose-500 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-500 dark:hover:text-rose-400",
    on: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
};

export function ToggleChip({ active, onClick, children, tone = "neutral" }) {
  const t = CHIP_TONES[tone] || CHIP_TONES.neutral;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2.5 py-1 text-[11px] font-medium tracking-wide transition ${
        active ? t.on : t.off
      }`}
    >
      {children}
    </button>
  );
}

export function formatUsd(value, opts = {}) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : opts.signed ? "+" : "";
  const out = abs.toLocaleString("en-US", {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  });
  return `${sign}$${out}`;
}

export function signedUsd(value, opts = {}) {
  return formatUsd(value, { ...opts, signed: true });
}

export function pnlClass(value, { dim = false } = {}) {
  if (value > 0) return dim ? "text-emerald-500" : "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return dim ? "text-rose-500" : "text-rose-600 dark:text-rose-400";
  return "text-zinc-500";
}
