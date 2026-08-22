import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import type { EnrichedAgreement } from "../../lib/types";
import { useResource } from "../../lib/useResource";
import { ContractPanel } from "../../ui/ContractPanel";
import { Banner, PageHeader } from "../../ui/primitives";

export function CreatorDealDetailPage() {
  const { creatorId = "", id = "" } = useParams();
  const { data, error, loading, reload } = useResource(`creator-contract-${creatorId}-${id}`, () =>
    api.creatorContract(creatorId, id),
  );
  const [contract, setContract] = useState<EnrichedAgreement | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const view = contract ?? data;

  if (loading && !view) {
    return <p className="text-sm text-muted">Loading deal…</p>;
  }

  if ((error && !view) || !view) {
    return <Banner>{error ?? "Deal not found."}</Banner>;
  }

  return (
    <div>
      <PageHeader title={view.title ?? "Untitled deal"} description={view.id} />
      <ContractPanel
        contract={view}
        variant="creator"
        busy={busy}
        error={actionError}
        message={message}
        onRecordMetric={async (input) => {
          setBusy(true);
          setActionError(null);
          setMessage(null);
          try {
            const result = await api.recordCreatorMetric(creatorId, view.id, input);
            setContract(result.agreement);
            setMessage(
              result.releasedPayoutIds.length > 0
                ? `Released ${result.releasedPayoutIds.length} payout${result.releasedPayoutIds.length === 1 ? "" : "s"}.`
                : "Observation recorded.",
            );
          } catch (err) {
            setActionError(err instanceof Error ? err.message : "Action failed");
          } finally {
            setBusy(false);
            reload();
          }
        }}
      />
    </div>
  );
}
