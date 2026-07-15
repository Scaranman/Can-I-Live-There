/**
 * Indiana (IN) — local employee-side state wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, local add-ons, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import {
  flatStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const PERSONAL_EXEMPTION = { single: 1000, married: 2000, hoh: 1000 };
const RATE = 0.0295;

export function estimateIndianaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, undefined, PERSONAL_EXEMPTION);
  const floor = 0;
  const income = flatStateIncomeTax(taxable, RATE, floor);
  return parts("IN", income);
}
