/**
 * California (CA) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 5540, married: 11080, hoh: 5540 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 11079, rate: 0.01 },
    { from: 11079, to: 26264, rate: 0.02 },
    { from: 26264, to: 41452, rate: 0.04 },
    { from: 41452, to: 57542, rate: 0.06 },
    { from: 57542, to: 72724, rate: 0.08 },
    { from: 72724, to: 371479, rate: 0.093 },
    { from: 371479, to: 445771, rate: 0.103 },
    { from: 445771, to: 742953, rate: 0.113 },
    { from: 742953, to: 1000000, rate: 0.123 },
    { from: 1000000, to: null, rate: 0.133 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 22158, rate: 0.01 },
    { from: 22158, to: 52528, rate: 0.02 },
    { from: 52528, to: 82904, rate: 0.04 },
    { from: 82904, to: 115084, rate: 0.06 },
    { from: 115084, to: 145448, rate: 0.08 },
    { from: 145448, to: 742958, rate: 0.093 },
    { from: 742958, to: 891542, rate: 0.103 },
    { from: 891542, to: 1000000, rate: 0.113 },
    { from: 1000000, to: 1485906, rate: 0.123 },
    { from: 1485906, to: null, rate: 0.133 },
];

export function estimateCaliforniaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  const extras = Math.max(0, params.grossAnnual) * 0.011; // CA SDI / disability payroll tax (no wage ceiling for recent years)
  return parts("CA", income, extras);
}
