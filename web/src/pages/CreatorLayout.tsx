import { Outlet, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useResource } from "../lib/useResource";
import { writeSession } from "../lib/session";
import { AppShell } from "../ui/AppShell";
import { useEffect } from "react";

export function CreatorLayout() {
  const { creatorId = "" } = useParams();
  const { data } = useResource(`creator-shell-${creatorId}`, () => api.creatorDashboard(creatorId));
  const creator = data?.creator;

  useEffect(() => {
    if (creatorId) {
      writeSession({ role: "creator", id: creatorId });
    }
  }, [creatorId]);

  return (
    <AppShell
      accountLabel={creator?.displayName ?? "Creator"}
      accountMeta={creator?.handle}
      nav={[
        { to: `/creator/${creatorId}`, label: "Home" },
        { to: `/creator/${creatorId}/deals`, label: "Deals" },
        { to: `/creator/${creatorId}/earnings`, label: "Earnings" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
