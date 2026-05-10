import { estimateCanadaPayrollRough, guessProvinceFromLabel } from "./canadaTax";
import {
  convertCurrency,
  resolveCadPerUsd,
  workCountryToCurrency,
} from "./currencyConversion";
import { derivePayrollWorkCountry } from "./deriveWorkCountry";
import {
  expenseLinesCurrencySummary,
  sumExpensesConvertedTo,
  sumExpensesInReportingCurrency,
} from "./expenseTotals";
import { estimatePayrollTaxesAnnual } from "./taxStub";
import type {
  CityInput,
  ComparisonComputed,
  ComputedCity,
  ExpenseLine,
  FilingStatus,
  MoneyCurrency,
  PretaxInput,
} from "./types";
import { parseMoney } from "./money";

export type PayrollTaxEstimate = ReturnType<typeof estimatePayrollTaxesAnnual>;

export type IncomeDeriveContext = {
  pretaxCurrency: MoneyCurrency;
  cityNative: MoneyCurrency;
  cadPerUsd: number;
};

export function annualize(amount: number, period: "monthly" | "annual"): number {
  return period === "annual" ? amount : amount * 12;
}

export function deriveCityIncomeAndDeferrals(
  city: CityInput,
  pretax: PretaxInput,
  ctx?: IncomeDeriveContext,
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

  const baselinePretax = ctx?.pretaxCurrency ?? ctx?.cityNative ?? "USD";
  const cityNative = ctx?.cityNative ?? baselinePretax;
  const cad = ctx ? resolveCadPerUsd(ctx.cadPerUsd) : resolveCadPerUsd(null);
  const convBaseline = (n: number) =>
    ctx && baselinePretax !== cityNative ? convertCurrency(n, baselinePretax, cityNative, cad) : n;

  let deferrals401kAnnual = 0;
  if (pretax.fourOhOne.mode === "percent") {
    const pct = Number.parseFloat(pretax.fourOhOne.percent.replace(/%/g, "").trim());
    const safePct = Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) : 0;
    deferrals401kAnnual = (salary + bonus) * (safePct / 100);
  } else {
    const fourOhOneCurrency: MoneyCurrency =
      pretax.fourOhOne.amountCurrency === "CAD" || pretax.fourOhOne.amountCurrency === "USD"
        ? pretax.fourOhOne.amountCurrency
        : baselinePretax;
    const raw = annualize(parseMoney(pretax.fourOhOne.amount), pretax.fourOhOne.period);
    deferrals401kAnnual =
      ctx && fourOhOneCurrency !== cityNative ? convertCurrency(raw, fourOhOneCurrency, cityNative, cad) : raw;
  }

  const hsaAnnual = convBaseline(annualize(parseMoney(pretax.hsa.amount), pretax.hsa.period));
  const fsaAnnual = convBaseline(annualize(parseMoney(pretax.fsa.amount), pretax.fsa.period));

  return { grossAnnual, deferrals401kAnnual, hsaAnnual, fsaAnnual };
}

export type ComputedCityFx = {
  reportingCurrency: MoneyCurrency;
  cityNative: MoneyCurrency;
  cadPerUsd: number;
};

