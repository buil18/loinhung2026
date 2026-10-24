(function () {
if (window.__sapAgent) { window.__sapAgent.stop(); return; }
var RELAY = { url: '__URL__', key: '__KEY__' };
function legacy() { var sapPasteAt = Date.now(); var text = prompt('Dán dữ liệu PO vừa copy từ JDE (Ctrl+V) rồi bấm OK:'); if (!text) return; var jde; try { jde = JSON.parse(text); } catch (e) { alert('Dữ liệu không hợp lệ. Hãy bấm "Copy dữ liệu PO" trên tab JDE rồi thử lại.'); return; } if (!jde || jde.kind !== 'jde' || !Array.isArray(jde.orders)) { alert('Đây không phải dữ liệu từ JDE Capture. Hãy copy lại trên tab JDE.'); return; } var soOrders = jde.orders.filter(function (o) { return o.OrderType === 'SO'; }).map(function (o) { return String(o.OrderNumber).trim(); }); var filter = soOrders.map(function (no) { return "SalesOrder eq '" + no + "'"; }).join(' or '); var sapUrl = '/sap/opu/odata/sap/ZUI_WM_TRUCK_TRACE_O2/ZWM_I_TRACK_TRACE?$format=json&$filter=(' + filter + ')'; (soOrders.length ? fetch(sapUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, credentials: 'same-origin' }) .then(function (r) { if (!r.ok) throw new Error('SAP trả về lỗi ' + r.status + '. Hãy đảm bảo đang đứng ở tab SAP và đã đăng nhập.'); return r.json(); }) : Promise.resolve({ d: { results: [] } })) .then(function (j) { var rows = (j.d && j.d.results) ? j.d.results : []; rows = rows.map(function (x) { var c = Object.assign({}, x); delete c.__metadata; return c; }); var sapFetchedAt = Date.now(); var count = {}; rows.forEach(function (r) { var k = String(r.SalesOrder || '').trim(); count[k] = (count[k] || 0) + 1; }); var box = document.getElementById('__sapFetchBox'); if (!box) { box = document.createElement('div'); box.id = '__sapFetchBox'; box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;border:1px solid #d5dbe5;border-top:4px solid #1a5fd8;border-radius:10px;padding:12px 14px;font:13px/1.45 Arial,sans-serif;color:#1d2433;box-shadow:0 8px 24px rgba(0,0,0,.18);width:300px'; document.body.appendChild(box); } var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:#1a5fd8">SAP Fetch</b>' + '<span id="__sapClose" title="Đóng" style="cursor:pointer;color:#6b7486;font-size:16px;padding:0 4px">✕</span></div>' + '<div style="margin-bottom:6px">' + (jde.mode === 'order' ? 'Theo mã đơn · nguồn ' + (jde.source || 'JDE') : 'PO <b>' + jde.po + '</b>') + '</div>'; soOrders.forEach(function (no) { html += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-top:1px solid #eef1f5"><span>' + no + '</span>' + (count[no] ? '<span style="color:#137a3a">✔ ' + count[no] + ' dòng SAP</span>' : '<span style="color:#6b7486">không có dòng SAP</span>') + '</div>'; }); if (!soOrders.length) html += '<div style="color:#c0262d">JDE không có đơn SO nào, không lấy được dữ liệu SAP. Web App sẽ báo chi tiết.</div>'; box.innerHTML = html; box.querySelector('#__sapClose').onclick = function () { box.remove(); }; var btn = document.createElement('button'); btn.textContent = 'Copy kết quả SAP'; btn.style.cssText = 'margin-top:10px;width:100%;padding:9px 12px;background:#1a5fd8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold'; btn.onclick = function () { var jf = jde.flow || null; var flow = jf ? { start: jf.start, copies: (jf.copies || 0) + 1, pastes: (jf.pastes || 0) + 1, marks: (jf.marks || []).concat([{ k: 'sap_paste', at: sapPasteAt }, { k: 'sap_fetched', at: sapFetchedAt }, { k: 'sap_copy', at: Date.now() }]) } : null; var data = JSON.stringify({ kind: 'crosscheck', jde: jde, sap: rows, flow: flow }); var done = function () { btn.textContent = 'Đã copy ✔ – dán vào Web App'; }; if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(data).then(done).catch(function () { legacyCopy(data); done(); }); } else { legacyCopy(data); done(); } }; box.appendChild(btn); }) .catch(function (err) { alert(err.message); }); function legacyCopy(t) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } }
function hhmmss() { return new Date().toLocaleTimeString('vi-VN'); }
function rGet(params) {
return fetch(RELAY.url + '?k=' + encodeURIComponent(RELAY.key) + '&' + params).then(function (r) { return r.json(); }).then(function (j) { if (!j || !j.ok) throw new Error('key'); return j; });
}
function rPut(order, part, data) {
var body = JSON.stringify({ k: RELAY.key, op: 'put', order: order, part: part, data: data });
return fetch(RELAY.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }).then(function (r) { return r.json(); }).then(function (j) { if (!j || !j.ok) throw new Error('key'); return j; }).catch(function (e) {
if (e && e.message === 'key') throw e;
return fetch(RELAY.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }).then(function () { return { ok: true }; });
});
}
var done = {};
var busy = {};
var tried = {};
var info = {};
var order = [];
var known = {};
var startAt = Date.now();
var GRACE = 120000;
var timer = null;
window.__sapAgent = {
stop: function () {
clearInterval(timer);
var b = document.getElementById('__sapAgentBox');
if (b) b.remove();
delete window.__sapAgent;
}
};
function sapRows(no) {
var field = /^\d{4}/.test(no) && Number(no.slice(0, 4)) < 6221 ? 'st' : 'SalesOrder';
var url = '/sap/opu/odata/sap/ZUI_WM_TRUCK_TRACE_O2/ZWM_I_TRACK_TRACE?$format=json&$filter=(' + field + " eq '" + no + "'" + ')';
return fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, credentials: 'same-origin' }).then(function (r) {
if (!r.ok) throw new Error('SAP trả về lỗi ' + r.status + '. Hãy đảm bảo đang đứng ở tab SAP và đã đăng nhập.');
return r.json();
}).then(function (j) {
var rows = (j.d && j.d.results) ? j.d.results : [];
return rows.map(function (x) { var c = Object.assign({}, x); delete c.__metadata; return c; });
});
}
function handle(o, force) {
var gr = o.parts && o.parts.gr;
if (!gr) return;
if (busy[o.order]) return;
if (!force) {
if (tried[o.order] === gr.at) return;
if (gr.at < startAt - GRACE) { tried[o.order] = gr.at; info[o.order] = '<span style="color:#6b7486">đơn cũ, không tự lấy</span>'; return; }
if (o.parts.sap) { tried[o.order] = gr.at; info[o.order] = '<span style="color:#137a3a">✔ đã có SAP trong hộp thư</span>'; return; }
}
busy[o.order] = true;
tried[o.order] = gr.at;
info[o.order] = '<span style="color:#a15c00">⏳ đang lấy SAP...</span>';
render();
sapRows(o.order).then(function (rows) {
return rPut(o.order, 'sap', { kind: 'sapRows', order: o.order, rows: rows, fetchedAt: Date.now() }).then(function () {
if (rows.length) { done[o.order] = gr.at; info[o.order] = '<span style="color:#137a3a">✔ ' + rows.length + ' dòng SAP · đã gửi ' + hhmmss() + '</span>'; }
else info[o.order] = '<span style="color:#a15c00">SAP chưa có dòng nào, đã dừng (bấm lấy lại nếu cần)</span>';
});
}).catch(function (e) {
info[o.order] = '<span style="color:#c0262d">✗ ' + (e && e.message === 'key' ? 'hộp thư từ chối (sai khóa)' : (e && e.message) || 'lỗi') + ' (đã dừng, bấm lấy lại)</span>';
}).then(function () { busy[o.order] = false; render(); });
}
function tick() {
rGet('op=recent').then(function (r) {
var list = (r.orders || []).filter(function (o) { return o.parts && o.parts.gr; });
list.sort(function (x, y) { return y.parts.gr.at - x.parts.gr.at; });
list = list.slice(0, 5);
order = list.map(function (o) { return o.order; });
list.forEach(function (o) { known[o.order] = o; handle(o, false); });
render();
}).catch(function () {});
}
function render() {
var box = document.getElementById('__sapAgentBox');
if (!box) {
box = document.createElement('div');
box.id = '__sapAgentBox';
box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;border:1px solid #d5dbe5;border-top:4px solid #1a5fd8;border-radius:10px;padding:12px 14px;font:13px/1.45 Arial,sans-serif;color:#1d2433;box-shadow:0 8px 24px rgba(0,0,0,.18);width:310px;max-height:70vh;overflow:auto';
(document.body || document.documentElement).appendChild(box);
}
var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:#1a5fd8">SAP Fetch · tự động</b><span id="__sapX" title="Tắt SAP Fetch" style="cursor:pointer;color:#6b7486;font-size:16px;padding:0 4px">✕</span></div>';
html += '<div style="color:#6b7486;font-size:11px;margin-bottom:6px">Đang đợi data từ glassRUN. Đơn nào được lọc trên glassRUN sẽ tự lấy SAP và gửi đi.</div>';
if (!order.length) html += '<div style="color:#6b7486">Chưa có đơn nào từ glassRUN.</div>';
order.forEach(function (no) {
html += '<div style="display:flex;gap:8px;justify-content:space-between;padding:3px 0;border-top:1px solid #eef1f5"><b>' + no + '</b><span>' + (info[no] || '<span style="color:#6b7486">chờ</span>') + '</span><a href="#" data-no="' + no + '" style="color:#1a5fd8">lấy lại</a></div>';
});
box.innerHTML = html;
box.querySelector('#__sapX').onclick = function () { window.__sapAgent.stop(); };
Array.prototype.forEach.call(box.querySelectorAll('a[data-no]'), function (a) {
a.onclick = function (ev) { ev.preventDefault(); handle(known[a.getAttribute('data-no')], true); };
});
var b = document.createElement('button');
b.textContent = 'Dán dữ liệu JDE (cách cũ)';
b.style.cssText = 'margin-top:8px;width:100%;padding:8px 12px;background:#fff;color:#1a5fd8;border:1px solid #1a5fd8;border-radius:8px;cursor:pointer;font-weight:bold';
b.onclick = function () { legacy(); };
box.appendChild(b);
}
rGet('op=ping').then(function () {
render();
tick();
timer = setInterval(tick, 5000);
}).catch(function () {
delete window.__sapAgent;
legacy();
});
})();
