import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { formatDate, partyName, truncateHash } from "../../lib/format";
import { formatUsdc } from "../../lib/money";
import { useResource } from "../../lib/useResource";
import { Banner, CopyText, EmptyState, PageHeader, StatusPill } from "../../ui/primitives";

export function CreatorEarningsPage() {
  const { creatorId = "" } = useParams();
  const { data, error, loading } = useResource(`creator-contracts-${creatorId}`, () =>
    api.creatorContracts(creatorId),
  );

  if (loading) {
    return <p className="text-sm text-muted">Loading earnings…</p>;
  }

  if (error || !data) {
    return <Banner>{error ?? "Unable to load earnings."}</Banner>;
  }

  const rows = data.flatMap((contract) =>
    contract.payouts.map((payout) => ({
      payout,
      contract,
    })),
  );

  if (rows.length === 0) {
    return (
      <div>
        <PageHeader title="Earnings" description="Base and bonus payouts across all deals." />
        <EmptyState>No payouts yet.</EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Earnings" description="Base and bonus payouts across all deals." />
      <div className="overflow-hidden rounded-[8px] border-2 border-ink/20 bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-[11px] uppercase tracking-[0.06em] text-muted">
              <th className="px-4 py-2.5 font-medium">Payout</th>
              <th className="px-4 py-2.5 font-medium">Deal</th>
              <th className="px-4 py-2.5 font-medium">Sponsor</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ payout, contract }) => (
              <tr key={payout.id} className="border-b border-rule last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{payout.label}</div>
                  <div className="text-xs capitalize text-muted">{payout.kind}</div>
                </td>
                <td className="px-4 py-3 text-muted">{contract.title ?? "Untitled"}</td>
                <td className="px-4 py-3 text-muted">{partyName(contract.demoBrand)}</td>
                <td className="px-4 py-3 tabular-nums">{formatUsdc(payout.amount)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={payout.status} />
                  {payout.releasedAt ? (
                    <div className="mt-1 text-xs text-muted">{formatDate(payout.releasedAt)}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {payout.releasedTxHash ? (
                    <CopyText value={payout.releasedTxHash} label={truncateHash(payout.releasedTxHash)} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
