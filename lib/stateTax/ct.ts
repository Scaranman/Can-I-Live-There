/**
 * Connecticut (CT) — local employee-side state wage tax estimate (TY 2026).
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

const PERSONAL_EXEMPTION = { single: 15000, married: 24000, hoh: 15000 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 10000, rate: 0.02 },
    { from: 10000, to: 50000, rate: 0.045 },
    { from: 50000, to: 100000, rate: 0.055 },
    { from: 100000, to: 200000, rate: 0.06 },
    { from: 200000, to: 250000, rate: 0.065 },
    { from: 250000, to: 500000, rate: 0.069 },
    { from: 500000, to: null, rate: 0.0699 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 20000, rate: 0.02 },
    { from: 20000, to: 100000, rate: 0.045 },
    { from: 100000, to: 200000, rate: 0.055 },
    { from: 200000, to: 400000, rate: 0.06 },
    { from: 400000, to: 500000, rate: 0.065 },
    { from: 500000, to: 1000000, rate: 0.069 },
    { from: 1000000, to: null, rate: 0.0699 },
];

export function estimateConnecticutStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, undefined, PERSONAL_EXEMPTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("CT", income);
}
