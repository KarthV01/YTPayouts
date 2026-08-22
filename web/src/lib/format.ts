export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatNumber(value: number | string): string {
  return new Intl.NumberFormat("en-US").format(typeof value === "string" ? Number(value) : value);
}

export function truncateAddress(address: string | null | undefined): string {
  if (!address) {
    return "—";
  }
  if (address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function truncateHash(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  if (value.length < 18) {
    return value;
  }
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function partyName(party: { name?: string | null; displayName?: string | null; handle?: string | null } | null): string {
  return party?.name || party?.displayName || party?.handle || "—";
}
