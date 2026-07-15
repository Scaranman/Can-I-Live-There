/**
 * Manitoba (MB) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 47564, rate: 0.108 },
  { from: 47564, to: 101200, rate: 0.1275 },
  { from: 101200, to: null, rate: 0.174 },
];

const BPA = 15780;
const LOWEST_RATE = 0.108;

export function estimateManitobaProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "MB",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
