/**
 * South Carolina (SC) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 8350, married: 16700, hoh: 8350 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 3640, rate: 0 },
    { from: 3640, to: 18230, rate: 0.03 },
    { from: 18230, to: null, rate: 0.06 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 3640, rate: 0 },
    { from: 3640, to: 18230, rate: 0.03 },
    { from: 18230, to: null, rate: 0.06 },
];

export function estimateSouthCarolinaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("SC", income);
}
