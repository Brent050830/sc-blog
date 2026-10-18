"use strict";
let frame=document.querySelector("#experiment");
const status=document.querySelector("#status"),log=document.querySelector("#log");
const issueSelect=document.querySelector("#issue"),spreadSelect=document.querySelector("#spread");
let catalog,issue,currentPage=null,run=0;
function supplement(){
  const item=issue?.text_supplements.find(item=>item.engine_page===currentPage);
  document.querySelector("#text-supplement").hidden=!item;
  document.querySelector("#text-note").textContent=item?item.note:"";
  document.querySelector("#original-text").textContent=item?item.text:"";
}
function load(spread,{keepSound=false,playVideo=false}={}){
  const sound=keepSound&&document.querySelector("#sound").getAttribute("aria-pressed")==="true";
  currentPage=null;supplement();run++;
  const url=new URL("assets/interactive/player.html",location.href);
  url.search=new URLSearchParams({id:issue.id,run:String(run),...(spread?{spread:String(spread)}:{}),...(sound?{sound:"1"}:{}),...(playVideo?{play:"1"}:{})});
  // Use a genuinely new browsing context. Reusing iframe.src can retain stale
  // native input/audio state while the previous opaque document is unloading.
  const next=frame.cloneNode(false);next.src=url.href;
  frame.replaceWith(next);frame=next;
  status.textContent="正在加载原刊组件…";log.textContent="";
  document.querySelector("#page-indicator").textContent="正在加载…";
  document.querySelector("#play-video").disabled=true;
  document.querySelector("#sound").setAttribute("aria-pressed",String(sound));
}
function choose(id,spread){
  issue=catalog.issues.find(item=>item.id===id&&item.pages)||catalog.issues.find(item=>item.id===catalog.defaultIssue);
  issueSelect.value=issue.id;spreadSelect.replaceChildren(new Option("选择跨页…",""));
  document.title=`${issue.title}｜互动杂志`;
  document.querySelector("#issue-title").textContent=issue.title;
  for(const page of issue.pages)spreadSelect.appendChild(new Option(`${page.engine_page}–${page.engine_page+1} · ${page.title}`,String(page.spread)));
  document.querySelector("#resource-summary").textContent=`原配置列出 ${issue.pages.length} 个跨页；${issue.original_assets} 个容器条目（可能含重复）。原资源已接入，内部互动仍需逐项核验。`;
  const selected=Number.isInteger(spread)&&issue.pages.some(item=>item.spread===spread)?spread:undefined;
  history.replaceState(null,"",`interactive.html?${new URLSearchParams({id:issue.id,...(selected?{spread:String(selected)}:{})})}`);
  load(selected);
}
fetch("assets/interactive/catalog.json",{credentials:"omit"}).then(response=>{
  if(!response.ok)throw new Error("目录读取失败");return response.json();
}).then(data=>{
  catalog=data;issueSelect.replaceChildren();
  for(const item of catalog.issues){const option=new Option(`${item.title}${item.pages?` · ${item.pages.length} 跨页`:" · 封装待恢复"}`,item.id);option.disabled=!item.pages;issueSelect.appendChild(option);}
  issueSelect.disabled=false;
  document.querySelector("#library-summary").textContent=`可选择 ${catalog.issues.filter(item=>item.pages).length} 本；${catalog.issues.filter(item=>!item.pages).length} 本待恢复。无需本机服务；不是所有互动均已核验的声明。`;
  const params=new URLSearchParams(location.search);choose(params.get("id"),Number(params.get("spread")));
}).catch(error=>{status.textContent="杂志目录加载失败，请使用备用版";log.textContent=String(error);});
issueSelect.addEventListener("change",()=>choose(issueSelect.value));
document.querySelector("#jump").addEventListener("click",()=>{const n=Number(spreadSelect.value);if(issue?.pages.some(item=>item.spread===n))load(n);});
document.querySelector("#play-video").addEventListener("click",()=>{
  const page=issue?.pages.find(item=>item.engine_page===currentPage);
  if(page&&issue.video_spreads?.includes(page.spread))load(page.spread,{keepSound:true,playVideo:true});
});
for(const command of ["pause","resume","restart","sound"]){document.querySelector(`#${command}`).addEventListener("click",event=>{
  frame.contentWindow.postMessage({type:"magazine-control",run,command},"*");
  if(command==="sound")event.currentTarget.setAttribute("aria-pressed",String(event.currentTarget.getAttribute("aria-pressed")!=="true"));
});}
window.addEventListener("message",event=>{
  if(event.origin!=="null"||event.source!==frame.contentWindow||event.data?.type!=="magazine-player"||event.data.run!==run)return;
  if(event.data.status)status.textContent=event.data.status;
  if(event.data.log)log.textContent=(log.textContent+event.data.log+"\n").slice(-12000);
  if(Number.isInteger(event.data.page)){
    const incoming=event.data.page,page=issue.pages.find(item=>item.engine_page===incoming);
    currentPage=incoming;
    document.querySelector("#play-video").disabled=!(page&&issue.video_spreads?.includes(page.spread));
    document.querySelector("#page-indicator").textContent=page?`${page.engine_page}–${page.engine_page+1} · ${page.title}`:currentPage===0?"封面":"封底 / 页面转换中";
    spreadSelect.value=page?String(page.spread):"";supplement();
  }
});
