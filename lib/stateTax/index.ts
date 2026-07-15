/**
 * Registry of per-state local wage income tax estimators (TY 2026).
 * One module per US state under lib/stateTax/*.ts.
 */
import { estimateAlabamaStateTax } from "./al";
import { estimateAlaskaStateTax } from "./ak";
import { estimateArizonaStateTax } from "./az";
import { estimateArkansasStateTax } from "./ar";
import { estimateCaliforniaStateTax } from "./ca";
import { estimateColoradoStateTax } from "./co";
import { estimateConnecticutStateTax } from "./ct";
import { estimateDelawareStateTax } from "./de";
import { estimateFloridaStateTax } from "./fl";
import { estimateGeorgiaStateTax } from "./ga";
import { estimateHawaiiStateTax } from "./hi";
import { estimateIdahoStateTax } from "./id";
import { estimateIllinoisStateTax } from "./il";
import { estimateIndianaStateTax } from "./in";
import { estimateIowaStateTax } from "./ia";
import { estimateKansasStateTax } from "./ks";
import { estimateKentuckyStateTax } from "./ky";
import { estimateLouisianaStateTax } from "./la";
import { estimateMaineStateTax } from "./me";
import { estimateMarylandStateTax } from "./md";
import { estimateMassachusettsStateTax } from "./ma";
import { estimateMichiganStateTax } from "./mi";
import { estimateMinnesotaStateTax } from "./mn";
import { estimateMississippiStateTax } from "./ms";
import { estimateMissouriStateTax } from "./mo";
import { estimateMontanaStateTax } from "./mt";
import { estimateNebraskaStateTax } from "./ne";
import { estimateNevadaStateTax } from "./nv";
import { estimateNewHampshireStateTax } from "./nh";
import { estimateNewJerseyStateTax } from "./nj";
import { estimateNewMexicoStateTax } from "./nm";
import { estimateNewYorkStateTax } from "./ny";
import { estimateNorthCarolinaStateTax } from "./nc";
import { estimateNorthDakotaStateTax } from "./nd";
import { estimateOhioStateTax } from "./oh";
import { estimateOklahomaStateTax } from "./ok";
import { estimateOregonStateTax } from "./or";
import { estimatePennsylvaniaStateTax } from "./pa";
import { estimateRhodeIslandStateTax } from "./ri";
import { estimateSouthCarolinaStateTax } from "./sc";
import { estimateSouthDakotaStateTax } from "./sd";
import { estimateTennesseeStateTax } from "./tn";
import { estimateTexasStateTax } from "./tx";
import { estimateUtahStateTax } from "./ut";
import { estimateVermontStateTax } from "./vt";
import { estimateVirginiaStateTax } from "./va";
import { estimateWashingtonStateTax } from "./wa";
import { estimateWestVirginiaStateTax } from "./wv";
import { estimateWisconsinStateTax } from "./wi";
import { estimateWyomingStateTax } from "./wy";
import type { StateTaxAnnualParts, StateTaxEstimateInput, StateTaxEstimator } from "./types";
import { zeroStateTax } from "./helpers";

export type { StateTaxAnnualParts, StateTaxEstimateInput, StateTaxEstimator, StateTaxBracket } from "./types";
export { wagesAfterPretax } from "./helpers";

export const STATE_TAX_ESTIMATORS: Record<string, StateTaxEstimator> = {
  AL: estimateAlabamaStateTax,
  AK: estimateAlaskaStateTax,
  AZ: estimateArizonaStateTax,
  AR: estimateArkansasStateTax,
  CA: estimateCaliforniaStateTax,
  CO: estimateColoradoStateTax,
  CT: estimateConnecticutStateTax,
  DE: estimateDelawareStateTax,
  FL: estimateFloridaStateTax,
  GA: estimateGeorgiaStateTax,
  HI: estimateHawaiiStateTax,
  ID: estimateIdahoStateTax,
  IL: estimateIllinoisStateTax,
  IN: estimateIndianaStateTax,
  IA: estimateIowaStateTax,
  KS: estimateKansasStateTax,
  KY: estimateKentuckyStateTax,
  LA: estimateLouisianaStateTax,
  ME: estimateMaineStateTax,
  MD: estimateMarylandStateTax,
  MA: estimateMassachusettsStateTax,
  MI: estimateMichiganStateTax,
  MN: estimateMinnesotaStateTax,
  MS: estimateMississippiStateTax,
  MO: estimateMissouriStateTax,
  MT: estimateMontanaStateTax,
  NE: estimateNebraskaStateTax,
  NV: estimateNevadaStateTax,
  NH: estimateNewHampshireStateTax,
  NJ: estimateNewJerseyStateTax,
  NM: estimateNewMexicoStateTax,
  NY: estimateNewYorkStateTax,
  NC: estimateNorthCarolinaStateTax,
  ND: estimateNorthDakotaStateTax,
  OH: estimateOhioStateTax,
  OK: estimateOklahomaStateTax,
  OR: estimateOregonStateTax,
  PA: estimatePennsylvaniaStateTax,
  RI: estimateRhodeIslandStateTax,
  SC: estimateSouthCarolinaStateTax,
  SD: estimateSouthDakotaStateTax,
  TN: estimateTennesseeStateTax,
  TX: estimateTexasStateTax,
  UT: estimateUtahStateTax,
  VT: estimateVermontStateTax,
  VA: estimateVirginiaStateTax,
  WA: estimateWashingtonStateTax,
  WV: estimateWestVirginiaStateTax,
  WI: estimateWisconsinStateTax,
  WY: estimateWyomingStateTax,
};

export const STATE_TAX_YEAR = 2026;

export function estimateStateTaxesAnnual(
  stateCode: string | undefined,
  params: StateTaxEstimateInput,
): StateTaxAnnualParts {
  const code = stateCode?.trim().toUpperCase();
  if (!code) {
    return zeroStateTax("??", "No work state parsed from city label; state tax treated as $0.");
  }
  const estimator = STATE_TAX_ESTIMATORS[code];
  if (!estimator) {
    return zeroStateTax(code, `No local estimator registered for ${code}.`);
  }
  return estimator(params);
}
