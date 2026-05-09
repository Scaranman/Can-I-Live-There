import {
  buildComputedCity,
  deriveCityIncomeAndDeferrals,
  type PayrollTaxEstimate,
} from "./compute";
import {
  annualEmployeeTaxesFromLookup,
  fetchPayrollTaxLookup,
  type PayrollTaxLookupResponse,
} from "./payrollTaxApi";
import { applyLocalTaxRegistrySupplement } from "./localTaxRegistry";
import { parseMoney } from "./money";
import { estimatePayrollTaxesAnnual, guessLocalityFromLabel, guessStateFromLabel } from "./taxStub";
import type { ComparisonComputed, ComparisonSnapshot } from "./types";

export type CompareTaxSource = "payrolltaxapi" | "partial" | "stub";

/** One row per city: PayrollTaxAPI payload when successful, or why it was skipped. */
export type PayrollTaxLookupDebugRow = {
  cityId: string;
  label: string;
  outcome:
    | "api_success"
    | "stub_no_api_key"
    | "stub_no_work_state"
    | "stub_zero_gross"
    | "api_error";
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

export async function compareSnapshotOnServer(snapshot: ComparisonSnapshot): Promise<{
  computed: ComparisonComputed;
  taxSource: CompareTaxSource;
  message?: string;
  payrollTaxLookups: PayrollTaxLookupDebugRow[];
}> {
  const apiKey = process.env.PAYROLL_TAX_API_KEY?.trim();
  const expenseMonthlyTotal = snapshot.expenses.reduce((sum, row) => sum + parseMoney(row.amount), 0);
  const payDate = new Date().toISOString().slice(0, 10);
  const filing = filingStatusForApi(snapshot.filingStatus);

  let apiRows = 0;
  let stubRows = 0;
  const warnings: string[] = [];

  const pairs = await Promise.all(
    snapshot.cities.map(async (city) => {
      const { grossAnnual, deferrals401kAnnual, hsaAnnual, fsaAnnual } = deriveCityIncomeAndDeferrals(
        city,
        snapshot.pretax,
      );
      const pretaxTotal = Math.min(grossAnnual, deferrals401kAnnual + hsaAnnual + fsaAnnual);
      const wagesForIncomeTax = Math.max(0, grossAnnual - pretaxTotal);

      const payrollDebug: PayrollTaxLookupDebugRow = {
        cityId: city.id,
        label: city.label || "",
        outcome: "stub_no_api_key",
      };

      const fallback = () =>
        stubEstimate({
          grossAnnual,
          filingStatus: snapshot.filingStatus,
          traditional401kAnnual: deferrals401kAnnual,
          hsaAnnual,
          fsaAnnual,
          cityLabel: city.label || "",
        });

      let tax: PayrollTaxEstimate;

      if (!apiKey) {
        stubRows += 1;
        payrollDebug.outcome = "stub_no_api_key";
        tax = fallback();
      } else {
        const st = guessStateFromLabel(city.label || "");
        if (!st) {
          stubRows += 1;
          payrollDebug.outcome = "stub_no_work_state";
          warnings.push(`“${city.label || "City"}” has no state code — demo taxes used.`);
          tax = fallback();
        } else if (grossAnnual <= 0) {
          stubRows += 1;
          payrollDebug.outcome = "stub_zero_gross";
          warnings.push("PayrollTaxAPI requires gross wages above $0 — demo taxes used when income is $0.");
          tax = fallback();
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
            apiRows += 1;
            payrollDebug.outcome = "api_success";
            payrollDebug.lookupResponse = lookup;
          } catch (e) {
            stubRows += 1;
            payrollDebug.outcome = "api_error";
            payrollDebug.error = e instanceof Error ? e.message : String(e);
            warnings.push("PayrollTaxAPI request failed — demo taxes used.");
            tax = fallback();
          }
        }
      }

      tax = applyLocalTaxRegistrySupplement(tax, {
        workCityLabel: city.label || "",
        residenceLabel: city.residenceLabel,
        taxableAnnual: wagesForIncomeTax,
        grossAnnual,
        lookup: payrollDebug.lookupResponse,
      });

      const built = buildComputedCity({
        city,
        grossAnnual,
        deferrals401kAnnual,
        hsaAnnual,
        fsaAnnual,
        expenseMonthlyTotal,
        tax,
      });

      return { built, payrollDebug };
    }),
  );

  const cities = pairs.map((p) => p.built);
  const payrollTaxLookups = pairs.map((p) => p.payrollDebug);

  const taxSource: CompareTaxSource =
    !apiKey || apiRows === 0 ? "stub" : stubRows === 0 ? "payrolltaxapi" : "partial";

  const deduped = [...new Set(warnings)];
  const message = deduped.length ? deduped.join(" ") : undefined;

  return {
    computed: {
      computedAt: new Date().toISOString(),
      expenseMonthlyTotal,
      cities,
    },
    taxSource,
    message,
    payrollTaxLookups,
  };
}
