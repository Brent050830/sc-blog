"use strict";
const query=new URLSearchParams(location.search);
const run=Number(query.get("run"));
const send=data=>parent.postMessage({type:"magazine-player",run,...data},location.origin);
window.RufflePlayer={config:{publicPath:new URL("vendor/",location.href).href,polyfills:false,autoplay:"on",unmuteOverlay:"hidden",
  allowScriptAccess:false,allowNetworking:"internal",openUrlMode:"deny",allowFullscreen:false,showSwfDownload:false,
  contextMenu:"off",compatibilityRules:false,credentialAllowList:[],socketProxy:[],favorFlash:false,
  maxExecutionDuration:5,backgroundExecutionMode:"pause",deviceFontRenderer:"canvas",scale:"showAll",forceScale:true}};
let api,muted=query.get("sound")!=="1",paused=false,restarting=false,disposed=false;
// Leaving a whole iframe (jump/issue switch/navigation) must also tear down its
// player. Native in-magazine page changes are handled by the AS2 video adapter.
function dispose(){
  if(disposed)return;disposed=true;
  if(api){api.volume=0;api.suspend();}
  document.querySelector("ruffle-player")?.remove();
}
window.addEventListener("pagehide",dispose);
let mediaURLs=new Set();
const resourceFetch=window.fetch.bind(window);
// Observe only the exact, approved FLV URLs. Do not rewrite credentials, retry,
// consume bodies, or proxy requests; native Ruffle still handles each response.
window.fetch=async(input,options)=>{
  const url=input instanceof Request?input.url:new URL(String(input),location.href).href;
  try{
    const response=await resourceFetch(input,options);
    if(mediaURLs.has(url)&&!response.ok)send({status:`视频资源加载失败（HTTP ${response.status}），请检查媒体仓库是否发布完成`,log:`媒体加载失败：${url}`});
    return response;
  }catch(error){
    if(mediaURLs.has(url))send({status:"视频资源连接失败，请检查网络或媒体站跨域设置",log:String(error)});
    throw error;
  }
};
function trace(message){
  send({log:`SWF: ${message}`});
  const page=/^LAB_PAGE:(\d+)$/.exec(message);
  if(page)send({page:Number(page[1])});
  if(message.startsWith("LAB_NOTICE:"))send({status:message.slice(11)});
}
window.addEventListener("securitypolicyviolation",event=>send({log:`CSP 拒绝：${event.violatedDirective} ${event.blockedURI}`}));
window.addEventListener("DOMContentLoaded",async()=>{
  try{
    const response=await fetch("catalog.json",{credentials:"omit"});
    if(!response.ok)throw new Error("杂志清单加载失败");
    const catalog=await response.json();
    const issue=catalog.issues.find(item=>item.id===query.get("id")&&item.pages);
    if(!issue)throw new Error("未知或尚未恢复的刊物");
    const base=new URL(issue.base,location.href).href;
    const mediaBase=new URL(catalog.mediaBase);
    const localPreview=location.hostname==="127.0.0.1"&&mediaBase.hostname==="127.0.0.1"&&mediaBase.protocol==="http:";
    if((mediaBase.protocol!=="https:"&&!localPreview)||mediaBase.username||mediaBase.password)throw new Error("媒体地址不合法");
    const rewrites=Object.entries(issue.media).map(([name,path])=>[new URL(name,base).href,new URL(path,mediaBase).href]);
    mediaURLs=new Set(rewrites.map(rule=>rule[1]));
    const player=window.RufflePlayer.newest().createPlayer();
    document.querySelector("#player").appendChild(player);api=player.ruffle(1);api.volume=muted?0:.7;
    player.addEventListener("loadedmetadata",()=>send({log:JSON.stringify(api.metadata)}));
    const spread=Number(query.get("spread"));
    const parameters=Number.isInteger(spread)&&spread>=1&&spread<=issue.pages.length?{labTarget:String(spread*2)}:{};
    if(query.get("play")==="1"&&issue.video_spreads?.includes(spread))parameters.labPlayVideo=String(spread*2);
    await api.load({url:new URL("main.swf",base).href,base,parameters,urlRewriteRules:rewrites});
    api.traceObserver=trace;api.volume=muted?0:.7;
    send({status:muted?"兼容阅读器运行中 · 默认静音":"兼容阅读器运行中 · 已保留声音设置"});
  }catch(error){send({status:"加载失败，请查看日志或使用截图备用版",log:String(error)});}
});
window.addEventListener("message",async event=>{
  if(event.source!==parent||event.origin!==location.origin||event.data?.type!=="magazine-control"||event.data.run!==run||!api||disposed)return;
  const command=event.data.command;
  if(command==="pause"){paused=true;api.volume=0;api.suspend();send({status:"已暂停"});}
  if(command==="resume"){paused=false;api.resume();api.volume=muted?0:.7;send({status:"已继续运行"});}
  if(command==="sound"){muted=!muted;api.volume=muted||paused?0:.7;send({status:muted?"已静音":"声音已开启；如无声请点击杂志画面"});}
  if(command==="restart"&&!restarting){
    restarting=true;
    try{await api.reload();paused=false;api.traceObserver=trace;api.volume=muted?0:.7;send({status:"已从头重播"});}
    catch(error){send({status:"重播失败",log:String(error)});}
    finally{restarting=false;}
  }
});
