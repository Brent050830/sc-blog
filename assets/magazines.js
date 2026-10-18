(() => {
  "use strict";
  const data = window.MAGAZINE_DATA;
  if (!data) return;
  const byId = (id) => document.getElementById(id);
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  const link = (text, href) => { const el = node("a", "", text); el.href = href; return el; };
  const readerUrl = (id, capture, view = "original") => {
    const query = new URLSearchParams({ id });
    if (capture !== undefined) { query.set("capture", String(capture)); query.set("view", view); }
    return `magazine.html?${query}`;
  };
  const blogUrl = (id) => `article.html?id=${encodeURIComponent(id)}`;
  const textLabel = (page) => page.text_status === "reviewed" ? "人工核对文字" : page.text_status === "ocr-unreviewed" ? "OCR 待校对" : "文字未恢复";

  function catalogue() {
    for (const issue of data.issues) {
      const card = node("article", "magazine-book");
      const cover = link("", readerUrl(issue.id));
      const image = node("img");
      image.src = issue.cover;
      image.alt = `${issue.title}封面画面`;
      image.width = 796;
      image.height = 596;
      cover.append(image);
      const copy = node("div", "magazine-book-copy");
      copy.append(node("p", "eyebrow", `${issue.publication_label} · 部分恢复`), node("h2", "", issue.title), node("p", "", issue.scope_note));
      const reviewed = issue.pages.filter((p) => p.text_status === "reviewed").length;
      copy.append(node("p", "magazine-book-stats", `${issue.capture_count} 个画面 · ${issue.pages.filter((p) => p.text).length} 个含文字 · ${reviewed} 个已人工核对`), link("开始阅读 →", readerUrl(issue.id)));
      card.append(cover, copy);
      byId("magazine-shelf").append(card);
    }
  }

  function articleEvidence() {
    const target = byId("magazine-evidence");
    if (!target) return;
    const id = new URLSearchParams(location.search).get("id");
    const refs = data.blog_references.filter((ref) => ref.blog_id === id);
    if (!refs.length) return;
    target.hidden = false;
    target.append(node("h2", "", "杂志转载佐证"), node("p", "", "以下为杂志中的转载文字及版本对照，不修改博客原文，也不认定杂志配图就是新浪原配图。"));
    for (const ref of refs) {
      target.append(link(`${ref.issue_title} · 画面 ${ref.capture} · 原刊 ${ref.printed_pages}`, readerUrl(ref.issue_id, ref.capture)), node("p", "", `原页标注时间：${ref.blog_datetime}。与本站导出正文去除空白后一致，未发现其他文字差异。`));
      const details = node("details", "source-variant");
      details.append(node("summary", "", "查看人工核对的杂志文字与版本结论"), node("p", "", "整理仅调整换行，不使用 OCR 错字覆盖原文；当前没有非空白文字差异。"), node("div", "variant-body", ref.magazine_text), link("在文字模式中对照 →", readerUrl(ref.issue_id, ref.capture, "text")), node("p", "magazine-hash", `原貌 SHA-256：${ref.image_sha256}`));
      target.append(details);
    }
  }

  function reader() {
    const params = new URLSearchParams(location.search);
    const issue = data.issues.find((item) => item.id === params.get("id"));
    if (!issue) { byId("reader-error").hidden = false; return; }
    byId("reader-shell").hidden = false;
    document.title = `${issue.title}｜电子杂志馆`;
    byId("reader-title").textContent = issue.title;
    byId("reader-scope").textContent = issue.scope_note;
    byId("reader-text-note").textContent = issue.text_note;
    byId("reader-cover-leads").textContent = `封面另提及《${issue.cover_mentions_without_recovered_body.join("》《")}》，但尚未取得本刊可核对正文，不算新增博客佐证。`;
    byId("reader-credits").textContent = issue.credits;
    byId("reader-credits-method").textContent = issue.credits_method;
    if (matchMedia("(max-width: 900px)").matches) byId("reader-toc").open = false;
    const storageKey = `sc-magazine:${issue.id}:v1`;
    let capture = 1;
    let view = "original";
    let storageAvailable = true;
    const validCapture = (value) => /^\d+$/.test(String(value)) && Number(value) >= 1 && Number(value) <= issue.pages.length;
    function restore(initial) {
      const current = new URLSearchParams(location.search);
      let saved = null;
      if (initial && !current.has("capture") && !current.has("view")) {
        try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { storageAvailable = false; }
      }
      const requested = current.get("capture") ?? saved?.capture;
      capture = validCapture(requested) ? Number(requested) : 1;
      view = (current.get("view") ?? saved?.view) === "text" ? "text" : "original";
      render();
    }
    function navigate(nextCapture, nextView = view) {
      if (!validCapture(nextCapture)) return;
      history.pushState(null, "", readerUrl(issue.id, nextCapture, nextView));
      restore(false);
    }
    const thumbs = byId("magazine-thumbnails");
    const select = byId("capture-select");
    for (const page of issue.pages) {
      const option = node("option", "", `${page.capture} / ${issue.capture_count}`);
      option.value = String(page.capture);
      select.append(option);
      const button = node("button", "magazine-thumb");
      button.type = "button";
      button.dataset.capture = page.capture;
      const image = node("img");
      image.src = page.thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.width = 220;
      image.height = 164;
      button.append(image, node("span", "", `${page.capture}. ${page.title}`), node("small", "", textLabel(page)));
      button.addEventListener("click", () => navigate(page.capture));
      thumbs.append(button);
    }
    function render() {
      const page = issue.pages[capture - 1];
      select.value = String(capture);
      byId("capture-prev").disabled = capture === 1;
      byId("capture-next").disabled = capture === issue.pages.length;
      byId("mode-original").setAttribute("aria-pressed", String(view === "original"));
      byId("mode-text").setAttribute("aria-pressed", String(view === "text"));
      byId("capture-original").hidden = view !== "original";
      byId("capture-text").hidden = view !== "text";
      byId("capture-title").textContent = page.title;
      byId("capture-numbers").textContent = `截图序号 ${capture} / ${issue.capture_count} · 原刊页码：${page.printed_pages || "尚未核对"}${page.title_is_editorial ? " · 整理者拟题" : ""}`;
      byId("capture-warning").hidden = page.capture_status === "captured";
      byId("capture-warning").textContent = page.capture_status === "near-white-candidate" ? "此画面内容区近乎空白，是否缺少加载内容尚未确定，不作为完整页面。" : "此画面仅见背景或未见正文；不推断历史上原本没有内容，不用其他文字填补。";
      const image = byId("capture-image");
      if (view === "original" && image.getAttribute("src") !== page.image) image.src = page.image;
      image.alt = `画面 ${capture}：${page.title}，${page.printed_pages ? `原刊 ${page.printed_pages}` : "原刊页码未核对"}`;
      byId("capture-text-status").textContent = `${textLabel(page)} · ${page.note}`;
      byId("capture-text-status").dataset.status = page.text_status;
      byId("capture-transcript").textContent = page.text || "暂未恢复可靠文字。请切回原貌查看；此处不以其他文章或推测填充。";
      byId("capture-file").href = page.image;
      byId("capture-hash").textContent = `原始 PNG SHA-256：${page.sha256}`;
      const related = byId("capture-blog-link");
      related.replaceChildren();
      if (page.blog_id) related.append(link("对照本站博客原文 →", blogUrl(page.blog_id)), node("p", "", "本画面文字已人工核对，与导出正文去除空白后一致；只增加转载佐证，不更换博客原文或图片。"));
      for (const button of thumbs.querySelectorAll("button")) {
        if (Number(button.dataset.capture) === capture) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      }
      try { localStorage.setItem(storageKey, JSON.stringify({ capture, view })); } catch { storageAvailable = false; }
      byId("reader-position").textContent = `正在阅读画面 ${capture} / ${issue.capture_count} · ${storageAvailable ? "已在本浏览器记住阅读位置" : "浏览器未允许本地存储，仍可通过当前网址继续阅读"}`;
    }
    byId("capture-prev").addEventListener("click", () => navigate(capture - 1));
    byId("capture-next").addEventListener("click", () => navigate(capture + 1));
    select.addEventListener("change", () => navigate(Number(select.value)));
    byId("mode-original").addEventListener("click", () => navigate(capture, "original"));
    byId("mode-text").addEventListener("click", () => navigate(capture, "text"));
    window.addEventListener("popstate", () => restore(false));
    byId("magazine-search").addEventListener("input", (event) => {
      const query = event.target.value.trim().normalize("NFKC").toLocaleLowerCase("zh-CN");
      const results = byId("magazine-search-results");
      results.replaceChildren();
      results.hidden = !query;
      if (!query) return;
      const found = issue.pages.filter((page) => `${page.title}\n${page.text}`.normalize("NFKC").toLocaleLowerCase("zh-CN").includes(query));
      results.append(node("p", "", `${found.length} 个画面匹配 · OCR结果可能有误`));
      for (const page of found) {
        const button = node("button", "search-capture", `${page.capture}. ${page.title} · ${textLabel(page)}`);
        button.type = "button";
        button.addEventListener("click", () => navigate(page.capture, "text"));
        results.append(button);
      }
    });
    const dialog = byId("capture-viewer");
    byId("capture-enlarge").addEventListener("click", () => {
      const page = issue.pages[capture - 1];
      byId("capture-viewer-title").textContent = `画面 ${capture} · ${page.title}`;
      byId("capture-viewer-image").src = page.image;
      byId("capture-viewer-image").alt = page.title;
      byId("capture-viewer-image").style.width = "100%";
      byId("capture-zoom").value = "1";
      dialog.showModal();
    });
    byId("capture-viewer-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => byId("capture-enlarge").focus());
    byId("capture-zoom").addEventListener("input", (event) => { byId("capture-viewer-image").style.width = `${Number(event.target.value) * 100}%`; });
    document.addEventListener("keydown", (event) => {
      if (dialog.open || event.ctrlKey || event.metaKey || event.altKey || event.target.closest("input,textarea,select,[contenteditable]")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        navigate(capture + (event.key === "ArrowRight" ? 1 : -1));
      }
    });
    restore(true);
  }
  if (document.body.dataset.page === "magazines") catalogue();
  if (document.body.dataset.page === "magazine") reader();
  if (document.body.dataset.page === "article") articleEvidence();
})();
