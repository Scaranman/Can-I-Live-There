/**
 * West Virginia (WV) — local employee-side state wage tax estimate (TY 2026).
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

const PERSONAL_EXEMPTION = { single: 2000, married: 4000, hoh: 2000 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 10000, rate: 0.0222 },
    { from: 10000, to: 25000, rate: 0.0296 },
    { from: 25000, to: 40000, rate: 0.0333 },
    { from: 40000, to: 60000, rate: 0.0444 },
    { from: 60000, to: null, rate: 0.0482 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 10000, rate: 0.0222 },
    { from: 10000, to: 25000, rate: 0.0296 },
    { from: 25000, to: 40000, rate: 0.0333 },
    { from: 40000, to: 60000, rate: 0.0444 },
    { from: 60000, to: null, rate: 0.0482 },
];

export function estimateWestVirginiaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, undefined, PERSONAL_EXEMPTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("WV", income);
}
