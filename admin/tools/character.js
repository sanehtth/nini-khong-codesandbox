// /admin/tools/character.js
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ===== init firestore/storage từ app đã được nini-fb.mjs khởi tạo ===== */
const app = getApp();
const db = getFirestore(app);
const storage = getStorage(app);

/* ===== helpers & state ===== */
const $ = id => document.getElementById(id);
const views = ["front","back","left","right"];
const state = { images:{front:null,back:null,left:null,right:null}, character:null };

const STYLE_PRESETS = {
  "3d_cinematic": "3D cinematic, semi-realistic lighting, soft global illumination, filmic color grading",
  "2d_painterly": "2D painterly illustration, soft brush strokes, subtle paper texture, warm watercolor feeling",
  "anime_modern": "modern anime film look, clean cel shading, crisp lineart, vibrant yet soft lighting",
  "pixar_inspired": "Pixar-inspired stylized 3D, friendly proportions, soft subsurface scattering, high-quality studio lighting",
  "disney_like": "Disney-like classic animation style, expressive eyes, gentle gradients, fairytale warmth",
  "comic": "comic book style, bold ink lines, halftone shading, graphic look"
};

function baseSheet(){
  return {
    name: $("charName").value.trim() || "Daisy Girl",
    sheet: $("charSheet").value.trim() || "female, early 20s, heart-shaped face, big green eyes, long wavy light brown hair, daisy headband, denim top, white tiered skirt, gentle warm vibe",
    palette: $("palette").value.trim() || "pastel warm, latte brown",
    props: $("props").value.trim() || "latte cup, umbrella",
    seed: $("seed").value ? Number($("seed").value) : undefined,
    aspect: $("aspect").value,
    styleKey: $("style").value
  };
}

function posePrompt(view){
  const viewText = {
    front:"front view, neutral pose, looking at camera",
    back: "back view, neutral pose, hair visible from behind",
    left: "left profile view, neutral pose",
    right:"right profile view, neutral pose"
  }[view];
  const b = baseSheet();
  const styleTxt = STYLE_PRESETS[b.styleKey] || STYLE_PRESETS["3d_cinematic"];
  return `${b.name}, ${b.sheet}, color palette ${b.palette}, props: ${b.props}. `
       + `${viewText}. ${styleTxt}. plain neutral background, character turnaround reference, high consistency.`;
}

/* ===== preview engines ===== */
const engines = {
  none: async () => null,
  openai: async ({prompt, size}) => {
    const key = localStorage.getItem("openai_key");
    if (!key) throw new Error("Thiếu OpenAI API key (localStorage.openai_key)");
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {"Content-Type":"application/json","Authorization":"Bearer "+key},
      body: JSON.stringify({ model: "gpt-image-1", prompt, size })
    });
    if (!res.ok) throw new Error(await res.text());
    const { data } = await res.json();
    return "data:image/png;base64," + data[0].b64_json;
  },
  sdwebui: async ({prompt, size}) => {
    const [w,h] = size.split("x").map(n=>parseInt(n,10));
    const res = await fetch("http://127.0.0.1:7860/sdapi/v1/txt2img", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt, width:w, height:h, steps:25,
        sampler_name:"DPM++ 2M Karras", cfg_scale:6.5, seed:-1
      })
    });
    if (!res.ok) throw new Error("Không kết nối được SD WebUI (http://127.0.0.1:7860).");
    const { images } = await res.json();
    return "data:image/png;base64," + images[0];
  }
};

async function generateOne(view){
  const engine = $("engine").value;
  if (engine === "none") throw new Error("Engine 'none' không hỗ trợ preview.");
  const size = baseSheet().aspect;
  const prompt = posePrompt(view);
  const dataUrl = await engines[engine]({prompt, size});
  const img = new Image(); img.src = dataUrl; await img.decode();
  state.images[view] = dataUrl;
  $("v-"+view).innerHTML = ""; $("v-"+view).appendChild(img);
}

/* ===== events ===== */
$("preview").addEventListener("click", async ()=>{
  try{ await generateOne("front"); }
  catch(e){ alert(e.message || e); }
});

$("gen").addEventListener("click", async ()=>{
  try{
    for(const v of views) await generateOne(v);
    state.character = baseSheet();
    $("out").textContent = JSON.stringify(buildCharacterJSON(), null, 2);
  }catch(e){ alert(e.message || e); }
});

$("clear").addEventListener("click", ()=>{
  for(const v of views){ $("v-"+v).innerHTML = v[0].toUpperCase()+v.slice(1); state.images[v]=null; }
  $("out").textContent = "";
});

$("export").addEventListener("click", ()=>{
  state.character = baseSheet();
  $("out").textContent = JSON.stringify(buildCharacterJSON(), null, 2);
});

$("save").addEventListener("click", async ()=>{
  try{
    const c = baseSheet();
    const docRef = await addDoc(collection(db,"characters"), {
      name:c.name, sheet:c.sheet, palette:c.palette, props:c.props,
      aspect:c.aspect, seed:c.seed || null, style:c.styleKey,
      createdAt: serverTimestamp()
    });
    const urls = {};
    for(const v of views){ if(state.images[v]) urls[v] = await uploadImage(docRef.id, v); }
    await updateDoc(doc(db,"characters",docRef.id), { reference_images: urls });
    state.character = {...c, id:docRef.id, reference_images: urls};
    $("out").textContent = JSON.stringify(buildCharacterJSON(), null, 2);
    alert("Đã lưu nhân vật: "+docRef.id);
  }catch(e){ alert(e.message || e); }
});

/* ===== storage helpers ===== */
async function dataURLtoBlob(dataUrl){ const r = await fetch(dataUrl); return await r.blob(); }
async function uploadImage(docId, view){
  const blob = await dataURLtoBlob(state.images[view]);
  const rf = ref(storage, `characters/${docId}/${view}.png`);
  await uploadBytes(rf, blob);
  return await getDownloadURL(rf);
}

/* ===== export block ===== */
function buildCharacterJSON(){
  const c = state.character || baseSheet();
  const refImg = (c.reference_images && (c.reference_images.front || c.reference_images.left)) || state.images.front || null;
  const ar = c.aspect==="1792x1024"?"16:9":c.aspect==="1024x1792"?"9:16":"1:1";
  return {
    id: c.id || null,
    name: c.name,
    description: `${c.sheet}. Palette: ${c.palette}. Props: ${c.props}.`,
    style: c.styleKey,
    aspect: ar,
    reference_images: refImg ? [refImg] : [],
    prompts: {
      generic: `${c.name}, ${c.sheet}. ${c.palette}. props ${c.props}.`,
      midjourney: `${c.name}, ${c.sheet}. ${c.palette}. props ${c.props}. --ar ${ar}` + (refImg?` --cref ${refImg} --cw 75`:""),
      sdxl: { ip_adapter: refImg?0.8:0.0, seed: c.seed || undefined, ref: refImg || null },
      openai_hint: refImg?`Reference image: ${refImg}. Keep face & hair consistent.`:""
    }
  };
}
