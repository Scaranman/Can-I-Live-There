/**
 * Maine (ME) — local employee-side state wage tax estimate (TY 2026).
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
const PERSONAL_EXEMPTION = { single: 5300, married: 10600, hoh: 5300 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 27399, rate: 0.058 },
    { from: 27399, to: 64849, rate: 0.0675 },
    { from: 64849, to: null, rate: 0.0715 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 54849, rate: 0.058 },
    { from: 54849, to: 129749, rate: 0.0675 },
    { from: 129749, to: null, rate: 0.0715 },
];

export function estimateMaineStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("ME", income);
}
