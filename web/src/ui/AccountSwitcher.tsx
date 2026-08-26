import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { truncateAddress } from "../lib/format";
import { writeSession, type Session } from "../lib/session";
import type { DemoProfiles } from "../lib/types";
import { useResource } from "../lib/useResource";

export type AccountTarget = Session & {
  label: string;
  meta: string;
  walletAddress: string;
};

export function AccountSwitcher({ currentSession }: { currentSession: Session }) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const { data, error, loading } = useResource("account-switcher-profiles", () => api.profiles());
  const current = useMemo(() => {
    if (!data) return null;
    return allTargets(data).find((target) => isCurrent(target, currentSession)) ?? null;
  }, [currentSession, data]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-2 rounded-[6px] border-2 border-ink/25 bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-accent-soft"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="max-w-[150px] truncate">{current?.label ?? "Switch account"}</span>
        <span className="text-muted">v</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[320px] rounded-[8px] border-2 border-ink/20 bg-surface p-3 shadow-[0_12px_30px_rgba(18,16,12,0.18)]">
          {loading ? <p className="px-2 py-3 text-sm text-muted">Loading accounts...</p> : null}
          {error ? <p className="px-2 py-3 text-sm text-muted">{error}</p> : null}
          {data ? (
            <AccountGroups
              profiles={data}
              currentSession={currentSession}
              compact
              onSelect={(target) => {
                selectAccount(target, navigate);
                setOpen(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AccountGroups({
  profiles,
  currentSession,
  compact = false,
  onSelect,
}: {
  profiles: DemoProfiles;
  currentSession?: Session | null;
  compact?: boolean;
  onSelect: (target: AccountTarget) => void;
}) {
  const sponsors = sponsorTargets(profiles);
  const creators = creatorTargets(profiles);

  return (
    <div className={compact ? "space-y-3" : "mx-auto max-w-[560px] space-y-6"}>
      <AccountGroup
        title="Sponsor Accounts"
        targets={sponsors}
        currentSession={currentSession}
        compact={compact}
        onSelect={onSelect}
      />
      <AccountGroup
        title="Creator Accounts"
        targets={creators}
        currentSession={currentSession}
        compact={compact}
        onSelect={onSelect}
      />
    </div>
  );
}

export function selectAccount(target: AccountTarget, navigate: ReturnType<typeof useNavigate>) {
  writeSession({ role: target.role, id: target.id });
  navigate(target.role === "sponsor" ? "/sponsor" : `/creator/${target.id}`);
}

function AccountGroup({
  title,
  targets,
  currentSession,
  compact,
  onSelect,
}: {
  title: string;
  targets: AccountTarget[];
  currentSession?: Session | null;
  compact: boolean;
  onSelect: (target: AccountTarget) => void;
}) {
  return (
    <section className={compact ? "" : "text-center"}>
      <h2 className="mb-2 text-sm font-semibold text-ink">{title}:</h2>
      <div className={compact ? "space-y-1" : "space-y-2"}>
        {targets.map((target) => {
          const active = currentSession ? isCurrent(target, currentSession) : false;
          return (
            <button
              key={`${target.role}-${target.id}`}
              type="button"
              className={`w-full rounded-[6px] border-2 px-3 transition-colors ${
                compact ? "py-2" : "py-3"
              } ${active ? "border-accent bg-accent-soft" : "border-ink/15 bg-surface hover:border-ink/35 hover:bg-accent-soft"}`}
              onClick={() => onSelect(target)}
            >
              <div className={`flex items-start gap-3 ${compact ? "justify-between text-left" : "justify-center text-center"}`}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{target.label}</div>
                  <div className="truncate text-xs text-muted">{target.meta}</div>
                </div>
                {active ? <span className="shrink-0 rounded-[4px] bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Active</span> : null}
              </div>
              {!compact ? <div className="mt-2 font-mono text-[11px] text-muted">{truncateAddress(target.walletAddress)}</div> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function sponsorTargets(profiles: DemoProfiles): AccountTarget[] {
  return profiles.sponsors.map((sponsor) => ({
    role: "sponsor",
    id: sponsor.id,
    label: sponsor.name,
    meta: sponsor.industry,
    walletAddress: sponsor.walletAddress,
  }));
}

function creatorTargets(profiles: DemoProfiles): AccountTarget[] {
  return profiles.creators.map((creator) => ({
    role: "creator",
    id: creator.id,
    label: creator.displayName,
    meta: `${creator.handle} - ${creator.category}`,
    walletAddress: creator.walletAddress,
  }));
}

function allTargets(profiles: DemoProfiles): AccountTarget[] {
  return [...sponsorTargets(profiles), ...creatorTargets(profiles)];
}

function isCurrent(target: AccountTarget, currentSession: Session): boolean {
  return target.role === currentSession.role && target.id === currentSession.id;
}
