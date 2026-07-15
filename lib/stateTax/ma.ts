/**
 * Massachusetts (MA) — local employee-side state wage tax estimate (TY 2026).
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

const PERSONAL_EXEMPTION = { single: 4400, married: 8800, hoh: 4400 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 1083150, rate: 0.05 },
    { from: 1083150, to: null, rate: 0.09 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 1083150, rate: 0.05 },
    { from: 1083150, to: null, rate: 0.09 },
];

export function estimateMassachusettsStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, undefined, PERSONAL_EXEMPTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("MA", income);
}
