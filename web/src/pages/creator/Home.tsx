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
    return <p className="text-sm text-muted">Loading dashboard...</p>;
  }

  if (error || !data) {
    return <Banner>{error ?? "Unable to load creator dashboard."}</Banner>;
  }

  const upcoming = [...data.contracts]
    .filter((contract) => contract.status !== "completed")
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const active = data.contracts.filter((contract) => contract.status === "active");

  return (
    <div>
      <PageHeader title="Home" description="Current contracts, deadlines, and payouts for this creator wallet." />
      <KpiRow
        items={[
          { label: "Earned", value: data.totals.releasedPayoutAmount, money: true },
          { label: "Pending", value: data.totals.pendingPayoutAmount, money: true },
          { label: "Active contracts", value: String(data.totals.byStatus.active ?? 0) },
          { label: "Completed", value: String(data.totals.byStatus.completed ?? 0) },
        ]}
      />
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink">Current contracts</h2>
        <ContractTable
          contracts={active}
          counterparty="sponsor"
          emptyLabel="No active contracts."
          hrefFor={(contract) => `/creator/${creatorId}/contracts/${contract.id}`}
        />
      </div>
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink">Upcoming deadlines</h2>
        <ContractTable
          contracts={upcoming}
          counterparty="sponsor"
          emptyLabel="No upcoming contracts."
          hrefFor={(contract) => `/creator/${creatorId}/contracts/${contract.id}`}
        />
      </div>
    </div>
  );
}
