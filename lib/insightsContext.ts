import { convertCurrency } from "./currencyConversion";
import { expenseLineCurrency } from "./expenseTotals";
import { formatMoney, parseMoney } from "./money";
import type { ComparisonComputed, ComparisonSnapshot, ExpenseLine, MoneyCurrency } from "./types";

/** Common cost-of-living categories often missing from a simple housing + tax comparison. */
export const COL_ASPECTS: { id: string; label: string; keywords: string[] }[] = [
  {
    id: "groceries",
    label: "groceries / food at home",
    keywords: ["grocer", "food", "supermarket", "grocery"],
  },
  {
    id: "dining",
    label: "dining out / restaurants",
    keywords: ["dining", "restaurant", "eat out", "takeout", "take-out", "coffee", "lunch"],
  },
  {
    id: "transit",
    label: "transit / commuting",
    keywords: [
      "transit",
      "commute",
      "metro",
      "subway",
      "bus",
      "train",
      "uber",
      "lyft",
      "taxi",
      "parking",
      "gas",
      "fuel",
      "car payment",
      "auto",
      "vehicle",
    ],
  },
  {
    id: "childcare",
    label: "childcare / daycare",
    keywords: ["childcare", "child care", "daycare", "day care", "nanny", "babysit", "preschool"],
  },
  {
    id: "healthcare",
    label: "healthcare / insurance premiums",
    keywords: [
      "health",
      "medical",
      "insurance",
      "dental",
      "vision",
      "prescription",
      "doctor",
      "premium",
    ],
  },
  {
    id: "phone_internet",
    label: "phone / internet",
    keywords: ["phone", "mobile", "cell", "internet", "wifi", "broadband", "isp"],
  },
  {
    id: "entertainment",
    label: "entertainment / subscriptions",
    keywords: [
      "entertain",
      "streaming",
      "netflix",
      "spotify",
      "subscription",
      "hobby",
      "gym",
      "fitness",
      "movie",
    ],
  },
  {
    id: "pets",
    label: "pet care",
    keywords: ["pet", "dog", "cat", "vet", "veterinary"],
  },
  {
    id: "debt",
    label: "debt payments (loans / credit cards)",
    keywords: ["loan", "debt", "credit card", "student loan", "car loan", "personal loan"],
  },
  {
    id: "clothing",
    label: "clothing / personal care",
    keywords: ["clothing", "clothes", "apparel", "personal care", "haircut", "toiletries"],
  },
];

export type InsightExpenseLine = {
  name: string;
  amount: number;
  currency: MoneyCurrency;
  /** Amount converted into the comparison reporting currency. */
  amountReporting: number;
  amountReportingFormatted: string;
};

export function namedExpenseLines(
  expenses: ExpenseLine[],
  reportingCurrency: MoneyCurrency,
  cadPerUsd: number,
): InsightExpenseLine[] {
  return expenses
    .map((e) => {
      const amount = parseMoney(e.amount);
      const currency = expenseLineCurrency(e);
      const name = e.name.trim() || "(unnamed expense)";
      const amountReporting = convertCurrency(amount, currency, reportingCurrency, cadPerUsd);
      return {
        name,
        amount,
        currency,
        amountReporting,
        amountReportingFormatted: formatMoney(amountReporting, reportingCurrency),
      };
    })
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amountReporting - a.amountReporting);
}

function lineMatchesAspect(lineName: string, keywords: string[]): boolean {
  const n = lineName.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

export function colAspectCoverage(lines: { name: string }[]): {
  enteredAspects: string[];
  missingAspects: string[];
} {
  const enteredAspects: string[] = [];
  const missingAspects: string[] = [];
  for (const aspect of COL_ASPECTS) {
    const hit = lines.some((l) => lineMatchesAspect(l.name, aspect.keywords));
    if (hit) enteredAspects.push(aspect.label);
    else missingAspects.push(aspect.label);
  }
  return { enteredAspects, missingAspects };
}

/** Compact expense + COL-gap payload shared by OpenAI summary and deterministic notes. */
export function buildExpenseInsightsContext(snapshot: ComparisonSnapshot, computed: ComparisonComputed) {
  const cur = computed.reportingCurrency;
  const lines = namedExpenseLines(snapshot.expenses, cur, computed.cadPerUsd);
  const { enteredAspects, missingAspects } = colAspectCoverage(lines);
  const totalReporting = computed.expenseMonthlyTotal;
  const baseline = computed.cities.find((c) => c.cityId === snapshot.baselineCityId) ?? computed.cities[0];
  const baselineTakeHome = baseline?.netMonthly ?? 0;
  const expenseShareOfTakeHomePct =
    baselineTakeHome > 0 ? Math.round((totalReporting / baselineTakeHome) * 1000) / 10 : null;

  return {
    expenseLines: lines.map((l) => ({
      name: l.name,
      amountEntered: formatMoney(l.amount, l.currency),
      currency: l.currency,
      amountReporting: l.amountReportingFormatted,
    })),
    expenseMonthlyTotalReporting: formatMoney(totalReporting, cur),
    topExpenseLines: lines.slice(0, 3).map((l) => `${l.name} (${l.amountReportingFormatted}/mo)`),
    expenseShareOfBaselineTakeHomePct: expenseShareOfTakeHomePct,
    enteredColAspects: enteredAspects,
    /** Cost-of-living categories the user has not modeled as line expenses. */
    missingColAspects: missingAspects,
    note: "Housing (rent/mortgage, utilities, HOA, property tax) is per city and separate from these global expense lines. Expenses apply equally to every city.",
  };
}
