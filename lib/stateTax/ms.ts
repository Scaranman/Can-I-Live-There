/**
 * Mississippi (MS) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 2300, married: 4600, hoh: 2300 };
const PERSONAL_EXEMPTION = { single: 6000, married: 12000, hoh: 6000 };
const RATE = 0.04;

export function estimateMississippiStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const floor = amountForFiling({ single: 10000, married: 10000, hoh: 10000 }, params.filingStatus);
  const income = flatStateIncomeTax(taxable, RATE, floor);
  return parts("MS", income);
}
