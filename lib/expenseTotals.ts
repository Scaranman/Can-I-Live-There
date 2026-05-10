import { convertCurrency, resolveCadPerUsd } from "./currencyConversion";
import { parseMoney } from "./money";
import type { ExpenseLine, MoneyCurrency } from "./types";

export function expenseLineCurrency(line: Pick<ExpenseLine, "currency">): MoneyCurrency {
  return line.currency === "CAD" ? "CAD" : "USD";
}

/** Sum expense lines after converting each line into `target` (USD or CAD). */
export function sumExpensesConvertedTo(
  expenses: ExpenseLine[],
  target: MoneyCurrency,
  cadPerUsd: number,
): number {
  const cad = resolveCadPerUsd(cadPerUsd);
  return expenses.reduce((sum, row) => {
    const amt = parseMoney(row.amount);
    const from = expenseLineCurrency(row);
    return sum + convertCurrency(amt, from, target, cad);
  }, 0);
}

export function sumExpensesInReportingCurrency(
  expenses: ExpenseLine[],
  reporting: MoneyCurrency,
  cadPerUsd: number,
): number {
  return sumExpensesConvertedTo(expenses, reporting, cadPerUsd);
}

export function expenseEnteredSubtotals(expenses: ExpenseLine[]): { usd: number; cad: number } {
  let usd = 0;
  let cad = 0;
  for (const e of expenses) {
    const n = parseMoney(e.amount);
    if (expenseLineCurrency(e) === "CAD") cad += n;
    else usd += n;
  }
  return { usd, cad };
}

export function expenseLinesCurrencySummary(expenses: ExpenseLine[]): string {
  let usd = 0;
  let cad = 0;
  for (const e of expenses) {
    if (expenseLineCurrency(e) === "CAD") cad += 1;
    else usd += 1;
  }
  if (cad === 0) return "All expense lines in USD";
  if (usd === 0) return "All expense lines in CAD";
  return `${usd} line(s) in USD, ${cad} line(s) in CAD`;
}
