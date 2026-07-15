/**
 * Local city wage-tax supplements from data/local-tax-rates.json.
 * When a registry entry matches the work city, its local tax replaces the stub locality amount.
 */
import rawRegistry from "@/data/local-tax-rates.json";
import { marginalBracketTaxAnnual, type PayrollTaxAnnualEstimate } from "./taxMath";
import type { FilingStatus } from "./types";
import { guessLocalityFromLabel, guessStateFromLabel } from "./taxStub";

export type LocalTaxBasis = "taxable_wages" | "gross_wages";

/** Ordered marginal slices on registry basis (`from` inclusive floor per row; `to` null = no upper cap). */
export type LocalTaxMarginalBracket = { from: number; to?: number | null; rate: number };

export type LocalTaxRegistryEntry = {
  id: string;
  locality: string;
  state: string;
  description?: string;
  basis: LocalTaxBasis;
  resident_rate: number;
  non_resident_rate: number;
  unknown_residence_default: "resident" | "non_resident";
  /** Alternate Places locality names that should match this entry (e.g. NYC → New York). */
  locality_aliases?: string[];
  /**
   * When set for the user’s filing status and residence maps to resident, replace flat `resident_rate`
   * with marginal integration over `basisAnnual`. Non-residents still use flat `non_resident_rate` unless
   * `marginal_brackets_non_resident_by_filing` is added later.
   */
  marginal_brackets_by_filing?: Partial<Record<FilingStatus, LocalTaxMarginalBracket[]>>;
  /** @deprecated No longer used — kept for JSON compatibility with older registry entries. */
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

function localityMatches(entry: LocalTaxRegistryEntry, locality: string): boolean {
  const key = normalizeKey(locality);
  if (normalizeKey(entry.locality) === key) return true;
  return (entry.locality_aliases ?? []).some((a) => normalizeKey(a) === key);
}

function matchingEntry(workCityLabel: string): LocalTaxRegistryEntry | undefined {
  const workLoc = guessLocalityFromLabel(workCityLabel);
  const workSt = guessStateFromLabel(workCityLabel);
  if (!workLoc || !workSt) return undefined;

  return registry.entries.find(
    (e) =>
      localityMatches(e, workLoc) && e.state.trim().toUpperCase() === workSt.toUpperCase(),
  );
}

export function applyLocalTaxRegistrySupplement(
  tax: PayrollTaxAnnualEstimate,
  params: {
    workCityLabel: string;
    residenceLabel?: string;
    taxableAnnual: number;
    grossAnnual: number;
    filingStatus: FilingStatus;
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

  const resLoc = params.residenceLabel ? guessLocalityFromLabel(params.residenceLabel) : undefined;
  const resSt = params.residenceLabel ? guessStateFromLabel(params.residenceLabel) : undefined;

  let useResident = false;
  if (resLoc && resSt) {
    useResident =
      localityMatches(entry, resLoc) &&
      resSt.toUpperCase() === entry.state.trim().toUpperCase();
  } else {
    useResident = entry.unknown_residence_default === "resident";
  }

  const rate = useResident ? entry.resident_rate : entry.non_resident_rate;
  const marginal =
    useResident &&
    entry.marginal_brackets_by_filing &&
    entry.marginal_brackets_by_filing[params.filingStatus]?.length
      ? entry.marginal_brackets_by_filing[params.filingStatus]
      : undefined;
  const registryAnnual =
    marginal && marginal.length > 0
      ? marginalBracketTaxAnnual(basisAnnual, marginal)
      : basisAnnual * rate;

  const previousLocalAnnual = tax.monthlyLocal * 12;
  const deltaAnnual = registryAnnual - previousLocalAnnual;
  if (Math.abs(deltaAnnual) < 1e-9) return tax;

  const newNetAnnual = tax.netAnnual - deltaAnnual;
  const newMonthlyLocal = registryAnnual / 12;
  const newEffectiveRate = gross > 0 ? tax.effectiveRate + deltaAnnual / gross : tax.effectiveRate;

  return {
    ...tax,
    netAnnual: Math.max(0, newNetAnnual),
    monthlyLocal: newMonthlyLocal,
    effectiveRate: Math.max(0, newEffectiveRate),
  };
}
