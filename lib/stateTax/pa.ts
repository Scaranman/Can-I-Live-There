/**
 * Pennsylvania (PA) — local employee-side state wage tax estimate (TY 2026).
 * Flat PIT is 3.07% (PA Dept. of Revenue / Tax Foundation). Pennsylvania generally does
 * **not** exclude employee 401(k)/HSA-style deferrals from PA taxable compensation the way
 * federal AGI does, so this module taxes a gross-wage proxy (not federal pretax wages).
 * Not tax advice; excludes local earned-income tax (see local-tax registry) and most credits.
 */
import type { StateTaxAnnualParts, StateTaxEstimateInput } from "./types";
import { flatStateIncomeTax, parts } from "./helpers";

/** Official PA personal income tax rate (unchanged for TY 2026). */
const RATE = 0.0307;

/**
 * PA employee share of Unemployment Compensation contributions (0.07%).
 * Folded into the UI state extras bucket.
 */
const EMPLOYEE_UC_RATE = 0.0007;

export function estimatePennsylvaniaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const gross = Math.max(0, params.grossAnnual);
  // Prefer gross — PA PIT largely taxes compensation before federal pretax deferrals.
  const taxable = gross;
  const income = flatStateIncomeTax(taxable, RATE, 0);
  const extras = gross * EMPLOYEE_UC_RATE;
  return parts(
    "PA",
    income,
    extras,
    "PA PIT 3.07% on gross wages (federal pretax deferrals generally not excluded). Includes 0.07% employee UC.",
  );
}
