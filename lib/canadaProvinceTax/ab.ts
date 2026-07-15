/**
 * Alberta (AB) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 61200, rate: 0.08 },
  { from: 61200, to: 154259, rate: 0.1 },
  { from: 154259, to: 185111, rate: 0.12 },
  { from: 185111, to: 246813, rate: 0.13 },
  { from: 246813, to: 370220, rate: 0.14 },
  { from: 370220, to: null, rate: 0.15 },
];

const BPA = 22769;
const LOWEST_RATE = 0.08;

export function estimateAlbertaProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "AB",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
