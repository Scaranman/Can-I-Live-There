/**
 * Maryland (MD) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 3350, married: 6700, hoh: 3350 };
const PERSONAL_EXEMPTION = { single: 3200, married: 6400, hoh: 3200 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 1000, rate: 0.02 },
    { from: 1000, to: 2000, rate: 0.03 },
    { from: 2000, to: 3000, rate: 0.04 },
    { from: 3000, to: 100000, rate: 0.0475 },
    { from: 100000, to: 125000, rate: 0.05 },
    { from: 125000, to: 150000, rate: 0.0525 },
    { from: 150000, to: 250000, rate: 0.055 },
    { from: 250000, to: 500000, rate: 0.0575 },
    { from: 500000, to: 1000000, rate: 0.0625 },
    { from: 1000000, to: null, rate: 0.065 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 1000, rate: 0.02 },
    { from: 1000, to: 2000, rate: 0.03 },
    { from: 2000, to: 3000, rate: 0.04 },
    { from: 3000, to: 150000, rate: 0.0475 },
    { from: 150000, to: 175000, rate: 0.05 },
    { from: 175000, to: 225000, rate: 0.0525 },
    { from: 225000, to: 300000, rate: 0.055 },
    { from: 300000, to: 600000, rate: 0.0575 },
    { from: 600000, to: 1200000, rate: 0.0625 },
    { from: 1200000, to: null, rate: 0.065 },
];

export function estimateMarylandStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("MD", income);
}
