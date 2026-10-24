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
      if (status.text_status === "unknown-empty") article.append(node("p", "正文或图片信息不足；不能仅凭导出分类认定原帖是纯图片帖。", "recovery-warning"));
      article.append(note());
      if (status.newly_recovered_images.length) {
        const label = document.getElementById("article-status");
        if (label) label.append(document.createTextNode(` · 本轮另补回 ${status.newly_recovered_images.length} 张`));
        const oldRecord = document.getElementById("supplemental-evidence");
        if (oldRecord) oldRecord.prepend(node("p", "以下保留旧批次统计；本轮补图已计入上方当前恢复状态。", "recovery-note"));
        article.append(node("p", "本轮从原帖引用补回以下配图，已计入本页已保存资源。历史来源区的旧失败数保留作记录，以这里的当前状态为准。"));
        status.newly_recovered_images.forEach(image => {
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
      if (post?.kind === "image-only" && !post.images?.length && status.text_status !== "partial-preview") {
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
  if (s.newly_recovered_resources) overview.append(node("p", `其中原博客数据保留 ${s.original_data_image_resources} 项，本轮另补回 ${s.newly_recovered_resources} 项，在对应文章的恢复区展示。`));
  overview.append(note());
  overview.append(node("p", "原博客历史总篇数、尚未发现的遗漏数未知。下面三类内容缺口分别列出，不相加成“总共只缺几篇”。", "recovery-warning"));
  const groups = [
    ["title_only", "仅有题录、尚无正文"],
    ["partial_preview", "站内仅有不完整预览"],
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
      if (p.source_url) li.append(external(p.source_url, "题录证据"));
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
