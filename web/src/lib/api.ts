import type {
  BrandDashboard,
  ContractBuilder,
  CreateContractInput,
  CreatorDashboard,
  DemoProfiles,
  EnrichedAgreement,
  MetricObservationInput,
  MutationResult,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // keep fallback
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export const api = {
  profiles: () => request<DemoProfiles>("/demo/profiles"),
  brandDashboard: () => request<BrandDashboard>("/demo/brand/dashboard"),
  brandContracts: () => request<EnrichedAgreement[]>("/demo/brand/contracts"),
  brandContract: (id: string) => request<EnrichedAgreement>(`/demo/brand/contracts/${id}`),
  contractBuilder: () => request<ContractBuilder>("/demo/brand/contract-builder"),
  createContract: (input: CreateContractInput) =>
    request<EnrichedAgreement>("/demo/brand/contracts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  fundContract: (id: string) =>
    request<EnrichedAgreement>(`/demo/brand/contracts/${id}/fund`, { method: "POST" }),
  approveDelivery: (id: string) =>
    request<MutationResult>(`/demo/brand/contracts/${id}/approve-delivery`, { method: "POST" }),
  recordBrandMetric: (id: string, input: MetricObservationInput) =>
    request<MutationResult>(`/demo/brand/contracts/${id}/metrics`, {
      method: "POST",
      body: JSON.stringify({ source: "simulation", ...input }),
    }),
  creatorDashboard: (creatorId: string) =>
    request<CreatorDashboard>(`/demo/creator/${creatorId}/dashboard`),
  creatorContracts: (creatorId: string) =>
    request<EnrichedAgreement[]>(`/demo/creator/${creatorId}/contracts`),
  creatorContract: (creatorId: string, id: string) =>
    request<EnrichedAgreement>(`/demo/creator/${creatorId}/contracts/${id}`),
  recordCreatorMetric: (creatorId: string, id: string, input: MetricObservationInput) =>
    request<MutationResult>(`/demo/creator/${creatorId}/contracts/${id}/metrics`, {
      method: "POST",
      body: JSON.stringify({ source: "simulation", ...input }),
    }),
};
