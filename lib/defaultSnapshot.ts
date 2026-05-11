import { workCountryToCurrency } from "./currencyConversion";
import { derivePayrollWorkCountry } from "./deriveWorkCountry";
import type { ComparisonSnapshot, ExpenseLine, MoneyCurrency, PretaxInput } from "./types";

export function newCity(): ComparisonSnapshot["cities"][number] {
  return {
    id: crypto.randomUUID(),
    label: "",
    placeId: "",
    residenceLabel: "",
    income: { salary: "", bonus: "", other: "" },
    housing: {
      mode: "rent",
      monthlyCore: "",
      utilities: "",
      hoa: "",
      propTax: "",
    },
  };
}

function normalizePretax(raw: ComparisonSnapshot["pretax"] | undefined, baselineMoneyCurrency: MoneyCurrency): PretaxInput {
  const f = raw?.fourOhOne;
  const h = raw?.hsa;
  const fs = raw?.fsa;
  const amountCurrency: MoneyCurrency =
    f?.amountCurrency === "CAD" || f?.amountCurrency === "USD" ? f.amountCurrency : baselineMoneyCurrency;
  const hsaAmountCurrency: MoneyCurrency =
    (h as { amountCurrency?: string } | undefined)?.amountCurrency === "CAD" ||
    (h as { amountCurrency?: string } | undefined)?.amountCurrency === "USD"
      ? ((h as { amountCurrency?: string }).amountCurrency as MoneyCurrency)
      : baselineMoneyCurrency;
  return {
    fourOhOne: {
      mode: f?.mode === "percent" ? "percent" : "amount",
      amount: typeof f?.amount === "string" ? f.amount : "",
      amountCurrency,
      period: f?.period === "annual" ? "annual" : "monthly",
      percent: typeof f?.percent === "string" ? f.percent : "",
    },
    hsa: {
      amount: typeof h?.amount === "string" ? h.amount : "",
      amountCurrency: hsaAmountCurrency,
      period: h?.period === "annual" ? "annual" : "monthly",
    },
    fsa: {
      amount: typeof fs?.amount === "string" ? fs.amount : "",
      period: fs?.period === "annual" ? "annual" : "monthly",
    },
  };
}

/** Ensures baseline id matches an existing city, or "" when there are none. */
export function normalizeSnapshotBaseline(s: ComparisonSnapshot): ComparisonSnapshot {
  if (!Array.isArray(s.cities)) return s;
  const cities = s.cities.map((c) => {
    const placeId = typeof c.placeId === "string" ? c.placeId : "";
    const placeCountryCode =
      placeId && (c.placeCountryCode === "CA" || c.placeCountryCode === "US")
        ? c.placeCountryCode
        : undefined;
    const label = typeof c.label === "string" ? c.label : "";
    return {
      ...c,
      placeId,
      placeCountryCode,
      residenceLabel: typeof c.residenceLabel === "string" ? c.residenceLabel : "",
      workCountry: derivePayrollWorkCountry({ label, placeId, placeCountryCode }),
    };
  });
  const legacyRootCad =
    "expenseCurrency" in s && (s as { expenseCurrency?: string }).expenseCurrency === "CAD";
  const rawExpenses = Array.isArray(s.expenses) ? s.expenses : [];
  const expenses: ExpenseLine[] = rawExpenses.map((e) => {
    const c = (e as { currency?: string }).currency;
    const currency: MoneyCurrency =
      c === "CAD" || c === "USD"
        ? c
        : legacyRootCad && !(e as { currency?: string }).currency
          ? "CAD"
          : "USD";
    return {
      id: typeof e.id === "string" ? e.id : crypto.randomUUID(),
      name: typeof e.name === "string" ? e.name : "",
      amount: typeof e.amount === "string" ? e.amount : "",
      currency,
    };
  });

  let baselineCityId = typeof s.baselineCityId === "string" ? s.baselineCityId : "";
  if (cities.length > 0 && !cities.some((c) => c.id === baselineCityId)) {
    baselineCityId = cities[0].id;
  }
  const baselineCity = cities.find((c) => c.id === baselineCityId) ?? cities[0];
  const baselineMoneyCurrency: MoneyCurrency = baselineCity
    ? workCountryToCurrency(derivePayrollWorkCountry(baselineCity))
    : "USD";
  const pretax = normalizePretax(s.pretax, baselineMoneyCurrency);

  const next: ComparisonSnapshot = {
    version: 1,
    cities,
    baselineCityId: cities.length === 0 ? "" : baselineCityId,
    filingStatus: s.filingStatus,
    pretax,
    expenses,
    updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : new Date().toISOString(),
  };
  if (next.cities.length === 0) {
    return { ...next, baselineCityId: "" };
  }
  return next;
}

export function defaultSnapshot(): ComparisonSnapshot {
  const a = newCity();
  const b = newCity();
  return normalizeSnapshotBaseline({
    version: 1,
    cities: [a, b],
    baselineCityId: a.id,
    filingStatus: "single",
    pretax: {
      fourOhOne: {
        mode: "amount",
        amount: "",
        amountCurrency: "USD",
        period: "monthly",
        percent: "",
      },
      hsa: { amount: "", amountCurrency: "USD", period: "monthly" },
      fsa: { amount: "", period: "monthly" },
    },
    expenses: [
      { id: crypto.randomUUID(), name: "Groceries", amount: "", currency: "USD" },
      { id: crypto.randomUUID(), name: "Student loan", amount: "", currency: "USD" },
    ],
    updatedAt: new Date().toISOString(),
  });
}
