import type { ComparisonSnapshot } from "./types";

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

/** Ensures baseline id matches an existing city, or "" when there are none. */
export function normalizeSnapshotBaseline(s: ComparisonSnapshot): ComparisonSnapshot {
  if (!Array.isArray(s.cities)) return s;
  if (s.cities.length === 0) {
    return { ...s, baselineCityId: "" };
  }
  if (!s.cities.some((c) => c.id === s.baselineCityId)) {
    return { ...s, baselineCityId: s.cities[0].id };
  }
  return s;
}

export function defaultSnapshot(): ComparisonSnapshot {
  const a = newCity();
  const b = newCity();
  return {
    version: 1,
    cities: [a, b],
    baselineCityId: a.id,
    filingStatus: "single",
    pretax: {
      fourOhOne: {
        mode: "amount",
        amount: "",
        period: "monthly",
        percent: "",
      },
      hsa: { amount: "", period: "monthly" },
      fsa: { amount: "", period: "monthly" },
    },
    expenses: [
      { id: crypto.randomUUID(), name: "Groceries", amount: "" },
      { id: crypto.randomUUID(), name: "Student loan", amount: "" },
    ],
    updatedAt: new Date().toISOString(),
  };
}