export function buildComputedCity(params: {
  city: CityInput;
  grossAnnualNative: number;
  deferrals401kAnnual: number;
  hsaAnnual: number;
  fsaAnnual: number;
  expenseMonthlyReporting: number;
  expenseMonthlyNative: number;
  tax: PayrollTaxEstimate;
  fx: ComputedCityFx;
}): ComputedCity {
  const {
    city,
    grossAnnualNative,
    deferrals401kAnnual,
    hsaAnnual,
    fsaAnnual,
    expenseMonthlyReporting,
    expenseMonthlyNative,
    tax,
    fx,
  } = params;

  const cad = resolveCadPerUsd(fx.cadPerUsd);
  const { reportingCurrency, cityNative } = fx;

  const housingCore = parseMoney(city.housing.monthlyCore);
  const housingMonthlyNative =
    housingCore +
    parseMoney(city.housing.utilities) +
    parseMoney(city.housing.hoa) +
    parseMoney(city.housing.propTax);

  const netMonthlyNative = tax.netAnnual / 12;

  const leftoverMonthlyNative = netMonthlyNative - housingMonthlyNative - expenseMonthlyNative;
  const annualSavingsProxyNative = leftoverMonthlyNative * 12;

  const netMonthly = convertCurrency(netMonthlyNative, cityNative, reportingCurrency, cad);
  const housingMonthly = convertCurrency(housingMonthlyNative, cityNative, reportingCurrency, cad);
  const leftoverMonthly = netMonthly - housingMonthly - expenseMonthlyReporting;
  const annualSavingsProxy = leftoverMonthly * 12;

  const grossAnnual = convertCurrency(grossAnnualNative, cityNative, reportingCurrency, cad);
  const taxableNative = Math.max(0, grossAnnualNative - deferrals401kAnnual - hsaAnnual - fsaAnnual);
  const taxableAnnualApprox = convertCurrency(taxableNative, cityNative, reportingCurrency, cad);
  const netAnnualAfterPayrollTaxes = convertCurrency(tax.netAnnual, cityNative, reportingCurrency, cad);

  return {
    cityId: city.id,
    label: city.label || "City",
    workCountry: derivePayrollWorkCountry(city),
    grossAnnualNative,
    grossAnnual,
    deferralsAnnual401k: deferrals401kAnnual,
    preTaxHsaAnnual: hsaAnnual,
    preTaxFsaAnnual: fsaAnnual,
    taxableAnnualApprox,
    netAnnualAfterPayrollTaxes,
    netMonthlyNative,
    housingMonthlyNative,
    expenseMonthlyNative,
    leftoverMonthlyNative,
    annualSavingsProxyNative,
    netMonthly,
    housingMonthly,
    expenseMonthly: expenseMonthlyReporting,
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

export function computeComparison(params: {
  cities: CityInput[];
  baselineCityId: string;
  filingStatus: FilingStatus;
  pretax: PretaxInput;
  expenses: ExpenseLine[];
  cadPerUsd: number | null;
}): ComparisonComputed {
  const baseline = params.cities.find((c) => c.id === params.baselineCityId) ?? params.cities[0];
  const reportingCurrency: MoneyCurrency = baseline
    ? workCountryToCurrency(derivePayrollWorkCountry(baseline))
    : "USD";
  const cadResolved = resolveCadPerUsd(params.cadPerUsd);
  const expenseLineSummary = expenseLinesCurrencySummary(params.expenses);
  const expenseMonthlyTotal = sumExpensesInReportingCurrency(
    params.expenses,
    reportingCurrency,
    cadResolved,
  );

  const cities: ComputedCity[] = params.cities.map((city) => {
    const cityNative = workCountryToCurrency(derivePayrollWorkCountry(city));
    const expenseMonthlyNative = sumExpensesConvertedTo(params.expenses, cityNative, cadResolved);
    const deriveCtx: IncomeDeriveContext = {
      pretaxCurrency: reportingCurrency,
      cityNative,
      cadPerUsd: cadResolved,
    };

    const { grossAnnual, deferrals401kAnnual, hsaAnnual, fsaAnnual } = deriveCityIncomeAndDeferrals(
      city,
      params.pretax,
      deriveCtx,
    );

    const pretaxTotal = Math.min(grossAnnual, deferrals401kAnnual + hsaAnnual + fsaAnnual);
    const isCa = derivePayrollWorkCountry(city) === "CA";
    const tax = isCa
      ? estimateCanadaPayrollRough(
          grossAnnual,
          pretaxTotal,
          guessProvinceFromLabel(city.label || "") ?? "ON",
        )
      : estimatePayrollTaxesAnnual({
          grossAnnual,
          filingStatus: params.filingStatus,
          traditional401kAnnual: deferrals401kAnnual,
          hsaAnnual,
          fsaAnnual,
          cityLabel: city.label || "",
        });

    return buildComputedCity({
      city,
      grossAnnualNative: grossAnnual,
      deferrals401kAnnual,
      hsaAnnual,
      fsaAnnual,
      expenseMonthlyReporting: expenseMonthlyTotal,
      expenseMonthlyNative,
      tax,
      fx: { reportingCurrency, cityNative, cadPerUsd: cadResolved },
    });
  });

  return {
    computedAt: new Date().toISOString(),
    expenseMonthlyTotal,
    cities,
    reportingCurrency,
    expenseLineSummary,
    cadPerUsd: cadResolved,
    fxSource: "fallback",
    fxFetchedAt: new Date().toISOString(),
  };
}

export function deltasVsBaseline(
  baselineId: string,
  computed: ComparisonComputed,
): Record<
  string,
  {
    leftoverMonthly: number | null;
    annualSavingsProxy: number | null;
    netMonthly: number | null;
    expenseMonthly: number | null;
  }
> {
  const base = computed.cities.find((c) => c.cityId === baselineId) ?? computed.cities[0];
  const out: Record<
    string,
    {
      leftoverMonthly: number | null;
      annualSavingsProxy: number | null;
      netMonthly: number | null;
      expenseMonthly: number | null;
    }
  > = {};
  if (!base) return out;
  const baseCur = workCountryToCurrency(base.workCountry);
  for (const row of computed.cities) {
    const same = workCountryToCurrency(row.workCountry) === baseCur;
    out[row.cityId] = same
      ? {
          leftoverMonthly: row.leftoverMonthlyNative - base.leftoverMonthlyNative,
          annualSavingsProxy: row.annualSavingsProxyNative - base.annualSavingsProxyNative,
          netMonthly: row.netMonthlyNative - base.netMonthlyNative,
          expenseMonthly: row.expenseMonthlyNative - base.expenseMonthlyNative,
        }
      : {
          leftoverMonthly: null,
          annualSavingsProxy: null,
          netMonthly: null,
          expenseMonthly: null,
        };
  }
  return out;
}
