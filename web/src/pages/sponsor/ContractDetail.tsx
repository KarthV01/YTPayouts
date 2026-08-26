import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { useResource } from "../../lib/useResource";
import type { EnrichedAgreement } from "../../lib/types";
import { ContractPanel } from "../../ui/ContractPanel";
import { Banner, PageHeader } from "../../ui/primitives";

export function SponsorContractDetailPage() {
  const { id = "" } = useParams();
  const { data, error, loading, reload } = useResource(`brand-contract-${id}`, () => api.brandContract(id));
  const [contract, setContract] = useState<EnrichedAgreement | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const view = contract ?? data;

  async function run(action: () => Promise<EnrichedAgreement | { releasedPayoutIds: string[]; agreement: EnrichedAgreement }>) {
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      const result = await action();
      if ("agreement" in result) {
        setContract(result.agreement);
        setMessage(
          result.releasedPayoutIds.length > 0
            ? `Released ${result.releasedPayoutIds.length} payout${result.releasedPayoutIds.length === 1 ? "" : "s"}.`
            : "No new payouts released.",
        );
      } else {
        setContract(result);
        setMessage("Escrow funded.");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
      reload();
    }
  }

  if (loading && !view) {
    return <p className="text-sm text-muted">Loading contract...</p>;
  }

  if ((error && !view) || !view) {
    return <Banner>{error ?? "Contract not found."}</Banner>;
  }

  return (
    <div>
      <PageHeader title={view.title ?? "Untitled contract"} description={view.id} />
      <ContractPanel
        contract={view}
        variant="sponsor"
        busy={busy}
        error={actionError}
        message={message}
        onFund={() => run(() => api.fundContract(view.id))}
        onApprove={() => run(() => api.approveDelivery(view.id))}
        onRecordMetric={(input) => run(() => api.recordBrandMetric(view.id, input))}
      />
    </div>
  );
}
