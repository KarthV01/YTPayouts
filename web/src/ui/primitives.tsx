import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-hover disabled:bg-[#7b8db8]",
    secondary: "border-2 border-ink/30 bg-surface text-ink hover:bg-accent-soft disabled:text-muted",
    ghost: "border-2 border-transparent bg-transparent text-ink hover:border-ink/25 hover:bg-accent-soft disabled:text-muted",
  }[variant];

  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-[6px] px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  className = "",
  children,
}: {
  to: string;
  variant?: "primary" | "secondary";
  className?: string;
  children: ReactNode;
}) {
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "border-2 border-ink/30 bg-surface text-ink hover:bg-accent-soft",
  }[variant];

  return (
    <Link
      to={to}
      className={`inline-flex h-9 items-center justify-center rounded-[6px] px-3.5 text-sm font-medium transition-colors ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 w-full rounded-[6px] border-2 border-ink/25 bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-9 w-full rounded-[6px] border-2 border-ink/25 bg-surface px-3 text-sm text-ink outline-none focus:border-accent ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-[6px] border-2 border-ink/25 bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Banner({
  tone = "error",
  children,
}: {
  tone?: "error" | "info";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-[#8a3a2a] bg-[#f4d7cf] text-ink"
      : "border-ink/25 bg-accent-soft text-ink";

  return <div className={`rounded-[8px] border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.02em] text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-[4px] border border-ink/30 bg-canvas px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink">
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function CopyText({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-[6px] border-2 border-transparent px-2 py-1 font-mono text-[12px] text-ink transition-colors hover:border-ink/25 hover:bg-accent-soft"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      <span>{label ?? value}</span>
      <span className="text-muted">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-10 text-sm font-medium text-ink">{children}</p>;
}
