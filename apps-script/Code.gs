function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.op) return relayApi_(p);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Đối soát JDE – SAP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ===== CẤU HÌNH =====
// Hai bước được phép đối soát (xét theo từng dòng hàng, trừ dòng két/vỏ):
// - Chờ SUP xác nhận: Next Status = 545. Đối soát để quyết định có xác nhận hay không.
// - Đã xác nhận (SUP đã xác nhận, đã ra hóa đơn): Last Status = 574, 620 hoặc 900, hoặc Next Status = 620
//   (574 → 620, 912 → 620, 620 → 999, 900 → 999...). Đối soát chỉ để kiểm tra lại.
const PRE_CONFIRM_NEXT = ['545'];
const CONFIRMED_LAST = ['574', '620', '900'];
const CONFIRMED_NEXT = ['620'];
const PHASE_LABEL = { pre: 'chờ SUP xác nhận', recheck: 'đã xác nhận' };
const STEP_HINT = 'Cần Next Status 545 (chờ SUP xác nhận), hoặc Last Status 574 / 620 / 900, hoặc Next Status 620 (đã xác nhận)';
// 3 tab JDE bắt buộc phải tìm theo PO trước khi đối soát.
const REQUIRED_TABS = ['SO', 'S5', 'S6'];
// Loại đơn luôn là đơn tặng. Đơn SO có mọi dòng giá = 0 cũng là đơn tặng.
const GIFT_ORDER_TYPES = ['S5', 'S6'];
// Loại dòng JDE không đối soát. DP = két/vỏ ký quỹ (Crt+Bot Own).
const EXCLUDED_LINE_TYPES = ['DP'];
// Last Status không đối soát. 980 = dòng đã hủy.
const EXCLUDED_LAST_STATUS = ['980'];
// Mã pallet: SAP không có dòng riêng cho pallet, mỗi dòng SAP = 1 pallet.
const PALLET_SKUS = ['10079799'];
// Nếu SAP có field mã pallet (SSCC/HU...), điền tên field để đếm không trùng. Để trống = đếm số dòng SAP.
const SAP_PALLET_ID_FIELD = '';
// Hệ số quy đổi SL SAP về đơn vị JDE, dạng '10079432': 24. Hiện cùng đơn vị nên để trống.
const SAP_TO_CASE_FACTOR = {};

function lineStep(l) {
  if (CONFIRMED_LAST.indexOf(l.LastStatus) >= 0 || CONFIRMED_NEXT.indexOf(l.NextStatus) >= 0) return 'recheck';
  if (PRE_CONFIRM_NEXT.indexOf(l.NextStatus) >= 0) return 'pre';
  return '';
}

function sapRowOrder_(r) {
  return String(r.SalesOrder || r.st || '').trim();
}

function normalizeSku(code) {
  return String(code || '').trim().replace(/^0+/, '');
}

// Chuẩn hóa đơn JDE. Đơn sẵn sàng khi mọi dòng cùng một bước: chờ xác nhận (Next 545) hoặc đã xác nhận (Last 574/620).
// Nguồn glassRUN không có trạng thái JDE nên không xét bước.
function normalizeOrders(jdeOrders, mode) {
  return (jdeOrders || []).map(o => {
    const lines = (o.lines || []).filter(l =>
      EXCLUDED_LINE_TYPES.indexOf(l.LineType) < 0 && EXCLUDED_LAST_STATUS.indexOf(l.LastStatus) < 0);
    const first = lines[0] || (o.lines || [])[0] || {};
    const isGift = o.IsGift === true || GIFT_ORDER_TYPES.indexOf(o.OrderType) >= 0 ||
      (o.OrderType !== 'ST' && !lines.some(l => Number(l.UnitPrice) > 0));
    const steps = lines.map(lineStep);
    const phase = mode === 'gr' ? '' : (steps.length && steps.every(x => x === 'pre') ? 'pre' : steps.length && steps.every(x => x === 'recheck') ? 'recheck' : '');
    return {
      no: o.OrderNumber, type: o.OrderType, lines: lines, isGift: isGift,
      phase: phase,
      ready: lines.length > 0 && (mode === 'gr' || phase !== ''),
      nextStatuses: Array.from(new Set(lines.map(l => l.LastStatus + '→' + l.NextStatus))).join(', '),
      key: [first.PO, first.ShipTo, first.Carrier].join('|'),
      shipTo: first.ShipTo, carrier: first.Carrier, customer: first.SoldToName
    };
  }).filter(o => o.lines.length);
}

