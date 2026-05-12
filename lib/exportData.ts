import type { ComparisonComputed, ComparisonSnapshot } from "./types";
import { workCountryToCurrency } from "./currencyConversion";
import { deltasVsBaseline } from "./compute";
import { formatMoney } from "./money";

export function buildExportPayload(snapshot: ComparisonSnapshot, computed: ComparisonComputed | null) {
  return {
    snapshot,
    computed,
    exportedAt: new Date().toISOString(),
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** CSV of last Calculate output: one row per computed city (no raw form inputs). */
export function exportResultsCsv(baselineCityId: string, computed: ComparisonComputed) {
  const delta = deltasVsBaseline(baselineCityId, computed);

  const headers = [
    "city",
    "is_baseline",
    "work_country",
    "payroll_currency",
    "gross_annual_native",
    "deferrals_401k_rrsp_annual_native",
    "pretax_hsa_annual_native",
    "pretax_fsa_annual_native",
    "taxable_income_annual_approx_native",
    "net_annual_after_payroll_taxes_native",
    "take_home_monthly_native",
    "housing_monthly_native",
    "expenses_monthly_native",
    "leftover_monthly_native",
    "annual_savings_proxy_native",
    "tax_effective_rate",
    "tax_monthly_federal_native",
    "tax_monthly_state_or_province_native",
    "tax_monthly_local_native",
    "tax_monthly_fica_or_cpp_native",
    "tax_monthly_medicare_or_ei_native",
    "reporting_currency",
    "take_home_monthly_reporting",
    "housing_monthly_reporting",
    "expenses_monthly_reporting",
    "leftover_monthly_reporting",
    "annual_savings_proxy_reporting",
    "delta_leftover_monthly_native_vs_baseline",
    "delta_annual_savings_native_vs_baseline",
    "global_expenses_monthly_total_reporting",
    "expense_line_summary",
    "computed_at",
    "fx_cad_per_usd",
    "fx_source",
    "fx_fetched_at",
  ];

  const rows = computed.cities.map((c) => {
    const d = delta[c.cityId];
    return [
      c.label,
      c.cityId === baselineCityId ? "yes" : "no",
      c.workCountry,
      workCountryToCurrency(c.workCountry),
      String(c.grossAnnualNative),
      String(c.deferralsAnnual401k),
      String(c.preTaxHsaAnnual),
      String(c.preTaxFsaAnnual),
      String(c.taxableAnnualApprox),
      String(c.netAnnualAfterPayrollTaxes),
      String(c.netMonthlyNative),
      String(c.housingMonthlyNative),
      String(c.expenseMonthlyNative),
      String(c.leftoverMonthlyNative),
      String(c.annualSavingsProxyNative),
      String(c.tax.effectiveRate),
      String(c.tax.monthlyFederal),
      String(c.tax.monthlyState),
      String(c.tax.monthlyLocal),
      String(c.tax.monthlyFica),
      String(c.tax.monthlyMedicare),
      computed.reportingCurrency,
      String(c.netMonthly),
      String(c.housingMonthly),
      String(c.expenseMonthly),
      String(c.leftoverMonthly),
      String(c.annualSavingsProxy),
      d && d.leftoverMonthly != null ? String(d.leftoverMonthly) : "",
      d && d.annualSavingsProxy != null ? String(d.annualSavingsProxy) : "",
      String(computed.expenseMonthlyTotal),
      computed.expenseLineSummary,
      computed.computedAt,
      String(computed.cadPerUsd),
      computed.fxSource,
      computed.fxFetchedAt,
    ].map(csvEscape);
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `city-budget-results-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(cell: string): string {
  if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function summarizeForInsights(snapshot: ComparisonSnapshot, computed: ComparisonComputed) {
  const baseline = snapshot.cities.find((c) => c.id === snapshot.baselineCityId) ?? snapshot.cities[0];
  const baselineRow = computed.cities.find((c) => c.cityId === baseline?.id);
  const ranked = [...computed.cities].sort((a, b) => b.leftoverMonthly - a.leftoverMonthly);
  const cur = computed.reportingCurrency;
  return {
    baselineLabel: baseline?.label ?? "Baseline",
    bestLeftover: ranked[0]?.label,
    worstLeftover: ranked.at(-1)?.label,
    reportingCurrency: cur,
    expenseLineSummary: computed.expenseLineSummary,
    cadPerUsd: computed.cadPerUsd,
    fxSource: computed.fxSource,
    fxFetchedAt: computed.fxFetchedAt,
    rows: computed.cities.map((c) => ({
      city: c.label,
      payrollCountry: c.workCountry,
      residenceLabel:
        snapshot.cities.find((x) => x.id === c.cityId)?.residenceLabel?.trim() || "",
      leftoverMonthly: formatMoney(c.leftoverMonthly, cur),
      annualSavingsProxy: formatMoney(c.annualSavingsProxy, cur),
      netMonthly: formatMoney(c.netMonthly, cur),
      housingMonthly: formatMoney(c.housingMonthly, cur),
      expenseMonthly: formatMoney(c.expenseMonthly, cur),
      effectiveTaxPct: `${(c.tax.effectiveRate * 100).toFixed(1)}%`,
    })),
    baselineLeftover: baselineRow ? formatMoney(baselineRow.leftoverMonthly, cur) : "",
  };
}
