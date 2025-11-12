// ---- Guard phiên (giữ như bạn đang có) ----
(async () => {
  try{
    const r = await fetch("/.netlify/functions/admin-auth/check", { credentials: "include" });
    const j = await r.json().catch(()=>({}));
    if (!j || !j.ok) location.replace("/admin/login.html");
  }catch(_){
    location.replace("/admin/login.html");
  }
})();
document.getElementById("btnLogout").onclick = async () => {
  try{ await fetch("/.netlify/functions/admin-auth/logout", { method:"POST", credentials:"include" }); }catch(_){}
  location.replace("/admin/login.html");
};

// ---- Danh mục công cụ: mỗi tool -> trang HTML nội bộ ----
// Bạn có thể đổi URL theo cấu trúc site của bạn
const TOOL_REGISTRY = {
  scores: {
    title: "Bảng điểm (theo ngày)",
    url: "/admin/tools/scores.html",
    note: "Xem & tải dữ liệu điểm"
  },
  storyboard: {
    title: "Tạo kịch bảng",
    url: "/admin/tools/storyboard.html",
    note: "tạo kịch bảng"
  },
  makepromt: {
    title: "Tạo promt hinh-video",
    url: "/admin/tools/makepromt.html",
    note: "tạo kịch bảng"
  },
  avatar: {
    title: "Tạo avatar nhân vật",
    url: "/admin/tools/avatar.html",               // bạn đã có file này
    note: "tạo avatar nhân vật"
  },
  character: {
  title: "Tạo hình nhân vật",
  url: "/admin/tools/character.html",
  note: "Form → ghép prompt → xem thử → lưu vào Firebase"
  },
  hotspot: {
    title: "Tạo điểm ảnh",
    url: "/admin/tools/hotspot.html",               // bạn đã có file này
    note: "tạo điểm ảnh"
  },
  storybook: {
    title: "Tạo Storybook",
    url: "/admin/tools/storybook.html",     // hoặc "/admin/storybook.html" nếu đã có
    note: "Biên soạn truyện tranh / sách ảnh"
  },
  image: {
    title: "Tạo ảnh",
    url: "/admin/tools/TaoNV.html",
    note: "Tạo ảnh Miễn phí • HuggingFace API • Replicate API"
  },
  zip: {
    title: "Nén ảnh",
    url: "/admin/tools/image.html",
    note: "nén ảnh"
  },
  users: {
    title: "Quản lý User",
    url: "/admin/tools/users.html",
    note: "Tìm kiếm, khóa/mở, reset email"
  }
};


// ---- Phần tử UI ----
const sidebar = document.querySelector(".admin-nav");
const buttons = [...sidebar.querySelectorAll(".nav-btn")];
const frame   = document.getElementById("toolFrame");
const empty   = document.getElementById("toolEmpty");
const titleEl = document.getElementById("toolTitle");
const metaEl  = document.getElementById("toolMeta");

// ---- Hàm nạp tool ----
function loadTool(toolKey, pushHash = true) {
  const conf = TOOL_REGISTRY[toolKey];
  if (!conf) return;

  // active state
  buttons.forEach(b => b.classList.toggle("active", b.dataset.tool === toolKey));

  // set heading
  titleEl.textContent = conf.title;
  metaEl.textContent = conf.note || "";

  // show iframe
  frame.hidden = false;
  empty.hidden = true;
  frame.src = conf.url;

  // đồng bộ hash để refresh/back-forward
  if (pushHash) {
    const h = new URL(location.href);
    h.hash = `#/tool/${toolKey}`;
    history.pushState({toolKey}, "", h);
  }
}

// ---- Click trên sidebar ----
sidebar.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;
  loadTool(btn.dataset.tool);
});

// ---- Hash/back-forward ----
window.addEventListener("popstate", () => {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  if (m) loadTool(m[1], /*pushHash*/ false);
});

// ---- Khởi động theo hash hoặc mặc định ----
(function boot() {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  const key = m?.[1] || "scores";
  // đảm bảo nút tồn tại
  if (!TOOL_REGISTRY[key]) return;
  loadTool(key, /*pushHash*/ false);
})();

// ---- Phím tắt: Alt+↑/↓ để chọn tool; Enter để mở; Alt+L logout ----
let focusIndex = buttons.findIndex(b => b.classList.contains("active"));
if (focusIndex < 0) focusIndex = 0;

function focusButton(i) {
  focusIndex = (i + buttons.length) % buttons.length;
  buttons.forEach((b, idx)=> b.classList.toggle("active", idx === focusIndex));
  // chỉ đổi highlight ở sidebar, chưa load tool tới khi Enter
}

window.addEventListener("keydown", (e) => {
  if (e.altKey && (e.key === "ArrowDown" || e.key === "Down")) {
    e.preventDefault();
    focusButton(focusIndex + 1);
  }
  if (e.altKey && (e.key === "ArrowUp" || e.key === "Up")) {
    e.preventDefault();
    focusButton(focusIndex - 1);
  }
  if (e.key === "Enter") {
    const btn = buttons[focusIndex];
    if (btn) loadTool(btn.dataset.tool);
  }
  if (e.altKey && (e.key.toLowerCase() === "l")) {
    document.getElementById("btnLogout").click();
  }
});

// Thêm mapping kích thước đề xuất
const AR_SIZES = {
  "16:9": {w:1920, h:1080, openai:"1792x1024"},
  "1:1":  {w:1024, h:1024, openai:"1024x1024"},
  "9:16": {w:1080, h:1920, openai:"1024x1792"}
};

function buildPrompts({text,total,step,preset,combo,aspect}){
  const baskets = splitToScenes(text,total,step);
  const sz = AR_SIZES[aspect] || AR_SIZES["16:9"];
  let t=0, scenes=[];
  for(let i=0;i<baskets.length;i++){
    const start=t, end=Math.min(total,t+step); t=end;
    const L=baskets[i].join(" ");
    const {cam,emo}=pickCombos(combo,i);
    scenes.push({
      index:i+1, start, end, aspect,
      width: sz.w, height: sz.h,    // Stable Diffusion / A1111
      openai_size: sz.openai,       // DALL·E 3 / OpenAI Images
      prompt: `${preset}, shot length ~${step}s. Camera: ${cam}. Emotion: ${emo}. `
            + `Action/Scene text: "${L}" (compose for ${aspect})`
    });
  }
  return scenes;
}

// Ở phần onclick:
const data = buildPrompts({
  text: $("lyrics").value||"",
  total: +$("dur").value||180,
  step: +$("len").value||5,
  preset: $("preset").value,
  combo: $("combo").value,
  aspect: $("aspect").value
});






