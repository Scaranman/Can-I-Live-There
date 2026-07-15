/**
 * Newfoundland and Labrador (NL) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 44678, rate: 0.087 },
  { from: 44678, to: 89354, rate: 0.145 },
  { from: 89354, to: 159528, rate: 0.158 },
  { from: 159528, to: 223340, rate: 0.178 },
  { from: 223340, to: 285319, rate: 0.198 },
  { from: 285319, to: 570638, rate: 0.208 },
  { from: 570638, to: 1141275, rate: 0.213 },
  { from: 1141275, to: null, rate: 0.218 },
];

const BPA = 11188;
const LOWEST_RATE = 0.087;

export function estimateNewfoundlandandLabradorProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  return parts(
    "NL",
    provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE),
  );
}
