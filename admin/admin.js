// /admin/admin.js — shell quản trị với Fallback chọn tool theo text nếu thiếu data-tool

const $ = (id) => document.getElementById(id);

// ---- Guard phiên ----
(async () => {
  try {
    const r = await fetch("/.netlify/functions/admin-auth/check", { credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!j || !j.ok) location.replace("/admin/login.html");
  } catch (_) {
    location.replace("/admin/login.html");
  }
})();
$("#btnLogout")?.addEventListener("click", async () => {
  try {
    await fetch("/.netlify/functions/admin-auth/logout", { method: "POST", credentials: "include" });
  } catch(_) {}
  location.replace("/admin/login.html");
});

// ---- Registry ----
const TOOL_REGISTRY = {
  scores:     { title:"Bảng điểm (theo ngày)", url:"/admin/tools/scores.html",     note:"Xem & tải dữ liệu điểm" },
  storyboard: { title:"Tạo kịch bảng",         url:"/admin/tools/storyboard.html", note:"Tạo kịch bảng" },
  makepromt:  { title:"Tạo promt hinh-video",  url:"/admin/tools/makepromt.html",  note:"Prompt 5s • JSON/TSV" },
  avatar:     { title:"Tạo avatar nhân vật",   url:"/admin/tools/avatar.html",     note:"Tạo avatar nhân vật" },
  character:  { title:"Tạo hình nhân vật",     url:"/admin/tools/character.html",  note:"Form → ghép prompt → xem thử → lưu Firebase" },
  hotspot:    { title:"Tạo điểm ảnh",          url:"/admin/tools/hotspot.html",    note:"Tạo điểm ảnh" },
  storybook2: { title:"Tạo Storybook",         url:"/admin/tools/storybook.html",  note:"Biên soạn truyện tranh / sách ảnh" },
  image:      { title:"Tạo ảnh",               url:"/admin/tools/TaoNV.html",      note:"Tạo ảnh • HuggingFace / Replicate" },
  zip:        { title:"Nén ảnh",               url:"/admin/tools/image.html",      note:"Nén ảnh" },
  users:      { title:"Quản lý User",          url:"/admin/tools/users.html",      note:"Tìm kiếm, khóa/mở, reset email" },
};

// map rút gọn để fallback theo text hiển thị
const LABEL_MAP = [
  { match:/bảng điểm/i,          key:"scores" },
  { match:/kịch bảng|storyboard/i,key:"storyboard" },
  { match:/promt|prompt/i,       key:"makepromt" },
  { match:/avatar/i,             key:"avatar" },
  { match:/hình nhân vật/i,      key:"character" },
  { match:/điểm ảnh|hotspot/i,   key:"hotspot" },
  { match:/storybook/i,          key:"storybook2" },
  { match:/tạo ảnh/i,            key:"image" },
  { match:/nén ảnh|zip/i,        key:"zip" },
  { match:/quản lý user|users?/i,key:"users" },
];

// ---- UI refs ----
const frame  = $("#toolFrame");
const empty  = $("#toolEmpty");
const titleEl= $("#toolTitle");
const metaEl = $("#toolMeta");

const getButtons = () => Array.from(document.querySelectorAll("[data-tool], .icon-btn, .nav-btn"));

function loadTool(toolKey, pushHash=true){
  const conf = TOOL_REGISTRY[toolKey];
  if (!conf || !frame || !titleEl || !metaEl) return;

  const btns = getButtons();
  btns.forEach(b => b.classList.toggle("active",
    (b.dataset?.tool===toolKey) ||
    (!b.dataset?.tool && (b.textContent||"").trim().toLowerCase().includes(conf.title.split(" ")[0].toLowerCase()))
  ));

  titleEl.textContent = conf.title;
  metaEl.textContent  = conf.note || "";
  frame.hidden = false;
  if (empty) empty.hidden = true;
  frame.src = conf.url;

  if (pushHash){
    const h = new URL(location.href);
    h.hash = `#/tool/${toolKey}`;
    history.pushState({toolKey}, "", h);
  }
}

// Fallback: đoán key từ text
function guessKeyFromText(txt){
  const t = (txt || "").trim();
  for (const rule of LABEL_MAP){
    if (rule.match.test(t)) return rule.key;
  }
  return null;
}

// ---- Delegation click ----
document.addEventListener("click", (e) => {
  const node = e.target.closest("[data-tool], .icon-btn, .nav-btn");
  if (!node) return;
  let key = node.dataset?.tool;
  if (!key){
    const txt = node.getAttribute("data-label") || node.title || node.innerText || node.textContent || "";
    key = guessKeyFromText(txt);
  }
  if (key && TOOL_REGISTRY[key]) loadTool(key);
});

// ---- Điều hướng hash ----
window.addEventListener("popstate", () => {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  if (m) loadTool(m[1], false);
});

// ---- Boot sau DOM ready ----
document.addEventListener("DOMContentLoaded", () => {
  // 1) ưu tiên hash
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  let key = m?.[1];

  // 2) nếu không có, thử lấy nút đầu tiên
  if (!key || !TOOL_REGISTRY[key]){
    const first = getButtons()[0];
    if (first){
      key = first.dataset?.tool || guessKeyFromText(first.getAttribute("data-label") || first.title || first.innerText || first.textContent);
    }
  }
  if (key && TOOL_REGISTRY[key]) loadTool(key, false);
});

// ---- Hotkeys ----
let focusIndex = 0;
function focusButton(i){
  const btns = getButtons();
  if (!btns.length) return;
  focusIndex = (i + btns.length) % btns.length;
  btns.forEach((b, idx)=> b.classList.toggle("active", idx===focusIndex));
}
window.addEventListener("keydown", (e) => {
  const btns = getButtons();
  if (!btns.length) return;

  if (e.altKey && (e.key==="ArrowDown" || e.key==="Down")) { e.preventDefault(); focusButton(focusIndex+1); }
  if (e.altKey && (e.key==="ArrowUp"   || e.key==="Up"))   { e.preventDefault(); focusButton(focusIndex-1); }
  if (e.key==="Enter"){ const b=btns[focusIndex]; if (b){ const key=b.dataset?.tool || guessKeyFromText(b.innerText||b.textContent); if(key) loadTool(key); } }
  if (e.altKey && e.key?.toLowerCase()==="l"){ $("#btnLogout")?.click(); }
});
