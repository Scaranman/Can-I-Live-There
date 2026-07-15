import { convertCurrency } from "./currencyConversion";
import { expenseLineCurrency } from "./expenseTotals";
import { formatMoney, parseMoney } from "./money";
import type { ComparisonComputed, ComparisonSnapshot, ExpenseLine, MoneyCurrency } from "./types";

/** Themes the model should discuss per city (beyond income / housing / payroll tax). */
export const COL_DISCUSSION_THEMES = [
  "groceries and everyday household goods",
  "dining out and coffee-shop culture",
  "transit vs needing a car (parking, insurance, fuel)",
  "healthcare access and out-of-pocket norms (US employer plans vs Canadian public coverage + extras)",
  "childcare and family costs when relevant",
  "utilities / seasonal heating or cooling beyond the housing fields",
  "phone, internet, and entertainment pricing",
  "lifestyle amenities that change how far leftover cash goes",
] as const;

export type InsightExpenseLine = {
  name: string;
  amount: number;
  currency: MoneyCurrency;
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

/** Expense context for personalized AI suggestions (not “please add more rows”). */
export function buildExpenseInsightsContext(snapshot: ComparisonSnapshot, computed: ComparisonComputed) {
  const cur = computed.reportingCurrency;
  const lines = namedExpenseLines(snapshot.expenses, cur, computed.cadPerUsd);
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
    topExpenseLines: lines.slice(0, 5).map((l) => `${l.name} (${l.amountReportingFormatted}/mo)`),
    expenseShareOfBaselineTakeHomePct: expenseShareOfTakeHomePct,
    /** Same dollar amounts are applied to every city in this app’s model. */
    expensesAreGlobalAcrossCities: true,
    colThemesToDiscuss: [...COL_DISCUSSION_THEMES],
    modelingNote:
      "Housing (rent/mortgage, utilities, HOA, property tax) and payroll taxes are already modeled per city in the app. Global expense lines use the same amounts in every column.",
  };
}
