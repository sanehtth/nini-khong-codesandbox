import admin from "firebase-admin";
const app = admin.apps.length ? admin.app() : admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
});
const db = admin.firestore();

export async function handler(event){
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try{
    const { characterId, url, prompt, model, seed } = JSON.parse(event.body||"{}");
    if (!characterId || !url) throw new Error("Missing characterId or url");

    const imageId = db.collection("_").doc().id;
    await db.collection("characters").doc(characterId).collection("images").doc(imageId).set({
      url, prompt: prompt || "", model: model || "", seed: seed ?? null,
      created_at: admin.firestore.Timestamp.now()
    });

    return { statusCode:200, body: JSON.stringify({ ok:true, imageId }) };
  }catch(e){
    return { statusCode:400, body: JSON.stringify({ ok:false, error: e.message }) };
  }
}
