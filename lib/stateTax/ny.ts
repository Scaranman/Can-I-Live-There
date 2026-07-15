/**
 * New York (NY) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 8000, married: 16050, hoh: 8000 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 8500, rate: 0.039 },
    { from: 8500, to: 11700, rate: 0.044 },
    { from: 11700, to: 13900, rate: 0.0515 },
    { from: 13900, to: 80650, rate: 0.054 },
    { from: 80650, to: 215400, rate: 0.059 },
    { from: 215400, to: 1077550, rate: 0.0685 },
    { from: 1077550, to: 5000000, rate: 0.0965 },
    { from: 5000000, to: 25000000, rate: 0.103 },
    { from: 25000000, to: null, rate: 0.109 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 17150, rate: 0.039 },
    { from: 17150, to: 23600, rate: 0.044 },
    { from: 23600, to: 27900, rate: 0.0515 },
    { from: 27900, to: 161550, rate: 0.054 },
    { from: 161550, to: 323200, rate: 0.059 },
    { from: 323200, to: 2155350, rate: 0.0685 },
    { from: 2155350, to: 5000000, rate: 0.0965 },
    { from: 5000000, to: 25000000, rate: 0.103 },
    { from: 25000000, to: null, rate: 0.109 },
];

export function estimateNewYorkStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  // NY PFL 2026: 0.432% of gross wages, annual max $411.91 (NY DFS / paidfamilyleave.ny.gov).
  const pflAnnual = Math.min(Math.max(0, params.grossAnnual) * 0.00432, 411.91);
  return parts(
    "NY",
    income,
    pflAnnual,
    "Includes NY Paid Family Leave employee premium (0.432%, max $411.91). Excludes NY DBL.",
  );
}
