/**
 * Ontario (ON) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { ontarioSurtaxAnnual, parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 53891, rate: 0.0505 },
  { from: 53891, to: 107785, rate: 0.0915 },
  { from: 107785, to: 150000, rate: 0.1116 },
  { from: 150000, to: 220000, rate: 0.1216 },
  { from: 220000, to: null, rate: 0.1316 },
];

const BPA = 12989;
const LOWEST_RATE = 0.0505;

export function estimateOntarioProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  const basic = provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE);
  const total = basic + ontarioSurtaxAnnual(basic);
  return parts("ON", total, 0, 0, "Includes Ontario surtax (CRA T4032-ON 2026 thresholds).");
}
