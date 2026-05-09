import type { ComparisonComputed, ComparisonSnapshot } from "./types";
import { deltasVsBaseline } from "./compute";
import { formatUsd } from "./money";

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
    "401k_period",
    "401k_percent",
    "hsa_amount",
    "hsa_period",
    "fsa_amount",
    "fsa_period",
    "expense_lines_monthly_total",
    "take_home_monthly",
    "expenses_monthly",
    "leftover_monthly",
    "annual_savings_proxy",
    "delta_leftover_vs_baseline_monthly",
    "delta_annual_savings_vs_baseline",
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
      snapshot.pretax.fourOhOne.period,
      snapshot.pretax.fourOhOne.percent,
      snapshot.pretax.hsa.amount,
      snapshot.pretax.hsa.period,
      snapshot.pretax.fsa.amount,
      snapshot.pretax.fsa.period,
      computed ? String(computed.expenseMonthlyTotal) : "",
      comp ? String(comp.netMonthly) : "",
      comp ? String(comp.expenseMonthly) : "",
      comp ? String(comp.leftoverMonthly) : "",
      comp ? String(comp.annualSavingsProxy) : "",
      d ? String(d.leftoverMonthly) : "",
      d ? String(d.annualSavingsProxy) : "",
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
  return {
    baselineLabel: baseline?.label ?? "Baseline",
    bestLeftover: ranked[0]?.label,
    worstLeftover: ranked.at(-1)?.label,
    rows: computed.cities.map((c) => ({
      city: c.label,
      residenceLabel:
        snapshot.cities.find((x) => x.id === c.cityId)?.residenceLabel?.trim() || "",
      leftoverMonthly: formatUsd(c.leftoverMonthly),
      annualSavingsProxy: formatUsd(c.annualSavingsProxy),
      netMonthly: formatUsd(c.netMonthly),
      housingMonthly: formatUsd(c.housingMonthly),
      expenseMonthly: formatUsd(c.expenseMonthly),
      effectiveTaxPct: `${(c.tax.effectiveRate * 100).toFixed(1)}%`,
    })),
    baselineLeftover: baselineRow ? formatUsd(baselineRow.leftoverMonthly) : "",
  };
}
