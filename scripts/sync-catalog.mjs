import { mkdir, readFile, writeFile } from "node:fs/promises";

const SOURCE_URL =
  "https://raw.githubusercontent.com/DataChant/PowerBI-Visuals-Marketplace/main/Custom%20Visuals.csv";
const OUTPUT = "public/data/catalog.json";

const CATEGORY_LABELS = {
  "pbiv-comparison": "对比分析",
  KPI: "指标与 KPI",
  "pbiv-other": "其他图表",
  Infographics: "信息图",
  Time: "时间趋势",
  Filters: "筛选与切片",
  "pbiv-distribution": "分布",
  "pbiv-flow": "流程与流向",
  "pbiv-correlation": "相关性",
  "pbiv-part-to-whole": "构成占比",
  Maps: "地图与地理",
  Analytics: "分析",
  analytics: "分析",
  "pbiv-narratives": "数据叙事",
  "advanced-analytics": "高级分析",
  AdvancedAnalytics: "高级分析",
};

const CERTIFIED_TAGS = new Set(["PowerBICertified"]);
const MAX_DESCRIPTION = 1400;
const MAX_SUMMARY = 220;

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function stripHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|ul|ol|h\d|div)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, limit) {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const boundary = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, boundary > limit * 0.6 ? boundary : limit).trim()}…`;
}

function httpUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function parseRelease(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec((value || "").trim());
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseNumber(value) {
  const parsed = Number.parseFloat((value || "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeRecord(row) {
  const id = (row.ID || "").trim();
  const name = (row.Name || "").trim();
  if (!id || !name) return null;

  const rawCategories = (row.Categories || "")
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const categories = [...new Set(rawCategories.map((tag) => CATEGORY_LABELS[tag]).filter(Boolean))];
  const summarySource = stripHtml(row.Description || row["Long Summary"] || "");
  const fullSource = stripHtml(row["Description Full"] || row["Long Summary"] || row.Description || "");

  return {
    id,
    name,
    publisher: (row.Publisher || "").trim() || null,
    summary: truncate(summarySource, MAX_SUMMARY),
    description: fullSource ? truncate(fullSource, MAX_DESCRIPTION) : null,
    categories: categories.length > 0 ? categories : ["其他图表"],
    keywords: (row.Keywords || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12),
    pricing: (row["App Free Type"] || "").trim() === "Free" ? "免费" : "付费",
    certified: (row["Is Certified"] || "").trim() === "Certified",
    rating: Math.round(parseNumber(row["Average Rating"]) * 10) / 10,
    ratingCount: Math.round(parseNumber(row["# of Ratings"])),
    popularity: Math.round(parseNumber(row.Popularity) * 1000) / 1000,
    releaseDate: parseRelease(row["Release Date"]),
    version: (row.Version || "").trim() || null,
    iconUrl: httpUrl(row.Image),
    marketplaceUrl: httpUrl(row.Link),
    pbivizUrl: httpUrl(row.PBIVIZ),
    pbixUrl: httpUrl(row.PBIX),
    legalTermsUrl: httpUrl(row.LegalTerms),
    privacyUrl: httpUrl(row.PrivacyPolicyUrl),
    supportUrl: httpUrl(row.SupportLink),
    tags: rawCategories.filter((tag) => !CERTIFIED_TAGS.has(tag)),
  };
}

export function normalizeCsv(text) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV has no data rows");
  const header = rows[0].map((value) => value.trim());
  const records = [];
  let skipped = 0;
  for (const values of rows.slice(1)) {
    const row = Object.fromEntries(header.map((key, position) => [key, values[position] ?? ""]));
    const record = normalizeRecord(row);
    if (record) records.push(record);
    else skipped += 1;
  }
  records.sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || "") || b.popularity - a.popularity);
  return { records, skipped, columns: header };
}

async function fetchSource() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "powerbi-visuals-catalog-sync" },
    });
    if (!response.ok) throw new Error(`Source responded ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function readPreviousGeneratedAt(records) {
  try {
    const previous = JSON.parse(await readFile(OUTPUT, "utf8"));
    const sameVisuals = JSON.stringify(previous.visuals) === JSON.stringify(records);
    return sameVisuals && typeof previous.meta?.generatedAt === "string" ? previous.meta.generatedAt : null;
  } catch {
    return null;
  }
}

async function main() {
  const csv = await fetchSource();
  const { records, skipped, columns } = normalizeCsv(csv);
  if (records.length < 100) throw new Error(`Unsafe record count: ${records.length}`);
  const categories = {};
  for (const record of records) {
    for (const category of record.categories) categories[category] = (categories[category] || 0) + 1;
  }
  const previousGeneratedAt = await readPreviousGeneratedAt(records);
  const payload = {
    meta: {
      generatedAt: previousGeneratedAt ?? new Date().toISOString(),
      source: "DataChant / Microsoft Power BI Visuals Marketplace",
      sourceUrl: "https://github.com/DataChant/PowerBI-Visuals-Marketplace",
      marketplaceUrl: "https://marketplace.microsoft.com/en-US/search/products?product=power-bi-visuals",
      total: records.length,
      certified: records.filter((record) => record.certified).length,
      free: records.filter((record) => record.pricing === "免费").length,
      skipped,
      columns,
      categories,
    },
    visuals: records,
  };
  await mkdir("public/data", { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(payload));
  console.log(`Wrote ${records.length} records (${skipped} skipped) to ${OUTPUT}`);
  console.log("Categories:", categories);
}

if (process.argv[1]?.endsWith("sync-catalog.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
