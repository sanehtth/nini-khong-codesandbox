/* ======================================================================
 * NiNi — Admin client (dùng cho /admin/login.html và /admin/index.html)
 *  - checkAuth(): gọi /admin-auth/check, nếu 401 => thử /admin-auth/refresh
 *  - login(): POST password => /admin-auth/login  => redirect /admin/
 *  - logout(): xoá cookie phía server => quay về /
 * ----------------------------------------------------------------------
 *  NOTE khối: helpers
 * ====================================================================*/
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

async function api(path, opt={}){
  const res = await fetch(`/.netlify/functions/admin-auth/${path}`, {
    credentials: "include",
    headers: { "Content-Type":"application/json", ...(opt.headers||{}) },
    ...opt
  });
  return res;
}

/* ======================================================================
 *  NOTE khối: Auth flows
 * ====================================================================*/
async function checkAuthOrRedirect(){
  // Check nhanh
  let r = await api("check");
  if(r.ok) return true;

  // Hết hạn? Thử refresh
  r = await api("refresh", { method:"POST" });
  if(r.ok) return true;

  // Vẫn fail => về trang login
  location.replace("/admin/login.html");
  return false;
}

async function doLogin(){
  const pass = $("#adminPass")?.value.trim();
  if(!pass) return;
  const btn = $("#btnLogin");
  btn && (btn.disabled = true);

  const r = await api("login", { method:"POST", body: JSON.stringify({ password: pass }) });
  btn && (btn.disabled = false);

  if(r.ok){
    location.replace("/admin/");
  }else{
    $("#err")?.removeAttribute("hidden");
  }
}

async function doLogout(){
  await api("logout", { method:"POST" }).catch(()=>{});
  location.href = "/";
}

/* ======================================================================
 *  NOTE khối: Page wiring
 * ====================================================================*/
document.addEventListener("DOMContentLoaded", async () => {
  // Trang login
  if($("#btnLogin")){
    $("#btnLogin").addEventListener("click", doLogin);
    $("#adminPass")?.addEventListener("keydown", e => { if(e.key==="Enter") doLogin(); });
    return;
  }

  // Trang index (dashboard)
  const ok = await checkAuthOrRedirect();
  if(!ok) return;

  // Tabs
  const tabs = $("#tabs");
  tabs?.addEventListener("click", e=>{
    const b = e.target.closest(".tab"); if(!b) return;
    const id = b.dataset.tab;
    $$(".tab").forEach(x=>x.classList.toggle("is-active", x===b));
    $$(".panel").forEach(p=>p.classList.toggle("is-show", p.id === `p-${id}`));
  });

  // Logout
  $("#btnLogout")?.addEventListener("click", doLogout);

  // ---------- Scores sample ----------
  const grid = $("#grid");
  const stat = $("#stat");
  const pick = $("#pickDate");
  const today = new Date().toISOString().slice(0,10);
  if(pick) pick.value = today;

  async function loadScores(){
    if(!grid) return;
    stat.textContent = "Đang tải…";
    grid.innerHTML = "";
    try{
      const d = pick.value || today;
      const res = await fetch(`/.netlify/functions/get-scores?date=${d}`).then(r=>r.json());
      if(!res.ok) throw new Error(res.error || "Lỗi dữ liệu");
      const rows = res.events || [];
      stat.textContent = `Ngày ${d} — ${rows.length} lượt`;
      grid.innerHTML = rows.map(e=>{
        const t = new Date(e.ts).toISOString().replace("T"," ").replace("Z","");
        const esc = v => v==null?"":String(v).replace(/[&<>"]/g, s=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[s]));
        return `<tr>
          <td>${t}</td>
          <td>${esc(e.userId)}</td>
          <td>${esc(e.displayName)}</td>
          <td>${esc(e.gameId)}</td>
          <td title="${esc(e.sessionId)}">${esc((e.sessionId||"").slice(0,8))}…</td>
          <td>${e.score}</td><td>${e.maxScore}</td><td>${e.durationSec??""}</td>
        </tr>`;
      }).join("");
    }catch(err){
      stat.textContent = "Lỗi: " + err.message;
    }
  }

  $("#btnLoad")?.addEventListener("click", loadScores);
  $("#btnCsv")?.addEventListener("click", ()=>{
    // demo nhỏ: xuất CSV ngay từ bảng hiện tại
    const lines = [["time","user","name","game","session","score","max","sec"]];
    $$("#grid tr").forEach(tr=>{
      const cols = Array.from(tr.children).map(td=>td.textContent);
      lines.push(cols);
    });
    const csv = lines.map(r => r.map(s => /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nini-scores.csv";
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },0);
  });

  // tự tải lần đầu
  loadScores();
});
