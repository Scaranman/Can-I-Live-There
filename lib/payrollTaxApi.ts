/**
 * PayrollTaxAPI client + annualization helpers (https://payrolltaxapi.com).
 * Used only from server routes — keep API keys off the client.
 */

import type { FilingStatus } from "./types";

export type PayrollTaxLookupTax = {
  tax_type_code: string;
  name: string;
  category: string;
  taxpayer_side: string;
  jurisdiction: string;
  rate_structure: string;
  rate?: number;
  wage_base?: number | null;
  brackets?: Array<{ from: number; to?: number | null; rate: number }>;
  supplemental_rate?: number;
};

/** Response body from GET /v1/rates/lookup (API may add fields over time). */
export type PayrollTaxLookupResponse = {
  taxes: PayrollTaxLookupTax[];
  pay_date?: string;
  work_state?: string;
  residence_state?: string;
  filing_status?: string;
  meta?: { tax_count?: number; processing_ms?: number };
};

export type PayrollTaxAnnualEstimate = {
  netAnnual: number;
  monthlyFederal: number;
  monthlyState: number;
  monthlyLocal: number;
  monthlyFica: number;
  monthlyMedicare: number;
  effectiveRate: number;
};

const BASE_URL = "https://payrolltaxapi.com";

/** Marginal income tax from ordered `from`/`to` slices (same shape as PayrollTaxAPI bracket rows). */
export function marginalBracketTaxAnnual(
  taxableAnnual: number,
  brackets: PayrollTaxLookupTax["brackets"],
): number {
  if (taxableAnnual <= 0 || !brackets?.length) return 0;
  let tax = 0;
  for (const br of brackets) {
    const lo = br.from;
    const hi = br.to == null ? Infinity : br.to;
    if (taxableAnnual <= lo) continue;
    const slice = Math.min(taxableAnnual, hi) - lo;
    const r = typeof br.rate === "number" && Number.isFinite(br.rate) ? br.rate : 0;
    if (slice > 0) tax += slice * r;
  }
  return tax;
}

/** IRS additional Medicare wage threshold (annual wages subject to 0.9% employee share). */
function additionalMedicareThreshold(filing: FilingStatus | undefined): number {
  return filing === "married" ? 250_000 : 200_000;
}

function flatOnBase(base: number, rate: number | undefined, wageBase: number | null | undefined): number {
  if (!rate || base <= 0) return 0;
  const cap = wageBase == null ? base : Math.min(base, wageBase);
  return cap * rate;
}

/**
 * Rows the estimator treats as **local** (city/school district, etc.) vs state income tax.
 * Match this when reading `rate` / `brackets` from the lookup payload.
 */
export function isLocalIncomeTax(tax: PayrollTaxLookupTax): boolean {
  const c = tax.tax_type_code.toUpperCase();
  const j = (tax.jurisdiction ?? "").toUpperCase();
  return (
    c.includes("NYC") ||
    c.includes("YONKERS") ||
    c.includes("_LOCAL") ||
    c.includes("_CITY_") ||
    (tax.category === "income" && j.includes("CITY"))
  );
}

function normalizeForLocalMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when this tax row appears tied to the employee's work city (API does not take city on `/lookup`;
 * we match jurisdiction/name/code against the locality parsed from the city label).
 */
export function taxRowMatchesWorkLocality(tax: PayrollTaxLookupTax, locality: string): boolean {
  const loc = normalizeForLocalMatch(locality);
  if (loc.length < 2) return false;

  const hay = normalizeForLocalMatch(`${tax.jurisdiction} ${tax.name} ${tax.tax_type_code}`);

  if (hay.includes(loc)) return true;

  if (loc === "new york" || loc.startsWith("new york ")) {
    return hay.includes("new york city") || hay.includes("nyc");
  }

  return false;
}

