import { useState } from "react";
import type { Visual } from "../lib/catalog";
import { safeUrl } from "../lib/catalog";

export function VisualIcon({ visual, size = "card" }: { visual: Visual; size?: "card" | "detail" }) {
  const [failed, setFailed] = useState(false);
  const icon = safeUrl(visual.iconUrl);
  if (!icon || failed) {
    return (
      <div className={`icon-fallback ${size}`} aria-hidden="true">
        {visual.name.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      className={`visual-icon ${size}`}
      src={icon}
      alt={`${visual.name} 图标`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

type Props = {
  visual: Visual;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (visual: Visual) => void;
};

export function CatalogCard({ visual, favorite, onToggleFavorite, onOpen }: Props) {
  const marketplace = safeUrl(visual.marketplaceUrl);
  const pbix = safeUrl(visual.pbixUrl);

  return (
    <article className="visual-card">
      <button
        type="button"
        className="card-main"
        onClick={() => onOpen(visual)}
        aria-label={`查看 ${visual.name} 详情`}
      >
        <div className="card-head">
          <VisualIcon visual={visual} />
          <div className="card-title">
            <h2>{visual.name}</h2>
            <span>{visual.publisher ?? "发布者未知"}</span>
          </div>
        </div>
        <p className="card-summary">{visual.summary || "暂无简介，打开详情查看来源信息。"}</p>
        <div className="card-tags">
          {visual.certified && <span className="tag certified">微软认证</span>}
          <span className={`tag ${visual.pricing === "免费" ? "free" : "paid"}`}>{visual.pricing}</span>
          {visual.categories.slice(0, 2).map((category) => (
            <span className="tag" key={category}>{category}</span>
          ))}
        </div>
      </button>
      <div className="card-foot">
        <span className="rating">
          {visual.rating > 0 ? `★ ${visual.rating.toFixed(1)}（${visual.ratingCount}）` : "暂无评分"}
          {visual.version ? `　v${visual.version}` : ""}
        </span>
        <span className="card-actions">
          {marketplace && (
            <a href={marketplace} target="_blank" rel="noreferrer">商店 ↗</a>
          )}
          {pbix && (
            <a href={pbix} target="_blank" rel="noreferrer">PBIX 示例 ↗</a>
          )}
          <button
            type="button"
            className={`star ${favorite ? "on" : ""}`}
            onClick={() => onToggleFavorite(visual.id)}
            aria-pressed={favorite}
            aria-label={favorite ? "取消收藏" : "收藏"}
          >
            {favorite ? "★" : "☆"}
          </button>
        </span>
      </div>
    </article>
  );
}
