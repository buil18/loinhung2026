const fs=require('fs');const vm=require('vm');
function makeServer(codePath){
 const store={};const props={};let clock=Date.now();
 const sandbox={
  console,
  CacheService:{getScriptCache(){return{
   get:k=>store[k]===undefined?null:store[k],
   put:(k,v)=>{store[k]=v;},
   putAll:(o)=>{Object.assign(store,o);},
   removeAll:(ks)=>{ks.forEach(k=>{delete store[k];});},getAll:(ks)=>{const r={};ks.forEach(k=>{if(store[k]!==undefined)r[k]=store[k];});return r;}}}},
  LockService:{getScriptLock(){return{waitLock(){},releaseLock(){}};}},
  PropertiesService:{getScriptProperties(){return{getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v;}};}},
  Utilities:{getUuid:()=>'abcdef12-3456-7890-abcd-ef1234567890'},
  ScriptApp:{getService(){return{getUrl:()=>'https://script.google.com/macros/s/TEST/exec'};}},
  ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput(t){const o={getContent:()=>t,setMimeType(){return o;}};return o;}},
  HtmlService:{createHtmlOutputFromFile(){return{setTitle(){return this;},addMetaTag(){return this;},setXFrameOptionsMode(){return this;}};},XFrameOptionsMode:{ALLOWALL:1}},
 };
 vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(codePath,'utf8')+';this.__x={doGet,doPost,relayState,relayClear,relayProcess,getRelayConfig,processCrossCheck};',sandbox);
 const x=sandbox.__x;
 function fetchMock(url,opt){
  opt=opt||{};
  return new Promise((res,rej)=>{
   setTimeout(()=>{
    if(!url.startsWith('https://script.google.com/macros/s/TEST/exec')) return rej(new TypeError('blocked'));
    let out;
    if((opt.method||'GET')==='POST') out=x.doPost({postData:{contents:opt.body}});
    else{const q={};const qs=url.split('?')[1]||'';qs.split('&').forEach(p=>{const [a,b]=p.split('=');if(a)q[decodeURIComponent(a)]=decodeURIComponent(b||'');});out=x.doGet({parameter:q});}
    const t=out.getContent();res({ok:true,json:()=>Promise.resolve(JSON.parse(t)),clone(){return{text:()=>Promise.resolve(t)};}});
   },5);});
 }
 return {x,fetchMock,store};
}
module.exports={makeServer};
