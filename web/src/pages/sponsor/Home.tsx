import { api } from "../../lib/api";
import { useResource } from "../../lib/useResource";
import { ContractTable } from "../../ui/ContractTable";
import { KpiRow } from "../../ui/KpiRow";
import { Banner, ButtonLink, PageHeader } from "../../ui/primitives";

export function SponsorHomePage() {
  const { data, error, loading } = useResource("brand-dashboard", () => api.brandDashboard());

  if (loading) {
    return <p className="text-sm text-muted">Loading dashboard...</p>;
  }

  if (error || !data) {
    return <Banner>{error ?? "Unable to load sponsor dashboard."}</Banner>;
  }

  const { totals, contracts } = data;

  return (
    <div>
      <PageHeader
        title="Home"
        description="Escrowed sponsorships for this workspace."
        action={<ButtonLink to="/sponsor/contracts/new">New contract</ButtonLink>}
      />
      <KpiRow
        items={[
          { label: "Escrowed", value: totals.escrowedCapAmount, money: true },
          { label: "Released", value: totals.releasedPayoutAmount, money: true },
          { label: "Pending", value: totals.pendingPayoutAmount, money: true },
          { label: "Contracts", value: String(totals.totalContracts) },
        ]}
      />
      <p className="mt-3 text-sm text-muted">
        {totals.byStatus.draft ?? 0} draft / {totals.byStatus.active ?? 0} active / {totals.byStatus.completed ?? 0}{" "}
        completed
      </p>
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink">Recent contracts</h2>
        <ContractTable
          contracts={contracts}
          counterparty="creator"
          hrefFor={(contract) => `/sponsor/contracts/${contract.id}`}
        />
      </div>
    </div>
  );
}
