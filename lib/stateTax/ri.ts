/**
 * Rhode Island (RI) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 11200, married: 22400, hoh: 11200 };
const PERSONAL_EXEMPTION = { single: 5250, married: 10500, hoh: 5250 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 82050, rate: 0.0375 },
    { from: 82050, to: 186450, rate: 0.0475 },
    { from: 186450, to: null, rate: 0.0599 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 82050, rate: 0.0375 },
    { from: 82050, to: 186450, rate: 0.0475 },
    { from: 186450, to: null, rate: 0.0599 },
];

export function estimateRhodeIslandStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("RI", income);
}
