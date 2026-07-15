/**
 * Montana (MT) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 16100, married: 32200, hoh: 16100 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 47500, rate: 0.047 },
    { from: 47500, to: null, rate: 0.0565 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 95000, rate: 0.047 },
    { from: 95000, to: null, rate: 0.0565 },
];

export function estimateMontanaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("MT", income);
}
