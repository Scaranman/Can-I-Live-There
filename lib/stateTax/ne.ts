/**
 * Nebraska (NE) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 8850, married: 17700, hoh: 8850 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 4130, rate: 0.0246 },
    { from: 4130, to: 24760, rate: 0.0351 },
    { from: 24760, to: null, rate: 0.0455 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 8250, rate: 0.0246 },
    { from: 8250, to: 49530, rate: 0.0351 },
    { from: 49530, to: null, rate: 0.0455 },
];

export function estimateNebraskaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("NE", income);
}
