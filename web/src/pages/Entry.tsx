import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { readSession, writeSession } from "../lib/session";

const DEFAULT_SPONSOR_ID = "demo_brand_stellar_snacks";

export function EntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = readSession();

    if (session?.role === "creator") {
      navigate(`/creator/${session.id}`, { replace: true });
      return;
    }

    writeSession({ role: "sponsor", id: session?.role === "sponsor" ? session.id : DEFAULT_SPONSOR_ID });
    navigate("/sponsor", { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-[420px] text-center">
        <div className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Payouts</div>
        <p className="mt-3 text-sm text-muted">Opening your sponsorship workspace...</p>
      </div>
    </div>
  );
}
