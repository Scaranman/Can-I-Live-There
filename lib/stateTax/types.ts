import type { FilingStatus } from "../types";

export type StateTaxBracket = { from: number; to?: number | null; rate: number };

/** App inputs that drive state wage income tax (same pretax model as federal). */
export type StateTaxEstimateInput = {
  grossAnnual: number;
  filingStatus: FilingStatus;
  traditional401kAnnual: number;
  hsaAnnual: number;
  fsaAnnual: number;
  /**
   * Optional override for wages after pretax (gross − 401k/HSA/FSA).
   * When omitted, computed from the fields above.
   */
  wagesForIncomeTax?: number;
};

export type StateTaxAnnualParts = {
  stateCode: string;
  /** Annual state ordinary / flat income tax on wages. */
  stateIncomeAnnual: number;
  /** Employee payroll extras folded into the UI state bucket (e.g. CA SDI). */
  stateExtrasAnnual: number;
  notes?: string;
};

export type StateTaxEstimator = (params: StateTaxEstimateInput) => StateTaxAnnualParts;
