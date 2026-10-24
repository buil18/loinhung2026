const {JSDOM}=require('jsdom');const fs=require('fs');
const {makeServer}=require('./mocks.js');
const srv=makeServer('../apps-script/Code.gs');const cfg=srv.x.getRelayConfig();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const post=b=>JSON.parse(srv.x.doPost({postData:{contents:JSON.stringify(Object.assign({k:cfg.key},b))}}).getContent());
function runner(){
 const o={_s:null,_f:null,withSuccessHandler(f){const n=Object.create(o);n._s=f;n._f=this._f;return n;},withFailureHandler(f){const n=Object.create(o);n._f=f;n._s=this._s;return n;}};
 ['relayState','relayClear','relayProcess','getRelayConfig','processCrossCheck'].forEach(fn=>{o[fn]=function(){const a=arguments,s=this._s,f=this._f;setTimeout(()=>{try{const r=JSON.parse(JSON.stringify(srv.x[fn].apply(null,a)));s&&s(r);}catch(e){f&&f(e);}},20);};});
 return o;
}
(async()=>{
 const dom=new JSDOM(fs.readFileSync('../apps-script/Index.html','utf8'),{runScripts:'dangerously',url:'https://x.test/',pretendToBeVisual:true,beforeParse(w){w.google={script:{run:runner()}};}});
 const w=dom.window;await sleep(200);
 console.log('stat:',w.document.getElementById('relayStat').textContent);
 const ORDER='62215471';
 const L=(i,q,l,n)=>({LineType:'RP',ProductCode:i,ProductName:'sp'+i,UOM:'CS',Qty:q,LastStatus:l,NextStatus:n,UnitPrice:1,ShipTo:'1',Carrier:'2',PO:'p',SoldToName:'c'});
 post({op:'put',order:ORDER,part:'gr',data:{kind:'glassRunLinks',links:{[ORDER]:[]}}});
 await sleep(30);
 post({op:'put',order:ORDER,part:'sap',data:{rows:[{SalesOrder:ORDER,MaHang:'10136266',SoLuong:-10},{SalesOrder:ORDER,MaHang:'10128309',SoLuong:-5}]}});
 await sleep(30);
 w.relayPoll();await sleep(200);
 console.log('chips:',w.document.getElementById('relayOrders').textContent.replace(/\s+/g,' '));
 console.log('verdict before jde:',w.document.getElementById('result').style.display);
 post({op:'put',order:ORDER,part:'jde',data:{kind:'jde',mode:'order',links:{[ORDER]:[]},orderSearch:{[ORDER]:{resolved:true,found:true,tab:'SO'}},layoutErrors:[],orders:[{OrderNumber:ORDER,OrderType:'SO',lines:[L('10136266',10,'574','620'),L('10128309',5,'912','620')]}]}});
 await sleep(50);w.relayPoll();await sleep(300);
 console.log('verdict:',w.document.getElementById('verdict').textContent.slice(0,140));
 console.log('flow:',w.document.getElementById('flow').textContent.replace(/\s+/g,' ').slice(0,300));
 w.rerun();await sleep(200);
 console.log('after rerun:',w.document.getElementById('verdict').textContent.match(/lần \d+/)[0]);
 const ev=()=>({stopPropagation(){},currentTarget:null});
 const clickClear=async(sel)=>{const b=w.document.querySelector(sel);b.click();await sleep(30);b.click();await sleep(300);};
 console.log('clearAll visible:',w.document.getElementById('btnClearAll').style.display!=='none');
 const firstRow=[...w.document.querySelectorAll('.rrow')][0];const n0=w.document.querySelectorAll('.rrow').length;
 await clickClear('.rrow:first-child button:last-child');
 w.relayPoll();await sleep(200);
 console.log('rows before/after one-delete:',n0,w.document.querySelectorAll('.rrow').length,'| result shown:',w.document.getElementById('result').style.display);
 await clickClear('#btnClearAll');
 w.relayPoll();await sleep(200);
 console.log('after clear all rows:',w.document.querySelectorAll('.rrow').length,'| btn:',w.document.getElementById('btnClearAll').style.display,'| orders text:',w.document.getElementById('relayOrders').textContent.trim().slice(0,40),'| result:',w.document.getElementById('result').style.display);
 // gr-only
 const O2='62215900';
 post({op:'put',order:O2,part:'gr',data:{kind:'glassRunLinks',links:{[O2]:[]}}});
 post({op:'put',order:O2,part:'sap',data:{rows:[{SalesOrder:O2,MaHang:'10136266',SoLuong:-10}]}});
 post({op:'put',order:O2,part:'grdata',data:{kind:'jde',mode:'order',source:'glassRUN',links:{[O2]:[]},orderSearch:{[O2]:{resolved:true,found:true,tab:'glassRUN'}},layoutErrors:[],orders:[{OrderNumber:O2,OrderType:'SO',IsGift:false,lines:[Object.assign(L('10136266',10,'',''),{OrderNumber:O2})]}]}});
 w.relayPoll();await sleep(300);
 console.log('chips2:',w.document.getElementById('relayOrders').textContent.replace(/\s+/g,' '));
 const b=w.document.querySelector('#relayOrders .btn');console.log('has gr button',!!b);
 if(b){b.click();await sleep(300);console.log('gr verdict:',w.document.getElementById('verdict').textContent.slice(0,100));}
 // bookmark generator
 const btn=w.document.querySelector('.bmrow .btn');let copied;w.document.execCommand=()=>{copied=w.document.querySelector('textarea').value;return true;};
 btn.click();await sleep(100);console.log('bm len',copied&&copied.length,copied&&decodeURIComponent(copied.slice(11)).includes(cfg.url),copied&&!decodeURIComponent(copied.slice(11)).includes('__URL__'));
 process.exit(0);
})();
