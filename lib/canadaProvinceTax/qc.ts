/**
 * Quebec (QC) — local provincial/territorial wage tax estimate (TY 2026).
 * Brackets: CRA current-year rates; BPA from CRA T4032 provincial payroll tables.
 * Not tax advice; excludes most credits beyond BPA (and ON surtax / QC extras where noted).
 */
import type { CanadaProvinceBracket, CanadaProvinceTaxAnnualParts, CanadaProvinceTaxEstimateInput } from "./types";
import { parts, provincialTaxAfterBpaCredit } from "./helpers";

const BRACKETS: CanadaProvinceBracket[] = [
  { from: 0, to: 54345, rate: 0.14 },
  { from: 54345, to: 108680, rate: 0.19 },
  { from: 108680, to: 132245, rate: 0.24 },
  { from: 132245, to: null, rate: 0.2575 },
];

const BPA = 18952;
const LOWEST_RATE = 0.14;

/** QPP 2026 employee (incl. enhancement) — Revenu Québec / CFIF tables. */
const QPP_RATE = 0.063;
const QPP_EXEMPTION = 3500;
const QPP_YMPE = 74600;
const QPP_MAX = 3768.3;
const QPP2_RATE = 0.04;
const QPP_YAMPE = 85000;
const QPP2_MAX = 416;

/** QPIP 2026 employee. */
const QPIP_RATE = 0.0043;
const QPIP_MAX_INSURABLE = 103000;
const QPIP_MAX = 442.9;

function qppAnnual(gross: number): number {
  const g = Math.max(0, gross);
  const baseEarnings = Math.max(0, Math.min(g, QPP_YMPE) - QPP_EXEMPTION);
  const base = Math.min(baseEarnings * QPP_RATE, QPP_MAX);
  const qpp2Earnings = Math.max(0, Math.min(g, QPP_YAMPE) - QPP_YMPE);
  const qpp2 = Math.min(qpp2Earnings * QPP2_RATE, QPP2_MAX);
  return base + qpp2;
}

function qpipAnnual(gross: number): number {
  const earnings = Math.min(Math.max(0, gross), QPIP_MAX_INSURABLE);
  return Math.min(earnings * QPIP_RATE, QPIP_MAX);
}

export function estimateQuebecProvinceTax(params: CanadaProvinceTaxEstimateInput): CanadaProvinceTaxAnnualParts {
  const income = provincialTaxAfterBpaCredit(params.taxableAnnual, BRACKETS, BPA, LOWEST_RATE);
  return parts(
    "QC",
    income,
    qppAnnual(params.grossAnnual),
    qpipAnnual(params.grossAnnual),
    "Quebec provincial tax + employee QPP/QPIP; federal uses reduced EI and skips CPP.",
  );
}
