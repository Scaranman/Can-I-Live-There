import type { ComparisonComputed, ComparisonSnapshot } from "./types";
import { buildExpenseInsightsContext } from "./insightsContext";

/**
 * Offline / no-key fallback. Intentionally does NOT rehash leftover, tax %, or housing
 * totals from the dashboard — those are already on screen. True city COL color needs GPT.
 */
export function deterministicInsights(params: {
  baselineLabel: string;
  computed: ComparisonComputed;
  snapshot?: ComparisonSnapshot;
}): string[] {
  const { computed, snapshot } = params;
  const cities = computed.cities.map((c) => c.label).filter(Boolean);
  const cityList =
    cities.length === 0
      ? "your compared cities"
      : cities.length === 1
        ? cities[0]
        : cities.length === 2
          ? `${cities[0]} and ${cities[1]}`
          : `${cities.slice(0, -1).join(", ")}, and ${cities.at(-1)}`;

  const hasUs = computed.cities.some((c) => c.workCountry === "US");
  const hasCa = computed.cities.some((c) => c.workCountry === "CA");

  const bullets: string[] = [
    `Qualitative cost-of-living notes for ${cityList} (groceries, transit, healthcare norms, lifestyle) need the OpenAI insights path — this fallback does not invent city price stories.`,
  ];

  if (hasUs && hasCa) {
    bullets.push(
      `You’re comparing US and Canadian payroll cities: everyday life often diverges on healthcare (employer insurance vs public coverage plus dental/vision extras), sales-tax/HST feel at the register, and how much a car vs transit matters — even when housing and withholding are already modeled above.`,
    );
  } else if (hasCa) {
    bullets.push(
      `For Canadian cities, groceries, telecom, and transit/car need can differ by metro as much as rent does; provincial health coverage usually shrinks medical-premium risk relative to typical US employer plans, while dental and prescriptions may still hit cash flow.`,
    );
  } else {
    bullets.push(
      `Across US metros, leftovers on the dashboard ignore how groceries, car-dependence, childcare, and employer health premiums usually diverge by city — those are the questions the AI Insights panel is meant to answer when GPT is enabled.`,
    );
  }

  if (snapshot) {
    const ctx = buildExpenseInsightsContext(snapshot, computed);
    if (ctx.topExpenseLines.length > 0) {
      bullets.push(
        `Looking at your lines (${ctx.topExpenseLines.join("; ")}): the calculator applies those same amounts in every city, so ranking changes come from income, housing, and tax — while in real life grocery, transit, or similar lines often stretch or shrink after a move.`,
      );
      const top = ctx.expenseLines[0];
      if (top) {
        bullets.push(
          `Suggestion on “${top.name}” (${top.amountReporting}/mo): treat it as a lifestyle signal when you compare ${cityList} — ask whether that category typically costs more or less in each place rather than assuming the leftover gap alone captures it.`,
        );
      }
    }
  }

  bullets.push(
    `Add OPENAI_API_KEY for city-by-city COL commentary that goes beyond the numbers already shown. This is not tax, payroll, or financial advice.`,
  );

  return bullets;
}
