(() => {
  "use strict";
  const data = window.RECOVERY_STATUS;
  if (!data || !window.BLOG_DATA) return;
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const external = (url, label) => {
    try {
      const target = new URL(url);
      if (!["http:", "https:"].includes(target.protocol)) throw new Error("scheme");
      const a = node("a", label);
      a.href = target.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      return a;
    } catch (_) {
      return node("span", label);
    }
  };
  const articleLink = post => {
    const a = node("a", post.title);
    a.href = `article.html?id=${encodeURIComponent(post.id)}`;
    return a;
  };
  const note = () => node("p", "原配图总数未知。这里统计的是有证据的图片引用，不是独特照片数。", "recovery-note");
  const proof = (parent, urls) => {
    if (!urls.length) {
      parent.append(node("span", "仅有本地导出/现存元数据，尚无完整原页证据。"));
      return;
    }
    urls.forEach((url, i) => {
      if (i) parent.append(document.createTextNode(" · "));
      parent.append(external(url, `来源 ${i + 1}`));
    });
  };
  const article = document.getElementById("article-recovery-status");
  if (article) {
    const id = new URLSearchParams(location.search).get("id");
    const status = data.posts[id];
    if (status) {
      article.hidden = false;
      article.append(node("h2", "当前恢复状态"));
      const facts = [`已保存 ${status.saved_image_resources} 个配图资源`];
      if (status.known_unrecovered_references) facts.push(`${status.known_unrecovered_references} 个已知图片引用待恢复`);
      if (status.damaged_resources) facts.push(`${status.damaged_resources} 个损坏资源已停止显示`);
      article.append(node("p", facts.join("；") + "。"));
      if (!status.known_unavailable_references) article.append(node("p", "未记录到其他待恢复引用，不代表原帖无缺图。"));
      if (status.text_status === "partial-preview") article.append(node("p", "正文状态：仅有不完整预览，全文尚待恢复。", "recovery-warning"));
      const completeness = status.completeness_evidence;
      if (completeness) {
        const evidence = node("p", completeness.description + " ", "recovery-warning");
        evidence.append(external(completeness.source_url, "2010 年新浪首页快照"));
        article.append(evidence);
      }
      const captioned = status.newly_recovered_images.find(image => image.caption);
      if (captioned) {
        const evidence = node("p", "2007-10-11 的新浪首页快照保留三张照片及逐图题注，正文停在句中。 ", "recovery-note");
        evidence.append(external(captioned.source_page, "2007 年新浪首页快照"));
        article.append(evidence);
      }
      if (status.identity_pending_image_paths?.length) {
        article.append(node("p", "两张照片来自同篇搜狐存档，与缺失新浪引用的逐图对应关系待核。", "recovery-warning"));
      }
      if (status.source_placeholders?.length) {
        const evidence = node("p", `${status.source_placeholders.length} 个搜狐图片地址曾返回通用占位图，网页保留来源记录。 `, "recovery-note");
        status.source_placeholders.forEach((item, index) => {
          if (index) evidence.append(document.createTextNode(" · "));
          evidence.append(external(item.source_page, "搜狐原帖存档"), document.createTextNode(" "), external(item.original_url, "图片引用"));
        });
        article.append(evidence);
      }
      if (status.contemporary_repost) {
        const repost = status.contemporary_repost;
        const evidence = node("p", `论坛资料组在 ${repost.posted_at} 转载了同文。游客快照中的附件区只保留权限提示。 `, "recovery-note");
        evidence.append(external(repost.snapshot_url, "查看同期论坛转载"));
        article.append(evidence);
      }
      if (status.text_status === "aliased-merged") {
        const p = node("p", undefined, "recovery-note");
        p.append(document.createTextNode("正文状态：经考证，本篇为博文《周末愉快！》的首发异名版本，正文全文完整保存在 "));
        const link = node("a", "《周末愉快！》", undefined);
        link.href = "article.html?id=2007-09-08-0019-343";
        p.append(link);
        p.append(document.createTextNode(" 中，不属于缺失缺口。"));
        article.append(p);
      }
      if (status.text_status === "unknown-empty") article.append(node("p", "正文或图片信息不足；不能仅凭导出分类认定原帖是纯图片帖。", "recovery-warning"));
      article.append(note());
      const displayRecovered = status.newly_recovered_images.filter(image => !status.display_duplicates?.[image.path]);
      const gallery = displayRecovered.filter(image => !image.caption);
      if (status.newly_recovered_images.length) {
        const label = document.getElementById("article-status");
        if (label && displayRecovered.length) label.append(document.createTextNode(` · 已按原图片引用补回 ${displayRecovered.length} 张`));
        const oldRecord = document.getElementById("supplemental-evidence");
        if (oldRecord) oldRecord.prepend(node("p", "以下保留旧批次统计；本轮补图已计入上方当前恢复状态。", "recovery-note"));
        if (gallery.length) article.append(node("p", "以下配图按本篇历史引用补回。历史来源区保留当批失败记录。"));
        gallery.forEach(image => {
          const figure = node("figure", undefined, "recovery-new-image");
          const img = node("img");
          img.src = image.path;
          img.alt = image.alt;
          img.width = image.width;
          img.height = image.height;
          img.loading = "lazy";
          const caption = node("figcaption", `${image.width}×${image.height}，保留取回的原字节，不放大生成细节。 `);
          caption.append(external(image.source_page, "原帖快照"));
          figure.append(img, caption);
          article.append(figure);
        });
      }
      const displayVersions = status.historical_version_images.filter(image => !status.display_duplicates?.[image.path]);
      if (displayVersions.length) {
        const label = document.getElementById("article-status");
        if (label) label.append(document.createTextNode(` · 已确认同篇后期配图 ${displayVersions.length} 张`));
        article.append(node("h3", `已确认的同篇博客配图（后期版本）：${displayVersions.length} 张`));
        article.append(node("p", "这些照片直接见于本篇博文的后期正文快照，确认为本篇博客配图，且当前正文配图区未显示。尚不能逐张核对它们与早期失图是否相同，因此早期缺图仍列为待恢复。", "recovery-warning"));
        displayVersions.forEach(image => {
          const figure = node("figure", undefined, "recovery-version-image");
          const img = node("img");
          img.src = image.path;
          img.alt = image.alt;
          img.width = image.width;
          img.height = image.height;
          img.loading = "lazy";
          const caption = node("figcaption", `${image.width}×${image.height} · ${image.snapshot_timestamp.slice(0, 4)} 年同篇快照配图 · 与早期失图是否同张未核实。 `);
          caption.append(external(image.source_page, "查看同篇快照"));
          figure.append(img, caption);
          article.append(figure);
        });
      }
      if (status.references.length) {
        const details = node("details");
        details.append(node("summary", `查看 ${status.known_unavailable_references} 个已知引用／资源缺口`));
        const list = node("ul");
        status.references.forEach(ref => {
          const li = node("li");
          li.append(node("span", `${ref.identity}${ref.damaged ? "（损坏）" : "（未取得）"} `, "recovery-identity"));
          if (ref.original_urls.length) li.append(external(ref.original_urls[0], "原图片引用"));
          list.append(li);
        });
        details.append(list);
        article.append(details);
      }
      const sources = node("p", undefined, "recovery-sources");
      proof(sources, status.source_urls);
      article.append(sources);
      const overview = node("a", "查看全站缺图与缺文清单 →");
      overview.href = "about.html#recovery-overview";
      article.append(overview);
      // Correct the old explanatory heuristic; author text and BLOG_DATA stay untouched.
      const post = window.BLOG_DATA.posts.find(p => p.id === id);
      if (post?.kind === "image-only" && !post.images?.length && status.text_status === "unknown-empty") {
        const lede = document.getElementById("article-lede");
        if (lede) lede.textContent = "导出或快照中的正文信息有限，以下保留已取得的资源；原帖配图总数未知。";
        const placeholder = document.querySelector("#article-body .missing-content p");
        if (placeholder) placeholder.textContent = "当前条目暂无可显示图片，原始图片数量及正文完整性仍待核实。";
        const sourceNote = document.getElementById("source-note-text");
        if (sourceNote) sourceNote.textContent = "本条目沿用原导出或历史快照的标题与日期；图片／空正文是整理分类，不证明原帖的全部内容组成。具体公开来源见恢复记录。";
      }
    }
  }

  const overview = document.getElementById("recovery-overview");
  if (!overview) return;
  const s = data.summary;
  overview.append(node("h2", "已知缺图与缺文清单"));
  overview.append(node("p", `目前保存 ${s.site_posts} 条内容、${s.saved_image_resources} 个图片展示项。已知 ${s.known_unrecovered_references} 条图片引用未恢复，另有 ${s.damaged_resources} 个损坏资源；去重后涉及 ${s.affected_posts} 篇。`));
  overview.append(node("p", `原博客数据保留 ${s.original_data_image_resources} 项，历史批次按图片引用补入 ${s.newly_recovered_resources} 项。合并展示 ${s.same_photo_copies_hidden} 个同画面副本，另剔除 ${s.source_placeholders_hidden} 个搜狐占位图，详情页保留对应来源。`));
  overview.append(node("h3", "四种图片证据，分别看"));
  overview.append(node("p", `原图已补回：${s.resolved_historical_references} 条已知历史图片引用已有可用文件。这里按引用计，不是本轮新增张数。`));
  overview.append(node("p", `已确认的同篇博客配图（后期版本）：${s.historical_version_resources} 张。博客归属有原正文快照证据；与早期失图是否同张未核实，不抵扣早期失图ID。`));
  if (s.identity_pending_resources) overview.append(node("p", "已取得同篇搜狐配图，新浪原图身份待核 " + s.identity_pending_resources + " 张。"));
  overview.append(node("p", `知道图片ID但尚无可用图：${s.known_unrecovered_references} 条引用；另有 ${s.damaged_resources} 个损坏资源。未取到不等于图从未存在。`));
  overview.append(node("p", "完全找不到可确认的图片ID：数量未知。只有题录或不完整正文时，不能据此推算缺了几张。"));
  overview.append(note());
  overview.append(node("p", "原博客历史总篇数、尚未发现的遗漏数未知。下方各项记录的是目前能核实的内容状态。", "recovery-warning"));
  const groups = [
    ["title_only", "仅有题录、尚无正文"],
    ["partial_preview", "站内仅有不完整预览"],
    ["completeness_unverified", "原篇完整性待核"],
    ["empty_without_images", "空正文／图片类暂无可显示图片"],
  ];
  for (const [key, label] of groups) {
    const rows = data.content_gaps[key];
    overview.append(node("h3", `${label}：${rows.length} 条`));
    const list = node("ul");
    rows.forEach(p => {
      const li = node("li");
      li.append(p.id ? articleLink(p) : node("span", p.title));
      li.append(document.createTextNode(`（${p.date || "发表日期未知"}${p.time ? " " + p.time : ""}） `));
      if (p.source_url) li.append(external(p.source_url, p.id ? "查看首页快照" : "快照题录证据"));
      if (key === "partial_preview" && p.source_urls?.length) li.append(external(p.source_urls[0], "查看首页快照"));
      if (p.original_url) {
        li.append(document.createTextNode(" · "));
        li.append(external(p.original_url, "原始博文URL"));
      }
      list.append(li);
    });
    overview.append(list);
  }
  const details = node("details");
  details.id = "recovery-post-list";
  details.append(node("summary", `展开 ${s.affected_posts} 篇已知图片缺口的逐篇清单`));
  const scroller = node("div", undefined, "recovery-table-scroll");
  scroller.tabIndex = 0;
  scroller.setAttribute("role", "region");
  scroller.setAttribute("aria-label", "逐篇图片缺口表，可横向滚动");
  const table = node("table");
  const header = node("tr");
  ["日期", "文章", "已保存资源", "待恢复引用", "损坏资源"].forEach(label => header.append(node("th", label)));
  const thead = node("thead");
  thead.append(header);
  table.append(thead);
  const tbody = node("tbody");
  Object.values(data.posts).filter(p => p.known_unavailable_references).forEach(p => {
    const row = node("tr");
    row.append(node("td", p.date));
    const title = node("td");
    title.append(articleLink(p));
    row.append(title);
    [p.saved_image_resources, p.known_unrecovered_references, p.damaged_resources].forEach(n => row.append(node("td", n)));
    tbody.append(row);
  });
  table.append(tbody);
  scroller.append(table);
  details.append(scroller);
  overview.append(details);
  const download = node("a", "下载当前逐篇状态 JSON（含公开来源）");
  download.href = "recovery-status.json";
  overview.append(download);
})();