function processCrossCheck(payload) {
  const jde = payload.jde || {};
  const sapRows = payload.sap || [];
  if (jde.mode === 'order') return processOrderMode(jde, sapRows, payload.links);

  const links = payload.links || null;
  const po = String(jde.po || '').trim();
  const result = { mode: 'po', source: 'JDE', po: po, tabs: jde.tabs || {}, errors: [], notes: [], blocks: [], hasLinks: !!links };

  // 1. Điều kiện dữ liệu đầu vào: đủ 3 tab, lưới tải hết, đúng bố cục
  if (!po) result.errors.push('Không xác định được số PO đã tìm trên JDE.');
  REQUIRED_TABS.forEach(tab => {
    const t = (jde.tabs || {})[tab];
    if (!t || !t.searched) result.errors.push(`Chưa tìm tab ${tab} theo PO ${po}.`);
    else if (!t.complete) result.errors.push(`Lưới tab ${tab} chưa tải hết dòng. Hãy cuộn xuống cuối lưới rồi copy lại.`);
  });
  (jde.layoutErrors || []).forEach(e => result.errors.push(e));
  if (result.errors.length) return result;

  // 2. Chuẩn hóa đơn hàng
  const orders = normalizeOrders(jde.orders, 'po');

  if (!orders.some(o => o.ready)) {
    result.errors.push(`Không có đơn nào của PO ${po} ở bước đối soát. ${STEP_HINT}.`);
    return result;
  }

  // 3. Gom nhóm theo khóa PO + Ship To + Carrier, mỗi đơn chính một khối
  const keys = Array.from(new Set(orders.map(o => o.key)));
  keys.forEach(key => {
    const inKey = orders.filter(o => o.key === key);
    const mains = inKey.filter(o => !o.isGift && o.ready);
    const gifts = inKey.filter(o => o.isGift);
    const readyGifts = gifts.filter(o => o.ready);
    if (!mains.length && !readyGifts.length) return;

    if (!mains.length) {
      result.blocks.push(blockedBlock(null, readyGifts,
        [`Không tìm thấy đơn chính ở bước đối soát cho đơn tặng ${readyGifts.map(g => g.no).join(', ')}. ${STEP_HINT}.`]));
      return;
    }

    // Gán đơn tặng cho đơn chính
    const assign = {};
    mains.forEach(m => { assign[m.no] = { gifts: [], reasons: [] }; });

    if (mains.length === 1 && !(links && links[mains[0].no])) {
      assign[mains[0].no].gifts = gifts;
    } else {
      if (!links) {
        mains.forEach(m => assign[m.no].reasons.push(
          `PO có ${mains.length} đơn chính cùng nhà xe và nơi giao (${mains.map(x => x.no).join(', ')}). ` +
          'Cần liên kết đơn tặng từ glassRUN để biết đơn tặng thuộc đơn nào.'));
      } else {
        const giftByNo = {};
        gifts.forEach(g => { giftByNo[g.no] = g; });
        const claimed = {};
        mains.forEach(m => {
          const linked = links[m.no];
          if (!linked) {
            assign[m.no].reasons.push(`Không có liên kết glassRUN cho đơn chính ${m.no}.`);
            return;
          }
          linked.forEach(no => {
            claimed[no] = true;
            if (giftByNo[no]) assign[m.no].gifts.push(giftByNo[no]);
            else assign[m.no].reasons.push(`Đơn tặng ${no} (theo glassRUN) không tìm thấy trên JDE với cùng PO, nơi giao và nhà xe.`);
          });
        });
        gifts.filter(g => !claimed[g.no]).forEach(g => {
          mains.forEach(m => assign[m.no].reasons.push(`Đơn tặng ${g.no} có trên JDE nhưng không thuộc liên kết glassRUN của đơn nào.`));
        });
      }
    }

    mains.forEach(m => {
      const a = assign[m.no];
      a.gifts.filter(g => !g.ready).forEach(g =>
        a.reasons.push(`Đơn tặng ${g.no} (${g.type}) chưa đúng bước đối soát (đang ${g.nextStatuses}). ${STEP_HINT}.`));
      a.gifts.filter(g => g.ready && g.phase !== m.phase).forEach(g =>
        a.reasons.push(`Đơn tặng ${g.no} đang ở bước "${PHASE_LABEL[g.phase]}", khác đơn chính ${m.no} ("${PHASE_LABEL[m.phase]}").`));
      const mainSap = sapRows.filter(r => sapRowOrder_(r) === m.no);
      if (!mainSap.length) a.reasons.push(`Không tìm thấy dữ liệu SAP cho đơn ${m.no}.`);
      result.blocks.push(a.reasons.length
        ? blockedBlock(m, a.gifts, a.reasons)
        : compareBlock(m, a.gifts, mainSap));
    });
  });

  // Đơn chưa sẵn sàng (để người dùng biết, không đối soát)
  const notReadyMains = orders.filter(o => !o.isGift && !o.ready);
  if (notReadyMains.length) {
    result.notes.push(`Bỏ qua ${notReadyMains.length} đơn chính chưa đúng bước đối soát: ` +
      notReadyMains.map(o => `${o.no} (${o.nextStatuses})`).join(', ') + '.');
  }
  if (!SAP_PALLET_ID_FIELD) result.notes.push('Số pallet SAP = số dòng SAP của đơn chính (mỗi dòng = 1 pallet).');
  return result;
}

