/**
 * New Jersey (NJ) — local employee-side state wage tax estimate (TY 2026).
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

const PERSONAL_EXEMPTION = { single: 1000, married: 2000, hoh: 1000 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 20000, rate: 0.014 },
    { from: 20000, to: 35000, rate: 0.0175 },
    { from: 35000, to: 40000, rate: 0.035 },
    { from: 40000, to: 75000, rate: 0.0553 },
    { from: 75000, to: 500000, rate: 0.0637 },
    { from: 500000, to: 1000000, rate: 0.0897 },
    { from: 1000000, to: null, rate: 0.1075 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 20000, rate: 0.014 },
    { from: 20000, to: 50000, rate: 0.0175 },
    { from: 50000, to: 70000, rate: 0.0245 },
    { from: 70000, to: 80000, rate: 0.035 },
    { from: 80000, to: 150000, rate: 0.0553 },
    { from: 150000, to: 500000, rate: 0.0637 },
    { from: 500000, to: 1000000, rate: 0.0897 },
    { from: 1000000, to: null, rate: 0.1075 },
];

export function estimateNewJerseyStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, undefined, PERSONAL_EXEMPTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("NJ", income);
}
