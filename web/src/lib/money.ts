export function formatUsdc(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "-";
  }

  const units = BigInt(amount);
  const cents = units / 10000n;
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}.${frac.toString().padStart(2, "0")}`;
}

export function usdcToUnits(input: string): string {
  const trimmed = input.trim().replace(/,/g, "").replace(/^\$/, "");
  if (!trimmed) {
    throw new Error("Amount is required");
  }
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error("Enter a valid USDC amount");
  }

  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const frac = (fracRaw + "000000").slice(0, 6);
  return (BigInt(whole) * 1_000_000n + BigInt(frac)).toString();
}

export function unitsToUsdcInput(amount: string): string {
  const units = BigInt(amount);
  const whole = units / 1_000_000n;
  const frac = units % 1_000_000n;
  if (frac === 0n) {
    return whole.toString();
  }
  return `${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}
