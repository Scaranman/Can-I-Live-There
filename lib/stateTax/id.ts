/**
 * Idaho (ID) — local employee-side state wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, local add-ons, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import {
  amountForFiling,
  flatStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const STANDARD_DEDUCTION = { single: 16100, married: 32200, hoh: 16100 };
const RATE = 0.053;

export function estimateIdahoStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const floor = amountForFiling({ single: 4811, married: 9622, hoh: 4811 }, params.filingStatus);
  const income = flatStateIncomeTax(taxable, RATE, floor);
  return parts("ID", income);
}
