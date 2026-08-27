import { Link } from "react-router-dom";
import { formatDate, partyName } from "../lib/format";
import { formatUsdc } from "../lib/money";
import type { ContractSummary } from "../lib/types";
import { EmptyState, StatusPill } from "./primitives";

export function ContractTable({
  contracts,
  hrefFor,
  counterparty,
  emptyLabel = "No contracts yet.",
}: {
  contracts: ContractSummary[];
  hrefFor: (contract: ContractSummary) => string;
  counterparty: "creator" | "sponsor";
  emptyLabel?: string;
}) {
  if (contracts.length === 0) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <div className="overflow-hidden rounded-[8px] border-2 border-ink/20 bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-rule text-[11px] uppercase tracking-[0.06em] text-muted">
            <th className="px-4 py-2.5 font-medium">Title</th>
            <th className="px-4 py-2.5 font-medium">{counterparty === "creator" ? "Creator" : "Sponsor"}</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Cap</th>
            <th className="px-4 py-2.5 font-medium">{counterparty === "creator" ? "Released" : "Earned"}</th>
            <th className="px-4 py-2.5 font-medium">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id} className="border-b border-rule last:border-b-0">
              <td className="px-4 py-3">
                <Link
                  to={hrefFor(contract)}
                  className="inline-flex rounded-[6px] border-2 border-transparent px-2 py-1 font-semibold text-ink transition-colors hover:border-ink/25 hover:bg-accent-soft"
                >
                  {contract.title ?? "Untitled contract"}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">
                {partyName(counterparty === "creator" ? contract.creatorProfile : contract.sponsorProfile)}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={contract.status} />
              </td>
              <td className="px-4 py-3 tabular-nums">{formatUsdc(contract.financials.totalCapAmount)}</td>
              <td className="px-4 py-3 tabular-nums">{formatUsdc(contract.financials.releasedPayoutAmount)}</td>
              <td className="px-4 py-3 text-muted">{formatDate(contract.deadline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
