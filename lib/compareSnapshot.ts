import {
  buildComputedCity,
  deriveCityIncomeAndDeferrals,
  type IncomeDeriveContext,
  type PayrollTaxEstimate,
} from "./compute";
import {
  annualEmployeeTaxesFromLookup,
  fetchPayrollTaxLookup,
  type PayrollTaxLookupResponse,
} from "./payrollTaxApi";
import { runCanataxPython } from "./canadaCanataxServer";
import { estimateCanadaPayrollRough, guessProvinceFromLabel, mapCanataxToPayrollEstimate } from "./canadaTax";
import { applyLocalTaxRegistrySupplement } from "./localTaxRegistry";
import { resolveCadPerUsd, workCountryToCurrency } from "./currencyConversion";
import {
  expenseLinesCurrencySummary,
  sumExpensesConvertedTo,
  sumExpensesInReportingCurrency,
} from "./expenseTotals";
import type { FxSnapshot } from "./exchangeRateApi";
import { estimatePayrollTaxesAnnual, guessLocalityFromLabel, guessStateFromLabel } from "./taxStub";
import { normalizeSnapshotBaseline } from "./defaultSnapshot";
import { derivePayrollWorkCountry } from "./deriveWorkCountry";
import { filterCitiesWithAnyLocation } from "./cityEntered";
import type { ComparisonComputed, ComparisonSnapshot } from "./types";

export type CompareTaxSource = "payrolltaxapi" | "canatax" | "partial" | "stub";

/** One row per city: PayrollTaxAPI or Canada bridge outcome. */
export type PayrollTaxLookupDebugRow = {
  cityId: string;
  label: string;
  outcome:
    | "api_success"
    | "stub_no_api_key"
    | "stub_no_work_state"
    | "stub_zero_gross"
    | "api_error"
    | "ca_canatax"
    | "ca_demo"
    | "ca_no_province";
  lookupResponse?: PayrollTaxLookupResponse;
  error?: string;
};

function filingStatusForApi(fs: ComparisonSnapshot["filingStatus"]): string {
  if (fs === "hoh") return "head_of_household";
  return fs;
}

function stubEstimate(params: {
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
  const apiKey = process.env.PAYROLL_TAX_API_KEY?.trim();
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
  const payDate = new Date().toISOString().slice(0, 10);
  const filing = filingStatusForApi(snapshot.filingStatus);

  let usApiRows = 0;
  let usStubRows = 0;
  let caCanataxRows = 0;
  let caStubRows = 0;
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
        outcome: "stub_no_api_key",
      };

      const fallbackUs = () =>
        stubEstimate({
          grossAnnual,
          filingStatus: snapshot.filingStatus,
          traditional401kAnnual: deferrals401kAnnual,
          hsaAnnual,
          fsaAnnual,
          cityLabel: city.label || "",
        });

      const country = derivePayrollWorkCountry(city);
      let tax: PayrollTaxEstimate;

      if (country === "CA") {
        const provinceGuess = guessProvinceFromLabel(city.label || "");
        const province = provinceGuess ?? "ON";

        if (grossAnnual <= 0) {
          caStubRows += 1;
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
          caStubRows += 1;
          payrollDebug.outcome = "ca_no_province";
          warnings.push(
            `“${city.label || "City"}” has no Canadian province — demo Canada rates (ON-style) used. Add e.g. “Toronto, ON”.`,
          );
          tax = estimateCanadaPayrollRough(grossAnnual, pretaxTotal, province);
        } else {
          const caJson = await runCanataxPython(wagesForIncomeTax, province);
          if (caJson) {
            caCanataxRows += 1;
            payrollDebug.outcome = "ca_canatax";
            tax = mapCanataxToPayrollEstimate(caJson, { grossAnnual, pretaxTotal });
          } else {
            caStubRows += 1;
            payrollDebug.outcome = "ca_demo";
            warnings.push(
              "Canada payroll: Python/canatax not available on this host — rough demo withholding used. Set CANATAX_PYTHON and install requirements.txt locally for canatax.",
            );
            tax = estimateCanadaPayrollRough(grossAnnual, pretaxTotal, province);
          }
        }
      } else if (!apiKey) {
        usStubRows += 1;
        payrollDebug.outcome = "stub_no_api_key";
        tax = fallbackUs();
      } else {
        const st = guessStateFromLabel(city.label || "");
        if (!st) {
          usStubRows += 1;
          payrollDebug.outcome = "stub_no_work_state";
          warnings.push(`“${city.label || "City"}” has no state code — demo taxes used.`);
          tax = fallbackUs();
        } else if (grossAnnual <= 0) {
          usStubRows += 1;
          payrollDebug.outcome = "stub_zero_gross";
          warnings.push("PayrollTaxAPI requires gross wages above $0 — demo taxes used when income is $0.");
          tax = fallbackUs();
        } else {
          try {
            const residenceLabel = (city.residenceLabel ?? "").trim();
            const resState = residenceLabel ? guessStateFromLabel(residenceLabel) : undefined;
            if (residenceLabel && !resState) {
              warnings.push(
                `Residence for “${city.label || "city"}” has no “, ST” style state — PayrollTaxAPI residenceState omitted.`,
              );
            }
            const residenceForApi = resState && resState !== st ? resState : undefined;

            const lookup = await fetchPayrollTaxLookup({
              apiKey,
              workState: st,
              residenceState: residenceForApi,
              payDate,
              filingStatus: filing,
              grossAnnual,
            });
            const workLocality = guessLocalityFromLabel(city.label || "");
            tax = annualEmployeeTaxesFromLookup(lookup, {
              taxableAnnual: wagesForIncomeTax,
              grossAnnual,
              workLocality,
              filingStatus: snapshot.filingStatus,
            });
            usApiRows += 1;
            payrollDebug.outcome = "api_success";
            payrollDebug.lookupResponse = lookup;
          } catch (e) {
            usStubRows += 1;
            payrollDebug.outcome = "api_error";
            payrollDebug.error = e instanceof Error ? e.message : String(e);
            warnings.push("PayrollTaxAPI request failed — demo taxes used.");
            tax = fallbackUs();
          }
        }
      }

      if (country === "US") {
        tax = applyLocalTaxRegistrySupplement(tax, {
          workCityLabel: city.label || "",
          residenceLabel: city.residenceLabel,
          taxableAnnual: wagesForIncomeTax,
          grossAnnual,
          lookup: payrollDebug.lookupResponse,
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

  const n = snapshot.cities.length;
  const totalStub = usStubRows + caStubRows;
  const totalLive = usApiRows + caCanataxRows;

  let taxSource: CompareTaxSource;
  if (totalStub === n) {
    taxSource = "stub";
  } else if (totalStub === 0 && totalLive === n) {
    if (usApiRows === n) taxSource = "payrolltaxapi";
    else if (caCanataxRows === n) taxSource = "canatax";
    else taxSource = "partial";
  } else {
    taxSource = "partial";
  }

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
    taxSource,
    message,
    payrollTaxLookups,
  };
}
