/**
 * Local Canada federal employee-side tax estimates (ordinary income + CPP/EI).
 * Rates: data/canada-federal-tax-rates.json
 * Not tax advice; excludes most credits beyond the basic personal amount, abatement, and AMT.
 */
import rawRegistry from "@/data/canada-federal-tax-rates.json";
import { marginalBracketTaxAnnual } from "./payrollTaxApi";
import type { FilingStatus } from "./types";

export type CanadaFederalBracket = { from: number; to?: number | null; rate: number };

export type CanadaFederalTaxRatesFile = {
  version: number;
  tax_year: number;
  reference_urls?: string[];
  notes?: string;
  ordinary_income_brackets: CanadaFederalBracket[];
  basic_personal_amount: {
    maximum: number;
    minimum: number;
    phaseout_start: number;
    phaseout_end: number;
    credit_rate: number;
  };
  cpp: {
    basic_exemption: number;
    ympe: number;
    employee_rate: number;
    max_employee: number;
    yampe: number;
    cpp2_rate: number;
    cpp2_max_employee: number;
  };
  ei: {
    max_insurable: number;
    employee_rate: number;
    max_employee: number;
    quebec_employee_rate: number;
    quebec_max_employee: number;
  };
};

export type CanadaFederalTaxEstimateInput = {
  grossAnnual: number;
  /** Kept for API symmetry with US/federal; Canada BPA is not filing-status-split here. */
  filingStatus?: FilingStatus;
  traditional401kAnnual: number;
  hsaAnnual: number;
  fsaAnnual: number;
  /** When true, use reduced Quebec EI employee rate (QPP/QPIP handled provincially). */
  quebec?: boolean;
  /**
   * When true (Quebec), skip CPP — QPP is assessed in the provincial estimate.
   * Federal income tax still applies.
   */
  skipCpp?: boolean;
};

export type CanadaFederalTaxAnnualParts = {
  taxYear: number;
  wagesForIncomeTax: number;
  taxableOrdinary: number;
  basicPersonalAmount: number;
  federalIncomeAnnual: number;
  cppAnnual: number;
  eiAnnual: number;
};

const rates = rawRegistry as CanadaFederalTaxRatesFile;

export function getCanadaFederalTaxRates(): CanadaFederalTaxRatesFile {
  return rates;
}

function wagesAfterPretax(params: CanadaFederalTaxEstimateInput): number {
  const gross = Math.max(0, params.grossAnnual);
  const pretax = Math.min(
    gross,
    Math.max(0, params.traditional401kAnnual + params.hsaAnnual + params.fsaAnnual),
  );
  return Math.max(0, gross - pretax);
}

/** Federal BPA with linear phase-down between CRA thresholds. */
export function federalBasicPersonalAmount(netIncomeProxy: number): number {
  const b = rates.basic_personal_amount;
  const income = Math.max(0, netIncomeProxy);
  if (income <= b.phaseout_start) return b.maximum;
  if (income >= b.phaseout_end) return b.minimum;
  const t = (income - b.phaseout_start) / (b.phaseout_end - b.phaseout_start);
  return b.maximum - t * (b.maximum - b.minimum);
}

export function canadaFederalOrdinaryIncomeTaxAnnual(taxableOrdinary: number): number {
  const grossTax = marginalBracketTaxAnnual(taxableOrdinary, rates.ordinary_income_brackets);
  const bpa = federalBasicPersonalAmount(taxableOrdinary);
  const credit = bpa * rates.basic_personal_amount.credit_rate;
  return Math.max(0, grossTax - credit);
}

/** Base CPP + CPP2 employee contributions on gross earnings. */
export function canadaCppAnnual(grossAnnual: number): number {
  const gross = Math.max(0, grossAnnual);
  const c = rates.cpp;
  const baseEarnings = Math.max(0, Math.min(gross, c.ympe) - c.basic_exemption);
  const base = Math.min(baseEarnings * c.employee_rate, c.max_employee);
  const cpp2Earnings = Math.max(0, Math.min(gross, c.yampe) - c.ympe);
  const cpp2 = Math.min(cpp2Earnings * c.cpp2_rate, c.cpp2_max_employee);
  return base + cpp2;
}

export function canadaEiAnnual(grossAnnual: number, quebec = false): number {
  const gross = Math.max(0, grossAnnual);
  const e = rates.ei;
  const base = Math.min(gross, e.max_insurable);
  if (quebec) {
    return Math.min(base * e.quebec_employee_rate, e.quebec_max_employee);
  }
  return Math.min(base * e.employee_rate, e.max_employee);
}

export function estimateCanadaFederalTaxesAnnual(
  params: CanadaFederalTaxEstimateInput,
): CanadaFederalTaxAnnualParts {
  const wagesForIncomeTax = wagesAfterPretax(params);
  const taxableOrdinary = wagesForIncomeTax;
  const bpa = federalBasicPersonalAmount(taxableOrdinary);
  return {
    taxYear: rates.tax_year,
    wagesForIncomeTax,
    taxableOrdinary,
    basicPersonalAmount: bpa,
    federalIncomeAnnual: canadaFederalOrdinaryIncomeTaxAnnual(taxableOrdinary),
    cppAnnual: params.skipCpp ? 0 : canadaCppAnnual(params.grossAnnual),
    eiAnnual: canadaEiAnnual(params.grossAnnual, Boolean(params.quebec)),
  };
}
