import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { formatNumber, truncateAddress } from "../../lib/format";
import type { CreatorProfile } from "../../lib/types";
import { Banner, Button, ButtonLink, EmptyState, Input, PageHeader } from "../../ui/primitives";

export function CreatorsPage() {
  const { sponsorId = "" } = useParams();
  const [query, setQuery] = useState("");
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchCreators(query);
      setCreators(result.creators);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Creators" description="Search creator accounts by account name or display name." />
      <form
        className="mb-5 flex max-w-[520px] gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <Input value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>
      {error ? (
        <div className="mb-4">
          <Banner>{error}</Banner>
        </div>
      ) : null}
      {creators.length === 0 ? <EmptyState>Search for a creator account to start a contract.</EmptyState> : null}
      {creators.length > 0 ? (
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
              {creators.map((creator) => (
                <tr key={creator.id} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{creator.displayName}</div>
                    <div className="text-xs text-muted">{creator.handle}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{creator.category}</td>
                  <td className="px-4 py-3 text-muted">{creator.audience ?? "-"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(creator.averageViews)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{truncateAddress(creator.walletAddress)}</td>
                  <td className="px-4 py-3 text-right">
                    <ButtonLink
                      to={`/sponsor/${sponsorId}/contracts/new?creatorProfileId=${creator.id}`}
                      variant="secondary"
                    >
                      New contract
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
