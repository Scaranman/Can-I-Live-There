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

export function exportCsv(snapshot: ComparisonSnapshot, computed: ComparisonComputed | null) {
  const baselineId = snapshot.baselineCityId;
  const delta = computed ? deltasVsBaseline(baselineId, computed) : {};

  const headers = [
    "city",
    "baseline",
    "place_id",
    "salary_annual",
    "bonus_annual",
    "other_income_annual",
    "housing_mode",
    "housing_core_monthly",
    "utilities_monthly",
    "hoa_monthly",
    "prop_tax_monthly",
    "residence_label",
    "filing_status",
    "401k_mode",
    "401k_amount",
    "401k_amount_currency",
    "401k_period",
    "401k_percent",
    "hsa_amount",
    "hsa_amount_currency",
    "hsa_period",
    "fsa_amount",
    "fsa_period",
    "payroll_currency",
    "expense_lines_monthly_total_baseline_reporting",
    "take_home_monthly_native",
    "expenses_monthly_native",
    "leftover_monthly_native",
    "annual_savings_proxy_native",
    "delta_leftover_vs_baseline_monthly_native",
    "delta_annual_savings_vs_baseline_native",
    "effective_tax_rate",
  ];

  const rows = snapshot.cities.map((c) => {
    const comp = computed?.cities.find((x) => x.cityId === c.id);
    const d = delta[c.id];
    return [
      c.label,
      c.id === baselineId ? "yes" : "no",
      c.placeId,
      c.income.salary,
      c.income.bonus,
      c.income.other,
      c.housing.mode,
      c.housing.monthlyCore,
      c.housing.utilities,
      c.housing.hoa,
      c.housing.propTax,
      c.residenceLabel ?? "",
      snapshot.filingStatus,
      snapshot.pretax.fourOhOne.mode,
      snapshot.pretax.fourOhOne.amount,
      snapshot.pretax.fourOhOne.amountCurrency,
      snapshot.pretax.fourOhOne.period,
      snapshot.pretax.fourOhOne.percent,
      snapshot.pretax.hsa.amount,
      snapshot.pretax.hsa.amountCurrency,
      snapshot.pretax.hsa.period,
      snapshot.pretax.fsa.amount,
      snapshot.pretax.fsa.period,
      comp ? workCountryToCurrency(comp.workCountry) : "",
      computed ? String(computed.expenseMonthlyTotal) : "",
      comp ? String(comp.netMonthlyNative) : "",
      comp ? String(comp.expenseMonthlyNative) : "",
      comp ? String(comp.leftoverMonthlyNative) : "",
      comp ? String(comp.annualSavingsProxyNative) : "",
      d && d.leftoverMonthly != null ? String(d.leftoverMonthly) : "",
      d && d.annualSavingsProxy != null ? String(d.annualSavingsProxy) : "",
      comp ? String(comp.tax.effectiveRate) : "",
    ].map(csvEscape);
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `city-budget-export-${new Date().toISOString().slice(0, 10)}.csv`;
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
