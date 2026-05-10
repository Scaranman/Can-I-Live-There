import type { ComparisonComputed } from "./types";
import { formatMoney } from "./money";

export function deterministicInsights(params: {
  baselineLabel: string;
  computed: ComparisonComputed;
}): string[] {
  const { baselineLabel, computed } = params;
  const cur = computed.reportingCurrency;
  const ranked = [...computed.cities].sort((a, b) => b.leftoverMonthly - a.leftoverMonthly);
  const best = ranked[0];
  const worst = ranked.at(-1);

  const bullets: string[] = [];

  const hasUs = computed.cities.some((c) => c.workCountry === "US");
  const hasCa = computed.cities.some((c) => c.workCountry === "CA");
  const fxLabel =
    computed.fxSource === "fallback"
      ? "offline placeholder rate"
      : computed.fxSource === "open_er_api"
        ? "ExchangeRate-API (open feed)"
        : "ExchangeRate-API";
  if (hasUs && hasCa) {
    bullets.push(
      `US and Canadian columns are mixed — salary and housing use each country’s currency for payroll, then take-home and housing convert to ${cur} at about ${computed.cadPerUsd.toFixed(3)} CAD per USD (${fxLabel}).`,
    );
  } else {
    bullets.push(
      `Table amounts are in ${cur}. Expenses: ${computed.expenseLineSummary}. FX: 1 USD ≈ ${computed.cadPerUsd.toFixed(4)} CAD (${fxLabel}).`,
    );
  }

  if (best && worst && best.cityId !== worst.cityId) {
    bullets.push(
      `Highest monthly leftover right now: ${best.label} (~${formatMoney(Math.round(best.leftoverMonthly), cur)}). Lowest: ${worst.label} (~${formatMoney(Math.round(worst.leftoverMonthly), cur)}), vs baseline “${baselineLabel}”.`,
    );
  }

  const housingSpread =
    computed.cities.length >= 2
      ? Math.max(...computed.cities.map((c) => c.housingMonthly)) -
        Math.min(...computed.cities.map((c) => c.housingMonthly))
      : 0;

  if (housingSpread > 50) {
    bullets.push(
      `Housing differs by about ${formatMoney(Math.round(housingSpread), cur)} / month across columns — that alone can reorder “best city” once taxes net out.`,
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
