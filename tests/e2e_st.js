const {JSDOM}=require('jsdom');const fs=require('fs');
const {makeServer}=require('./mocks.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function jdeRow(order,type,line,item,qty,last,next,price){const c=Array(70).fill('x');c[1]='blank.gif';c[2]=order;c[3]=type;c[5]=line;c[11]='CTY';c[12]='Bia';c[13]=item;c[14]=qty;c[15]='CS';c[20]='23/10/26';c[22]='10260945';c[27]=last;c[28]=next;c[30]='';c[35]='';c[40]=price;c[45]=' 100000';c[46]='S';c[69]='1';return '{VAL:"'+c.join('\\t')+'",EVT:203,';}
function sigma(){const c=Array(70).fill('x');c[1]='sigma.gif';return '{VAL:"'+c.join('\\t')+'",EVT:203,';}
const ST_NO='60128925',SO_NO='62210001',GIFT='62210002';
const DATA={[ST_NO]:{type:'ST',price:'0',rows:[['1.000','10136266','10','900','999']]},[SO_NO]:{type:'SO',price:'25,009,110',rows:[['1.000','10136266','10','574','620']]},[GIFT]:{type:'S5',price:'0',rows:[['1.000','10099999','2','574','620']]}};
(async()=>{
 const srv=makeServer('../apps-script/Code.gs');const cfg=srv.x.getRelayConfig();
 const code=fs.readFileSync('../bookmarks/jde-capture.js','utf8').replace(/__URL__/g,cfg.url).replace(/__KEY__/g,cfg.key).replace(/\s*\n\s*/g,' ');
 const dom=new JSDOM('<body><div><input title="Order Number" id="C0_9" value="*"><input class="textfield" title="Order Type" id="C0_13" value="*"><input title="Customer PO" id="C0_19" value="*"></div><img id="hc_Find" title="Find"></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'https://jde.test/'});
 const w=dom.window;w.fetch=()=>Promise.reject(new TypeError('blocked'));
 const finds=[];const RealX=w.XMLHttpRequest;RealX.prototype.send=function(){};
 const OrigAppend=w.Node.prototype.appendChild;
 w.Node.prototype.appendChild=function(n){if(n.tagName==='SCRIPT'&&n.src){setTimeout(()=>n.onerror&&n.onerror(),5);return n;}return OrigAppend.call(this,n);};
 const origXhr=w.XMLHttpRequest;
 w.XMLHttpRequest=function(){const api={open(){},setRequestHeader(){},addEventListener(){},send(){setTimeout(()=>api.onerror&&api.onerror(),5);}};return api;};
 w.XMLHttpRequest.prototype=origXhr.prototype;
 w.HTMLFormElement.prototype.submit=function(){const inp=this.querySelector('input[name=payload]');srv.x.doPost({parameter:{payload:inp.value},postData:{contents:''}});};
 const doc=w.document;
 doc.getElementById('hc_Find').onclick=function(){
  const no=doc.getElementById('C0_9').value;finds.push(doc.getElementById('C0_13').value+':'+no);
  const d=DATA[no];const body='EVTS'+(d?d.rows.map(l=>jdeRow(no,d.type,l[0],l[1],l[2],l[3],l[4],d.price)).join(''):'')+sigma();
  const x=new origXhr();Object.defineProperty(x,'responseText',{get:()=>body});
  setTimeout(()=>{x.send();x.dispatchEvent(new w.Event('load'));},50);};
 Object.defineProperty(w.navigator,'clipboard',{value:{readText:()=>Promise.resolve(JSON.stringify({kind:'glassRunLinks',links:{[ST_NO]:[]},capturedAt:'x'}))},configurable:true});
 w.eval(code);await sleep(400);
 const txt=()=>doc.getElementById('__jdeCaptureBox').textContent.replace(/\s+/g,' ');
 [...doc.querySelectorAll('#__jdeCaptureBox button')].find(b=>/clipboard và chạy/.test(b.textContent)).click();
 await sleep(3000);
 console.log('ST finds:',finds.join(' | '));console.log('ST panel:',txt().slice(0,330));
 await sleep(5000);
 const parts=srv.x.relayState().orders.map(o=>[o.order,Object.keys(o.parts)]);console.log('relay parts:',JSON.stringify(parts));
 const put=(o,p,d)=>srv.x.doPost({postData:{contents:JSON.stringify({k:cfg.key,op:'put',order:o,part:p,data:d})}});
 put(ST_NO,'gr',{kind:'glassRunLinks',links:{[ST_NO]:[]}});
 put(ST_NO,'sap',{rows:[{st:ST_NO,MaHang:'10136266',SoLuong:-10}]});
 const r=srv.x.relayProcess(ST_NO,false);
 const b=JSON.parse(JSON.stringify(r.result)).blocks[0];
 console.log(JSON.stringify(b.items.map(i=>[i.sku,i.jdeQty,i.sapQty,i.status])));console.log('ST result:',b.status,'| phase',b.phase,'| main',b.main&&b.main.no,b.main&&b.main.type,'| reasons',JSON.stringify(b.reasons||null),'| summary',JSON.stringify(b.summary));
 put(ST_NO,'sap',{rows:[{st:ST_NO,MaHang:'10136266',SoLuong:-9}]});
 const b2=JSON.parse(JSON.stringify(srv.x.relayProcess(ST_NO,false).result)).blocks[0];
 console.log('ST mismatch case:',b2.status,JSON.stringify(b2.summary));
 // multi: SO main + S5 gift via unified screen
 const links2={[SO_NO]:[GIFT]};
 Object.defineProperty(w.navigator,'clipboard',{value:{readText:()=>Promise.resolve(JSON.stringify({kind:'glassRunLinks',links:links2,capturedAt:'x'}))},configurable:true});
 finds.length=0;
 [...doc.querySelectorAll('#__jdeCaptureBox button')].find(b=>/clipboard và chạy/.test(b.textContent)).click();
 await sleep(4500);
 console.log('SO+gift finds:',finds.join(' | '));console.log('SO+gift panel:',txt().slice(0,360));
 process.exit(0);
})();