/** Employee-side city/local income tax rows (aligned with `monthlyLocal` in annualEmployeeTaxesFromLookup). */
export function employeeLocalIncomeTaxRows(
  lookup: PayrollTaxLookupResponse,
  workLocality?: string,
): PayrollTaxLookupTax[] {
  const wl = workLocality?.trim();
  return (Array.isArray(lookup.taxes) ? lookup.taxes : []).filter((t) => {
    if (t.taxpayer_side?.toLowerCase() !== "employee") return false;
    if (t.category !== "income") return false;
    if (t.tax_type_code.startsWith("FED_")) return false;
    return isLocalIncomeTax(t) || (wl ? taxRowMatchesWorkLocality(t, wl) : false);
  });
}

function incomeTaxCountsAsLocal(tax: PayrollTaxLookupTax, workLocality?: string): boolean {
  const wl = workLocality?.trim();
  return isLocalIncomeTax(tax) || (wl ? taxRowMatchesWorkLocality(tax, wl) : false);
}

/**
 * Sum employee-side payroll taxes for an annual pay period using API rate payloads.
 */
export function annualEmployeeTaxesFromLookup(
  lookup: PayrollTaxLookupResponse,
  ctx: {
    taxableAnnual: number;
    grossAnnual: number;
    workLocality?: string;
    filingStatus?: FilingStatus;
  },
): PayrollTaxAnnualEstimate {
  const { taxableAnnual, grossAnnual } = ctx;
  const gross = Math.max(0, grossAnnual);
  const taxable = Math.max(0, taxableAnnual);

  let annualFederalIncome = 0;
  let annualStateIncome = 0;
  let annualLocalIncome = 0;
  let annualStateExtras = 0;
  let annualFica = 0;
  let annualMedicare = 0;

  const rows = Array.isArray(lookup.taxes) ? lookup.taxes : [];

  for (const tax of rows) {
    if (tax.taxpayer_side?.toLowerCase() !== "employee") continue;

    const code = tax.tax_type_code;
    const codeUp = code.toUpperCase();
    const struct = tax.rate_structure;

    if (codeUp.includes("FICA_SS")) {
      annualFica += flatOnBase(gross, tax.rate, tax.wage_base ?? undefined);
      continue;
    }

    const isAddlMedicare =
      (codeUp.includes("ADDL") || codeUp.includes("ADDITIONAL")) && codeUp.includes("MED");
    if (isAddlMedicare) {
      const thresh = additionalMedicareThreshold(ctx.filingStatus);
      const excess = Math.max(0, gross - thresh);
      const r = typeof tax.rate === "number" && Number.isFinite(tax.rate) ? tax.rate : 0;
      annualMedicare += excess * r;
      continue;
    }

    if (
      (codeUp.includes("FICA_MED") || codeUp.includes("MEDICARE")) &&
      !codeUp.includes("ADDL") &&
      !codeUp.includes("ADDITIONAL")
    ) {
      annualMedicare += flatOnBase(gross, tax.rate, tax.wage_base ?? undefined);
      continue;
    }

    if (tax.category === "income" && code.startsWith("FED_")) {
      if (struct === "graduated" && tax.brackets?.length) {
        annualFederalIncome += marginalBracketTaxAnnual(taxable, tax.brackets);
      }
      continue;
    }

    if (tax.category === "income" && !code.startsWith("FED_")) {
      let amt = 0;
      if (struct === "graduated" && tax.brackets?.length) {
        amt = marginalBracketTaxAnnual(taxable, tax.brackets);
      } else if (struct === "flat_percent") {
        amt = flatOnBase(taxable, tax.rate, tax.wage_base ?? undefined);
      }
      if (amt <= 0) continue;
      if (incomeTaxCountsAsLocal(tax, ctx.workLocality)) annualLocalIncome += amt;
      else annualStateIncome += amt;
      continue;
    }

    // CA SDI and similar: employee levy with a wage cap, not a flat % of unlimited gross.
    if (struct === "wage_base_capped" && tax.category !== "income" && tax.rate) {
      annualStateExtras += flatOnBase(gross, tax.rate, tax.wage_base ?? undefined);
      continue;
    }

    if (struct === "flat_percent" && tax.rate) {
      annualStateExtras += flatOnBase(gross, tax.rate, tax.wage_base ?? undefined);
    }
  }

  const totalAnnualTaxes =
    annualFederalIncome + annualStateIncome + annualLocalIncome + annualStateExtras + annualFica + annualMedicare;
  const pretax = Math.max(0, gross - taxable);
  const netAnnual = Math.max(0, gross - pretax - totalAnnualTaxes);

  return {
    netAnnual,
    monthlyFederal: annualFederalIncome / 12,
    monthlyState: (annualStateIncome + annualStateExtras) / 12,
    monthlyLocal: annualLocalIncome / 12,
    monthlyFica: annualFica / 12,
    monthlyMedicare: annualMedicare / 12,
    effectiveRate: gross > 0 ? totalAnnualTaxes / gross : 0,
  };
}

