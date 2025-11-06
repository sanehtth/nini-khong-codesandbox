import fetch from "node-fetch";
export async function handler(event){
  const body=JSON.parse(event.body||"{}");
  const token=process.env.HUGGINGFACE_API_TOKEN;
  if(!token) return {statusCode:500,body:"No HF token"};
  const url=`https://api-inference.huggingface.co/models/${body.model}`;
  const r=await fetch(url,{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(body.input)
  });
  const data=await r.json();
  return {statusCode:r.status,body:JSON.stringify(data)};
}
