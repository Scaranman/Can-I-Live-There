/**
 * Delaware (DE) — local employee-side state wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, local add-ons, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxBracket, StateTaxEstimateInput } from "./types";
import {
  filingKey,
  graduatedStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const STANDARD_DEDUCTION = { single: 3250, married: 6500, hoh: 3250 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 2000, to: 5000, rate: 0.022 },
    { from: 5000, to: 10000, rate: 0.039 },
    { from: 10000, to: 20000, rate: 0.048 },
    { from: 20000, to: 25000, rate: 0.052 },
    { from: 25000, to: 60000, rate: 0.0555 },
    { from: 60000, to: null, rate: 0.066 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 2000, to: 5000, rate: 0.022 },
    { from: 5000, to: 10000, rate: 0.039 },
    { from: 10000, to: 20000, rate: 0.048 },
    { from: 20000, to: 25000, rate: 0.052 },
    { from: 25000, to: 60000, rate: 0.0555 },
    { from: 60000, to: null, rate: 0.066 },
];

export function estimateDelawareStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("DE", income);
}