/** Annual dollar amount for one employee non-federal income tax row (used for registry credit vs API). */
export function annualEmployeeIncomeTaxAmountForRow(
  tax: PayrollTaxLookupTax,
  ctx: { taxableAnnual: number; grossAnnual: number },
): number {
  if (tax.taxpayer_side?.toLowerCase() !== "employee") return 0;
  if (tax.category !== "income") return 0;
  if (tax.tax_type_code.startsWith("FED_")) return 0;

  const taxable = Math.max(0, ctx.taxableAnnual);
  const struct = tax.rate_structure;

  if (struct === "graduated" && tax.brackets?.length) {
    return marginalBracketTaxAnnual(taxable, tax.brackets);
  }
  if (struct === "flat_percent") {
    return flatOnBase(taxable, tax.rate, tax.wage_base ?? undefined);
  }
  return 0;
}

function haystackForTaxRow(tax: PayrollTaxLookupTax): string {
  return normalizeForLocalMatch(`${tax.jurisdiction ?? ""} ${tax.name} ${tax.tax_type_code}`);
}

/** Sums API income-tax amounts already attributed to this work locality (avoid double-count with registry). */
export function apiIncomeTaxAnnualForWorkLocality(
  lookup: PayrollTaxLookupResponse | undefined,
  workLocality: string | undefined,
  taxableAnnual: number,
  grossAnnual: number,
  creditSubstrings?: string[],
): number {
  const taxRows = Array.isArray(lookup?.taxes) ? lookup.taxes : [];
  if (!taxRows.length || !workLocality?.trim()) return 0;
  const loc = workLocality.trim();
  const subs = (creditSubstrings ?? [])
    .map((s) => normalizeForLocalMatch(s))
    .filter((s) => s.length >= 2);
  let sum = 0;
  for (const tax of taxRows) {
    const hay = haystackForTaxRow(tax);
    const matchLoc = taxRowMatchesWorkLocality(tax, loc);
    const matchSub = subs.some((s) => hay.includes(s));
    if (!matchLoc && !matchSub) continue;
    sum += annualEmployeeIncomeTaxAmountForRow(tax, { taxableAnnual, grossAnnual });
  }
  return sum;
}

export async function fetchPayrollTaxLookup(params: {
  apiKey: string;
  workState: string;
  residenceState?: string;
  payDate: string;
  filingStatus: string;
  grossAnnual: number;
}): Promise<PayrollTaxLookupResponse> {
  const q = new URLSearchParams({
    workState: params.workState,
    payDate: params.payDate,
    filingStatus: params.filingStatus,
    grossWages: String(Math.max(0, params.grossAnnual)),
    payPeriod: "annual",
  });
  const rs = params.residenceState?.trim().toUpperCase();
  if (rs && rs !== params.workState.trim().toUpperCase()) {
    q.set("residenceState", rs);
  }

  const url = `${BASE_URL}/v1/rates/lookup?${q.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const rawText = await res.text();
  const jsonText = rawText.replace(/^\uFEFF/, "").trim();

  if (!res.ok) {
    throw new Error(`payrolltaxapi_${res.status}: ${rawText.slice(0, 300)}`);
  }

  let data: PayrollTaxLookupResponse;
  try {
    data = JSON.parse(jsonText) as PayrollTaxLookupResponse;
  } catch (e) {
    throw e instanceof Error ? e : new Error("payrolltaxapi_invalid_json");
  }

  return data;
}
