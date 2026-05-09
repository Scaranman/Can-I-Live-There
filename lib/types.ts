export type FilingStatus = "single" | "married" | "hoh";

export type HousingMode = "rent" | "mortgage";

export type ContributionPeriod = "monthly" | "annual";

export type FourZeroOneMode = "amount" | "percent";

export interface CityInput {
  id: string;
  label: string;
  placeId: string;
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
}

export interface PretaxInput {
  fourOhOne: {
    mode: FourZeroOneMode;
    amount: string;
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
  grossAnnual: number;
  deferralsAnnual401k: number;
  preTaxHsaAnnual: number;
  preTaxFsaAnnual: number;
  taxableAnnualApprox: number;
  netAnnualAfterPayrollTaxes: number;
  netMonthly: number;
  housingMonthly: number;
  expenseMonthly: number;
  leftoverMonthly: number;
  annualSavingsProxy: number;
  tax: TaxBreakdown;
}

export interface ComparisonComputed {
  computedAt: string;
  expenseMonthlyTotal: number;
  cities: ComputedCity[];
}
