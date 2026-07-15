/**
 * Ohio (OH) — local employee-side state wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, local add-ons, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import {
  amountForFiling,
  flatStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const PERSONAL_EXEMPTION = { single: 2400, married: 4800, hoh: 2400 };
const RATE = 0.0275;

export function estimateOhioStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, undefined, PERSONAL_EXEMPTION);
  const floor = amountForFiling({ single: 26050, married: 26050, hoh: 26050 }, params.filingStatus);
  const income = flatStateIncomeTax(taxable, RATE, floor);
  return parts("OH", income);
}
