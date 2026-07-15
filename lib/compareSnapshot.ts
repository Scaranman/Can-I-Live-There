/**
 * Server compare orchestration — uses local US / Canada tax modules only (no external tax APIs).
 */
import {
  buildComputedCity,
  deriveCityIncomeAndDeferrals,
  type IncomeDeriveContext,
  type PayrollTaxEstimate,
} from "./compute";
import { estimateCanadaPayrollRough, guessProvinceFromLabel } from "./canadaTax";
import { applyLocalTaxRegistrySupplement } from "./localTaxRegistry";
import { resolveCadPerUsd, workCountryToCurrency } from "./currencyConversion";
import {
  expenseLinesCurrencySummary,
  sumExpensesConvertedTo,
  sumExpensesInReportingCurrency,
} from "./expenseTotals";
import type { FxSnapshot } from "./exchangeRateApi";
import { estimatePayrollTaxesAnnual, guessStateFromLabel } from "./taxStub";
import { normalizeSnapshotBaseline } from "./defaultSnapshot";
import { derivePayrollWorkCountry } from "./deriveWorkCountry";
import { filterCitiesWithAnyLocation } from "./cityEntered";
import type { ComparisonComputed, ComparisonSnapshot } from "./types";

/** Always local estimators after migrating off PayrollTaxAPI / canatax. */
export type CompareTaxSource = "local";

export type PayrollTaxLookupDebugRow = {
  cityId: string;
  label: string;
  outcome:
    | "local_us"
    | "local_ca"
    | "local_ca_default_province"
    | "stub_zero_gross"
    | "stub_no_work_state";
  error?: string;
};

function localUsEstimate(params: {
  grossAnnual: number;
  filingStatus: ComparisonSnapshot["filingStatus"];
  traditional401kAnnual: number;
  hsaAnnual: number;
  fsaAnnual: number;
  cityLabel: string;
}): PayrollTaxEstimate {
  return estimatePayrollTaxesAnnual(params);
}

export async function compareSnapshotOnServer(
  snapshot: ComparisonSnapshot,
  fx: FxSnapshot,
): Promise<{
  computed: ComparisonComputed;
  taxSource: CompareTaxSource;
  message?: string;
  payrollTaxLookups: PayrollTaxLookupDebugRow[];
}> {
  snapshot = normalizeSnapshotBaseline({
    ...snapshot,
    cities: filterCitiesWithAnyLocation(snapshot.cities),
  });
  const baseline =
    snapshot.cities.find((c) => c.id === snapshot.baselineCityId) ?? snapshot.cities[0];
  const reportingCurrency: "USD" | "CAD" = baseline
    ? workCountryToCurrency(derivePayrollWorkCountry(baseline))
    : "USD";
  const cadResolved = resolveCadPerUsd(fx.cadPerUsd);
  const expenseLineSummary = expenseLinesCurrencySummary(snapshot.expenses);
  const expenseMonthlyTotal = sumExpensesInReportingCurrency(
    snapshot.expenses,
    reportingCurrency,
    cadResolved,
  );

  const warnings: string[] = [];

  const pairs = await Promise.all(
    snapshot.cities.map(async (city) => {
      const cityNative = workCountryToCurrency(derivePayrollWorkCountry(city));
      const expenseMonthlyNative = sumExpensesConvertedTo(snapshot.expenses, cityNative, cadResolved);
      const deriveCtx: IncomeDeriveContext = {
        pretaxCurrency: reportingCurrency,
        cityNative,
        cadPerUsd: cadResolved,
      };
      const { grossAnnual, deferrals401kAnnual, hsaAnnual, fsaAnnual } = deriveCityIncomeAndDeferrals(
        city,
        snapshot.pretax,
        deriveCtx,
      );
      const pretaxTotal = Math.min(grossAnnual, deferrals401kAnnual + hsaAnnual + fsaAnnual);
      const wagesForIncomeTax = Math.max(0, grossAnnual - pretaxTotal);

      const payrollDebug: PayrollTaxLookupDebugRow = {
        cityId: city.id,
        label: city.label || "",
        outcome: "local_us",
      };

      const country = derivePayrollWorkCountry(city);
      let tax: PayrollTaxEstimate;

      if (country === "CA") {
        const provinceGuess = guessProvinceFromLabel(city.label || "");
        const province = provinceGuess ?? "ON";

        if (grossAnnual <= 0) {
          payrollDebug.outcome = "stub_zero_gross";
          warnings.push("Canada payroll: gross wages are $0 — no withholding applied.");
          tax = {
            netAnnual: Math.max(0, grossAnnual - pretaxTotal),
            monthlyFederal: 0,
            monthlyState: 0,
            monthlyLocal: 0,
            monthlyFica: 0,
            monthlyMedicare: 0,
            effectiveRate: 0,
          };
        } else if (!provinceGuess) {
          payrollDebug.outcome = "local_ca_default_province";
          warnings.push(
            `“${city.label || "City"}” has no Canadian province — local Canada rates (ON default) used. Add e.g. “Toronto, ON”.`,
          );
          tax = estimateCanadaPayrollRough(grossAnnual, pretaxTotal, province);
        } else {
          payrollDebug.outcome = "local_ca";
          tax = estimateCanadaPayrollRough(grossAnnual, pretaxTotal, province);
        }
      } else if (grossAnnual <= 0) {
        payrollDebug.outcome = "stub_zero_gross";
        warnings.push("US payroll: gross wages are $0 — no withholding applied.");
        tax = localUsEstimate({
          grossAnnual,
          filingStatus: snapshot.filingStatus,
          traditional401kAnnual: deferrals401kAnnual,
          hsaAnnual,
          fsaAnnual,
          cityLabel: city.label || "",
        });
      } else {
        const st = guessStateFromLabel(city.label || "");
        if (!st) {
          payrollDebug.outcome = "stub_no_work_state";
          warnings.push(
            `“${city.label || "City"}” has no state/territory code — federal and FICA applied; state tax treated as $0. Add e.g. “Austin, TX”.`,
          );
        } else {
          payrollDebug.outcome = "local_us";
        }
        tax = localUsEstimate({
          grossAnnual,
          filingStatus: snapshot.filingStatus,
          traditional401kAnnual: deferrals401kAnnual,
          hsaAnnual,
          fsaAnnual,
          cityLabel: city.label || "",
        });
      }

      if (country === "US") {
        tax = applyLocalTaxRegistrySupplement(tax, {
          workCityLabel: city.label || "",
          residenceLabel: city.residenceLabel,
          taxableAnnual: wagesForIncomeTax,
          grossAnnual,
          filingStatus: snapshot.filingStatus,
        });
      }

      const built = buildComputedCity({
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

      return { built, payrollDebug };
    }),
  );

  const cities = pairs.map((p) => p.built);
  const payrollTaxLookups = pairs.map((p) => p.payrollDebug);

  const deduped = [...new Set(warnings)];
  const message = deduped.length ? deduped.join(" ") : undefined;

  return {
    computed: {
      computedAt: new Date().toISOString(),
      expenseMonthlyTotal,
      cities,
      reportingCurrency,
      expenseLineSummary,
      cadPerUsd: cadResolved,
      fxSource: fx.source,
      fxFetchedAt: fx.fetchedAt,
    },
    taxSource: "local",
    message,
    payrollTaxLookups,
  };
}
