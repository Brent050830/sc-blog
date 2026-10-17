(() => {
  "use strict";
  const data = window.OFFICIAL_ARCHIVE_DATA;
  if (!data) return;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const sourceLink = (url) => {
    const link = element("a", "official-source", "来源快照 ↗");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  };
  const captured = (url) => {
    const stamp = url.match(/\/web\/(\d{4})(\d{2})(\d{2})/);
    return stamp ? `${stamp[1]}-${stamp[2]}-${stamp[3]}（UTC）` : "未知";
  };
  const viewer = document.getElementById("photo-viewer");
  let opener;
  function openPhoto(image, button) {
    opener = button;
    document.getElementById("viewer-title").textContent = image.title;
    const picture = document.getElementById("viewer-image");
    picture.src = image.path;
    picture.alt = image.title;
    document.getElementById("viewer-source").href = image.snapshot;
    viewer.showModal();
  }
  document.getElementById("viewer-close").addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", (event) => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener("close", () => opener?.focus());

  const groups = [
    ["photos", "照片候选", "两张古装照片；尚未确认剧目、拍摄日期或对应博文。", ["photo-candidate"]],
    ["covers", "杂志封面", "目前仅保存封面，不代表已经恢复杂志内页。", ["magazine-cover"]],
    ["designs", "官网装饰与合成图", "横幅、背景和人物合成图，单独保存，不计作博客照片。", ["site-banner", "layout-background", "fan-graphic"]],
  ];
  const gallery = document.getElementById("official-gallery");
  for (const [id, title, note, kinds] of groups) {
    const section = element("section", `official-group group-${id}`);
    section.dataset.group = id;
    const heading = element("div", "collection-heading");
    heading.append(element("h2", "", title), element("p", "", note));
    const grid = element("div", "official-grid");
    for (const image of data.images.filter((item) => kinds.includes(item.kind))) {
      const card = element("figure", "official-image-card");
      const button = element("button", "official-image-button");
      button.type = "button";
      button.setAttribute("aria-label", `放大查看：${image.title}`);
      const picture = element("img");
      picture.src = image.path;
      picture.alt = image.title;
      picture.width = image.width;
      picture.height = image.height;
      picture.loading = id === "photos" ? "eager" : "lazy";
      picture.decoding = "async";
      button.append(picture, element("span", "image-enlarge", "放大 ↗"));
      button.addEventListener("click", () => openPhoto(image, button));
      const caption = element("figcaption");
      caption.append(element("h3", "", image.title), element("p", "image-dimensions", `${image.width} × ${image.height} · 本地保存`));
      const details = element("details", "official-evidence");
      details.append(element("summary", "", "来源与校验"), element("p", "", `快照捕获：${captured(image.snapshot)}，不是拍摄日期。作者归属尚未核定。`), sourceLink(image.snapshot), element("p", "official-hash", `SHA-256：${image.sha256}`));
      caption.append(details);
      card.append(button, caption);
      grid.append(card);
    }
    section.append(heading, grid);
    gallery.append(section);
  }

  const chats = document.getElementById("official-chats");
  for (const chat of data.chats) {
    const article = element("article", "official-chat");
    article.id = chat.id;
    article.append(element("p", "eyebrow", chat.session_date), element("h3", "", chat.title), element("p", "chat-attribution", `${chat.compiled_by}整理版 · 整理帖发表于 ${chat.compiled_at}`));
    article.append(element("p", "official-context", "仅恢复该汇总页可见的整理文字，不是完整原始聊天线程；不能仅凭其中署名确认本人身份。"));
    const details = element("details", "chat-reader");
    details.append(element("summary", "", "展开阅读聊天整理"), element("div", "chat-transcript", chat.text));
    const evidence = element("details", "official-evidence");
    evidence.append(element("summary", "", "整理页来源与校验"), sourceLink(`${chat.snapshot}#pid${chat.source_post_id}`), element("p", "official-hash", `来源页面 SHA-256：${chat.source_sha256}`));
    article.append(details, evidence);
    chats.append(article);
  }
  function switchSection() {
    const isChat = location.hash === "#chats" || location.hash.startsWith("#chat-");
    document.getElementById("photos-panel").hidden = isChat;
    document.getElementById("chats-panel").hidden = !isChat;
    for (const [id, active] of [["photos-link", !isChat], ["chats-link", isChat]]) {
      const link = document.getElementById(id);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }
  window.addEventListener("hashchange", switchSection);
  switchSection();
})();
