/**
 * Shared wage-tax math and estimate shape used by local federal / state / provincial estimators.
 */

export type TaxBracket = { from: number; to?: number | null; rate: number };

/** Annualized employee-side payroll estimate mapped into the UI TaxBreakdown fields. */
export type PayrollTaxAnnualEstimate = {
  netAnnual: number;
  monthlyFederal: number;
  monthlyState: number;
  monthlyLocal: number;
  monthlyFica: number;
  monthlyMedicare: number;
  effectiveRate: number;
};

/** Marginal income tax from ordered `from`/`to` slices (`from` inclusive lower bound). */
export function marginalBracketTaxAnnual(
  taxableAnnual: number,
  brackets: TaxBracket[] | undefined,
): number {
  if (taxableAnnual <= 0 || !brackets?.length) return 0;
  let tax = 0;
  for (const br of brackets) {
    const lo = br.from;
    const hi = br.to == null ? Infinity : br.to;
    if (taxableAnnual <= lo) continue;
    const slice = Math.min(taxableAnnual, hi) - lo;
    const r = typeof br.rate === "number" && Number.isFinite(br.rate) ? br.rate : 0;
    if (slice > 0) tax += slice * r;
  }
  return tax;
}
