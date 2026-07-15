/**
 * New Brunswick (NB) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 52333, rate: 0.094 },
  { from: 52333, to: 104666, rate: 0.14 },
  { from: 104666, to: 193861, rate: 0.16 },
  { from: 193861, to: null, rate: 0.195 },
];

const BPA = 13664;
const LOWEST_RATE = 0.094;

export function estimateNewBrunswickProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "NB",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