// Đối soát theo mã đơn: nhóm đơn lấy từ liên kết glassRUN (đơn chính → đơn tặng).
// Nguồn JDE: mỗi mã đơn phải được tìm trên JDE theo thứ tự tab SO → S5 → S6, đơn phải có 620 ở Last hoặc Next Status.
// Nguồn glassRUN (người dùng không có JDE): dòng hàng lấy từ View Details, không xét trạng thái 620.
function processOrderMode(jde, sapRows, extraLinks) {
  const links = Object.assign({}, extraLinks || {}, jde.links || {});
  const search = jde.orderSearch || {};
  const isGr = jde.source === 'glassRUN';
  const src = isGr ? 'glassRUN' : 'JDE';
  const result = { mode: 'order', source: src, grStatus: jde.status || '', po: jde.po || '', tabs: {}, orderSearch: search, errors: [], notes: [], blocks: [], hasLinks: true };

  if (!Object.keys(links).length) {
    result.errors.push('Chưa có danh sách đơn từ glassRUN. Trên JDE Capture, bấm "Dán danh sách đơn" trước khi tìm theo mã đơn.');
  }
  (jde.layoutErrors || []).forEach(e => result.errors.push(e));
  if (result.errors.length) return result;

  const byNo = {};
  normalizeOrders(jde.orders, isGr ? 'gr' : 'order').forEach(o => { byNo[o.no] = o; });

  Object.keys(links).forEach(mainNo => {
    const giftNos = links[mainNo] || [];
    const reasons = [];

    [mainNo].concat(giftNos).forEach(no => {
      const s = search[no];
      if (!s || !s.resolved) reasons.push(`Chưa tìm đơn ${no} trên JDE.`);
      else if (!s.found) reasons.push(isGr
        ? `Không có dòng hàng của đơn ${no} trong chi tiết glassRUN (View Details).`
        : `Không tìm thấy đơn ${no} trên JDE (đã tìm SO, S5, S6, ST).`);
    });

    const main = byNo[mainNo];
    const gifts = giftNos.map(no => byNo[no]).filter(Boolean);
    if (main && main.isGift) reasons.push(`Đơn ${mainNo} không phải đơn chính (loại ${main.type}, không có dòng giá > 0).`);
    gifts.forEach(g => {
      if (!g.isGift) reasons.push(`Đơn ${g.no} có dòng giá > 0, không phải đơn tặng.`);
      if (main && (g.shipTo !== main.shipTo || g.carrier !== main.carrier)) {
        reasons.push(`Đơn tặng ${g.no} khác nơi giao hoặc nhà xe với đơn chính ${mainNo}.`);
      }
    });
    [main].concat(gifts).filter(Boolean).forEach(o => {
      if (!o.ready) reasons.push(`Đơn ${o.no} (${o.type}) chưa đúng bước đối soát (Last→Next: ${o.nextStatuses}). ${STEP_HINT}.`);
    });
    if (main && main.ready && !isGr) {
      gifts.filter(g => g.ready && g.phase !== main.phase).forEach(g =>
        reasons.push(`Đơn tặng ${g.no} đang ở bước "${PHASE_LABEL[g.phase]}", khác đơn chính ${mainNo} ("${PHASE_LABEL[main.phase]}").`));
    }
    if (isGr) {
      [main].concat(gifts).filter(Boolean).forEach(o => {
        const missing = o.lines.filter(l => !(Number(l.Qty) > 0));
        if (missing.length) reasons.push(`Đơn ${o.no}: ${missing.length} dòng thiếu số lượng trên glassRUN (${missing.slice(0, 5).map(l => normalizeSku(l.ProductCode) || '?').join(', ')}${missing.length > 5 ? ', ...' : ''}). Không so được, hãy kiểm tra lại View Details.`);
      });
    }

    const mainSap = sapRows.filter(r => sapRowOrder_(r) === mainNo);
    if (main && !mainSap.length) reasons.push(`Không tìm thấy dữ liệu SAP cho đơn ${mainNo}.`);

    const mainForBlock = main || { no: mainNo, type: '?', lines: [], shipTo: '', carrier: '', customer: '', nextStatuses: '' };
    result.blocks.push(reasons.length
      ? blockedBlock(mainForBlock, gifts, reasons)
      : compareBlock(main, gifts, mainSap));
  });

  result.notes.push('Dòng két/vỏ (Crt+Bot Own) không đối soát và không xét trạng thái.');
  result.notes.push(isGr
    ? 'Nguồn glassRUN (không qua JDE): số lượng lấy từ View Details, không kiểm tra bước xác nhận. Độ tin cậy thấp hơn nguồn JDE.'
    : 'Đối soát theo mã đơn: nhóm đơn lấy từ cột "Mã đơn hàng tặng" trên glassRUN, số lượng lấy từ JDE.');
  if (!SAP_PALLET_ID_FIELD) result.notes.push('Số pallet SAP = số dòng SAP của đơn chính (mỗi dòng = 1 pallet).');
  return result;
}

