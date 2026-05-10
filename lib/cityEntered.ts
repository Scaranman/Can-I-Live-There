import type { CityInput } from "./types";

/** True once the user has set that row’s work city (Places pick or manual label). */
export function isCityColumnEntered(city: CityInput, placesOk: boolean | null): boolean {
  if (placesOk === false) return city.label.trim().length > 0;
  return city.placeId.trim().length > 0;
}

export function filterEnteredCityInputs(cities: CityInput[], placesOk: boolean | null): CityInput[] {
  return cities.filter((c) => isCityColumnEntered(c, placesOk));
}

/** Server-side: drop blank city slots when Places vs manual mode is unknown. */
export function filterCitiesWithAnyLocation(cities: CityInput[]): CityInput[] {
  return cities.filter((c) => c.placeId.trim().length > 0 || c.label.trim().length > 0);
}
