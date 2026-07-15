/**
 * DEMO payroll-tax approximation for MVP when PayrollTaxAPI is not wired.
 * Federal ordinary income + FICA come from lib/federalTax.ts; state/local remain stub heuristics.
 * Not tax advice. UI labels this explicitly.
 */
import { estimateFederalTaxesAnnual } from "./federalTax";
import type { PayrollTaxAnnualEstimate } from "./payrollTaxApi";
import type { FilingStatus } from "./types";

/** Very rough effective state rate table by USPS state code (many omitted → default). */
function stateRate(state?: string): number {
  if (!state) return 0.04;
  const s = state.toUpperCase();
  const map: Record<string, number> = {
    CA: 0.09,
    NY: 0.077,
    IL: 0.0495,
    TX: 0,
    FL: 0,
    WA: 0,
    CO: 0.044,
    MA: 0.05,
    NJ: 0.0637,
    PA: 0.0307,
    OH: 0.0399,
    GA: 0.055,
    NC: 0.0475,
    MI: 0.0425,
  };
  return map[s] ?? 0.045;
}

/** Lowercase full state / territory names → USPS (incl. District of Columbia). */
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

const SKIP_STATE_SEGMENTS = new Set(["usa", "us", "united states", "united states of america"]);

export function guessStateFromLabel(label: string): string | undefined {
  const trimmed = label.trim();
  if (!trimmed) return undefined;

  const abbrev = trimmed.match(/,\s*([A-Za-z]{2})\b/);
  if (abbrev?.[1]) return abbrev[1].toUpperCase();

  const segments = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    let seg = segments[i].toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
    if (!seg || SKIP_STATE_SEGMENTS.has(seg)) continue;
    if (/^[a-z]{2}$/i.test(seg)) return seg.toUpperCase();
    if (seg === "d.c" || seg === "d.c.") return "DC";
    const code = STATE_NAME_TO_CODE[seg];
    if (code) return code;
  }
  return undefined;
}

/** City/locality from a Places-style label (`Springfield, IL`). Used to bucket API rows into local vs state income tax. */
export function guessLocalityFromLabel(label: string): string | undefined {
  const trimmed = label.trim();
  if (!trimmed || !trimmed.includes(",")) return undefined;
  const city = trimmed.split(",")[0]?.trim();
  return city || undefined;
}

export function estimatePayrollTaxesAnnual(params: {
  grossAnnual: number;
  filingStatus: FilingStatus;
  /** Traditional 401k deferrals annualized (already capped logically by caller). */
  traditional401kAnnual: number;
  /** Annualized HSA employee contributions treated pre-tax for this stub. */
  hsaAnnual: number;
  /** Annualized FSA contributions treated pre-tax for this stub. */
  fsaAnnual: number;
  cityLabel: string;
}): PayrollTaxAnnualEstimate {
  const federal = estimateFederalTaxesAnnual({
    grossAnnual: params.grossAnnual,
    filingStatus: params.filingStatus,
    traditional401kAnnual: params.traditional401kAnnual,
    hsaAnnual: params.hsaAnnual,
    fsaAnnual: params.fsaAnnual,
  });

  const gross = Math.max(0, params.grossAnnual);
  const pretax = Math.max(0, gross - federal.wagesForIncomeTax);
  const wagesForIncomeTax = federal.wagesForIncomeTax;

  const st = guessStateFromLabel(params.cityLabel);
  const stateAnnual = wagesForIncomeTax * stateRate(st);

  /** NYC-ish hint — ultra rough local piggyback (registry supplement overrides when present). */
  const localAnnual =
    params.cityLabel.toLowerCase().includes("new york") ? wagesForIncomeTax * 0.0125 : 0;

  const fedAnnual = federal.federalIncomeAnnual;
  const ficaAnnual = federal.socialSecurityAnnual;
  const medicareAnnual = federal.medicareAnnual;

  const totalAnnualTaxes = fedAnnual + stateAnnual + localAnnual + ficaAnnual + medicareAnnual;
  const netAnnual = Math.max(0, gross - pretax - totalAnnualTaxes);

  const effectiveRate = gross > 0 ? totalAnnualTaxes / gross : 0;

  return {
    netAnnual,
    monthlyFederal: fedAnnual / 12,
    monthlyState: stateAnnual / 12,
    monthlyLocal: localAnnual / 12,
    monthlyFica: ficaAnnual / 12,
    monthlyMedicare: medicareAnnual / 12,
    effectiveRate,
  };
}