function blockedBlock(main, gifts, reasons) {
  return {
    phase: main && main.phase ? main.phase : '',
    main: main ? orderInfo(main) : null,
    gifts: gifts.map(orderInfo),
    status: 'blocked',
    reasons: reasons,
    items: [],
    summary: null
  };
}

function compareBlock(main, gifts, sapRows) {
  const palletSkus = PALLET_SKUS.map(normalizeSku);
  const map = {};
  const row = (sku, name, uom) => map[sku] || (map[sku] = { sku: sku, itemName: name, uom: uom, jdeQty: 0, parts: {}, sapQty: 0, isPallet: false });

  [main].concat(gifts).forEach(o => {
    o.lines.forEach(l => {
      const sku = normalizeSku(l.ProductCode);
      if (!sku) return;
      const r = row(sku, l.ProductName, l.UOM);
      const qty = Number(l.Qty) || 0;
      r.jdeQty += qty;
      r.parts[o.no] = (r.parts[o.no] || 0) + qty;
      if (l.LineType === 'RP' || palletSkus.indexOf(sku) >= 0) r.isPallet = true;
    });
  });

  sapRows.forEach(s => {
    const sku = normalizeSku(s.MaHang || s.ProductCode);
    if (!sku || palletSkus.indexOf(sku) >= 0) return;
    const factor = Number(SAP_TO_CASE_FACTOR[sku]) || 1;
    row(sku, s.ItemcodeDescription || s.ProductName || '(Không có trên JDE)', '').sapQty +=
      Math.abs(Number(s.SoLuong || s.ProductQuantity) || 0) / factor;
  });

  const palletCount = SAP_PALLET_ID_FIELD
    ? new Set(sapRows.map(r => r[SAP_PALLET_ID_FIELD]).filter(Boolean)).size
    : sapRows.length;
  const pallets = Object.values(map).filter(r => r.isPallet);
  if (pallets.length) pallets.forEach(p => { p.sapQty = palletCount; });
  else if (palletCount && palletSkus.length) {
    const p = row(palletSkus[0], 'Pallet (không có trên JDE)', 'PC');
    p.isPallet = true;
    p.sapQty = palletCount;
  }

  const rank = { error: 0, warning: 1, ok: 2 };
  const items = Object.values(map).map(r => {
    r.jdeQty = round3(r.jdeQty);
    r.sapQty = round3(r.sapQty);
    r.diff = round3(r.sapQty - r.jdeQty);
    r.parts = Object.keys(r.parts).map(no => ({ order: no, qty: round3(r.parts[no]) }));
    if (r.jdeQty === 0 && r.sapQty !== 0) { r.status = 'Ngoài đơn hàng'; r.level = 'warning'; }
    else if (r.sapQty === 0 && r.jdeQty !== 0) { r.status = 'Chưa có trên SAP'; r.level = 'error'; }
    else if (r.diff === 0) { r.status = 'Khớp'; r.level = 'ok'; }
    else { r.status = r.diff > 0 ? 'SAP thừa' : 'SAP thiếu'; r.level = 'warning'; }
    return r;
  }).sort((a, b) => (rank[a.level] - rank[b.level]) || (a.isPallet - b.isPallet) || a.sku.localeCompare(b.sku));

  const pallet = items.find(i => i.isPallet);
  const summary = {
    total: items.length,
    ok: items.filter(i => i.level === 'ok').length,
    warning: items.filter(i => i.level === 'warning').length,
    error: items.filter(i => i.level === 'error').length,
    palletJde: pallet ? pallet.jdeQty : 0,
    palletSap: pallet ? pallet.sapQty : 0,
    sapRows: sapRows.length
  };
  return {
    phase: main.phase || '',
    main: orderInfo(main),
    gifts: gifts.map(orderInfo),
    status: summary.ok === summary.total ? 'ok' : 'mismatch',
    reasons: [],
    items: items,
    summary: summary
  };
}

