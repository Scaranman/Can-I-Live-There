/**
 * Canada payroll estimates: local federal + provincial modules and label parsers.
 * Not tax advice.
 */
import { estimateCanadaFederalTaxesAnnual } from "./canadaFederalTax";
import { estimateCanadaProvinceTaxesAnnual } from "./canadaProvinceTax";
import type { PayrollTaxAnnualEstimate } from "./taxMath";

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

/**
 * Local Canada payroll estimate (federal + province modules).
 * UI mapping: federal / provincial / CPP|QPP / EI / QPIP→local.
 */
export function estimateCanadaPayrollRough(
  grossAnnual: number,
  pretaxTotal: number,
  province: string,
): PayrollTaxAnnualEstimate {
  const gross = Math.max(0, grossAnnual);
  const pretax = Math.min(gross, Math.max(0, pretaxTotal));
  const taxable = Math.max(0, gross - pretax);
  const prov = province.toUpperCase();
  const isQuebec = prov === "QC";

  const federal = estimateCanadaFederalTaxesAnnual({
    grossAnnual: gross,
    traditional401kAnnual: pretax,
    hsaAnnual: 0,
    fsaAnnual: 0,
    quebec: isQuebec,
    skipCpp: isQuebec,
  });

  const provincial = estimateCanadaProvinceTaxesAnnual(prov, {
    taxableAnnual: taxable,
    grossAnnual: gross,
  });

  const fedAnnual = federal.federalIncomeAnnual;
  const provAnnual = provincial.provincialIncomeAnnual;
  const cppLike = federal.cppAnnual + provincial.qppAnnual;
  const eiAnnual = federal.eiAnnual;
  const qpipAnnual = provincial.qpipAnnual;

  const totalAnnual = fedAnnual + provAnnual + cppLike + eiAnnual + qpipAnnual;
  const netAnnual = Math.max(0, gross - pretax - totalAnnual);
  const effectiveRate = gross > 0 ? totalAnnual / gross : 0;

  return {
    netAnnual,
    monthlyFederal: fedAnnual / 12,
    monthlyState: provAnnual / 12,
    monthlyLocal: qpipAnnual / 12,
    monthlyFica: cppLike / 12,
    monthlyMedicare: eiAnnual / 12,
    effectiveRate,
  };
}
