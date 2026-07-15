/**
 * Wisconsin (WI) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 13960, married: 25840, hoh: 13960 };
const PERSONAL_EXEMPTION = { single: 700, married: 1400, hoh: 700 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 15110, rate: 0.035 },
    { from: 15110, to: 51950, rate: 0.044 },
    { from: 51950, to: 332720, rate: 0.053 },
    { from: 332720, to: null, rate: 0.0765 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 20150, rate: 0.035 },
    { from: 20150, to: 69260, rate: 0.044 },
    { from: 69260, to: 443630, rate: 0.053 },
    { from: 443630, to: null, rate: 0.0765 },
];

export function estimateWisconsinStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("WI", income);
}
