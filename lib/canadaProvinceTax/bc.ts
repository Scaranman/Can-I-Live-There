/**
 * British Columbia (BC) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 50363, rate: 0.0506 },
  { from: 50363, to: 100728, rate: 0.077 },
  { from: 100728, to: 115648, rate: 0.105 },
  { from: 115648, to: 140430, rate: 0.1229 },
  { from: 140430, to: 190405, rate: 0.147 },
  { from: 190405, to: 265545, rate: 0.168 },
  { from: 265545, to: null, rate: 0.205 },
];

const BPA = 13216;
const LOWEST_RATE = 0.0506;

export function estimateBritishColumbiaProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "BC",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
