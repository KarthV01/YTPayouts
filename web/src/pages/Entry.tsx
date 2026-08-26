import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { readSession } from "../lib/session";
import { useResource } from "../lib/useResource";
import { AccountGroups, selectAccount } from "../ui/AccountSwitcher";
import { Banner } from "../ui/primitives";

export function EntryPage() {
  const navigate = useNavigate();
  const currentSession = useMemo(() => readSession(), []);
  const { data, error, loading } = useResource("entry-profiles", () => api.profiles());

  return (
    <div className="min-h-screen bg-canvas px-6 py-10">
      <main className="mx-auto w-full max-w-[860px]">
        <div className="mb-7 text-center">
          <div className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Payouts</div>
          <h1 className="mt-6 text-[28px] font-medium tracking-[-0.02em] text-ink">Choose an account</h1>
          <p className="mx-auto mt-2 max-w-[520px] text-sm text-muted">
            Switch between the demo sponsor workspace and creator profiles. Each dashboard only shows activity for the selected account.
          </p>
        </div>

        {loading ? <p className="text-center text-sm text-muted">Loading accounts...</p> : null}
        {error ? <Banner>{error}</Banner> : null}
        {data ? (
          <AccountGroups
            profiles={data}
            currentSession={currentSession}
            onSelect={(target) => selectAccount(target, navigate)}
          />
        ) : null}
      </main>
    </div>
  );
}
