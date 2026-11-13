import { type CategorySlug, categories } from "$lib/categories";
import { boundingBox, haversineKm, type Place } from "$lib/geo";
import { pb } from "$lib/pb";
import type { Skill } from "$lib/types";

export type CategoryFilter = CategorySlug | "all";

export type LocationFilter = {
  /** Radius in kilometres, or null for "anywhere". */
  km: number | null;
  /** The place to measure from; must carry coordinates for distance to apply. */
  place: Place | null;
};

export type SkillFilters = {
  q: string;
  category: CategoryFilter;
  location: LocationFilter;
  includeRemote: boolean;
};

export const defaultFilters: SkillFilters = {
  q: "",
  category: "all",
  location: { km: null, place: null },
  includeRemote: true,
};

const PARAM_Q = "q";
const PARAM_CATEGORY = "category";
const PARAM_NEAR = "near";
const PARAM_KM = "km";
const PARAM_PLACE = "place";
const PARAM_REMOTE = "remote";

const categorySlugs = new Set<string>(categories.map((category) => category.slug));

/** Read filter state out of a URL, e.g. `/skills?category=tech&near=51.5,-0.1&km=25`. */
export function parseSkillFilters(url: URL): SkillFilters {
  const params = url.searchParams;

  const rawCategory = params.get(PARAM_CATEGORY);
  const category: CategoryFilter =
    rawCategory && categorySlugs.has(rawCategory) ? (rawCategory as CategorySlug) : "all";

  const q = params.get(PARAM_Q) ?? "";

  let location: LocationFilter = { km: null, place: null };
  const kmRaw = params.get(PARAM_KM);
  const nearRaw = params.get(PARAM_NEAR);
  if (kmRaw && nearRaw) {
    const km = Number.parseInt(kmRaw, 10);
    const [lat, lng] = nearRaw.split(",").map(Number);
    if (Number.isFinite(km) && Number.isFinite(lat) && Number.isFinite(lng)) {
      location = {
        km,
        place: { label: params.get(PARAM_PLACE) ?? "", lat, lng },
      };
    }
  }

  const includeRemote = params.get(PARAM_REMOTE) !== "0";

  return { q, category, location, includeRemote };
}

/** Serialize filter state into URL query params (only set non-default values). */
export function skillFiltersToParams(filters: SkillFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set(PARAM_Q, filters.q.trim());
  if (filters.category !== "all") params.set(PARAM_CATEGORY, filters.category);

  const { km, place } = filters.location;
  if (km != null && place?.lat != null && place?.lng != null) {
    params.set(PARAM_NEAR, `${place.lat},${place.lng}`);
    params.set(PARAM_KM, String(km));
    if (place.label) params.set(PARAM_PLACE, place.label);
  }

  if (!filters.includeRemote) params.set(PARAM_REMOTE, "0");

  return params;
}

/** Build the PocketBase list filter for a set of skill filters. */
export function buildSkillListFilter(filters: SkillFilters): string {
  const parts: string[] = [];

  if (filters.category !== "all") {
    parts.push(pb.filter("category = {:category}", { category: filters.category }));
  }

  const q = filters.q.trim();
  if (q) {
    parts.push(
      `(${pb.filter("title ~ {:q}", { q })} || ${pb.filter("description ~ {:q}", { q })})`,
    );
  }

  const { km, place } = filters.location;
  if (km != null && place?.lat != null && place?.lng != null) {
    const box = boundingBox(place.lat, place.lng, km);
    const bbox = pb.filter(
      "user.lat >= {:minLat} && user.lat <= {:maxLat} && user.lng >= {:minLng} && user.lng <= {:maxLng}",
      { minLat: box.minLat, maxLat: box.maxLat, minLng: box.minLng, maxLng: box.maxLng },
    );
    // With remote-friendly included, anything that isn't strictly in-person
    // passes regardless of distance; otherwise only nearby in-person skills.
    parts.push(
      filters.includeRemote
        ? `(${bbox} || mode != "in_person")`
        : `(${bbox} && mode = "in_person")`,
    );
  }

  return parts.join(" && ");
}

export type LocatedSkill = Skill & { km: number | null };

/**
 * Attach an exact distance to each skill (relative to the active location) and
 * sort nearest-first, keeping strictly remote skills last. When no location is
 * set the input order (newest first) is preserved.
 */
export function withDistances(skills: Skill[], location: LocationFilter): LocatedSkill[] {
  const center =
    location.km != null && location.place?.lat != null && location.place?.lng != null
      ? { lat: location.place.lat, lng: location.place.lng }
      : null;

  const located: LocatedSkill[] = skills.map((skill) => {
    const user = skill.expand?.user;
    let km: number | null = null;
    if (center && user && user.lat != null && user.lng != null) {
      km = haversineKm(center, { lat: user.lat, lng: user.lng });
    }
    return { ...skill, km };
  });

  if (!center) return located;

  return located.sort((a, b) => {
    const aLast = a.mode === "remote" || a.km == null;
    const bLast = b.mode === "remote" || b.km == null;
    if (aLast !== bLast) return aLast ? 1 : -1;
    if (!aLast && !bLast && a.km != null && b.km != null && a.km !== b.km) {
      return a.km - b.km;
    }
    return (b.created ?? "").localeCompare(a.created ?? "");
  });
}
