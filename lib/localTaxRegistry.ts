/**
 * Supplemental local wage taxes absent from PayrollTaxAPI responses.
 * Source of truth: data/local-tax-rates.json (extend as needed).
 */
import rawRegistry from "@/data/local-tax-rates.json";
import {
  apiIncomeTaxAnnualForWorkLocality,
  type PayrollTaxAnnualEstimate,
  type PayrollTaxLookupResponse,
} from "./payrollTaxApi";
import { guessLocalityFromLabel, guessStateFromLabel } from "./taxStub";

export type LocalTaxBasis = "taxable_wages" | "gross_wages";

export type LocalTaxRegistryEntry = {
  id: string;
  locality: string;
  state: string;
  description?: string;
  basis: LocalTaxBasis;
  resident_rate: number;
  non_resident_rate: number;
  unknown_residence_default: "resident" | "non_resident";
  api_credit_substrings?: string[];
  reference_url?: string;
  notes?: string;
};

type LocalTaxRegistryFile = {
  version: number;
  entries: LocalTaxRegistryEntry[];
};

const registry = rawRegistry as LocalTaxRegistryFile;

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\./g, "").trim().replace(/\s+/g, " ");
}

function matchingEntry(workCityLabel: string): LocalTaxRegistryEntry | undefined {
  const workLoc = guessLocalityFromLabel(workCityLabel);
  const workSt = guessStateFromLabel(workCityLabel);
  if (!workLoc || !workSt) return undefined;

  return registry.entries.find(
    (e) =>
      normalizeKey(e.locality) === normalizeKey(workLoc) &&
      e.state.trim().toUpperCase() === workSt.toUpperCase(),
  );
}

export function applyLocalTaxRegistrySupplement(
  tax: PayrollTaxAnnualEstimate,
  params: {
    workCityLabel: string;
    residenceLabel?: string;
    taxableAnnual: number;
    grossAnnual: number;
    lookup?: PayrollTaxLookupResponse;
  },
): PayrollTaxAnnualEstimate {
  const entry = matchingEntry(params.workCityLabel);
  if (!entry) return tax;

  const gross = Math.max(0, params.grossAnnual);
  const taxable = Math.max(0, params.taxableAnnual);

  const basisAnnual =
    entry.basis === "gross_wages"
      ? gross
      : entry.basis === "taxable_wages"
        ? taxable
        : 0;

  const workLoc = guessLocalityFromLabel(params.workCityLabel);
  if (!workLoc) return tax;

  const resLoc = params.residenceLabel ? guessLocalityFromLabel(params.residenceLabel) : undefined;
  const resSt = params.residenceLabel ? guessStateFromLabel(params.residenceLabel) : undefined;

  let useResident = false;
  if (resLoc && resSt) {
    useResident =
      normalizeKey(resLoc) === normalizeKey(entry.locality) &&
      resSt.toUpperCase() === entry.state.trim().toUpperCase();
  } else {
    useResident = entry.unknown_residence_default === "resident";
  }

  const rate = useResident ? entry.resident_rate : entry.non_resident_rate;
  const registryAnnual = basisAnnual * rate;

  const apiCredit = apiIncomeTaxAnnualForWorkLocality(
    params.lookup,
    workLoc,
    params.taxableAnnual,
    params.grossAnnual,
    entry.api_credit_substrings,
  );

  const deltaAnnual = Math.max(0, registryAnnual - apiCredit);
  if (deltaAnnual <= 0) return tax;

  const newNetAnnual = tax.netAnnual - deltaAnnual;
  const newMonthlyLocal = tax.monthlyLocal + deltaAnnual / 12;
  const newEffectiveRate = gross > 0 ? tax.effectiveRate + deltaAnnual / gross : tax.effectiveRate;

  return {
    ...tax,
    netAnnual: Math.max(0, newNetAnnual),
    monthlyLocal: newMonthlyLocal,
    effectiveRate: newEffectiveRate,
  };
}
