/**
 * Registry of Canadian provincial/territorial wage tax estimators (TY 2026).
 */
import { estimateAlbertaProvinceTax } from "./ab";
import { estimateBritishColumbiaProvinceTax } from "./bc";
import { estimateManitobaProvinceTax } from "./mb";
import { estimateNewBrunswickProvinceTax } from "./nb";
import { estimateNewfoundlandandLabradorProvinceTax } from "./nl";
import { estimateNovaScotiaProvinceTax } from "./ns";
import { estimateNorthwestTerritoriesProvinceTax } from "./nt";
import { estimateNunavutProvinceTax } from "./nu";
import { estimateOntarioProvinceTax } from "./on";
import { estimatePrinceEdwardIslandProvinceTax } from "./pe";
import { estimateQuebecProvinceTax } from "./qc";
import { estimateSaskatchewanProvinceTax } from "./sk";
import { estimateYukonProvinceTax } from "./yt";
import type {
  CanadaProvinceTaxAnnualParts,
  CanadaProvinceTaxEstimateInput,
  CanadaProvinceTaxEstimator,
} from "./types";

export type {
  CanadaProvinceTaxAnnualParts,
  CanadaProvinceTaxEstimateInput,
  CanadaProvinceTaxEstimator,
  CanadaProvinceBracket,
} from "./types";

export const CANADA_PROVINCE_TAX_ESTIMATORS: Record<string, CanadaProvinceTaxEstimator> = {
  AB: estimateAlbertaProvinceTax,
  BC: estimateBritishColumbiaProvinceTax,
  MB: estimateManitobaProvinceTax,
  NB: estimateNewBrunswickProvinceTax,
  NL: estimateNewfoundlandandLabradorProvinceTax,
  NS: estimateNovaScotiaProvinceTax,
  NT: estimateNorthwestTerritoriesProvinceTax,
  NU: estimateNunavutProvinceTax,
  ON: estimateOntarioProvinceTax,
  PE: estimatePrinceEdwardIslandProvinceTax,
  QC: estimateQuebecProvinceTax,
  SK: estimateSaskatchewanProvinceTax,
  YT: estimateYukonProvinceTax,
};

export const CANADA_PROVINCE_CODES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"] as const;

export function estimateCanadaProvinceTaxesAnnual(
  provinceCode: string | undefined,
  params: CanadaProvinceTaxEstimateInput,
): CanadaProvinceTaxAnnualParts {
  const code = provinceCode?.trim().toUpperCase() || "ON";
  const estimator = CANADA_PROVINCE_TAX_ESTIMATORS[code] ?? CANADA_PROVINCE_TAX_ESTIMATORS.ON;
  return estimator(params);
}
