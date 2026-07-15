/**
 * Saskatchewan (SK) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 54532, rate: 0.105 },
  { from: 54532, to: 155805, rate: 0.125 },
  { from: 155805, to: null, rate: 0.145 },
];

const BPA = 20381;
const LOWEST_RATE = 0.105;

export function estimateSaskatchewanProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "SK",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
