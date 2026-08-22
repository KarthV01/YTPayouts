import { api } from "../../lib/api";
import { formatNumber, truncateAddress } from "../../lib/format";
import { useResource } from "../../lib/useResource";
import { Banner, ButtonLink, EmptyState, PageHeader } from "../../ui/primitives";

export function CreatorsPage() {
  const { data, error, loading } = useResource("contract-builder", () => api.contractBuilder());

  if (loading) {
    return <p className="text-sm text-muted">Loading creators…</p>;
  }

  if (error || !data) {
    return <Banner>{error ?? "Unable to load creators."}</Banner>;
  }

  if (data.creators.length === 0) {
    return <EmptyState>No creators in the demo catalog.</EmptyState>;
  }

  return (
    <div>
      <PageHeader title="Creators" description="Catalog used when composing a new contract." />
      <div className="overflow-hidden rounded-[8px] border-2 border-ink/20 bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-[11px] uppercase tracking-[0.06em] text-muted">
              <th className="px-4 py-2.5 font-medium">Creator</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Audience</th>
              <th className="px-4 py-2.5 font-medium">Avg. views</th>
              <th className="px-4 py-2.5 font-medium">Wallet</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.creators.map((creator) => (
              <tr key={creator.id} className="border-b border-rule last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{creator.displayName}</div>
                  <div className="text-xs text-muted">{creator.handle}</div>
                </td>
                <td className="px-4 py-3 text-muted">{creator.category}</td>
                <td className="px-4 py-3 text-muted">{creator.audience ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">{formatNumber(creator.averageViews)}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{truncateAddress(creator.walletAddress)}</td>
                <td className="px-4 py-3 text-right">
                  <ButtonLink to={`/sponsor/contracts/new?creatorId=${creator.id}`} variant="secondary">
                    New contract
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
