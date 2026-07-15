/**
 * Prince Edward Island (PE) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 33928, rate: 0.095 },
  { from: 33928, to: 65820, rate: 0.1347 },
  { from: 65820, to: 106890, rate: 0.166 },
  { from: 106890, to: 142520, rate: 0.1762 },
  { from: 142520, to: 200000, rate: 0.19 },
  { from: 200000, to: null, rate: 0.2 },
];

const BPA = 15000;
const LOWEST_RATE = 0.095;

export function estimatePrinceEdwardIslandProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "PE",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
