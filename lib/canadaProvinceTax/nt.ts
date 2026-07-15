/**
 * Northwest Territories (NT) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 53003, rate: 0.059 },
  { from: 53003, to: 106009, rate: 0.086 },
  { from: 106009, to: 172346, rate: 0.122 },
  { from: 172346, to: null, rate: 0.1405 },
];

const BPA = 18198;
const LOWEST_RATE = 0.059;

export function estimateNorthwestTerritoriesProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "NT",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
