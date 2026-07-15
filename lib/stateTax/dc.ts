/**
 * District of Columbia (DC) — local employee-side wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets
 * (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, locals, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxBracket, StateTaxEstimateInput } from "./types";
import {
  graduatedStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const STANDARD_DEDUCTION = { single: 16100, married: 32200, hoh: 16100 };

/** DC uses the same ordinary brackets for single and joint (Tax Foundation TY2026 table). */
const BRACKETS: StateTaxBracket[] = [
  { from: 0, to: 10000, rate: 0.04 },
  { from: 10000, to: 40000, rate: 0.06 },
  { from: 40000, to: 60000, rate: 0.065 },
  { from: 60000, to: 250000, rate: 0.085 },
  { from: 250000, to: 500000, rate: 0.0925 },
  { from: 500000, to: 1000000, rate: 0.0975 },
  { from: 1000000, to: null, rate: 0.1075 },
];

export function estimateDistrictOfColumbiaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  return parts("DC", graduatedStateIncomeTax(taxable, BRACKETS));
}
