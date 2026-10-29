export type Visual = {
  id: string;
  name: string;
  publisher: string | null;
  summary: string;
  categories: string[];
  keywords: string[];
  pricing: "免费" | "付费";
  certified: boolean;
  rating: number;
  ratingCount: number;
  popularity: number;
  releaseDate: string | null;
  version: string | null;
  iconUrl: string | null;
  marketplaceUrl: string | null;
  hasPbix: boolean;
  detail: string;
};

export type VisualDetail = {
  description: string | null;
  keywords: string[];
  tags: string[];
  pbivizUrl: string | null;
  pbixUrl: string | null;
  legalTermsUrl: string | null;
  privacyUrl: string | null;
  supportUrl: string | null;
};

export type CatalogMeta = {
  generatedAt: string;
  source: string;
  sourceUrl: string;
  marketplaceUrl: string;
  total: number;
  certified: number;
  free: number;
  skipped: number;
  categories: Record<string, number>;
};

export type Catalog = {
  meta: CatalogMeta;
  visuals: Visual[];
};

export type SortKey = "recommended" | "release" | "rating" | "name";

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: "推荐优先",
  release: "最新发布",
  rating: "评分最高",
  name: "名称排序",
};

export type FilterState = {
  query: string;
  category: string;
  pricing: "全部" | "免费" | "付费";
  certifiedOnly: boolean;
  pbixOnly: boolean;
  sort: SortKey;
};

export const EMPTY_FILTERS: FilterState = {
  query: "",
  category: "全部",
  pricing: "全部",
  certifiedOnly: false,
  pbixOnly: false,
  sort: "recommended",
};

export function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function matchesQuery(visual: Visual, needle: string) {
  if (!needle) return true;
  const haystack = [
    visual.name,
    visual.publisher ?? "",
    visual.summary,
    visual.keywords.join(" "),
    visual.categories.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function filterVisuals(visuals: Visual[], filters: FilterState): Visual[] {
  const needle = filters.query.trim().toLowerCase();
  const filtered = visuals.filter((visual) => {
    if (!matchesQuery(visual, needle)) return false;
    if (filters.category !== "全部" && !visual.categories.includes(filters.category)) return false;
    if (filters.pricing !== "全部" && visual.pricing !== filters.pricing) return false;
    if (filters.certifiedOnly && !visual.certified) return false;
    if (filters.pbixOnly && !visual.hasPbix) return false;
    return true;
  });
  return sortVisuals(filtered, filters.sort);
}

export function sortVisuals(visuals: Visual[], sort: SortKey): Visual[] {
  const sorted = [...visuals];
  if (sort === "release") {
    sorted.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "") || b.popularity - a.popularity);
  } else if (sort === "rating") {
    sorted.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
  } else if (sort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "en"));
  } else {
    sorted.sort((a, b) => b.popularity - a.popularity || b.rating - a.rating);
  }
  return sorted;
}

export function formatDate(value: string | null): string {
  if (!value) return "未知";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
}
