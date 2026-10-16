(() => {
  "use strict";

  const data = window.BLOG_DATA;
  if (!data || !Array.isArray(data.posts)) return;

  const posts = [...data.posts].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const years = [...new Set(posts.map((post) => post.date.slice(0, 4)))].sort((a, b) => a.localeCompare(b));
  const page = document.body.dataset.page;

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);

  const articleUrl = (post) => `article.html?id=${encodeURIComponent(post.id)}`;
  const postImages = (post) => Array.isArray(post.images) ? post.images : [];
  const waybackLabel = (post) => post.wayback?.new_article ? "Wayback 补入" : post.wayback?.status === "verified" ? "Wayback 已核验" : "Wayback 部分恢复";
  const waybackBadge = (post) => post.wayback ? `<span class="wayback-badge">${waybackLabel(post)}</span>` : "";
  const recoveryBadges = (post) => `${waybackBadge(post)}${post.supplemental?.new_article && post.supplemental.platform === "sohu" ? '<span class="supplemental-badge">搜狐博客补遗</span>' : ""}${post.supplemental?.new_article && !post.supplemental.complete ? '<span class="preview-badge">首页预览 · 不完整</span>' : ""}`;
  const postStatus = (post) => {
    const imageCount = postImages(post).length;
    if (post.kind === "image-only") return imageCount ? `${imageCount} 张图片` : "原图待恢复";
    return `${post.body_chars.toLocaleString("zh-CN")} 字${imageCount ? ` · ${imageCount} 图` : ""}`;
  };
  const formatChineseDate = (date) => {
    const [year, month, day] = date.split("-");
    return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
  };
  const toneForYear = (year) => 134 + ((Number(year) - 2006) * 19) % 82;
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  function setupNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function highlightedExcerpt(post, query) {
    const plain = (post.excerpt || "原导出文件未包含可读取的文字内容。").trim();
    if (!query) return escapeHtml(plain);
    const normalized = plain.toLocaleLowerCase("zh-CN");
    const needle = query.toLocaleLowerCase("zh-CN");
    const index = normalized.indexOf(needle);
    if (index < 0) return escapeHtml(plain);
    const start = Math.max(0, index - 42);
    const end = Math.min(plain.length, index + query.length + 95);
    const slice = `${start ? "…" : ""}${plain.slice(start, end)}${end < plain.length ? "…" : ""}`;
    const localIndex = slice.toLocaleLowerCase("zh-CN").indexOf(needle);
    if (localIndex < 0) return escapeHtml(slice);
    return `${escapeHtml(slice.slice(0, localIndex))}<mark>${escapeHtml(slice.slice(localIndex, localIndex + query.length))}</mark>${escapeHtml(slice.slice(localIndex + query.length))}`;
  }

  function postCard(post, query) {
    const [year, month, day] = post.date.split("-");
    const pending = post.kind === "image-only" && postImages(post).length === 0 ? '<span class="image-pending">原图待恢复</span>' : "";
    const status = postStatus(post);
    return `
      <article class="post-card">
        <a class="post-cover" href="${articleUrl(post)}" style="--tone:${toneForYear(year)}" aria-label="阅读《${escapeHtml(post.title)}》">
          <span class="cover-year">VOL. ${escapeHtml(year)}</span>
          <span class="cover-date"><strong>${escapeHtml(day)}</strong><span>${escapeHtml(month)} 月 · ${escapeHtml(year)}</span></span>
          ${pending}
        </a>
        <div class="post-content">
          <div class="post-meta"><span class="pill">舒畅博客</span>${recoveryBadges(post)}<span class="dot"></span><time datetime="${post.date}T${post.time}">${formatChineseDate(post.date)} · ${escapeHtml(post.time.slice(0, 5))}</time><span class="dot"></span><span>${status}</span></div>
          <h3><a href="${articleUrl(post)}">${escapeHtml(post.title)}</a></h3>
          <p class="post-excerpt">${highlightedExcerpt(post, query)}</p>
          <a class="read-link" href="${articleUrl(post)}">阅读全文 <span>→</span></a>
        </div>
      </article>`;
  }

  function renderRecent() {
    const container = document.getElementById("recent-posts");
    if (!container) return;
    container.innerHTML = posts.slice(0, 6).map((post) => {
      const [, month, day] = post.date.split("-");
      return `<article class="recent-item"><div class="recent-date"><strong>${escapeHtml(day)}</strong><span>${escapeHtml(month)}月</span></div><div><h3><a href="${articleUrl(post)}">${escapeHtml(post.title)}</a></h3><time>${escapeHtml(post.date)}</time></div></article>`;
    }).join("");
  }

  function renderYearCloud(selectYear) {
    const counts = Object.fromEntries(years.map((year) => [year, posts.filter((post) => post.date.startsWith(year)).length]));
    const cloud = document.getElementById("year-cloud");
    if (cloud) {
      cloud.innerHTML = years.map((year) => `<button class="year-chip" type="button" data-year="${year}">${year} · ${counts[year]}</button>`).join("");
      cloud.addEventListener("click", (event) => {
        const button = event.target.closest("[data-year]");
        if (button) selectYear(button.dataset.year);
      });
      const label = cloud.closest(".side-card")?.querySelector(".side-title span");
      if (label) label.textContent = `共 ${years.length} 年`;
    }
  }

  function homePage() {
    const input = document.getElementById("search-input");
    const yearFilter = document.getElementById("year-filter");
    const list = document.getElementById("post-list");
    const pagination = document.getElementById("pagination");
    const empty = document.getElementById("empty-state");
    const params = new URLSearchParams(location.search);
    const state = { query: params.get("q") || "", year: params.get("year") || "all", page: Math.max(1, Number(params.get("page")) || 1) };
    const perPage = 8;

    setText("stat-posts", data.site.text_count);
    setText("stat-images", posts.filter((post) => post.kind === "image-only" && !postImages(post).length).length);
    setText("stat-years", Number(data.site.last_date.slice(0, 4)) - Number(data.site.first_date.slice(0, 4)) + 1);
    input.value = state.query;
    yearFilter.innerHTML += years.map((year) => `<option value="${year}">${year} 年</option>`).join("");
    yearFilter.value = years.includes(state.year) ? state.year : "all";

    function updateUrl() {
      const next = new URLSearchParams();
      if (state.query) next.set("q", state.query);
      if (state.year !== "all") next.set("year", state.year);
      if (state.page > 1) next.set("page", state.page);
      history.replaceState(null, "", `${location.pathname}${next.toString() ? `?${next}` : ""}`);
    }

    function filteredPosts() {
      const query = state.query.trim().toLocaleLowerCase("zh-CN");
      return posts.filter((post) => {
        const yearOk = state.year === "all" || post.date.startsWith(state.year);
        const queryOk = !query || `${post.title}\n${post.text}`.toLocaleLowerCase("zh-CN").includes(query);
        return yearOk && queryOk;
      });
    }

    function pageButtons(totalPages) {
      if (totalPages <= 1) return "";
      const items = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
      const valid = [...items].filter((number) => number >= 1 && number <= totalPages).sort((a, b) => a - b);
      let previous = 0;
      const output = [];
      if (state.page > 1) output.push(`<button class="page-button" data-page="${state.page - 1}">上一页</button>`);
      valid.forEach((number) => {
        if (number - previous > 1) output.push('<span class="page-ellipsis">…</span>');
        output.push(`<button class="page-button${number === state.page ? " is-current" : ""}" data-page="${number}"${number === state.page ? ' aria-current="page"' : ""}>${number}</button>`);
        previous = number;
      });
      if (state.page < totalPages) output.push(`<button class="page-button" data-page="${state.page + 1}">下一页</button>`);
      return output.join("");
    }

    function render(scroll = false) {
      const found = filteredPosts();
      const totalPages = Math.max(1, Math.ceil(found.length / perPage));
      state.page = Math.min(state.page, totalPages);
      const start = (state.page - 1) * perPage;
      list.innerHTML = found.slice(start, start + perPage).map((post) => postCard(post, state.query.trim())).join("");
      pagination.innerHTML = pageButtons(totalPages);
      list.hidden = found.length === 0;
      pagination.hidden = found.length === 0;
      empty.hidden = found.length !== 0;
      setText("result-heading", state.query || state.year !== "all" ? "筛选结果（由早到晚）" : "从第一篇开始");
      setText("result-count", `${found.length} 篇${found.length ? ` · 第 ${state.page}/${totalPages} 页` : ""}`);
      updateUrl();
      if (scroll) document.querySelector(".section-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    let debounce;
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { state.query = input.value.trim(); state.page = 1; render(); }, 120);
    });
    yearFilter.addEventListener("change", () => { state.year = yearFilter.value; state.page = 1; render(); });
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;
      state.page = Number(button.dataset.page);
      render(true);
    });
    document.getElementById("clear-search")?.addEventListener("click", () => {
      state.query = ""; state.year = "all"; state.page = 1; input.value = ""; yearFilter.value = "all"; render(); input.focus();
    });
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); input.focus(); }
    });
    renderYearCloud((year) => { state.year = year; state.page = 1; yearFilter.value = year; render(true); });
    renderRecent();
    render();
  }

  function renderImage(image, index, total) {
      const positionNote = image.placement === "inline" ? " · 按历史正文位置近似还原" : image.placement === "inline-unresolved" ? " · 原位置无法精确映射，按正文后附图" : "";
      const source = image.path.startsWith("assets/images/supplemental/") ? image.source : image.source_page.includes("web.archive.org/") ? "Wayback 历史页面" : "seeyou.life 镜像";
      return `<figure class="archive-image" data-placement="${escapeHtml(image.placement)}">
        <a class="archive-image-link" href="${escapeHtml(image.path)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(image.path)}" alt="${escapeHtml(image.alt)}"${image.width && image.height ? ` width="${Number(image.width)}" height="${Number(image.height)}"` : ""} loading="lazy" decoding="async">
        </a>
        <figcaption><span>存档配图 ${index + 1}/${total}${positionNote}</span><a href="${escapeHtml(image.source_page)}" target="_blank" rel="noopener noreferrer">来源：${source}</a></figcaption>
      </figure>`;
  }

  function makeBody(post) {
    const images = postImages(post);
    if (post.kind === "image-only" && images.length === 0) {
      return '<div class="missing-content"><span aria-hidden="true">□</span><h2>原图待恢复</h2><p>这是一篇纯图片博文，导出备份只留下标题与日期。找到可核实的历史快照后，图片会补回这里。</p></div>';
    }
    const blocks = post.text.split(/\n{2,}/).filter(Boolean);
    const positions = [0];
    blocks.forEach((block) => positions.push(positions.at(-1) + (block.normalize("NFKC").match(/[\p{L}\p{N}]/gu) || []).length));
    const slots = Array.from({ length: blocks.length + 1 }, () => []);
    images.forEach((image, index) => {
      let slot = image.placement === "before" ? 0 : blocks.length;
      if (image.placement === "inline") {
        const target = Math.max(0, Math.min(1, image.body_position_ratio)) * positions.at(-1);
        slot = positions.reduce((best, value, current) => Math.abs(value - target) < Math.abs(positions[best] - target) ? current : best, 0);
      }
      slots[slot].push(renderImage(image, index, images.length));
    });
    let markedReplies = false;
    const text = blocks.map((block, index) => {
      const trimmed = block.trim();
      const content = escapeHtml(trimmed).replace(/\n/g, "<br>");
      const isQuote = /^\[(?:匿名|新浪网友|网友)|^【|^“.*”$/.test(trimmed);
      const replyAnchor = isQuote && !markedReplies && post.wayback?.comments?.author_reply_confirmed;
      if (replyAnchor) markedReplies = true;
      return `${slots[index].join("")}${isQuote ? `<blockquote${replyAnchor ? ' id="author-replies"' : ""}>${content}</blockquote>` : `<p>${content}</p>`}`;
    }).join("");
    return `${text}${slots.at(-1).join("")}`;
  }

  function renderWaybackEvidence(post) {
    const recovery = post.wayback;
    const element = document.getElementById("wayback-evidence");
    if (!recovery || !element) return;
    const timestamp = recovery.snapshot_timestamp;
    const date = timestamp.length === 14 ? `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)} ${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)} UTC` : "历史快照";
    const fields = [recovery.body_from_wayback ? "正文由历史快照补入" : "标题、日期与本地原文已交叉核验"];
    if (recovery.recovered_image_count) fields.push(`恢复 ${recovery.recovered_image_count} 张正文图片`);
    if (recovery.missing_image_count) fields.push(`${recovery.missing_image_count} 个原图引用仍失效`);
    if (recovery.body_note) fields.push(recovery.body_note.replace(/。$/, ""));
    const comments = recovery.comments;
    const commentText = comments ? `正文保留博主整理的 ${comments.comment_excerpts} 条历史评论摘录${comments.author_reply_confirmed ? "，含舒畅本人回应" : ""}。这些摘录由作者写入正文。` : "";
    const dynamicText = post.supplemental?.historical_comments ? "另已从独立评论页恢复部分留言，见下方历史网友评论；不代表完整评论区。" : recovery.dynamic_comments === "placeholder-only" ? "快照中的动态评论区仅有加载占位，尚未恢复评论列表。" : "本页快照未保存可读取的独立评论列表。";
    element.hidden = false;
    element.innerHTML = `<h2>${waybackBadge(post)} 历史页面恢复记录</h2><p>${fields.join("；")}。</p><p><a href="${escapeHtml(recovery.snapshot_url)}" target="_blank" rel="noopener noreferrer">查看 Wayback 快照</a> · ${date}</p>${commentText ? `<p class="author-reply-note">${commentText}${comments.author_reply_confirmed ? ' <a href="#author-replies">阅读正文中的评论与回应 ↓</a>' : ""}</p>` : ""}<p>${dynamicText}</p>`;
  }

  function renderSupplemental(post) {
    const recovery = post.supplemental;
    const element = document.getElementById("supplemental-evidence");
    if (!element) return;
    const imageNote = post.quarantined_images?.length ? `<p class="incomplete-note">另有 ${post.quarantined_images.length} 个旧图片文件无法解码，已停止显示；原始文件与来源证据仍保留，不使用替代图片。</p>` : "";
    if (!recovery) {
      if (imageNote) { element.hidden=false; element.innerHTML=`<h2>图片校验记录</h2>${imageNote}`; }
      return;
    }
    const providerNames = {"sina-article":"新浪旧版文章页", "sina-homepage":"新浪首页快照", "sina-rss":"新浪 RSS", "sina-comments":"新浪独立评论页", sohu:"搜狐博客存档"};
    const sourceNote = source => source.complete ? "" : source.provider === "sina-homepage" ? " · 仅保存首页预览" : source.provider === "sina-comments" ? " · 部分历史评论" : " · 来源内容不完整";
    const sources = recovery.sources.map(source => `<li><a href="${escapeHtml(source.snapshot_url)}" target="_blank" rel="noopener noreferrer">${providerNames[source.provider] || "历史来源"} · ${escapeHtml(source.title)}</a><small>原页时间：${escapeHtml(source.date)} ${escapeHtml(source.time.slice(0, 5))}${sourceNote(source)}</small></li>`).join("");
    const variants = recovery.body_variants.map(variant => `<details class="source-variant"><summary>查看历史文字版本（未覆盖本地导出）</summary><p><a href="${escapeHtml(variant.source.snapshot_url)}" target="_blank" rel="noopener noreferrer">该版本来源</a></p><div class="variant-body">${escapeHtml(variant.text)}</div></details>`).join("");
    element.hidden = false;
    element.innerHTML = `<h2>本轮补漏与来源记录</h2>${recovery.platform === "sohu" && recovery.new_article ? "<p>搜狐博客补遗：日期与正文采用搜狐来源，尚未证明新浪也发布过这一篇。</p>" : "<p>原 TXT 标题、正文与既有链接保留；补充证据和配图单独关联。</p>"}${!recovery.complete ? '<p class="incomplete-note">此来源仅保存首页预览，不代表完整原文或全部图片。</p>' : ""}<p>本轮新增保存 ${recovery.images_added} 个配图资源${recovery.missing_images ? `；${recovery.missing_images} 个图片引用仍未能恢复` : ""}。正文图片可能包含原作者使用的表情。</p><details><summary>查看 ${recovery.sources.length} 条可追溯来源</summary><ul class="recovery-sources">${sources}</ul></details>${variants}`;
    element.insertAdjacentHTML('beforeend',imageNote);
    const comments = recovery.historical_comments;
    if (!comments) return;
    const target = document.getElementById("historical-comments");
    target.hidden = false;
    target.innerHTML = `<h2>历史网友评论</h2><p>从独立评论页恢复第 ${comments.page} 页共 ${comments.total_saved} 条，非完整评论区；未确认含舒畅本人回复。</p><p class="comment-privacy">${escapeHtml(comments.redaction_note)}</p><details><summary>展开 ${comments.total_saved} 条历史留言</summary><ol class="comment-list">${comments.items.map(comment => `<li class="historical-comment"><header><strong>${escapeHtml(comment.author)}</strong><time>${escapeHtml(comment.time)}</time></header><div>${escapeHtml(comment.text)}</div></li>`).join("")}</ol></details><p><a href="${escapeHtml(comments.snapshot_url)}" target="_blank" rel="noopener noreferrer">查看原评论页快照</a></p>`;
  }

  function navPost(element, post, label) {
    if (!element) return;
    if (!post) { element.hidden = true; return; }
    element.href = articleUrl(post);
    element.innerHTML = `<small>${label}</small><strong>${escapeHtml(post.title)}</strong>`;
  }

  function articlePage() {
    const id = new URLSearchParams(location.search).get("id");
    const index = posts.findIndex((post) => post.id === id);
    const post = posts[index];
    if (!post) {
      document.getElementById("article").innerHTML = '<div class="missing-content"><h1>没有找到这篇文章</h1><p><a href="archive.html">返回时间归档</a></p></div>';
      document.querySelector(".article-aside")?.remove();
      document.querySelector(".post-nav")?.remove();
      return;
    }

    document.title = `${post.title}｜舒畅白小兔`;
    setText("crumb-title", post.title);
    setText("article-date", `${formatChineseDate(post.date)} · ${post.time.slice(0, 5)}`);
    const imageCount = postImages(post).length;
    setText("article-status", post.supplemental?.new_article && !post.supplemental.complete ? "首页预览 · 不完整" : post.supplemental?.new_article && post.supplemental.platform === "sohu" ? "搜狐博客原文" : post.kind === "image-only"
      ? (imageCount ? "原图已恢复" : "原图待恢复")
      : `${post.wayback?.body_from_wayback ? "快照原文" : "本地原文"}${imageCount ? ` · ${imageCount} 张配图` : ""}`);
    document.getElementById("article-status").insertAdjacentHTML("afterend", recoveryBadges(post));
    setText("article-title", post.title);
    setText("article-lede", post.supplemental?.new_article && !post.supplemental.complete ? "这是历史首页保留的部分预览，完整正文或全部图片尚未恢复。" : post.kind === "image-only"
      ? (imageCount ? "图片已由可核实的历史页面恢复，并在本站保存。" : "原导出文件未保留图片内容。")
      : (post.excerpt.length < post.text.length ? `${post.excerpt}…` : post.excerpt));
    document.getElementById("article-body").innerHTML = makeBody(post);
    renderWaybackEvidence(post);
    renderSupplemental(post);
    const origin = post.supplemental?.new_article && post.supplemental.platform === "sohu" ? "本条目来自舒畅搜狐博客的 RSS 历史快照；不是已核实的新浪转载。" : post.supplemental?.new_article && !post.supplemental.complete ? "本条目仅保留新浪首页快照中的预览，完整原页尚未恢复。" : post.wayback?.body_from_wayback ? "本条目的标题、日期与正文来自已核实的 Wayback 历史快照。" : post.kind === "image-only" ? `条目来自《${post.source_detail}》；导出文件只保留标题、日期和时间。` : `正文来自《${post.source_detail}》GBK 导出备份，仅整理换行，未改写原文。`;
    setText("source-note-text", `${origin}${imageCount ? ` ${imageCount} 张配图由各图下方标注的历史页面核实，已下载到本站保存。` : post.kind === "image-only" ? " 原图尚待恢复。" : ""}`);
    setText("article-number", `#${String(post.n || post.sequence).padStart(3, "0")}`);
    setText("article-position", `全文第 ${post.sequence} 条 · ${post.date.slice(0, 4)} 年存档`);
    const sameYear = posts.filter((item) => item.id !== post.id && item.date.slice(0, 4) === post.date.slice(0, 4)).slice(0, 5);
    document.getElementById("same-year-posts").innerHTML = sameYear.map((item) => `<a href="${articleUrl(item)}">${escapeHtml(item.title)}</a>`).join("");
    const sameYearLink = document.getElementById("same-year-link");
    sameYearLink.href = `archive.html#year-${post.date.slice(0, 4)}`;
    navPost(document.getElementById("prev-post"), posts[index - 1], "← 更早一篇");
    navPost(document.getElementById("next-post"), posts[index + 1], "更新一篇 →");
  }

  function archivePage() {
    const nav = document.getElementById("archive-year-nav");
    const list = document.getElementById("archive-list");
    const groups = Object.fromEntries(years.map((year) => [year, posts.filter((post) => post.date.startsWith(year))]));
    nav.innerHTML = years.map((year) => `<a href="#year-${year}">${year} <small>${groups[year].length}</small></a>`).join("");
    list.innerHTML = years.map((year) => `
      <section class="year-section" id="year-${year}">
        <header class="year-heading"><h2>${year}</h2><span>${groups[year].length} 篇</span></header>
        <div>${groups[year].map((post) => `<article class="archive-row"><time datetime="${post.date}T${post.time}">${post.date.slice(5)} · ${post.time.slice(0, 5)}</time><div class="archive-entry"><a href="${articleUrl(post)}">${escapeHtml(post.title)}</a>${recoveryBadges(post)}</div><span>${postStatus(post)}</span></article>`).join("")}</div>
      </section>`).join("");
    setText("archive-footer-count", `${posts.length} 个条目`);
  }

  function aboutPage() {
    setText("about-text-count", `${data.site.text_count} 篇`);
    setText("about-image-count", `${posts.filter((post) => post.kind === "image-only" && !postImages(post).length).length} 篇`);
    setText("about-wayback-count", `${data.site.wayback_count || 0} 篇`);
    setText("about-date-range", `${data.site.first_date} — ${data.site.last_date}`);
  }

  setupNavigation();
  if (page === "home") homePage();
  if (page === "article") articlePage();
  if (page === "archive") archivePage();
  if (page === "about") aboutPage();
})();
