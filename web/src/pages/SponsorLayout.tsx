import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { api } from "../lib/api";
import { truncateAddress } from "../lib/format";
import { writeSession } from "../lib/session";
import { useResource } from "../lib/useResource";
import { AppShell } from "../ui/AppShell";

export function SponsorLayout() {
  const { data } = useResource("sponsor-shell", () => api.brandDashboard());
  const brand = data?.brand;

  useEffect(() => {
    if (brand) {
      writeSession({ role: "sponsor", id: brand.id });
    }
  }, [brand]);

  return (
    <AppShell
      accountLabel={brand?.name ?? "Sponsor"}
      accountMeta={brand ? truncateAddress(brand.walletAddress) : undefined}
      nav={[
        { to: "/sponsor", label: "Home" },
        { to: "/sponsor/contracts", label: "Contracts" },
        { to: "/sponsor/creators", label: "Creators" },
        { to: "/sponsor/contracts/new", label: "New contract" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
