import { useCallback, useEffect, useMemo, useState } from "react";
import { CatalogCard } from "./components/CatalogCard";
import { DetailPanel } from "./components/DetailPanel";
import {
  EMPTY_FILTERS,
  SORT_LABELS,
  filterVisuals,
  formatDate,
  type Catalog,
  type FilterState,
  type SortKey,
  type Visual,
} from "./lib/catalog";

const REPO_URL = "https://github.com/muxiaoqi007/powerbi-visuals-catalog";
const ACTIONS_URL = `${REPO_URL}/actions/workflows/sync-data.yml`;
const PAGE_SIZE = 36;
const FAVORITES_KEY = "pbi-catalog-favorites";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; catalog: Catalog }
  | { status: "error"; message: string };

function readFavorites(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

async function loadCatalog(): Promise<Catalog> {
  const endpoints = ["/api/catalog", `${import.meta.env.BASE_URL}data/catalog.json`];
  let lastError = "目录数据加载失败";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: "no-cache" });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("application/json")) continue;
      const catalog = (await response.json()) as Catalog;
      if (!Array.isArray(catalog.visuals) || catalog.visuals.length === 0) {
        lastError = "目录数据为空";
        continue;
      }
      return catalog;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Visual | null>(null);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const catalog = await loadCatalog();
      setState({ status: "ready", catalog });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "目录数据加载失败" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const catalog = state.status === "ready" ? state.catalog : null;
  const results = useMemo(() => {
    if (!catalog) return [];
    const base = favoritesOnly
      ? catalog.visuals.filter((visual) => favorites.includes(visual.id))
      : catalog.visuals;
    return filterVisuals(base, filters);
  }, [catalog, favorites, favoritesOnly, filters]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filters, favoritesOnly]);

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setFavoritesOnly(false);
  }

  const categoryEntries = catalog
    ? Object.entries(catalog.meta.categories).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="site-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">图</span>
          <span>图表集<small>POWER BI VISUALS</small></span>
        </div>
        <div className="nav-label">浏览</div>
        <button
          type="button"
          className={`nav-item ${filters.category === "全部" && !favoritesOnly ? "active" : ""}`}
          onClick={() => {
            setFavoritesOnly(false);
            update("category", "全部");
            setMobileNav(false);
          }}
        >
          全部图表 <span>{catalog?.meta.total ?? "—"}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${favoritesOnly ? "active" : ""}`}
          onClick={() => {
            setFavoritesOnly(true);
            setMobileNav(false);
          }}
        >
          ☆ 我的收藏 <span>{favorites.length}</span>
        </button>
        <div className="nav-label">分类</div>
        {categoryEntries.map(([category, count]) => (
          <button
            key={category}
            type="button"
            className={`nav-item ${filters.category === category && !favoritesOnly ? "active" : ""}`}
            onClick={() => {
              setFavoritesOnly(false);
              update("category", category);
              setMobileNav(false);
            }}
          >
            {category} <span>{count}</span>
          </button>
        ))}
        <div className="source-status">
          <span className="status-dot" />
          数据来源：DataChant
          <br />
          微软 Power BI 图表目录
          <br />
          {catalog ? `更新于 ${formatDate(catalog.meta.generatedAt)}` : "正在读取目录…"}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            aria-label="打开导航"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav((value) => !value)}
          >
            ☰
          </button>
          <span>资源目录　/　{favoritesOnly ? "我的收藏" : filters.category}</span>
          <a className="update-link" href={ACTIONS_URL} target="_blank" rel="noreferrer">
            ↻ 手动更新数据
          </a>
        </header>

        <section className="hero">
          <div>
            <div className="eyebrow">POWER BI 可视化资源库</div>
            <h1>让每一张图表，都好找一点。</h1>
            <p>收录官方商店图表，支持中文分类与关键词检索，直达商店、示例和原始下载。</p>
          </div>
          <div className="total">
            <strong>{catalog?.meta.total.toLocaleString("zh-CN") ?? "—"}</strong>
            个可视化资源
          </div>
        </section>

        {catalog && (
          <section className="stats" aria-label="目录概况">
            <span><b>{catalog.meta.certified.toLocaleString("zh-CN")}</b> 微软认证</span>
            <span><b>{catalog.meta.free.toLocaleString("zh-CN")}</b> 免费图表</span>
            <span><b>{categoryEntries.length}</b> 个中文分类</span>
            <span className="stats-updated">数据更新于 {formatDate(catalog.meta.generatedAt)}</span>
          </section>
        )}

        <section className="controls">
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={filters.query}
              onChange={(event) => update("query", event.target.value)}
              placeholder="搜索图表名称、发布者、关键词"
              aria-label="搜索图表"
            />
          </label>
          <select
            value={filters.pricing}
            onChange={(event) => update("pricing", event.target.value as FilterState["pricing"])}
            aria-label="价格筛选"
          >
            <option value="全部">全部价格</option>
            <option value="免费">免费</option>
            <option value="付费">付费</option>
          </select>
          <select
            value={filters.category}
            onChange={(event) => update("category", event.target.value)}
            aria-label="分类筛选"
          >
            <option value="全部">全部分类</option>
            {categoryEntries.map(([category]) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={filters.sort}
            onChange={(event) => update("sort", event.target.value as SortKey)}
            aria-label="排序方式"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </section>

        <section className="filters">
          <div className="pills">
            <button
              type="button"
              className={!filters.certifiedOnly && !filters.pbixOnly ? "selected" : ""}
              onClick={() => {
                update("certifiedOnly", false);
                update("pbixOnly", false);
              }}
            >
              全部
            </button>
            <button
              type="button"
              className={filters.certifiedOnly ? "selected" : ""}
              aria-pressed={filters.certifiedOnly}
              onClick={() => update("certifiedOnly", !filters.certifiedOnly)}
            >
              微软认证
            </button>
            <button
              type="button"
              className={filters.pbixOnly ? "selected" : ""}
              aria-pressed={filters.pbixOnly}
              onClick={() => update("pbixOnly", !filters.pbixOnly)}
            >
              含 PBIX 示例
            </button>
          </div>
          <span className="sort">
            {state.status === "ready" ? `${results.length.toLocaleString("zh-CN")} 个结果` : ""}
          </span>
        </section>

        {state.status === "loading" && (
          <div className="state-panel" role="status">
            <div className="spinner" aria-hidden="true" />
            <strong>正在加载图表目录…</strong>
            <span>首次加载需要下载约 3 MB 数据。</span>
          </div>
        )}

        {state.status === "error" && (
          <div className="state-panel" role="alert">
            <strong>目录加载失败</strong>
            <span>{state.message}</span>
            <div className="state-actions">
              <button type="button" onClick={() => void load()}>重新加载</button>
              <a href={REPO_URL} target="_blank" rel="noreferrer">查看数据源</a>
            </div>
          </div>
        )}

        {state.status === "ready" && (
          <>
            <section className="catalog-grid" aria-label="图表列表">
              {results.slice(0, visible).map((visual) => (
                <CatalogCard
                  key={visual.id}
                  visual={visual}
                  favorite={favorites.includes(visual.id)}
                  onToggleFavorite={toggleFavorite}
                  onOpen={setSelected}
                />
              ))}
            </section>

            {results.length === 0 && (
              <div className="state-panel">
                <strong>{favoritesOnly ? "还没有收藏" : "没有找到匹配图表"}</strong>
                <span>
                  {favoritesOnly
                    ? "在图表卡片右下角点 ☆ 收藏，之后可以从左侧快速回到这里。"
                    : "试试更短的关键词，或用英文图表名称搜索。"}
                </span>
                <div className="state-actions">
                  <button type="button" onClick={resetFilters}>清除筛选</button>
                </div>
              </div>
            )}

            {visible < results.length && (
              <div className="more-row">
                <button type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                  加载更多（还有 {(results.length - visible).toLocaleString("zh-CN")} 个）
                </button>
              </div>
            )}
          </>
        )}

        <footer>
          图表名称与描述保留发布者原文 · 数据来自 DataChant 整理的 Microsoft Power BI 图表目录，由 GitHub Actions 定时同步
          {" · "}
          <a href={catalog?.meta.sourceUrl ?? REPO_URL} target="_blank" rel="noreferrer">查看数据来源</a>
          {" · "}
          <a href="https://marketplace.microsoft.com/en-US/search/products?product=power-bi-visuals" target="_blank" rel="noreferrer">官方商店</a>
        </footer>
      </main>

      {selected && <DetailPanel visual={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