function orderInfo(o) {
  return { no: o.no, type: o.type, customer: o.customer, shipTo: o.shipTo, carrier: o.carrier, nextStatus: o.nextStatuses };
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}


// ===== HỘP THƯ TRUNG GIAN (3 tab tự gửi dữ liệu, không cần copy/dán) =====
// Mỗi bookmark gửi phần dữ liệu của mình lên đây theo số đơn chính. Trang đối soát tự ghép và chạy.
// Phần dữ liệu: gr = liên kết đơn tặng, grdata = dòng hàng glassRUN, jde = dòng hàng JDE, sap = dòng SAP.
const RELAY_TTL = 3600;
const RELAY_CHUNK = 30000;
const RELAY_RECENT_MS = 30 * 60 * 1000;
const RELAY_RESET_MS = 10 * 60 * 1000;
const RELAY_PARTS = ['gr', 'grdata', 'jde', 'sap'];

function relaySecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('RELAY_SECRET');
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    props.setProperty('RELAY_SECRET', secret);
  }
  return secret;
}

function getRelayConfig() {
  return { url: ScriptApp.getService().getUrl(), key: relaySecret_() };
}

function relayIndexRead_(cache) {
  const text = cache.get('fc|index');
  const idx = text ? JSON.parse(text) : {};
  const limit = Date.now() - RELAY_TTL * 1000;
  Object.keys(idx).forEach(no => {
    const last = Math.max.apply(null, RELAY_PARTS.map(p => (idx[no][p] && idx[no][p].at) || 0));
    if (last < limit) delete idx[no];
  });
  return idx;
}

function relayPut_(order, part, data) {
  order = String(order || '').trim();
  if (!/^\d{4,}$/.test(order) || RELAY_PARTS.indexOf(part) < 0) throw new Error('Sai số đơn hoặc loại dữ liệu.');
  const cache = CacheService.getScriptCache();
  const text = JSON.stringify(data);
  const n = Math.max(1, Math.ceil(text.length / RELAY_CHUNK));
  const base = 'fc|' + order + '|' + part;
  const puts = {};
  for (let i = 0; i < n; i++) puts[base + '#' + i] = text.substr(i * RELAY_CHUNK, RELAY_CHUNK);
  puts[base + '#n'] = String(n);
  cache.putAll(puts, RELAY_TTL);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const idx = relayIndexRead_(cache);
    const now = Date.now();
    const o = idx[order] || (idx[order] = {});
    if (part === 'gr' && o.gr && now - o.gr.at > RELAY_RESET_MS) {
      delete o.grdata; delete o.jde; delete o.sap; delete o.gr;
    }
    const p = o[part] || (o[part] = { first: now });
    p.at = now;
    cache.put('fc|index', JSON.stringify(idx), RELAY_TTL);
  } finally {
    lock.releaseLock();
  }
}

