import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import type { EnrichedAgreement } from "../../lib/types";
import { useResource } from "../../lib/useResource";
import { ContractPanel } from "../../ui/ContractPanel";
import { Banner, Button, PageHeader } from "../../ui/primitives";

export function CreatorContractDetailPage() {
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
    return <p className="text-sm text-muted">Loading contract...</p>;
  }

  if ((error && !view) || !view) {
    return <Banner>{error ?? "Contract not found."}</Banner>;
  }

  return (
    <div>
      <PageHeader title={view.title ?? "Untitled contract"} description={view.id} />
      <DeliverableUpload />
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

function DeliverableUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");

  return (
    <section className="mb-6 rounded-[8px] border-2 border-ink/20 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-ink">Upload deliverable</h2>
          <p className="mt-1 max-w-[520px] text-sm text-muted">
            Add a drafted video, brief, or proof file to this contract for sponsor review. File storage is not connected in this demo yet.
          </p>
        </div>
        <Button type="button" onClick={() => inputRef.current?.click()}>
          Upload deliverable
        </Button>
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="video/*,image/*,.pdf,.doc,.docx"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
      />
      {fileName ? (
        <div className="mt-4">
          <Banner tone="info">Selected {fileName}. Upload storage is not connected yet.</Banner>
        </div>
      ) : null}
    </section>
  );
}
