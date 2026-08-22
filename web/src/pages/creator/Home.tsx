import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useResource } from "../../lib/useResource";
import { ContractTable } from "../../ui/ContractTable";
import { KpiRow } from "../../ui/KpiRow";
import { Banner, PageHeader } from "../../ui/primitives";

export function CreatorHomePage() {
  const { creatorId = "" } = useParams();
  const { data, error, loading } = useResource(`creator-dashboard-${creatorId}`, () =>
    api.creatorDashboard(creatorId),
  );

  if (loading) {
    return <p className="text-sm text-muted">Loading dashboard…</p>;
  }

  if (error || !data) {
    return <Banner>{error ?? "Unable to load creator dashboard."}</Banner>;
  }

  const upcoming = [...data.contracts]
    .filter((contract) => contract.status !== "completed")
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div>
      <PageHeader title="Home" description="Deals and payouts for this creator wallet." />
      <KpiRow
        items={[
          { label: "Earned", value: data.totals.releasedPayoutAmount, money: true },
          { label: "Pending", value: data.totals.pendingPayoutAmount, money: true },
          { label: "Active deals", value: String(data.totals.byStatus.active ?? 0) },
          { label: "All deals", value: String(data.totals.totalContracts) },
        ]}
      />
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink">Upcoming deadlines</h2>
        <ContractTable
          contracts={upcoming}
          counterparty="sponsor"
          emptyLabel="No upcoming deals."
          hrefFor={(contract) => `/creator/${creatorId}/deals/${contract.id}`}
        />
      </div>
    </div>
  );
}
