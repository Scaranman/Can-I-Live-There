import type { ComparisonComputed } from "./types";

export function deterministicInsights(params: {
  baselineLabel: string;
  computed: ComparisonComputed;
}): string[] {
  const { baselineLabel, computed } = params;
  const ranked = [...computed.cities].sort((a, b) => b.leftoverMonthly - a.leftoverMonthly);
  const best = ranked[0];
  const worst = ranked.at(-1);

  const bullets: string[] = [];

  if (best && worst && best.cityId !== worst.cityId) {
    bullets.push(
      `Highest monthly leftover right now: ${best.label} (~$${Math.round(best.leftoverMonthly).toLocaleString()}). Lowest: ${worst.label} (~$${Math.round(worst.leftoverMonthly).toLocaleString()}), vs baseline “${baselineLabel}”.`,
    );
  }

  const housingSpread =
    computed.cities.length >= 2
      ? Math.max(...computed.cities.map((c) => c.housingMonthly)) -
        Math.min(...computed.cities.map((c) => c.housingMonthly))
      : 0;

  if (housingSpread > 50) {
    bullets.push(
      `Housing differs by about $${Math.round(housingSpread).toLocaleString()} / month across columns — that alone can reorder “best city” once taxes net out.`,
    );
  }

  const taxSpread =
    computed.cities.length >= 2
      ? Math.max(...computed.cities.map((c) => c.tax.effectiveRate)) -
        Math.min(...computed.cities.map((c) => c.tax.effectiveRate))
      : 0;

  if (taxSpread > 0.03) {
    bullets.push(
      `Combined withholding rates differ by ~${(taxSpread * 100).toFixed(1)} percentage points across cities — compare the numbers above before trusting small leftover gaps.`,
    );
  }

  bullets.push(
    `These notes use only your inputs and the on-screen estimates — not a substitute for a tax or payroll professional.`,
  );

  return bullets.slice(0, 6);
}
