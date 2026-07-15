/**
 * Yukon (YT) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 58523, rate: 0.064 },
  { from: 58523, to: 117045, rate: 0.09 },
  { from: 117045, to: 181440, rate: 0.109 },
  { from: 181440, to: 500000, rate: 0.128 },
  { from: 500000, to: null, rate: 0.15 },
];

const BPA = 16452;
const LOWEST_RATE = 0.064;

export function estimateYukonProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "YT",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
