/**
 * Missouri (MO) — local employee-side state wage tax estimate (TY 2026).
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
    { from: 1348, to: 2696, rate: 0.02 },
    { from: 2696, to: 4044, rate: 0.025 },
    { from: 4044, to: 5392, rate: 0.03 },
    { from: 5392, to: 6740, rate: 0.035 },
    { from: 6740, to: 8088, rate: 0.04 },
    { from: 8088, to: 9436, rate: 0.045 },
    { from: 9436, to: null, rate: 0.047 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 1348, to: 2696, rate: 0.02 },
    { from: 2696, to: 4044, rate: 0.025 },
    { from: 4044, to: 5392, rate: 0.03 },
    { from: 5392, to: 6740, rate: 0.035 },
    { from: 6740, to: 8088, rate: 0.04 },
    { from: 8088, to: 9436, rate: 0.045 },
    { from: 9436, to: null, rate: 0.047 },
];

export function estimateMissouriStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("MO", income);
}
