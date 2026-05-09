import { estimatePayrollTaxesAnnual } from "./taxStub";
import type {
  CityInput,
  ComparisonComputed,
  ComputedCity,
  ExpenseLine,
  FilingStatus,
  PretaxInput,
} from "./types";
import { parseMoney } from "./money";

export type PayrollTaxEstimate = ReturnType<typeof estimatePayrollTaxesAnnual>;

export function annualize(amount: number, period: "monthly" | "annual"): number {
  return period === "annual" ? amount : amount * 12;
}

export function deriveCityIncomeAndDeferrals(
  city: CityInput,
  pretax: PretaxInput,
): {
  grossAnnual: number;
  deferrals401kAnnual: number;
  hsaAnnual: number;
  fsaAnnual: number;
} {
  const salary = parseMoney(city.income.salary);
  const bonus = parseMoney(city.income.bonus);
  const other = parseMoney(city.income.other);
  const grossAnnual = salary + bonus + other;

  let deferrals401kAnnual = 0;
  if (pretax.fourOhOne.mode === "percent") {
    const pct = Number.parseFloat(pretax.fourOhOne.percent.replace(/%/g, "").trim());
    const safePct = Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) : 0;
    deferrals401kAnnual = (salary + bonus) * (safePct / 100);
  } else {
    deferrals401kAnnual = annualize(parseMoney(pretax.fourOhOne.amount), pretax.fourOhOne.period);
  }

  const hsaAnnual = annualize(parseMoney(pretax.hsa.amount), pretax.hsa.period);
  const fsaAnnual = annualize(parseMoney(pretax.fsa.amount), pretax.fsa.period);

  return { grossAnnual, deferrals401kAnnual, hsaAnnual, fsaAnnual };
}

export function buildComputedCity(params: {
  city: CityInput;
  grossAnnual: number;
  deferrals401kAnnual: number;
  hsaAnnual: number;
  fsaAnnual: number;
  expenseMonthlyTotal: number;
  tax: PayrollTaxEstimate;
}): ComputedCity {
  const { city, grossAnnual, deferrals401kAnnual, hsaAnnual, fsaAnnual, expenseMonthlyTotal, tax } = params;

  const housingCore = parseMoney(city.housing.monthlyCore);
  const housingMonthly =
    housingCore +
    parseMoney(city.housing.utilities) +
    parseMoney(city.housing.hoa) +
    parseMoney(city.housing.propTax);

  const netMonthly = tax.netAnnual / 12;
  const leftoverMonthly = netMonthly - housingMonthly - expenseMonthlyTotal;
  const annualSavingsProxy = leftoverMonthly * 12;

  return {
    cityId: city.id,
    label: city.label || "City",
    grossAnnual,
    deferralsAnnual401k: deferrals401kAnnual,
    preTaxHsaAnnual: hsaAnnual,
    preTaxFsaAnnual: fsaAnnual,
    taxableAnnualApprox: Math.max(0, grossAnnual - deferrals401kAnnual - hsaAnnual - fsaAnnual),
    netAnnualAfterPayrollTaxes: tax.netAnnual,
    netMonthly,
    housingMonthly,
    expenseMonthly: expenseMonthlyTotal,
    leftoverMonthly,
    annualSavingsProxy,
    tax: {
      monthlyFederal: tax.monthlyFederal,
      monthlyState: tax.monthlyState,
      monthlyLocal: tax.monthlyLocal,
      monthlyFica: tax.monthlyFica,
      monthlyMedicare: tax.monthlyMedicare,
      effectiveRate: tax.effectiveRate,
    },
  };
}

/** Percent-based 401(k) applies to salary + bonus only (disclosed in UI). */
export function computeComparison(params: {
  cities: CityInput[];
  filingStatus: FilingStatus;
  pretax: PretaxInput;
  expenses: ExpenseLine[];
}): ComparisonComputed {
  const expenseMonthlyTotal = params.expenses.reduce((sum, row) => sum + parseMoney(row.amount), 0);

  const cities: ComputedCity[] = params.cities.map((city) => {
    const { grossAnnual, deferrals401kAnnual, hsaAnnual, fsaAnnual } = deriveCityIncomeAndDeferrals(
      city,
      params.pretax,
    );

    const tax = estimatePayrollTaxesAnnual({
      grossAnnual,
      filingStatus: params.filingStatus,
      traditional401kAnnual: deferrals401kAnnual,
      hsaAnnual,
      fsaAnnual,
      cityLabel: city.label || "",
    });

    return buildComputedCity({
      city,
      grossAnnual,
      deferrals401kAnnual,
      hsaAnnual,
      fsaAnnual,
      expenseMonthlyTotal,
      tax,
    });
  });

  return {
    computedAt: new Date().toISOString(),
    expenseMonthlyTotal,
    cities,
  };
}

export function deltasVsBaseline(
  baselineId: string,
  computed: ComparisonComputed,
): Record<
  string,
  {
    leftoverMonthly: number;
    annualSavingsProxy: number;
    netMonthly: number;
    expenseMonthly: number;
  }
> {
  const base = computed.cities.find((c) => c.cityId === baselineId) ?? computed.cities[0];
  const out: Record<string, { leftoverMonthly: number; annualSavingsProxy: number; netMonthly: number; expenseMonthly: number }> =
    {};
  if (!base) return out;
  for (const row of computed.cities) {
    out[row.cityId] = {
      leftoverMonthly: row.leftoverMonthly - base.leftoverMonthly,
      annualSavingsProxy: row.annualSavingsProxy - base.annualSavingsProxy,
      netMonthly: row.netMonthly - base.netMonthly,
      expenseMonthly: row.expenseMonthly - base.expenseMonthly,
    };
  }
  return out;
}
