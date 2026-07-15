/**
 * New Mexico (NM) — local employee-side state wage tax estimate (TY 2026).
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
    { from: 0, to: 5500, rate: 0.015 },
    { from: 5500, to: 16500, rate: 0.032 },
    { from: 16500, to: 33500, rate: 0.043 },
    { from: 33500, to: 66500, rate: 0.047 },
    { from: 66500, to: 210000, rate: 0.049 },
    { from: 210000, to: null, rate: 0.059 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 8000, rate: 0.015 },
    { from: 8000, to: 25000, rate: 0.032 },
    { from: 25000, to: 50000, rate: 0.043 },
    { from: 50000, to: 100000, rate: 0.047 },
    { from: 100000, to: 315000, rate: 0.049 },
    { from: 315000, to: null, rate: 0.059 },
];

export function estimateNewMexicoStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("NM", income);
}
