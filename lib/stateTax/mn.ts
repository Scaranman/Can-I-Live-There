/**
 * Minnesota (MN) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 15300, married: 30600, hoh: 15300 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 33310, rate: 0.0535 },
    { from: 33310, to: 109430, rate: 0.068 },
    { from: 109430, to: 203150, rate: 0.0785 },
    { from: 203150, to: null, rate: 0.0985 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 48700, rate: 0.0535 },
    { from: 48700, to: 193480, rate: 0.068 },
    { from: 193480, to: 337930, rate: 0.0785 },
    { from: 337930, to: null, rate: 0.0985 },
];

export function estimateMinnesotaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("MN", income);
}
