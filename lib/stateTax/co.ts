/**
 * Colorado (CO) — local employee-side state wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, local add-ons, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import {
  flatStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const STANDARD_DEDUCTION = { single: 16100, married: 32200, hoh: 16100 };
const RATE = 0.044;

export function estimateColoradoStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const floor = 0;
  const income = flatStateIncomeTax(taxable, RATE, floor);
  // CO FAMLI 2026: 0.88% total, 50/50 split → 0.44% employee up to SS wage base.
  const famli = Math.min(Math.max(0, params.grossAnnual), 184_500) * 0.0044;
  return parts(
    "CO",
    income,
    famli,
    "Includes Colorado FAMLI employee share (0.44% up to SS wage base).",
  );
}
