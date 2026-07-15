/**
 * Nova Scotia (NS) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 30995, rate: 0.0879 },
  { from: 30995, to: 61991, rate: 0.1495 },
  { from: 61991, to: 97417, rate: 0.1667 },
  { from: 97417, to: 157124, rate: 0.175 },
  { from: 157124, to: null, rate: 0.21 },
];

const BPA = 11932;
const LOWEST_RATE = 0.0879;

export function estimateNovaScotiaProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "NS",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
