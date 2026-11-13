import { copy } from "./copy";

export type Place = {
  label: string;
  lat: number | null;
  lng: number | null;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type PhotonFeature = {
  properties?: {
    name?: unknown;
    state?: unknown;
    country?: unknown;
  };
  geometry?: {
    coordinates?: unknown;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

const EARTH_RADIUS_KM = 6371;
const KILOMETRES_PER_DEGREE = 111.32;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: "6",
    lang: "en",
    osm_tag: "place",
  });
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!response.ok) throw new Error(`Place search failed with status ${response.status}`);

  const data = (await response.json()) as PhotonResponse;
  const labels = new Set<string>();
  const places: Place[] = [];

  for (const feature of data.features ?? []) {
    const parts = [feature.properties?.name, feature.properties?.state, feature.properties?.country]
      .map(text)
      .filter(Boolean);
    const label = [...new Set(parts)].join(", ");
    if (!label || labels.has(label)) continue;

    const coordinates = feature.geometry?.coordinates;
    const lng =
      Array.isArray(coordinates) && typeof coordinates[0] === "number" ? coordinates[0] : null;
    const lat =
      Array.isArray(coordinates) && typeof coordinates[1] === "number" ? coordinates[1] : null;
    labels.add(label);
    places.push({ label, lat, lng });
  }

  return places;
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const latDelta = radians(b.lat - a.lat);
  const lngDelta = radians(b.lng - a.lng);
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function boundingBox(lat: number, lng: number, km: number) {
  const latDelta = km / KILOMETRES_PER_DEGREE;
  const lngDelta = km / (KILOMETRES_PER_DEGREE * Math.max(Math.cos(radians(lat)), 0.01));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function formatKm(km: number): string {
  if (km < 1) return copy.distance.lessThan;
  return `${Math.round(km)} ${copy.distance.nearby}`;
}
