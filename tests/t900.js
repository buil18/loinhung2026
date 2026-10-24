const {makeServer}=require('./mocks.js');
const srv=makeServer('../apps-script/Code.gs');const x=srv.x;
const L=(i,q,l,n,t)=>({LineType:t||'S',ProductCode:i,ProductName:'sp'+i,UOM:'CS',Qty:q,LastStatus:l,NextStatus:n,UnitPrice:1,ShipTo:'1',Carrier:'2',PO:'p',SoldToName:'c',OrderNumber:'',LineNumber:'1'});
function run(mainSt,giftSt){
 const mk=(no,type,st)=>({OrderNumber:no,OrderType:type,lines:[Object.assign(L('10136266',10,st[0],st[1]),{OrderNumber:no})]});
 const jde={kind:'jde',mode:'order',links:{'1001':['1002']},orderSearch:{'1001':{resolved:true,found:true,tab:'SO'},'1002':{resolved:true,found:true,tab:'S5'}},layoutErrors:[],orders:[mk('1001','SO',mainSt),mk('1002','S5',giftSt)]};
 const sap=[{SalesOrder:'1001',MaHang:'10136266',SoLuong:-10},{SalesOrder:'1002',MaHang:'10136266',SoLuong:-10}];
 const r=x.processCrossCheck({jde,sap,links:{'1001':['1002']}});
 return JSON.stringify(JSON.parse(JSON.stringify(r)).blocks.map(b=>[b.status,b.phase,b.reasons&&b.reasons[0]]));
}
console.log('900>999 both:',run(['900','999'],['900','999']));
console.log('main 574>620, gift 900>999:',run(['574','620'],['900','999']));
console.log('main 545, gift 900>999 (mixed):',run(['540','545'],['900','999']));
