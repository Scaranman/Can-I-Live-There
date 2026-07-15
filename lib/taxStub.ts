/**
 * DEMO payroll-tax approximation for MVP when PayrollTaxAPI is not wired.
 * Federal: lib/federalTax.ts. State/DC/territories: lib/stateTax/<code>.ts.
 * Local remains a small heuristic / registry supplement.
 * Not tax advice. UI labels this explicitly.
 */
import { estimateFederalTaxesAnnual } from "./federalTax";
import type { PayrollTaxAnnualEstimate } from "./payrollTaxApi";
import { estimateStateTaxesAnnual, isUsTerritoryTaxCode } from "./stateTax";
import type { FilingStatus } from "./types";

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
  // Inhabited US territories
  "puerto rico": "PR",
  guam: "GU",
  "virgin islands": "VI",
  "u.s. virgin islands": "VI",
  "us virgin islands": "VI",
  "united states virgin islands": "VI",
  "american samoa": "AS",
  "northern mariana islands": "MP",
  "commonwealth of the northern mariana islands": "MP",
  cnmi: "MP",
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
  const state = estimateStateTaxesAnnual(st, {
    grossAnnual: params.grossAnnual,
    filingStatus: params.filingStatus,
    traditional401kAnnual: params.traditional401kAnnual,
    hsaAnnual: params.hsaAnnual,
    fsaAnnual: params.fsaAnnual,
    wagesForIncomeTax,
  });
  const stateAnnual = state.stateIncomeAnnual + state.stateExtrasAnnual;

  /** NYC-ish hint — ultra rough local piggyback (registry supplement overrides when present). */
  const localAnnual =
    params.cityLabel.toLowerCase().includes("new york") ? wagesForIncomeTax * 0.0125 : 0;

  /**
   * Bona fide territory residents generally exclude territory-source wages from US federal
   * ordinary income tax and pay local/territorial tax instead (mapped to monthlyState).
   * FICA/Medicare still apply. DC residents continue to pay both federal and DC tax.
   */
  const fedAnnual = isUsTerritoryTaxCode(st) ? 0 : federal.federalIncomeAnnual;
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
