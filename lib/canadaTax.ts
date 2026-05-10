/**
 * Canada payroll estimates: rough TS fallback + shared parsers/mappers.
 * Optional Python bridge lives in canadaCanataxServer.ts (server-only).
 * Not tax advice.
 */
import type { PayrollTaxAnnualEstimate } from "./payrollTaxApi";

const VALID_CA = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);

const PROVINCE_NAME_TO_CODE: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  newfoundland: "NL",
  labrador: "NL",
  "nova scotia": "NS",
  "northwest territories": "NT",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

const SKIP_SEGMENTS = new Set(["canada", "ca"]);

export function guessProvinceFromLabel(label: string): string | undefined {
  const trimmed = label.trim();
  if (!trimmed) return undefined;

  const abbrev = trimmed.match(/,\s*([A-Za-z]{2})\b/);
  if (abbrev?.[1]) {
    const code = abbrev[1].toUpperCase();
    if (VALID_CA.has(code)) return code;
    return undefined;
  }

  const segments = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    let seg = segments[i].toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
    if (!seg || SKIP_SEGMENTS.has(seg)) continue;
    if (/^[a-z]{2}$/i.test(seg)) {
      const code = seg.toUpperCase();
      if (VALID_CA.has(code)) return code;
      continue;
    }
    const code = PROVINCE_NAME_TO_CODE[seg];
    if (code) return code;
  }
  return undefined;
}

export type CanataxAnnualResult = {
  federal_tax: number;
  provincial_tax: number;
  cpp: number;
  ei: number;
  total_tax: number;
  net_income: number;
  qpp?: number;
  qpip?: number;
};

export function mapCanataxToPayrollEstimate(
  r: CanataxAnnualResult,
  params: { grossAnnual: number; pretaxTotal: number },
): PayrollTaxAnnualEstimate {
  const gross = Math.max(0, params.grossAnnual);
  const pretax = Math.min(gross, Math.max(0, params.pretaxTotal));
  const federal = Math.max(0, r.federal_tax);
  const provincial = Math.max(0, r.provincial_tax);
  const cpp = Math.max(0, r.cpp ?? 0);
  const ei = Math.max(0, r.ei ?? 0);
  const qpp = Math.max(0, r.qpp ?? 0);
  const qpip = Math.max(0, r.qpip ?? 0);
  const cppLike = cpp + qpp;
  const totalAnnual = federal + provincial + cppLike + ei + qpip;
  const netAnnual = Math.max(0, gross - pretax - totalAnnual);
  const effectiveRate = gross > 0 ? totalAnnual / gross : 0;

  return {
    netAnnual,
    monthlyFederal: federal / 12,
    monthlyState: provincial / 12,
    monthlyLocal: qpip / 12,
    monthlyFica: cppLike / 12,
    monthlyMedicare: ei / 12,
    effectiveRate,
  };
}

/** Demo-only combined income-tax proxy by province (CPP/EI modeled separately). */
const ROUGH_COMBINED_RATE: Record<string, number> = {
  AB: 0.22,
  BC: 0.24,
  MB: 0.25,
  NB: 0.24,
  NL: 0.26,
  NS: 0.27,
  NT: 0.2,
  NU: 0.2,
  ON: 0.26,
  PE: 0.25,
  QC: 0.28,
  SK: 0.23,
  YT: 0.2,
};

const CPP_RATE = 0.0595;
const CPP_CEILING = 68500;
const CPP_MAX_EMPLOYEE = 3867;
const EI_RATE = 0.0163;
const EI_CEILING = 63200;
const EI_MAX_EMPLOYEE = 1072;

export function estimateCanadaPayrollRough(
  grossAnnual: number,
  pretaxTotal: number,
  province: string,
): PayrollTaxAnnualEstimate {
  const gross = Math.max(0, grossAnnual);
  const pretax = Math.min(gross, Math.max(0, pretaxTotal));
  const taxable = Math.max(0, gross - pretax);
  const prov = province.toUpperCase();
  const combinedRate = ROUGH_COMBINED_RATE[prov] ?? 0.24;
  const incomeTaxAnnual = taxable * combinedRate;
  const fedShare = incomeTaxAnnual * 0.58;
  const provShare = incomeTaxAnnual * 0.42;

  const cppWages = Math.min(taxable, CPP_CEILING);
  const cppAnnual = Math.min(cppWages * CPP_RATE, CPP_MAX_EMPLOYEE);
  const eiWages = Math.min(taxable, EI_CEILING);
  const eiAnnual = Math.min(eiWages * EI_RATE, EI_MAX_EMPLOYEE);

  const totalAnnual = fedShare + provShare + cppAnnual + eiAnnual;
  const netAnnual = Math.max(0, gross - pretax - totalAnnual);
  const effectiveRate = gross > 0 ? totalAnnual / gross : 0;

  return {
    netAnnual,
    monthlyFederal: fedShare / 12,
    monthlyState: provShare / 12,
    monthlyLocal: 0,
    monthlyFica: cppAnnual / 12,
    monthlyMedicare: eiAnnual / 12,
    effectiveRate,
  };
}
