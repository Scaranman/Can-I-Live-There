/**
 * Kansas (KS) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 3605, married: 8240, hoh: 3605 };
const PERSONAL_EXEMPTION = { single: 9160, married: 18320, hoh: 9160 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 23000, rate: 0.052 },
    { from: 23000, to: null, rate: 0.0558 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 46000, rate: 0.052 },
    { from: 46000, to: null, rate: 0.0558 },
];

export function estimateKansasStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("KS", income);
}
