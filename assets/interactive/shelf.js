"use strict";
(async()=>{
 const shelf=document.querySelector("#interactive-shelf");if(!shelf)return;
 const node=(tag,text)=>{const item=document.createElement(tag);item.textContent=text;return item;};
 try{
  const response=await fetch("assets/interactive/catalog.json",{credentials:"omit"});if(!response.ok)throw new Error("目录未生成");
  const catalog=await response.json();
  document.querySelector("#interactive-count").textContent=`${catalog.issues.filter(item=>item.pages).length} 本兼容阅读 · ${catalog.issues.filter(item=>!item.pages).length} 本封装待恢复`;
  for(const issue of catalog.issues){
   const card=node("article","");card.className="interactive-book"+(issue.pages?"":" unavailable");
   card.append(node("p","ORIGINAL / INTERACTIVE"),node("h3",issue.title));
   if(issue.pages){
    card.append(node("p",`${issue.pages.length} 个原配置跨页 · 保留原动画与组件`),node("p","基础翻页已抽测，内部互动尚未逐项核验。"));
    const link=node("a","打开兼容阅读器 →");link.href=`interactive.html?id=${encodeURIComponent(issue.id)}`;card.append(link);
   }else card.append(node("p","封装不同，尚未恢复"),node("p",issue.reason));
   shelf.append(card);
  }
 }catch(error){shelf.append(node("p",`互动目录暂不可用，可使用下方截图备用版。${error.message}`));}
})();
