import { useState, type ReactNode } from "react";
import { formatDate, formatNumber, partyName, truncateAddress, truncateHash } from "../lib/format";
import { formatUsdc } from "../lib/money";
import type { EnrichedAgreement, MetricObservationInput } from "../lib/types";
import { Banner, Button, CopyText, Field, Input, Select, StatusPill } from "./primitives";

export function ContractPanel({
  contract,
  variant,
  busy,
  message,
  error,
  onFund,
  onApprove,
  onRecordMetric,
}: {
  contract: EnrichedAgreement;
  variant: "sponsor" | "creator";
  busy?: boolean;
  message?: string | null;
  error?: string | null;
  onFund?: () => void;
  onApprove?: () => void;
  onRecordMetric?: (input: MetricObservationInput) => void;
}) {
  const canFund = variant === "sponsor" && contract.status === "draft" && onFund;
  const canApprove =
    variant === "sponsor" &&
    contract.status === "active" &&
    contract.payouts.some((payout) => payout.kind === "base" && payout.status === "pending") &&
    onApprove;
  const canRecord = contract.status === "active" && contract.metrics.length > 0 && onRecordMetric;

  return (
    <div className="space-y-6">
      {error ? <Banner>{error}</Banner> : null}
      {message ? <Banner tone="info">{message}</Banner> : null}

      {(canFund || canApprove || canRecord) && (
        <section className="rounded-[8px] border-2 border-ink/20 bg-surface p-5">
          <h2 className="text-sm font-medium text-ink">Actions</h2>
          <p className="mt-1 text-sm text-muted">
            Delivery approval is an operator check. Video content is not verified in this demo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {canFund ? (
              <Button type="button" disabled={busy} onClick={onFund}>
                Fund escrow
              </Button>
            ) : null}
            {canApprove ? (
              <Button type="button" disabled={busy} onClick={onApprove}>
                Approve delivery
              </Button>
            ) : null}
          </div>
          {canRecord ? (
            <RecordPerformanceForm
              metrics={contract.metrics}
              busy={busy}
              onSubmit={(input) => onRecordMetric?.(input)}
            />
          ) : null}
        </section>
      )}

      <section className="grid gap-px overflow-hidden rounded-[8px] border-2 border-ink/20 bg-rule md:grid-cols-2">
        <InfoCell label="Status">
          <StatusPill status={contract.status} />
        </InfoCell>
        <InfoCell label="Cap">{formatUsdc(contract.financials.totalCapAmount)}</InfoCell>
        <InfoCell label="Released">{formatUsdc(contract.financials.releasedPayoutAmount)}</InfoCell>
        <InfoCell label="Pending">{formatUsdc(contract.financials.pendingPayoutAmount)}</InfoCell>
        <InfoCell label="Deadline">{formatDate(contract.deadline)}</InfoCell>
        <InfoCell label="Measurement window">{contract.measurementWindowDays} days</InfoCell>
        <InfoCell label="Sponsor">{partyName(contract.demoBrand)}</InfoCell>
        <InfoCell label="Creator">{partyName(contract.demoCreator)}</InfoCell>
      </section>

      <section className="rounded-[8px] border-2 border-ink/20 bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Deliverable</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{contract.deliverableDescription}</p>
      </section>

      <section className="overflow-hidden rounded-[8px] border-2 border-ink/20 bg-surface">
        <div className="border-b border-rule px-4 py-3 text-sm font-medium text-ink">Payout schedule</div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-[11px] uppercase tracking-[0.06em] text-muted">
              <th className="px-4 py-2.5 font-medium">Payout</th>
              <th className="px-4 py-2.5 font-medium">Condition</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {contract.payouts.map((payout) => (
              <tr key={payout.id} className="border-b border-rule last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{payout.label}</div>
                  <div className="text-xs capitalize text-muted">{payout.kind}</div>
                </td>
                <td className="px-4 py-3 text-muted">
                  {payout.condition
                    ? `${payout.condition.metric.key} ≥ ${formatNumber(payout.condition.threshold)}`
                    : "On delivery approval"}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatUsdc(payout.amount)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={payout.status} />
                  {payout.releasedTxHash ? (
                    <div className="mt-1">
                      <CopyText value={payout.releasedTxHash} label={truncateHash(payout.releasedTxHash)} />
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-[8px] border-2 border-ink/20 bg-surface">
        <div className="border-b border-rule px-4 py-3 text-sm font-medium text-ink">Performance observations</div>
        {contract.observations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No observations recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-[11px] uppercase tracking-[0.06em] text-muted">
                <th className="px-4 py-2.5 font-medium">Metric</th>
                <th className="px-4 py-2.5 font-medium">Value</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Observed</th>
              </tr>
            </thead>
            <tbody>
              {contract.observations.map((observation) => (
                <tr key={observation.id} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-3">{observation.metric.key}</td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(observation.value)}</td>
                  <td className="px-4 py-3 text-muted">{observation.source}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(observation.observedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-[8px] border-2 border-ink/20 bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">On-chain</h2>
        {contract.blockchainRecord ? (
          <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <HashRow label="Escrow" value={contract.blockchainRecord.escrowAddress} display={truncateAddress(contract.blockchainRecord.escrowAddress)} />
            <HashRow label="Create tx" value={contract.blockchainRecord.createTxHash} display={truncateHash(contract.blockchainRecord.createTxHash)} />
            <HashRow label="Terms hash" value={contract.blockchainRecord.termsHash} display={truncateHash(contract.blockchainRecord.termsHash)} />
            <HashRow label="Agreement key" value={contract.blockchainRecord.agreementKey} display={truncateHash(contract.blockchainRecord.agreementKey)} />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">Escrow has not been funded yet.</p>
        )}
      </section>
    </div>
  );
}

function InfoCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.06em] text-muted">{label}</div>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}

function HashRow({ label, value, display }: { label: string; value: string; display: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <CopyText value={value} label={display} />
    </div>
  );
}

function RecordPerformanceForm({
  metrics,
  busy,
  onSubmit,
}: {
  metrics: EnrichedAgreement["metrics"];
  busy?: boolean;
  onSubmit: (input: MetricObservationInput) => void;
}) {
  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? "");
  const [value, setValue] = useState("");

  return (
    <form
      className="mt-5 grid gap-3 border-t border-rule pt-5 md:grid-cols-[1fr_160px_auto] md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ metricKey, value: value.trim() });
      }}
    >
      <Field label="Metric">
        <Select value={metricKey} onChange={(event) => setMetricKey(event.target.value)}>
          {metrics.map((metric) => (
            <option key={metric.id} value={metric.key}>
              {metric.label ?? metric.key}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Value" hint="Integer only">
        <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="100000" />
      </Field>
      <Button type="submit" variant="secondary" disabled={busy || !metricKey || !value.trim()}>
        Record performance
      </Button>
    </form>
  );
}
