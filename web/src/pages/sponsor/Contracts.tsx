import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useResource } from "../../lib/useResource";
import { ContractTable } from "../../ui/ContractTable";
import { Banner, ButtonLink, PageHeader, Select } from "../../ui/primitives";

export function SponsorContractsPage() {
  const { sponsorId = "" } = useParams();
  const { data, error, loading } = useResource(`brand-contracts-${sponsorId}`, () =>
    api.brandContracts(sponsorId),
  );
  const [status, setStatus] = useState("all");

  const contracts = useMemo(() => {
    if (!data) {
      return [];
    }
    if (status === "all") {
      return data;
    }
    return data.filter((contract) => contract.status === status);
  }, [data, status]);

  if (loading) {
    return <p className="text-sm text-muted">Loading contracts...</p>;
  }

  if (error || !data) {
    return <Banner>{error ?? "Unable to load contracts."}</Banner>;
  }

  return (
    <div>
      <PageHeader
        title="Contracts"
        description="All sponsorship agreements for this sponsor."
        action={<ButtonLink to={`/sponsor/${sponsorId}/contracts/new`}>New contract</ButtonLink>}
      />
      <div className="mb-4 max-w-[200px]">
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </Select>
      </div>
      <ContractTable
        contracts={contracts}
        counterparty="creator"
        hrefFor={(contract) => `/sponsor/${sponsorId}/contracts/${contract.id}`}
      />
    </div>
  );
}
