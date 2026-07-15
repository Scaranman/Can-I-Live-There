/**
 * Hawaii (HI) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 4400, married: 8800, hoh: 4400 };
const PERSONAL_EXEMPTION = { single: 1144, married: 2288, hoh: 1144 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 9600, rate: 0.014 },
    { from: 9600, to: 14400, rate: 0.032 },
    { from: 14400, to: 19200, rate: 0.055 },
    { from: 19200, to: 24000, rate: 0.064 },
    { from: 24000, to: 36000, rate: 0.068 },
    { from: 36000, to: 48000, rate: 0.072 },
    { from: 48000, to: 125000, rate: 0.076 },
    { from: 125000, to: 175000, rate: 0.079 },
    { from: 175000, to: 225000, rate: 0.0825 },
    { from: 225000, to: 275000, rate: 0.09 },
    { from: 275000, to: 325000, rate: 0.1 },
    { from: 325000, to: null, rate: 0.11 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 19200, rate: 0.014 },
    { from: 19200, to: 28800, rate: 0.032 },
    { from: 28800, to: 38400, rate: 0.055 },
    { from: 38400, to: 48000, rate: 0.064 },
    { from: 48000, to: 72000, rate: 0.068 },
    { from: 72000, to: 96000, rate: 0.072 },
    { from: 96000, to: 250000, rate: 0.076 },
    { from: 250000, to: 350000, rate: 0.079 },
    { from: 350000, to: 450000, rate: 0.0825 },
    { from: 450000, to: 550000, rate: 0.09 },
    { from: 550000, to: 650000, rate: 0.1 },
    { from: 650000, to: null, rate: 0.11 },
];

export function estimateHawaiiStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("HI", income);
}
