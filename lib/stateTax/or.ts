/**
 * Oregon (OR) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 2910, married: 5820, hoh: 2910 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 4550, rate: 0.0475 },
    { from: 4550, to: 11400, rate: 0.0675 },
    { from: 11400, to: 125000, rate: 0.0875 },
    { from: 125000, to: null, rate: 0.099 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 9100, rate: 0.0475 },
    { from: 9100, to: 22800, rate: 0.0675 },
    { from: 22800, to: 250000, rate: 0.0875 },
    { from: 250000, to: null, rate: 0.099 },
];

export function estimateOregonStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("OR", income);
}
