/**
 * Local US federal employee-side tax estimates (ordinary income + FICA).
 * Rates live in data/federal-tax-rates.json.
 *
 * Driven by the same inputs the app already collects for payroll estimates:
 * filingStatus, gross wages, and pretax deferrals (401k / HSA / FSA).
 * Not tax advice; excludes credits, itemizing, AMT, dependents, and multi-job FICA.
 */
import rawRegistry from "@/data/federal-tax-rates.json";
import { marginalBracketTaxAnnual } from "./taxMath";
import type { FilingStatus } from "./types";

export type FederalTaxBracket = { from: number; to?: number | null; rate: number };

export type FederalTaxRatesFile = {
  version: number;
  tax_year: number;
  reference_urls?: string[];
  notes?: string;
  standard_deduction: Record<FilingStatus, number>;
  ordinary_income_brackets: Record<FilingStatus, FederalTaxBracket[]>;
  social_security: {
    employee_rate: number;
    wage_base: number;
  };
  medicare: {
    employee_rate: number;
    additional_rate: number;
    additional_threshold: Record<FilingStatus, number>;
  };
};

/** App inputs that affect federal income tax and employee FICA/Medicare. */
export type FederalTaxEstimateInput = {
  grossAnnual: number;
  filingStatus: FilingStatus;
  /** Traditional 401(k) deferrals annualized (caller should already cap logically). */
  traditional401kAnnual: number;
  /** Annualized HSA employee contributions treated as pre-tax. */
  hsaAnnual: number;
  /** Annualized FSA contributions treated as pre-tax. */
  fsaAnnual: number;
};

/** Federal pieces that map to TaxBreakdown.monthlyFederal / monthlyFica / monthlyMedicare. */
export type FederalTaxAnnualParts = {
  taxYear: number;
  /** Gross wages after pretax deferrals (income-tax base before standard deduction). */
  wagesForIncomeTax: number;
  standardDeduction: number;
  /** Taxable ordinary income after pretax + standard deduction. */
  taxableOrdinary: number;
  /** Annual federal ordinary income tax. */
  federalIncomeAnnual: number;
  /** Employee OASDI (Social Security) — shown as FICA in the UI. */
  socialSecurityAnnual: number;
  /** Employee Medicare + Additional Medicare. */
  medicareAnnual: number;
};

const rates = rawRegistry as FederalTaxRatesFile;

export function getFederalTaxRates(): FederalTaxRatesFile {
  return rates;
}

export function standardDeductionFor(filing: FilingStatus): number {
  return rates.standard_deduction[filing];
}

export function additionalMedicareThresholdFor(filing: FilingStatus): number {
  return rates.medicare.additional_threshold[filing];
}

/** Ordinary federal income tax on taxable income (after pretax + standard deduction). */
export function federalOrdinaryIncomeTaxAnnual(
  taxableOrdinary: number,
  filing: FilingStatus,
): number {
  return marginalBracketTaxAnnual(taxableOrdinary, rates.ordinary_income_brackets[filing]);
}

/**
 * FICA wage base: traditional 401(k) deferrals remain FICA-taxable; employee HSA/FSA
 * cafeteria deferrals are generally excluded from Social Security and Medicare wages.
 */
export function ficaWageAnnual(params: {
  grossAnnual: number;
  hsaAnnual: number;
  fsaAnnual: number;
}): number {
  const gross = Math.max(0, params.grossAnnual);
  const cafeteria = Math.min(gross, Math.max(0, params.hsaAnnual + params.fsaAnnual));
  return Math.max(0, gross - cafeteria);
}

/** Employee Social Security (OASDI) on FICA wages, capped at the annual wage base. */
export function socialSecurityTaxAnnual(ficaWages: number): number {
  const wages = Math.max(0, ficaWages);
  const capped = Math.min(wages, rates.social_security.wage_base);
  return capped * rates.social_security.employee_rate;
}

/**
 * Employee Medicare (1.45% of all FICA wages) + Additional Medicare (0.9% of wages above
 * the filing-status threshold).
 */
export function medicareTaxAnnual(ficaWages: number, filing: FilingStatus): number {
  const wages = Math.max(0, ficaWages);
  const base = wages * rates.medicare.employee_rate;
  const thresh = additionalMedicareThresholdFor(filing);
  const additional = Math.max(0, wages - thresh) * rates.medicare.additional_rate;
  return base + additional;
}

/**
 * Estimate employee-side US federal taxes from app payroll inputs.
 * State and local taxes are intentionally out of scope here.
 */
export function estimateFederalTaxesAnnual(params: FederalTaxEstimateInput): FederalTaxAnnualParts {
  const gross = Math.max(0, params.grossAnnual);
  const pretax = Math.min(
    gross,
    Math.max(0, params.traditional401kAnnual + params.hsaAnnual + params.fsaAnnual),
  );
  const wagesForIncomeTax = Math.max(0, gross - pretax);
  const standardDeduction = standardDeductionFor(params.filingStatus);
  const taxableOrdinary = Math.max(0, wagesForIncomeTax - standardDeduction);
  const ficaWages = ficaWageAnnual({
    grossAnnual: gross,
    hsaAnnual: params.hsaAnnual,
    fsaAnnual: params.fsaAnnual,
  });

  return {
    taxYear: rates.tax_year,
    wagesForIncomeTax,
    standardDeduction,
    taxableOrdinary,
    federalIncomeAnnual: federalOrdinaryIncomeTaxAnnual(taxableOrdinary, params.filingStatus),
    socialSecurityAnnual: socialSecurityTaxAnnual(ficaWages),
    medicareAnnual: medicareTaxAnnual(ficaWages, params.filingStatus),
  };
}
