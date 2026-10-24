(function () { try {
if (window.__jdeCapture) { window.__jdeCapture.stop(); return; }
var hooked = [];
var timer = null;
var rtimer = null;
var atimer = null;
window.__jdeCapture = {
stop: function () {
clearInterval(timer);
clearInterval(rtimer);
clearInterval(atimer);
hooked.forEach(function (h) { try { h.proto.send = h.send; delete h.proto.__jdeHooked; } catch (e) {} });
var box = document.getElementById('__jdeCaptureBox');
if (box) box.remove();
delete window.__jdeCapture;
}
};
var COL = { order: 2, type: 3, line: 5, soldToName: 11, desc: 12, item: 13, qty: 14, uom: 15, requestDate: 20, shipTo: 22, lastStatus: 27, nextStatus: 28, po: 30, shipment: 35, unitPrice: 40 };
var CARRIER_OFFSET = 24;
var TABS = ['SO', 'S5', 'S6'];
var ORDER_TABS = ['SO', 'S5', 'S6', 'ST'];
var curTab = '';
function isStNo(no) { return /^\d{4}/.test(no) && Number(String(no).slice(0, 4)) < 6221; }
function tabsFor(no) { return isStNo(no) ? ['ST'] : TABS; }
var store = {};
var orderStore = {};
var links = null;
var mode = 'po';
var lastPo = '';
var warn = '';
var lastSearch = '';
var lastRead = '';
var flow = { start: Date.now(), copies: 0, pastes: 0, marks: [{ k: 'jde_open', at: Date.now() }] };
function withFlow(obj) {
var f = { start: flow.start, copies: flow.copies + 1, pastes: flow.pastes, marks: flow.marks.concat([{ k: 'jde_copy', at: Date.now() }]) };
flow = f;
obj.flow = f;
return obj;
}
function num(s) { return Number(String(s || '').replace(/,/g, '').trim()) || 0; }
function txt(s) { return String(s == null ? '' : s).trim(); }
function unescapeVal(s) { return s.replace(/\\(.)/g, function (m, c) { return c === 't' ? '\t' : c === 'n' ? '\n' : c; }); }
function parseEvts(text) {
var out = { reset: /EVT:226,FIRSTROW:0[,}]/.test(text), rows: [], complete: false, layoutErrors: [] };
var re = /\{VAL:"((?:[^"\\]|\\.)*)",EVT:203,/g;
var m;
while ((m = re.exec(text))) {
var cols = unescapeVal(m[1]).split('\t');
if (cols[1] === 'sigma.gif') { out.complete = true; continue; }
if (cols[1] !== 'blank.gif') continue;
var b = -1;
for (var i = COL.unitPrice; i < cols.length; i++) { if (/^\s+\d{4,}$/.test(cols[i])) { b = i; break; } }
var r = {
OrderNumber: txt(cols[COL.order]),
OrderType: txt(cols[COL.type]),
LineNumber: txt(cols[COL.line]),
SoldToName: txt(cols[COL.soldToName]),
ProductName: txt(cols[COL.desc]),
ProductCode: txt(cols[COL.item]),
Qty: num(cols[COL.qty]),
UOM: txt(cols[COL.uom]),
RequestDate: txt(cols[COL.requestDate]),
ShipTo: txt(cols[COL.shipTo]),
LastStatus: txt(cols[COL.lastStatus]),
NextStatus: txt(cols[COL.nextStatus]),
PO: txt(cols[COL.po]),
Shipment: txt(cols[COL.shipment]),
UnitPrice: num(cols[COL.unitPrice]),
LineType: b >= 0 ? txt(cols[b + 1]) : '',
Carrier: b >= 0 ? txt(cols[b + CARRIER_OFFSET]) : ''
};
var bad = [];
if (!/^\d{6,}$/.test(r.OrderNumber)) bad.push('Order Number');
if (!/^[A-Z0-9]{2}$/.test(r.OrderType)) bad.push('Or Ty');
if (!/^\d+$/.test(r.ProductCode)) bad.push('2nd Item Number');
if (!/^[\d,]*\.\d+$|^\d+$/.test(txt(cols[COL.qty]))) bad.push('Quantity');
if (!/^[A-Z]{2,3}$/.test(r.UOM)) bad.push('UOM');
if (!/^\d{3}$/.test(r.NextStatus)) bad.push('Next Status');
if (!r.LineType) bad.push('Line Type');
if (!/^\d+$/.test(r.Carrier)) bad.push('Carrier');
if (bad.length) out.layoutErrors.push('Dòng ' + r.LineNumber + ' đơn ' + r.OrderNumber + ': không đọc được ' + bad.join(', ') + '. Bố cục lưới JDE khác mẫu.');
out.rows.push(r);
}
return out;
}
function docsOf(win) {
var list = [];
function walk(w) {
try { if (w.document) list.push(w.document); } catch (e) { return; }
try { for (var i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {}
}
try { list.push(win.document); } catch (e) {}
walk(window);
return list;
}
function readByTitle(doc, title) {
var inputs = doc.querySelectorAll('input');
var found = null;
for (var i = 0; i < inputs.length; i++) {
if (txt(inputs[i].getAttribute('title')) !== title) continue;
if (/^C0_/.test(inputs[i].id || '')) return txt(inputs[i].value);
if (found === null) found = txt(inputs[i].value);
}
return found;
}
function readScreen(win, rows) {
var info = { tab: '', po: null, orderNo: null, orderType: '' };
var TAB_RE = /\(\s*(SO|S5|S6|ST)\s*\)[^\n]{0,15}Customer Service Inquiry/i;
docsOf(win).some(function (doc) {
try {
var orderNo = readByTitle(doc, 'Order Number');
var po = readByTitle(doc, 'Customer PO');
if (orderNo === null && po === null) return false;
var ot = readByTitle(doc, 'Order Type');
var bodyText = doc.body ? (doc.body.innerText || doc.body.textContent || '') : '';
var mt = bodyText.match(TAB_RE) || String(doc.title || '').match(TAB_RE);
if (ot) info.orderType = ot.toUpperCase();
if (ot && /^(SO|S5|S6|ST)$/i.test(ot)) info.tab = ot.toUpperCase();
else if (ot === '*') info.tab = 'ALL';
else if (mt) info.tab = mt[1].toUpperCase();
if (orderNo !== null) info.orderNo = orderNo.replace(/\*/g, '');
if (po !== null) info.po = po.replace(/\*/g, '');
return true;
} catch (e) { return false; }
});
if (!info.tab && rows.length) {
var types = Array.from(new Set(rows.map(function (r) { return r.OrderType; })));
if (types.length === 1 && ORDER_TABS.indexOf(types[0]) >= 0) info.tab = types[0];
}
return info;
}
function waitText(st) { return curTab === 'ALL' ? '→ chưa tìm' : '→ tìm ở tab ' + st.next; }
function show(v) { return v === null ? '(không thấy ô)' : v === '' ? '(trống)' : v; }
function reject(msg) { warn = msg + ' Lần tìm này không được ghi nhận.'; render(); }
function onResponse(text, win) {
if (!text || typeof text !== 'string' || text.indexOf('EVTS') < 0 || text.indexOf('EVT:203') < 0) return;
var parsed = parseEvts(text);
if (!parsed.rows.length && !parsed.complete) return;
var screen = readScreen(win, parsed.rows);
lastRead = 'Đọc từ form: Order Number = ' + show(screen.orderNo) + ' · Customer PO = ' + show(screen.po) + ' · Order Type = ' + (screen.orderType || '?');
if (!screen.po && !screen.orderNo && parsed.rows.length) {
var nos = Array.from(new Set(parsed.rows.map(function (r) { return r.OrderNumber; })));
if (nos.length === 1 && links && expectedOrders().indexOf(nos[0]) >= 0) {
screen.orderNo = nos[0];
lastRead += ' · số đơn lấy từ bảng: ' + nos[0];
}
}
lastSearch = 'Tab ' + (screen.tab || '?') + ' · ' + (screen.po ? 'PO ' + screen.po : screen.orderNo ? 'đơn ' + screen.orderNo : 'không có điều kiện') + ' · ' + (parsed.rows.length ? parsed.rows.length + ' dòng' : 'không có dòng') + (parsed.complete ? '' : ' (chưa tải hết)') + ' · ' + new Date().toLocaleTimeString('vi-VN');
if (!screen.tab) return reject('Không nhận ra tab JDE (SO/S5/S6/ST) trên màn hình.');
curTab = screen.tab;
if (screen.tab === 'ALL' && screen.po) return reject('Màn hình tìm chung chỉ dùng để tìm theo mã đơn, không tìm theo Customer PO.');
if (screen.po === null) return reject('Không đọc được ô Customer PO trên màn hình.');
if (screen.orderNo === null) return reject('Không đọc được ô Order Number trên màn hình.');
sentSig = '';
var entry = { rows: {}, complete: false, layoutErrors: [], at: new Date().toLocaleTimeString('vi-VN') };
var fill = function (t) {
parsed.rows.forEach(function (r) { t.rows[r.OrderNumber + '|' + r.LineNumber] = r; });
t.layoutErrors = t.layoutErrors.concat(parsed.layoutErrors);
if (parsed.complete) t.complete = true;
};
if (screen.po) {
if (screen.orderNo) return reject('Tab ' + screen.tab + ': khi tìm theo Customer PO, hãy để trống ô Order Number.');
if (parsed.rows.some(function (r) { return r.PO !== screen.po; })) return reject('Tab ' + screen.tab + ': có dòng không thuộc PO ' + screen.po + '.');
warn = '';
mode = 'po';
lastPo = screen.po;
var s = store[screen.po] || (store[screen.po] = { po: screen.po, tabs: {} });
if (!s.tabs[screen.tab] || parsed.reset) s.tabs[screen.tab] = entry;
fill(s.tabs[screen.tab]);
} else if (screen.orderNo) {
if (parsed.rows.some(function (r) { return r.OrderNumber !== screen.orderNo; })) return reject('Tab ' + screen.tab + ': có dòng không thuộc đơn ' + screen.orderNo + '.');
warn = '';
mode = 'order';
var o = orderStore[screen.orderNo] || (orderStore[screen.orderNo] = { tabs: {} });
if (!o.tabs[screen.tab] || parsed.reset) o.tabs[screen.tab] = entry;
fill(o.tabs[screen.tab]);
} else {
return reject('Tab ' + screen.tab + ': hãy nhập Order Number (hoặc Customer PO) trước khi tìm.');
}
render();
}
function collectOrders(entries, orders, tabName) {
var layoutErrors = [];
entries.forEach(function (t) {
layoutErrors = layoutErrors.concat(t.layoutErrors);
Object.keys(t.rows).forEach(function (k) {
var r = t.rows[k];
var o = orders[r.OrderNumber] || (orders[r.OrderNumber] = { OrderNumber: r.OrderNumber, OrderType: r.OrderType, Tab: tabName(t), lines: [] });
o.lines.push(r);
});
});
return layoutErrors;
}
function buildPoPayload(s) {
var orders = {};
var tabs = {};
var entries = [];
TABS.forEach(function (tab) {
var t = s.tabs[tab];
tabs[tab] = { searched: !!t, complete: !!(t && t.complete), lines: t ? Object.keys(t.rows).length : 0 };
if (t) { t.tab = tab; entries.push(t); }
});
var layoutErrors = collectOrders(entries, orders, function (t) { return t.tab; });
return { kind: 'jde', mode: 'po', po: s.po, capturedAt: new Date().toISOString(), tabs: tabs, layoutErrors: layoutErrors, orders: Object.keys(orders).map(function (k) { return orders[k]; }) };
}
function orderState(no) {
var o = orderStore[no] || { tabs: {} };
var all = o.tabs.ALL;
if (all) {
if (!all.complete) return { resolved: false, found: false, next: 'ALL', loading: true };
var keys = Object.keys(all.rows);
if (keys.length) return { resolved: true, found: true, tab: 'ALL', type: all.rows[keys[0]].OrderType };
return { resolved: true, found: false };
}
var seq = tabsFor(no);
for (var i = 0; i < seq.length; i++) {
var t = o.tabs[seq[i]];
if (!t) return { resolved: false, found: false, next: seq[i] };
if (!t.complete) return { resolved: false, found: false, next: seq[i], loading: true };
if (Object.keys(t.rows).length) return { resolved: true, found: true, tab: seq[i] };
}
return { resolved: true, found: false };
}
function expectedOrders() {
var list = [];
Object.keys(links || {}).forEach(function (main) {
[main].concat(links[main]).forEach(function (no) { if (list.indexOf(no) < 0) list.push(no); });
});
return list;
}
function buildOrderPayload() {
var orders = {};
var orderSearch = {};
var entries = [];
expectedOrders().forEach(function (no) {
var st = orderState(no);
orderSearch[no] = st;
if (st.found) { var t = orderStore[no].tabs[st.tab]; t.tab = st.type || st.tab; entries.push(t); }
});
var layoutErrors = collectOrders(entries, orders, function (t) { return t.tab; });
return { kind: 'jde', mode: 'order', po: '', capturedAt: new Date().toISOString(), links: links, orderSearch: orderSearch, tabs: {}, layoutErrors: layoutErrors, orders: Object.keys(orders).map(function (k) { return orders[k]; }) };
}
var RELAY = { url: '__URL__', key: '__KEY__' };
var rs = 'đang kiểm tra...';
var relayOk = false;
var sentSig = '';
var newHint = '';
function hhmmss() { return new Date().toLocaleTimeString('vi-VN'); }
var transport = '';
var canRead = false;
function jsonp(params) {
return new Promise(function (resolve, reject) {
var cb = '__rly' + Math.random().toString(36).slice(2);
var s = document.createElement('script');
var t = setTimeout(function () { cleanup(); reject(new Error('script: quá thời gian')); }, 8000);
function cleanup() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
window[cb] = function (j) { cleanup(); resolve(j); };
s.onerror = function () { cleanup(); reject(new Error('script: bị chặn')); };
s.src = RELAY.url + '?k=' + encodeURIComponent(RELAY.key) + '&' + params + '&callback=' + cb;
(document.head || document.documentElement).appendChild(s);
});
}
function xhrReq(method, url, body) {
return new Promise(function (resolve, reject) {
var x = new XMLHttpRequest();
x.open(method, url);
if (body) x.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
x.onload = function () { try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(new Error('xhr: phản hồi lạ')); } };
x.onerror = function () { reject(new Error('xhr: bị chặn')); };
x.send(body || null);
});
}
function formPost(body) {
return new Promise(function (resolve) {
var name = '__rlyf' + Math.random().toString(36).slice(2);
var f = document.createElement('iframe');
f.name = name;
f.style.display = 'none';
var form = document.createElement('form');
form.method = 'POST';
form.action = RELAY.url;
form.target = name;
form.style.display = 'none';
var inp = document.createElement('input');
inp.type = 'hidden';
inp.name = 'payload';
inp.value = body;
form.appendChild(inp);
var root = document.body || document.documentElement;
root.appendChild(f);
root.appendChild(form);
form.submit();
setTimeout(function () { try { form.remove(); f.remove(); } catch (e) {} resolve({ ok: true }); }, 4000);
});
}
function check(j) { if (!j || !j.ok) throw new Error('key'); return j; }
function rGet(params) {
var url = RELAY.url + '?k=' + encodeURIComponent(RELAY.key) + '&' + params;
if (transport === 'xhr') return xhrReq('GET', url).then(check);
if (transport === 'script') return jsonp(params).then(check);
return fetch(url).then(function (r) { return r.json(); }).then(check);
}
function rPut(order, part, data) {
var body = JSON.stringify({ k: RELAY.key, op: 'put', order: order, part: part, data: data });
var t0 = Date.now();
if (transport === 'xhr') return xhrReq('POST', RELAY.url, body).then(check);
if (transport === 'form') return formPost(body);
if (transport === 'script') {
return formPost(body).then(function () {
return rGet('op=recent').then(function (r) {
var o = (r.orders || []).filter(function (x) { return x.order === order; })[0];
if (!o || !o.parts[part] || o.parts[part].at < t0) throw new Error('chưa lưu được');
return { ok: true };
});
});
}
return fetch(RELAY.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }).then(function (r) { return r.json(); }).then(check).catch(function (e) {
if (e && e.message === 'key') throw e;
return fetch(RELAY.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }).then(function () { return { ok: true }; });
});
}
function detectTransport() {
var errs = [];
var tries = [
['fetch', function () { return fetch(RELAY.url + '?k=' + encodeURIComponent(RELAY.key) + '&op=ping').then(function (r) { return r.json(); }).then(check); }],
['xhr', function () { return xhrReq('GET', RELAY.url + '?k=' + encodeURIComponent(RELAY.key) + '&op=ping').then(check); }],
['script', function () { return jsonp('op=ping').then(check); }]
];
var p = Promise.reject(new Error('start'));
tries.forEach(function (t) {
p = p.catch(function () {
transport = t[0];
return t[1]().then(function () { return t[0]; }, function (e) { errs.push(t[0] + ': ' + ((e && e.message) || e)); throw e; });
});
});
return p.then(function (name) { canRead = true; return name; }, function () {
transport = 'form';
canRead = false;
return Promise.reject(errs.join(' | '));
});
}
function pullLinks(force) {
if (!relayOk || !canRead) return;
rGet('op=recent').then(function (r) {
var list = (r.orders || []).filter(function (o) { return o.parts && o.parts.gr; });
if (!list.length) return;
list.sort(function (x, y) { return y.parts.gr.at - x.parts.gr.at; });
var o = list[0];
var current = expectedOrders().indexOf(o.order) >= 0;
if (links && !force) {
if (!current) { var changed = newHint !== o.order; newHint = sentSig ? '' : o.order; if (sentSig) { force = true; } else if (changed) render(); }
if (!force) return;
}
return rGet('op=get&order=' + o.order + '&part=gr').then(function (g) {
if (!g.data || !g.data.links) return;
links = g.data.links;
mode = 'order';
warn = '';
var gf = g.data.flow;
flow = { start: gf && gf.start ? gf.start : Date.now(), copies: 0, pastes: 0, marks: (gf && gf.marks ? gf.marks.slice() : []).concat([{ k: 'jde_paste', at: Date.now() }]) };
sentSig = '';
newHint = '';
rs = '✔ đã nhận đơn ' + o.order + ' từ glassRUN lúc ' + hhmmss();
render();
});
}).catch(function () {});
}
function autoSend(ok) {
if (!relayOk || !ok) return;
var mains = Object.keys(links || {});
if (mains.length !== 1) return;
var payload = buildOrderPayload();
var sig = JSON.stringify([payload.orders, payload.orderSearch]);
if (sig === sentSig) return;
sentSig = sig;
payload.flow = { start: flow.start, copies: 0, pastes: 0, marks: flow.marks.concat([{ k: 'jde_copy', at: Date.now() }]) };
rPut(mains[0], 'jde', payload).then(function () { rs = '✔ đã gửi dữ liệu JDE đơn ' + mains[0] + ' lúc ' + hhmmss(); render(); }).catch(function () { sentSig = ''; rs = '✗ gửi lỗi, dùng nút Copy bên dưới'; render(); });
}
function extra(box) {
if (!relayOk || !canRead) return;
addButton(box, newHint ? 'Lấy đơn mới ' + newHint + ' từ glassRUN' : 'Lấy đơn mới nhất từ glassRUN', !!newHint, function () { pullLinks(true); }, !newHint);
}
function legacyCopy(text) {
var ta = document.createElement('textarea');
ta.value = text;
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
ta.remove();
}
function applyLinksText(t) {
try {
var p = JSON.parse(t);
if (p.kind !== 'glassRunLinks' || !p.links || !Object.keys(p.links).length) throw new Error();
links = p.links;
if (p.flow && p.flow.start) flow = { start: p.flow.start, copies: p.flow.copies || 0, pastes: p.flow.pastes || 0, marks: (p.flow.marks || []).slice() };
flow.pastes += 1;
flow.marks.push({ k: 'jde_paste', at: Date.now() });
mode = 'order';
warn = '';
return true;
} catch (e) { warn = 'Nội dung vừa lấy không phải danh sách đơn từ GR Capture (hãy bấm Copy đơn ở glassRUN trước).'; return false; }
}
function pasteLinks() {
var t = prompt('Dán liên kết đơn tặng vừa copy từ GR Capture (glassRUN) rồi bấm OK:');
if (!t) return;
applyLinksText(t);
render();
}
function clipLinks() {
var go = function (t) { if (applyLinksText(t)) startAuto(); render(); };
if (navigator.clipboard && navigator.clipboard.readText) {
navigator.clipboard.readText().then(go).catch(function () { var t = prompt('Không đọc được clipboard. Dán danh sách đơn vừa copy từ GR Capture rồi bấm OK:'); if (t) go(t); });
} else { var t = prompt('Dán danh sách đơn vừa copy từ GR Capture rồi bấm OK:'); if (t) go(t); }
}
var auto = { on: false, cur: '', curTab: '', at: 0, msg: '' };
function findForm() {
var docs = docsOf(window);
for (var i = 0; i < docs.length; i++) {
try {
var el = docs[i].getElementById('C0_9');
if (el && txt(el.getAttribute('title')) === 'Order Number') return { doc: docs[i], el: el };
} catch (e) {}
}
return null;
}
function setVal(el, v) {
var win = el.ownerDocument.defaultView;
var d = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value');
el.focus();
if (d && d.set) d.set.call(el, v); else el.value = v;
['input', 'change'].forEach(function (n) { el.dispatchEvent(new win.Event(n, { bubbles: true })); });
el.blur();
}
function pressFind(doc) {
var b = doc.getElementById('hc_Find');
if (b) { b.click(); return true; }
try {
var w = doc.defaultView;
if (w.JDEDTAFactory) { w.JDEDTAFactory.getInstance('').post('0_28'); return true; }
} catch (e) {}
return false;
}
function stopAuto(msg) { auto.on = false; auto.cur = ''; auto.msg = msg || ''; render(); }
function startAuto() {
if (!links) return;
auto.on = true;
auto.cur = '';
auto.msg = 'Đang chạy tự động...';
render();
}
function autoTick() {
if (!auto.on || !links) return;
var f = findForm();
if (!f) { if (auto.msg.indexOf('Không thấy') !== 0) { auto.msg = 'Không thấy ô Order Number. Mở màn hình Customer Service Inquiry (tab SO, S5, S6, ST hoặc màn hình tìm chung).'; render(); } return; }
var ot = f.doc.getElementById('C0_13');
var tab = ot ? txt(ot.value).toUpperCase() : '';
if (auto.cur) {
var t = orderStore[auto.cur] && orderStore[auto.cur].tabs[auto.curTab];
if (t && t.complete) auto.cur = '';
else if (Date.now() - auto.at > (t ? 10000 : 20000)) return stopAuto(t ? 'Đơn ' + auto.cur + ': lưới chưa tải hết. Cuộn lưới xuống cuối rồi bấm Chạy tự động lại.' : 'Đơn ' + auto.cur + ': JDE không trả kết quả sau 20 giây. Kiểm tra màn hình rồi bấm Chạy tự động lại.');
else return;
}
if (tab === '*' || tab === '') tab = 'ALL';
curTab = tab;
if (ORDER_TABS.indexOf(tab) < 0 && tab !== 'ALL') { auto.msg = 'Không nhận ra tab hiện tại (cần SO, S5, S6, ST hoặc ô loại đơn là *).'; render(); return; }
var list = expectedOrders();
var pick = '';
var needTab = '';
for (var i = 0; i < list.length; i++) {
var st = orderState(list[i]);
if (st.resolved) continue;
if (tab === 'ALL' || st.next === tab) { pick = list[i]; break; }
if (!needTab) needTab = st.next;
}
if (!pick) {
if (needTab) { var m = 'Xong tab ' + tab + '. Chuyển sang tab ' + needTab + ' để chạy tiếp.'; if (auto.msg !== m) { auto.msg = m; render(); } return; }
return stopAuto('Đã tìm xong tất cả các đơn.');
}
var po = f.doc.getElementById('C0_19');
if (po && txt(po.value) !== '' && txt(po.value) !== '*') setVal(po, '*');
setVal(f.el, pick);
auto.cur = pick;
auto.curTab = tab;
auto.at = Date.now();
auto.msg = 'Đang tìm đơn ' + pick + (tab === 'ALL' ? ' trên màn hình tìm chung...' : ' ở tab ' + tab + '...');
setTimeout(function () { if (!pressFind(f.doc)) stopAuto('Không bấm được nút Find. Bạn bấm Find bằng tay.'); else render(); }, 250);
}
function autoButtons(box, done) {
if (auto.msg) {
var d = document.createElement('div');
d.style.cssText = 'margin-top:8px;padding:6px 8px;border-radius:6px;background:#eef3ff;color:#1a3f99;font-size:12px';
d.textContent = auto.msg;
box.appendChild(d);
}
if (auto.on) addButton(box, 'Dừng tự động', true, function () { stopAuto('Đã dừng.'); }, true);
else if (!done) addButton(box, 'Chạy tự động (điền mã + Find)', true, startAuto);
}
function addButton(box, label, enabled, onClick, secondary) {
var btn = document.createElement('button');
btn.textContent = label;
btn.disabled = !enabled;
btn.style.cssText = 'margin-top:8px;width:100%;padding:9px 12px;border-radius:8px;font-weight:bold;cursor:' + (enabled ? 'pointer' : 'not-allowed') + ';' + (secondary ? 'background:#fff;color:#1a5fd8;border:1px solid #1a5fd8' : 'border:none;background:' + (enabled ? '#1a5fd8' : '#dfe3ea') + ';color:' + (enabled ? '#fff' : '#6b7486'));
btn.onclick = onClick;
box.appendChild(btn);
return btn;
}
function copyButton(box, label, enabled, build) {
var btn = addButton(box, label, enabled, function () {
var data = JSON.stringify(withFlow(build()));
var done = function () { btn.textContent = 'Đã copy ✔ – sang tab SAP'; };
if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(data).then(done).catch(function () { legacyCopy(data); done(); }); }
else { legacyCopy(data); done(); }
});
}
var LINE = 'display:flex;gap:8px;padding:3px 0;border-top:1px solid #eef1f5';
var OK = 'color:#137a3a', BAD = 'color:#c0262d', WAIT = 'color:#a15c00';
function render() {
var box = document.getElementById('__jdeCaptureBox');
if (!box) {
box = document.createElement('div');
box.id = '__jdeCaptureBox';
box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;border:1px solid #d5dbe5;border-top:4px solid #1a5fd8;border-radius:10px;padding:12px 14px;font:13px/1.45 Arial,sans-serif;color:#1d2433;box-shadow:0 8px 24px rgba(0,0,0,.18);width:310px;max-height:70vh;overflow:auto';
(document.body || document.documentElement).appendChild(box);
}
var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:#1a5fd8">JDE Capture' + (mode === 'order' ? ' <span style="color:#6b7486;font-weight:600">· theo mã đơn</span>' : '') + '</b>' + '<span id="__jdeClose" title="Tắt JDE Capture" style="cursor:pointer;color:#6b7486;font-size:16px;padding:0 4px">✕</span></div>';
if (warn) html += '<div style="background:#fdecec;color:#c0262d;padding:6px 8px;border-radius:6px;margin-bottom:8px">' + warn + '</div>';
html += '<div style="color:#6b7486;font-size:11px;margin-bottom:6px">Hộp thư: ' + rs + '</div>';
html += '<div style="color:#6b7486;font-size:11px;margin-bottom:6px">Lần tìm gần nhất: ' + (lastSearch || 'chưa nhận được lần tìm nào từ JDE') + '</div>';
if (lastRead) html += '<div style="color:#6b7486;font-size:11px;margin-bottom:6px">' + lastRead + '</div>';
if (mode === 'order' && !links) {
var searched = Object.keys(orderStore);
html += '<div style="color:#a15c00;margin-bottom:4px">Chưa có danh sách đơn. Bấm <b>Lấy danh sách từ clipboard và chạy</b> (sau khi Copy đơn ở glassRUN). Các lần tìm đã làm vẫn được giữ lại.</div>';
searched.forEach(function (no) {
var st = orderState(no);
html += '<div style="' + LINE + '"><b style="width:74px">' + no + '</b>' + (st.found ? '<span style="' + OK + '">✔ ' + (st.type || st.tab) + '</span>' : st.resolved ? '<span style="' + BAD + '">✗ không tìm thấy</span>' : '<span style="' + WAIT + '">' + waitText(st) + '</span>') + '</div>';
});
box.innerHTML = html;
addButton(box, 'Lấy danh sách từ clipboard và chạy', true, clipLinks);
addButton(box, 'Dán danh sách đơn (nhập tay)', true, pasteLinks, true);
autoButtons(box, true);
extra(box);
bindClose(box);
return;
}
if (mode === 'order') {
var exp = expectedOrders();
var p2 = buildOrderPayload();
exp.forEach(function (no) {
var st = p2.orderSearch[no];
var isMain = links.hasOwnProperty(no);
var state = st.found ? '<span style="' + OK + '">✔ ' + (st.type || st.tab) + '</span>' : st.resolved ? '<span style="' + BAD + '">✗ không tìm thấy (đã tìm SO, S5, S6, ST)</span>' : st.loading ? '<span style="' + WAIT + '">⏳ ' + st.next + ': lưới chưa tải hết</span>' : '<span style="' + WAIT + '">' + waitText(st) + '</span>';
html += '<div style="' + LINE + '"><b style="width:74px">' + no + '</b><span style="width:34px;color:#6b7486">' + (isMain ? 'chính' : 'tặng') + '</span>' + state + '</div>';
});
if (p2.layoutErrors.length) html += '<div style="background:#fdecec;color:#c0262d;padding:6px 8px;border-radius:6px;margin-top:8px">' + p2.layoutErrors[0] + '</div>';
box.innerHTML = html;
var allResolved = exp.every(function (no) { return p2.orderSearch[no].resolved; });
autoSend(allResolved && !p2.layoutErrors.length);
autoButtons(box, allResolved);
copyButton(box, allResolved ? 'Copy dữ liệu tra cứu' : 'Chưa tìm đủ – chưa copy được', allResolved && !p2.layoutErrors.length, buildOrderPayload);
addButton(box, 'Lấy danh sách mới từ clipboard và chạy', true, clipLinks, true);
addButton(box, 'Dán danh sách đơn khác', true, pasteLinks, true);
extra(box);
bindClose(box);
return;
}
var s = store[lastPo];
if (!s) {
html += '<div style="color:#6b7486">Copy đơn ở glassRUN, rồi bấm <b>Lấy danh sách từ clipboard và chạy</b>. Tool tự điền từng mã đơn và bấm Find, bạn chỉ chuyển tab SO → S5 → S6 khi được nhắc.</div>';
box.innerHTML = html;
addButton(box, 'Lấy danh sách từ clipboard và chạy', true, clipLinks);
addButton(box, 'Dán danh sách đơn (nhập tay)', true, pasteLinks, true);
extra(box);
bindClose(box);
return;
}
var p = buildPoPayload(s);
var ready = TABS.every(function (tab) { return p.tabs[tab].searched && p.tabs[tab].complete; }) && !p.layoutErrors.length;
html += '<div style="margin-bottom:6px">PO <b>' + s.po + '</b></div>';
TABS.forEach(function (tab) {
var t = p.tabs[tab];
var ords = p.orders.filter(function (o) { return o.Tab === tab; }).map(function (o) { return o.OrderNumber; });
var state = !t.searched ? '<span style="' + BAD + '">✗ chưa tìm</span>' : !t.complete ? '<span style="' + WAIT + '">⏳ lưới chưa tải hết, cuộn xuống cuối</span>' : '<span style="' + OK + '">✔ ' + (ords.length ? ords.join(', ') : 'không có đơn') + '</span>';
html += '<div style="' + LINE + '"><b style="width:26px">' + tab + '</b>' + state + '</div>';
});
if (p.layoutErrors.length) html += '<div style="background:#fdecec;color:#c0262d;padding:6px 8px;border-radius:6px;margin-top:8px">' + p.layoutErrors[0] + '</div>';
box.innerHTML = html;
copyButton(box, ready ? 'Copy dữ liệu PO ' + s.po : 'Chưa đủ 3 tab – chưa copy được', ready, function () { return buildPoPayload(store[lastPo]); });
extra(box);
bindClose(box);
}
function bindClose(box) {
var x = box.querySelector('#__jdeClose');
if (x) x.onclick = function () { window.__jdeCapture.stop(); };
}
function hook(win) {
try {
if (!win.XMLHttpRequest || win.XMLHttpRequest.prototype.__jdeHooked) return;
var proto = win.XMLHttpRequest.prototype;
var origSend = proto.send;
proto.send = function () {
this.addEventListener('load', function () {
try { if (this.responseType === '' || this.responseType === 'text') onResponse(this.responseText, win); } catch (e) {}
});
return origSend.apply(this, arguments);
};
proto.__jdeHooked = true;
hooked.push({ proto: proto, send: origSend });
} catch (e) {}
}
function hookAll(win) {
hook(win);
try { for (var i = 0; i < win.frames.length; i++) hookAll(win.frames[i]); } catch (e) {}
}
detectTransport().then(function (name) { relayOk = true; rs = '✔ đã kết nối hộp thư (' + name + ')'; pullLinks(false); render(); rtimer = setInterval(function () { pullLinks(false); }, 5000); }, function (errs) { relayOk = true; rs = '⚠ trang JDE chặn nhận dữ liệu (' + errs + '). Dán danh sách đơn như cũ, dữ liệu JDE vẫn tự gửi đi (chưa kiểm chứng).'; render(); });
hookAll(window);
timer = setInterval(function () { hookAll(window); }, 1000);
atimer = setInterval(autoTick, 800);
render();
} catch (e) { alert('JDE Capture lỗi: ' + (e && e.message)); } })();
