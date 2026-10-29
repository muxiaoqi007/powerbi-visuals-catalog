import { useEffect } from "react";
import type { Visual } from "../lib/catalog";
import { formatDate, safeUrl } from "../lib/catalog";
import { VisualIcon } from "./CatalogCard";

type Props = {
  visual: Visual;
  onClose: () => void;
};

export function DetailPanel({ visual, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const links = [
    { label: "商店详情", url: safeUrl(visual.marketplaceUrl) },
    { label: "PBIX 示例", url: safeUrl(visual.pbixUrl) },
    { label: "PBIVIZ 文件", url: safeUrl(visual.pbivizUrl) },
    { label: "支持页面", url: safeUrl(visual.supportUrl) },
    { label: "隐私政策", url: safeUrl(visual.privacyUrl) },
    { label: "授权条款", url: safeUrl(visual.legalTermsUrl) },
  ].filter((link) => link.url);

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <section
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${visual.name} 详情`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="close" onClick={onClose} aria-label="关闭详情">×</button>
        <div className="detail-head">
          <VisualIcon visual={visual} size="detail" />
          <div>
            <h2>{visual.name}</h2>
            <p className="detail-publisher">{visual.publisher ?? "发布者未知"}</p>
          </div>
        </div>
        <div className="detail-badges">
          <span className={`tag ${visual.pricing === "免费" ? "free" : "paid"}`}>{visual.pricing}</span>
          {visual.certified && <span className="tag certified">微软认证</span>}
          {visual.categories.map((category) => (
            <span className="tag" key={category}>{category}</span>
          ))}
        </div>
        <dl className="detail-meta">
          <div><dt>版本</dt><dd>{visual.version ?? "未知"}</dd></div>
          <div><dt>发布</dt><dd>{formatDate(visual.releaseDate)}</dd></div>
          <div><dt>评分</dt><dd>{visual.rating > 0 ? `★ ${visual.rating.toFixed(1)}` : "暂无"}</dd></div>
          <div><dt>评分数</dt><dd>{visual.ratingCount}</dd></div>
        </dl>
        <p className="detail-description">{visual.description || visual.summary || "来源未提供描述。"}</p>
        {links.length > 0 && (
          <div className="detail-actions">
            {links.map((link, index) => (
              <a
                key={link.label}
                href={link.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className={index === 0 ? "primary" : ""}
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
        <small>
          名称与描述保留发布者原文。下载、价格和授权以来源页面为准；本站不托管第三方图表文件。
        </small>
      </section>
    </div>
  );
}
