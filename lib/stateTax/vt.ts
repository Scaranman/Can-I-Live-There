/**
 * Vermont (VT) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 7650, married: 15300, hoh: 7650 };
const PERSONAL_EXEMPTION = { single: 5300, married: 10600, hoh: 5300 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 49400, rate: 0.0335 },
    { from: 49400, to: 119700, rate: 0.066 },
    { from: 119700, to: 249700, rate: 0.076 },
    { from: 249700, to: null, rate: 0.0875 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 82500, rate: 0.0335 },
    { from: 82500, to: 199450, rate: 0.066 },
    { from: 199450, to: 304000, rate: 0.076 },
    { from: 304000, to: null, rate: 0.0875 },
];

export function estimateVermontStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("VT", income);
}
