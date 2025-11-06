import fetch from "node-fetch";
export async function handler(event){
  const token=process.env.REPLICATE_API_TOKEN;
  const id=new URLSearchParams(event.queryStringParameters).get("id");
  const r=await fetch("https://api.replicate.com/v1/predictions/"+id,{
    headers:{"Authorization":`Bearer ${token}`}
  });
  const data=await r.json();
  return {statusCode:r.status,body:JSON.stringify(data)};
}
