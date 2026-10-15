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
    const pending = post.kind === "image-only" ? '<span class="image-pending">原图待恢复</span>' : "";
    const status = post.kind === "image-only" ? "图片帖" : `${post.body_chars.toLocaleString("zh-CN")} 字`;
    return `
      <article class="post-card">
        <a class="post-cover" href="${articleUrl(post)}" style="--tone:${toneForYear(year)}" aria-label="阅读《${escapeHtml(post.title)}》">
          <span class="cover-year">VOL. ${escapeHtml(year)}</span>
          <span class="cover-date"><strong>${escapeHtml(day)}</strong><span>${escapeHtml(month)} 月 · ${escapeHtml(year)}</span></span>
          ${pending}
        </a>
        <div class="post-content">
          <div class="post-meta"><span class="pill">舒畅博客</span><span class="dot"></span><time datetime="${post.date}T${post.time}">${formatChineseDate(post.date)} · ${escapeHtml(post.time.slice(0, 5))}</time><span class="dot"></span><span>${status}</span></div>
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
    setText("stat-images", data.site.image_only_count);
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

  function makeBody(post) {
    if (post.kind === "image-only") {
      return '<div class="missing-content"><span aria-hidden="true">□</span><h2>原图待恢复</h2><p>这是一篇纯图片博文，导出备份只留下标题与日期。找到可核实的历史快照后，图片会补回这里。</p></div>';
    }
    return post.text.split(/\n{2,}/).filter(Boolean).map((block) => {
      const trimmed = block.trim();
      const content = escapeHtml(trimmed).replace(/\n/g, "<br>");
      const isQuote = /^\[(?:匿名|新浪网友|网友)|^【|^“.*”$/.test(trimmed);
      return isQuote ? `<blockquote>${content}</blockquote>` : `<p>${content}</p>`;
    }).join("");
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
    setText("article-status", post.kind === "image-only" ? "原图待恢复" : "本地原文");
    setText("article-title", post.title);
    setText("article-lede", post.kind === "image-only" ? "原导出文件未保留图片内容。" : (post.excerpt.length < post.text.length ? `${post.excerpt}…` : post.excerpt));
    document.getElementById("article-body").innerHTML = makeBody(post);
    setText("source-note-text", post.kind === "image-only"
      ? `条目来自《${post.source_detail}》；导出文件只保留标题、日期和时间，尚未找到可核实原图。`
      : `正文来自《${post.source_detail}》GBK 导出备份，仅整理换行，未改写原文。`);
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
        <div>${groups[year].map((post) => `<article class="archive-row"><time datetime="${post.date}T${post.time}">${post.date.slice(5)} · ${post.time.slice(0, 5)}</time><a href="${articleUrl(post)}">${escapeHtml(post.title)}</a><span>${post.kind === "image-only" ? "原图待恢复" : `${post.body_chars} 字`}</span></article>`).join("")}</div>
      </section>`).join("");
    setText("archive-footer-count", `${posts.length} 个条目`);
  }

  function aboutPage() {
    setText("about-text-count", `${data.site.text_count} 篇`);
    setText("about-image-count", `${data.site.image_only_count} 篇`);
    setText("about-date-range", `${data.site.first_date} — ${data.site.last_date}`);
  }

  setupNavigation();
  if (page === "home") homePage();
  if (page === "article") articlePage();
  if (page === "archive") archivePage();
  if (page === "about") aboutPage();
})();
