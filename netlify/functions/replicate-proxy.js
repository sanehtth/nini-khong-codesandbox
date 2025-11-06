import fetch from "node-fetch";
export async function handler(event){
  const body=JSON.parse(event.body||"{}");
  const token=process.env.REPLICATE_API_TOKEN;
  if(!token) return {statusCode:500,body:"No Replicate token"};
  const r=await fetch("https://api.replicate.com/v1/predictions",{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      version:body.model,
      input:body.input
    })
  });
  const data=await r.json();
  return {statusCode:r.status,body:JSON.stringify(data)};
}
