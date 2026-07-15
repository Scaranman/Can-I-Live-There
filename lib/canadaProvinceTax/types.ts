export type CanadaProvinceBracket = { from: number; to?: number | null; rate: number };

export type CanadaProvinceTaxEstimateInput = {
  /** Taxable wages after pretax deferrals (gross − RRSP-like pretax). */
  taxableAnnual: number;
  grossAnnual: number;
};

export type CanadaProvinceTaxAnnualParts = {
  provinceCode: string;
  provincialIncomeAnnual: number;
  /** QPP (maps with CPP into UI FICA bucket) — Quebec only. */
  qppAnnual: number;
  /** QPIP (maps into UI local bucket) — Quebec only. */
  qpipAnnual: number;
  notes?: string;
};

export type CanadaProvinceTaxEstimator = (
  params: CanadaProvinceTaxEstimateInput,
) => CanadaProvinceTaxAnnualParts;