function relayGet_(order, part) {
  const cache = CacheService.getScriptCache();
  const idx = relayIndexRead_(cache);
  if (!idx[order] || !idx[order][part]) return null;
  const base = 'fc|' + order + '|' + part;
  const n = Number(cache.get(base + '#n'));
  if (!n) return null;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(base + '#' + i);
  const got = cache.getAll(keys);
  let text = '';
  for (let i = 0; i < n; i++) {
    if (got[keys[i]] == null) return null;
    text += got[keys[i]];
  }
  return JSON.parse(text);
}

function relayRecent_() {
  const idx = relayIndexRead_(CacheService.getScriptCache());
  const limit = Date.now() - RELAY_RECENT_MS;
  return Object.keys(idx).map(no => {
    const last = Math.max.apply(null, RELAY_PARTS.map(p => (idx[no][p] && idx[no][p].at) || 0));
    return { order: no, parts: idx[no], last: last };
  }).filter(o => o.last >= limit).sort((a, b) => b.last - a.last);
}

function relayJson_(obj, callback) {
  if (callback && /^[A-Za-z0-9_$.]{1,60}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function relayApi_(p) {
  const cb = p.callback;
  try {
    if (String(p.k || '') !== relaySecret_()) return relayJson_({ ok: false, error: 'key' }, cb);
    if (p.op === 'ping') return relayJson_({ ok: true, now: Date.now() }, cb);
    if (p.op === 'recent') return relayJson_({ ok: true, now: Date.now(), orders: relayRecent_() }, cb);
    if (p.op === 'get') return relayJson_({ ok: true, data: relayGet_(String(p.order || ''), String(p.part || '')) }, cb);
    return relayJson_({ ok: false, error: 'op' }, cb);
  } catch (err) {
    return relayJson_({ ok: false, error: String(err) }, cb);
  }
}

function doPost(e) {
  try {
    const raw = (e && e.parameter && e.parameter.payload) || (e && e.postData && e.postData.contents) || '{}';
    const req = JSON.parse(raw);
    if (String(req.k || '') !== relaySecret_()) return relayJson_({ ok: false, error: 'key' });
    if (req.op === 'ping') return relayJson_({ ok: true, now: Date.now() });
    if (req.op === 'put') {
      relayPut_(req.order, req.part, req.data);
      return relayJson_({ ok: true, now: Date.now() });
    }
    return relayJson_({ ok: false, error: 'op' });
  } catch (err) {
    return relayJson_({ ok: false, error: String(err) });
  }
}

// Trang đối soát gọi mỗi vài giây: danh sách đơn gần đây và phần dữ liệu đã có.
function relayState() {
  return { now: Date.now(), orders: relayRecent_() };
}

function relayClear(order) {
  order = String(order || '').trim();
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const idx = relayIndexRead_(cache);
    const targets = order ? [order] : Object.keys(idx);
    const keys = [];
    targets.forEach(no => {
      const o = idx[no];
      if (!o) return;
      RELAY_PARTS.forEach(p => {
        if (!o[p]) return;
        const base = 'fc|' + no + '|' + p;
        const n = Number(cache.get(base + '#n')) || 0;
        for (let i = 0; i < n; i++) keys.push(base + '#' + i);
        keys.push(base + '#n');
      });
      delete idx[no];
    });
    if (keys.length) cache.removeAll(keys);
    cache.put('fc|index', JSON.stringify(idx), RELAY_TTL);
    return { cleared: targets.length };
  } finally {
    lock.releaseLock();
  }
}

// Ghép dữ liệu của một đơn rồi đối soát bằng đúng logic cũ (processCrossCheck).
// useGr = true: không có JDE, dùng dòng hàng glassRUN.
function relayProcess(order, useGr) {
  order = String(order || '').trim();
  const idx = relayIndexRead_(CacheService.getScriptCache());
  const parts = idx[order] || {};
  const srcPart = useGr ? 'grdata' : 'jde';
  const gr = relayGet_(order, 'gr');
  const src = relayGet_(order, srcPart);
  const sap = relayGet_(order, 'sap');
  const waiting = [];
  if (!src) waiting.push(srcPart);
  if (!sap) waiting.push('sap');
  if (waiting.length) return { waiting: waiting, parts: parts, now: Date.now() };
  const links = (gr && gr.links) || src.links || {};
  const result = processCrossCheck({ jde: src, sap: sap.rows || [], links: links });
  return { waiting: [], result: result, parts: parts, now: Date.now(), useGr: !!useGr };
}
