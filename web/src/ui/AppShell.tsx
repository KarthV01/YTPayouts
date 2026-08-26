import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { Session } from "../lib/session";
import { AccountSwitcher } from "./AccountSwitcher";

export type NavItem = {
  to: string;
  label: string;
};

export function AppShell({
  nav,
  accountLabel,
  accountMeta,
  currentSession,
  children,
}: {
  nav: NavItem[];
  accountLabel: string;
  accountMeta?: string;
  currentSession: Session;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-56 shrink-0 flex-col border-r-2 border-ink/20 bg-surface">
        <div className="flex h-14 items-center px-5">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Payouts</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `rounded-[6px] border-2 px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? "border-accent bg-accent text-white" : "border-transparent text-muted hover:border-ink/20 hover:bg-accent-soft"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b-2 border-ink/20 bg-surface px-8">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{accountLabel}</div>
            {accountMeta ? <div className="truncate font-mono text-[11px] text-muted">{accountMeta}</div> : null}
          </div>
          <AccountSwitcher currentSession={currentSession} />
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
