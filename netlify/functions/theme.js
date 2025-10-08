// netlify/functions/theme.js
const admin = require("firebase-admin");

const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "https://nini-funny.com";
const THEME_TOKEN  = process.env.THEME_TOKEN || ""; // đặt 1 chuỗi bí mật để update

const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

const DEFAULT_CSS = `/* ===== NiNi — Theme mặc định ===== */
:root{
  --bg-url: url('/public/assets/bg/nini_home.webp');
  --glass-bg: rgba(255,255,255,.15);
  --glass-brd: rgba(255,255,255,.35);
  --glass-shadow: 0 10px 30px rgba(47,110,63,.25);
  --radius: 18px;

  --ink:#1c2024;
  --muted:#6b7b8c;
  --green:#2f6e3f;
  --green-2:#21512d;
}
.viewport,.page-hero,body[data-page],body{
  background-image: var(--bg-url);
  background-size: cover;
  background-position: center;
}
/* Auth modal: chỉ hiện pane active */
#authModal .form{display:none}
#authModal .form.is-active{display:block}
`;

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors };
  }

  try {
    if (event.httpMethod === "GET") {
      const ref = db.collection("config").doc("theme");
      const snap = await ref.get();
      const css  = snap.exists && snap.data().css ? String(snap.data().css) : DEFAULT_CSS;
      const updatedAt = snap.exists && snap.data().updatedAt ? Number(snap.data().updatedAt) : Date.now();

      // Nếu thêm ?format=json sẽ trả JSON, còn không trả text/css
      const url = new URL(event.rawUrl);
      const isJSON = url.searchParams.get("format") === "json";

      return {
        statusCode: 200,
        headers: {
          ...cors,
          "Content-Type": isJSON ? "application/json; charset=utf-8" : "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=300", // client cache 5 phút
          "Last-Modified": new Date(updatedAt).toUTCString(),
        },
        body: isJSON ? JSON.stringify({ ok: true, css, updatedAt }) : css,
      };
    }

    if (event.httpMethod === "POST") {
      // Bảo vệ: yêu cầu Authorization: Bearer <THEME_TOKEN>
      const auth = event.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!THEME_TOKEN || token !== THEME_TOKEN) {
        return {
          statusCode: 401,
          headers: cors,
          body: JSON.stringify({ ok: false, error: "Unauthorized" }),
        };
      }

      const { css } = JSON.parse(event.body || "{}");
      if (typeof css !== "string" || css.length > 200000) {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({ ok: false, error: "Invalid CSS" }),
        };
      }

      await db.collection("config").doc("theme")
        .set({ css, updatedAt: Date.now() }, { merge: true });

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: true }),
      };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method Not Allowed" }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
