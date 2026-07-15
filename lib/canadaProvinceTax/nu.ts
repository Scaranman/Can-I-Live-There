/**
 * Nunavut (NU) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 55801, rate: 0.04 },
  { from: 55801, to: 111602, rate: 0.07 },
  { from: 111602, to: 181439, rate: 0.09 },
  { from: 181439, to: null, rate: 0.115 },
];

const BPA = 19659;
const LOWEST_RATE = 0.04;

export function estimateNunavutProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "NU",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
