// /admin/admin.js — SHELL QUẢN TRỊ (sạch, không lẫn logic của các tool con)

// ===== Guard phiên đăng nhập =====
const $ = (id) => document.getElementById(id);

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
  } catch (_) {}
  location.replace("/admin/login.html");
});

// ===== Danh mục tool (mỗi tool là 1 trang HTML nội bộ) =====
const TOOL_REGISTRY = {
  scores: {
    title: "Bảng điểm (theo ngày)",
    url: "/admin/tools/scores.html",
    note: "Xem & tải dữ liệu điểm",
  },
  storyboard: {
    title: "Tạo kịch bảng",
    url: "/admin/tools/storyboard.html",
    note: "Tạo kịch bảng",
  },
  makepromt: {
    title: "Tạo promt hinh-video",
    url: "/admin/tools/makepromt.html",
    note: "Prompt 5s • JSON/TSV",
  },
  avatar: {
    title: "Tạo avatar nhân vật",
    url: "/admin/tools/avatar.html",
    note: "Tạo avatar nhân vật",
  },
  character: {
    title: "Tạo hình nhân vật",
    url: "/admin/tools/character.html",
    note: "Form → ghép prompt → xem thử → lưu Firebase",
  },
  hotspot: {
    title: "Tạo điểm ảnh",
    url: "/admin/tools/hotspot.html",
    note: "Tạo điểm ảnh",
  },
  storybook: {
    title: "Tạo Storybook",
    url: "/admin/tools/storybook.html",
    note: "Biên soạn truyện tranh / sách ảnh",
  },
  image: {
    title: "Tạo ảnh",
    url: "/admin/tools/TaoNV.html",
    note: "Tạo ảnh • HuggingFace / Replicate",
  },
  zip: {
    title: "Nén ảnh",
    url: "/admin/tools/image.html",
    note: "Nén ảnh",
  },
  users: {
    title: "Quản lý User",
    url: "/admin/tools/users.html",
    note: "Tìm kiếm, khóa/mở, reset email",
  },
};

// ===== Phần tử UI của shell =====
const frame  = $("#toolFrame");
const empty  = $("#toolEmpty");
const titleEl = $("#toolTitle");
const metaEl  = $("#toolMeta");

// Lấy danh sách nút trong sidebar theo data-tool (không phụ thuộc class)
const getButtons = () => Array.from(document.querySelectorAll("[data-tool]"));

// ===== Nạp 1 tool vào iframe =====
function loadTool(toolKey, pushHash = true) {
  const conf = TOOL_REGISTRY[toolKey];
  if (!conf || !frame || !titleEl || !metaEl) return;

  // active highlight
  const buttons = getButtons();
  buttons.forEach((b) => b.classList.toggle("active", b.dataset.tool === toolKey));

  // set heading
  titleEl.textContent = conf.title;
  metaEl.textContent  = conf.note || "";

  // show iframe
  frame.hidden = false;
  if (empty) empty.hidden = true;
  frame.src = conf.url;

  // sync hash
  if (pushHash) {
    const h = new URL(location.href);
    h.hash = `#/tool/${toolKey}`;
    history.pushState({ toolKey }, "", h);
  }
}

// ===== Click toàn trang (delegation) =====
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-tool]");
  if (!btn) return;
  loadTool(btn.dataset.tool);
});

// ===== Back/forward qua hash =====
window.addEventListener("popstate", () => {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  if (m) loadTool(m[1], /* pushHash */ false);
});

// ===== Khởi động sau DOM ready =====
document.addEventListener("DOMContentLoaded", () => {
  const m = (location.hash || "").match(/#\/tool\/([a-z0-9_-]+)/i);
  let key = m?.[1];

  // Nếu hash trống/không khớp → lấy tool đầu tiên trong sidebar
  if (!key || !TOOL_REGISTRY[key]) {
    const firstBtn = getButtons()[0];
    key = firstBtn ? firstBtn.dataset.tool : null;
  }
  if (key && TOOL_REGISTRY[key]) loadTool(key, /* pushHash */ false);
});

// ===== Phím tắt: Alt+↑/↓ để chọn; Enter để mở; Alt+L logout =====
let focusIndex = 0;
function focusButton(i) {
  const buttons = getButtons();
  if (!buttons.length) return;
  focusIndex = (i + buttons.length) % buttons.length;
  buttons.forEach((b, idx) => b.classList.toggle("active", idx === focusIndex));
}

window.addEventListener("keydown", (e) => {
  const buttons = getButtons();
  if (!buttons.length) return;

  if (e.altKey && (e.key === "ArrowDown" || e.key === "Down")) {
    e.preventDefault(); focusButton(focusIndex + 1);
  }
  if (e.altKey && (e.key === "ArrowUp" || e.key === "Up")) {
    e.preventDefault(); focusButton(focusIndex - 1);
  }
  if (e.key === "Enter") {
    const btn = buttons[focusIndex];
    if (btn) loadTool(btn.dataset.tool);
  }
  if (e.altKey && e.key?.toLowerCase() === "l") {
    $("#btnLogout")?.click();
  }
});

// ===== KHÔNG đặt logic của tool con bên dưới file này =====
// Mỗi tool phải có JS riêng: /admin/tools/makeprompt.js, /character.js, ...
