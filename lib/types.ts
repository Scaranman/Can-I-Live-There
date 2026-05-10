export type FilingStatus = "single" | "married" | "hoh";

/** Where payroll withholding rules apply for this column. */
export type WorkCountry = "US" | "CA";

export type MoneyCurrency = "USD" | "CAD";

export type HousingMode = "rent" | "mortgage";

export type ContributionPeriod = "monthly" | "annual";

export type FourZeroOneMode = "amount" | "percent";

export interface CityInput {
  id: string;
  label: string;
  placeId: string;
  /** Set when a work city is chosen via Places (server details). Drives payroll country with the label. */
  placeCountryCode?: "US" | "CA";
  /** Derived in normalizeSnapshotBaseline — do not set manually in the UI. */
  workCountry?: WorkCountry;
  /**
   * Where you live if different from the work city (optional).
   * Include comma + US state (e.g. "Hoboken, NJ") for estimates when residence differs from work.
   */
  residenceLabel?: string;
  income: {
    salary: string;
    bonus: string;
    other: string;
  };
  housing: {
    mode: HousingMode;
    monthlyCore: string;
    utilities: string;
    hoa: string;
    propTax: string;
  };
}

export interface ExpenseLine {
  id: string;
  name: string;
  amount: string;
  /** Currency this line's amount is entered in. */
  currency: MoneyCurrency;
}

export interface PretaxInput {
  fourOhOne: {
    mode: FourZeroOneMode;
    amount: string;
    /** Currency the fixed amount is entered in (percent mode ignores this). */
    amountCurrency: MoneyCurrency;
    period: ContributionPeriod;
    percent: string;
  };
  hsa: { amount: string; period: ContributionPeriod };
  fsa: { amount: string; period: ContributionPeriod };
}

export interface ComparisonSnapshot {
  version: 1;
  cities: CityInput[];
  baselineCityId: string;
  filingStatus: FilingStatus;
  pretax: PretaxInput;
  expenses: ExpenseLine[];
  updatedAt: string;
}

export interface TaxBreakdown {
  monthlyFederal: number;
  monthlyState: number;
  monthlyLocal: number;
  monthlyFica: number;
  monthlyMedicare: number;
  effectiveRate: number;
}

export interface ComputedCity {
  cityId: string;
  label: string;
  workCountry: WorkCountry;
  /** Annual gross in this column’s payroll currency (for withholding context). */
  grossAnnualNative: number;
  /** Annual gross converted to baseline reporting currency (insights / cross-city rank). */
  grossAnnual: number;
  deferralsAnnual401k: number;
  preTaxHsaAnnual: number;
  preTaxFsaAnnual: number;
  taxableAnnualApprox: number;
  netAnnualAfterPayrollTaxes: number;
  /** Take-home / month in this column’s payroll currency (UI table & charts). */
  netMonthlyNative: number;
  /** Housing / month in payroll currency. */
  housingMonthlyNative: number;
  /** Shared expense lines summed into payroll currency (FX only when a line differs). */
  expenseMonthlyNative: number;
  /** Leftover / month in payroll currency. */
  leftoverMonthlyNative: number;
  annualSavingsProxyNative: number;
  /** Take-home converted to baseline currency (insights / ranking). */
  netMonthly: number;
  housingMonthly: number;
  /** Same numeric total as expense lines summed into baseline currency (legacy / insights). */
  expenseMonthly: number;
  leftoverMonthly: number;
  annualSavingsProxy: number;
  tax: TaxBreakdown;
}

export interface ComparisonComputed {
  computedAt: string;
  expenseMonthlyTotal: number;
  cities: ComputedCity[];
  /** Baseline payroll currency — used for ranking, AI insight summaries, and reporting-currency leftovers. */
  reportingCurrency: MoneyCurrency;
  /** Human-readable split of expense line currencies (for UI / insights). */
  expenseLineSummary: string;
  /** CAD per 1 USD (USD-base API). */
  cadPerUsd: number;
  fxSource: "exchangerate_api_key" | "open_er_api" | "fallback";
  fxFetchedAt: string;
}
