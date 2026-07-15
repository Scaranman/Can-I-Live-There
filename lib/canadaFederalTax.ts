/**
 * Local Canada federal employee-side tax estimates (ordinary income + CPP/EI).
 * Rates: data/canada-federal-tax-rates.json
 * Not tax advice; excludes most credits beyond BPA, Canada Employment Amount,
 * CPP/EI contribution credits, and the Quebec abatement.
 */
import rawRegistry from "@/data/canada-federal-tax-rates.json";
import { marginalBracketTaxAnnual } from "./taxMath";
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
  canada_employment_amount: number;
  quebec_abatement_rate: number;
  cpp: {
    basic_exemption: number;
    ympe: number;
    employee_rate: number;
    max_employee: number;
    /** Base CPP rate eligible for the federal tax credit (excludes enhancement). */
    base_credit_rate: number;
    max_base_credit: number;
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
   * Federal income tax still applies (with abatement); QPP-like base still credits.
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

/**
 * Base CPP contribution amount eligible for the federal non-refundable credit
 * (enhancement / CPP2 excluded). Also used as a QPP-base proxy for Quebec credits.
 */
export function canadaCppBaseCreditAmount(grossAnnual: number): number {
  const gross = Math.max(0, grossAnnual);
  const c = rates.cpp;
  const baseEarnings = Math.max(0, Math.min(gross, c.ympe) - c.basic_exemption);
  return Math.min(baseEarnings * c.base_credit_rate, c.max_base_credit);
}

export function canadaFederalOrdinaryIncomeTaxAnnual(
  taxableOrdinary: number,
  opts?: {
    grossAnnual?: number;
    quebec?: boolean;
    /** Employee EI premiums (full amount qualifies for credit). */
    eiAnnual?: number;
    /** Base CPP/QPP contribution amount eligible for the credit (not CPP2). */
    cppBaseCreditAmount?: number;
  },
): number {
  const taxable = Math.max(0, taxableOrdinary);
  const grossTax = marginalBracketTaxAnnual(taxable, rates.ordinary_income_brackets);
  const creditRate = rates.basic_personal_amount.credit_rate;

  const bpa = federalBasicPersonalAmount(taxable);
  const cea = Math.min(
    rates.canada_employment_amount,
    Math.max(0, opts?.grossAnnual ?? taxable),
  );
  const cppCreditBase = Math.max(0, opts?.cppBaseCreditAmount ?? 0);
  const eiCreditBase = Math.max(0, opts?.eiAnnual ?? 0);

  const credits =
    (bpa + cea + cppCreditBase + eiCreditBase) * creditRate;

  let tax = Math.max(0, grossTax - credits);
  if (opts?.quebec) {
    tax *= 1 - rates.quebec_abatement_rate;
  }
  return tax;
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
  const eiAnnual = canadaEiAnnual(params.grossAnnual, Boolean(params.quebec));
  // Even for Quebec (skipCpp), apply a QPP-base credit proxy equal to the CPP base credit amount.
  const cppBaseCreditAmount = canadaCppBaseCreditAmount(params.grossAnnual);

  return {
    taxYear: rates.tax_year,
    wagesForIncomeTax,
    taxableOrdinary,
    basicPersonalAmount: bpa,
    federalIncomeAnnual: canadaFederalOrdinaryIncomeTaxAnnual(taxableOrdinary, {
      grossAnnual: params.grossAnnual,
      quebec: Boolean(params.quebec),
      eiAnnual,
      cppBaseCreditAmount,
    }),
    cppAnnual: params.skipCpp ? 0 : canadaCppAnnual(params.grossAnnual),
    eiAnnual,
  };
}
