(function () {
  if (window.__grCapture) {
    window.__grCapture.stop();
    return;
  }
  var PALLET_SKUS = ["10079799"];
  var flowStart = Date.now();
  var copies = 0;
  var curMain = "";
  var latest = [];
  var group = {};
  var details = {};
  var origSend = XMLHttpRequest.prototype.send;
  var origFetch = window.fetch;
  var watchTimer = null;
  window.__grCapture = {
    stop: function () {
      clearInterval(watchTimer);
      XMLHttpRequest.prototype.send = origSend;
      if (origFetch) window.fetch = origFetch;
      var box = document.getElementById("__grCaptureBox");
      if (box) box.remove();
      delete window.__grCapture;
    },
  };
  var RELAY = { url: "__URL__", key: "__KEY__" };
  var rs = "đang kiểm tra...";
  var sentSig = {};
  function hhmmss() {
    return new Date().toLocaleTimeString("vi-VN");
  }
  function rGet(params) {
    return origFetch
      .call(
        window,
        RELAY.url + "?k=" + encodeURIComponent(RELAY.key) + "&" + params,
      )
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok) throw new Error("key");
        return j;
      });
  }
  function rPut(order, part, data) {
    var body = JSON.stringify({
      k: RELAY.key,
      op: "put",
      order: order,
      part: part,
      data: data,
    });
    return origFetch
      .call(window, RELAY.url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: body,
      })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok) throw new Error("key");
        return j;
      })
      .catch(function (e) {
        if (e && e.message === "key") throw e;
        return origFetch
          .call(window, RELAY.url, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: body,
          })
          .then(function () {
            return { ok: true };
          });
      });
  }
  function flowOf() {
    return {
      start: flowStart,
      copies: 0,
      pastes: 0,
      marks: [
        { k: "gr_start", at: flowStart },
        { k: "gr_copy", at: Date.now() },
      ],
    };
  }
  function autoSend() {
    if (latest.length !== 1) return;
    var main = latest[0].main;
    var gifts = latest[0].gifts;
    var links = {};
    links[main] = gifts;
    var sig = JSON.stringify(links);
    if (sentSig[main + "|gr"] !== sig) {
      sentSig[main + "|gr"] = sig;
      rPut(main, "gr", {
        kind: "glassRunLinks",
        links: links,
        capturedAt: new Date().toISOString(),
        flow: flowOf(),
      })
        .then(function () {
          rs = "✔ đã gửi đơn " + main + " lúc " + hhmmss();
          render();
        })
        .catch(function () {
          sentSig[main + "|gr"] = "";
          rs = "✗ gửi lỗi, dùng nút Copy bên dưới";
          render();
        });
    }
    var det = details[main];
    if (det) {
      var gp = buildGrPayload(main, gifts, det);
      var sig2 = JSON.stringify(gp.orders);
      if (sentSig[main + "|grdata"] !== sig2) {
        sentSig[main + "|grdata"] = sig2;
        gp.flow = flowOf();
        rPut(main, "grdata", gp)
          .then(function () {
            rs = "✔ đã gửi dữ liệu glassRUN đơn " + main + " lúc " + hhmmss();
            render();
          })
          .catch(function () {
            sentSig[main + "|grdata"] = "";
          });
      }
    }
  }
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  function copy(links, btn) {
    copyData(
      {
        kind: "glassRunLinks",
        links: links,
        capturedAt: new Date().toISOString(),
      },
      btn,
    );
  }
  function buildGrPayload(main, gifts, det) {
    var orders = {};
    var links = {};
    orders[main] = {
      OrderNumber: main,
      OrderType: det.OrderType || "SO",
      IsGift: false,
      lines: [],
    };
    gifts.forEach(function (g) {
      orders[g] = {
        OrderNumber: g,
        OrderType: "Tặng",
        IsGift: true,
        lines: [],
      };
    });
    (det.OrderProductList || []).forEach(function (p, i) {
      if (p.IsActive === false) return;
      var assoc = String(p.AssociatedOrderNumber || "").trim();
      var target = /^\d+$/.test(assoc) && assoc !== main ? assoc : main;
      if (!orders[target])
        orders[target] = {
          OrderNumber: target,
          OrderType: "Tặng",
          IsGift: true,
          lines: [],
        };
      var code = String(p.ProductCode || "").trim();
      var qty = Number(p.ProductQuantity) || 0;
      if (p.IsPackingItem === true || p.ProductType === "9")
        qty = Number(p.ShippableQuantity) || qty;
      var isPallet =
        PALLET_SKUS.indexOf(code.replace(/^0+/, "")) >= 0 ||
        /pallet/i.test(p.ProductName || "");
      orders[target].lines.push({
        OrderNumber: target,
        LineNumber: String(p.LineNumber || p.OrderProductId || i),
        ProductCode: code,
        ProductName: p.ProductName || "",
        Qty: qty,
        UOM: p.UOM || "",
        LineType: p.IsPackingItem === true ? (isPallet ? "RP" : "DP") : "S",
        LastStatus: "",
        NextStatus: "",
        UnitPrice: Number(p.UnitPrice) || 0,
        ShipTo: det.ShipToCode || "",
        Carrier: det.CarrierCode || "",
        SoldToName: det.SoldToName || "",
        PO: det.PurchaseOrderNumber || "",
      });
    });
    links[main] = Object.keys(orders).filter(function (k) {
      return k !== main;
    });
    var orderSearch = {};
    Object.keys(orders).forEach(function (k) {
      orderSearch[k] = {
        resolved: true,
        found: orders[k].lines.length > 0,
        tab: "glassRUN",
      };
    });
    return {
      kind: "jde",
      mode: "order",
      source: "glassRUN",
      po: det.PurchaseOrderNumber || "",
      status: det.Status || "",
      capturedAt: new Date().toISOString(),
      links: links,
      orderSearch: orderSearch,
      tabs: {},
      layoutErrors: [],
      orders: Object.keys(orders)
        .map(function (k) {
          return orders[k];
        })
        .filter(function (o) {
          return o.lines.length;
        }),
    };
  }
  function copyData(obj, btn) {
    copies += 1;
    obj.flow = {
      start: flowStart,
      copies: copies,
      pastes: 0,
      marks: [
        { k: "gr_start", at: flowStart },
        { k: "gr_copy", at: Date.now() },
      ],
    };
    var data = JSON.stringify(obj);
    var done = function () {
      btn.textContent = "Đã copy ✔";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(data)
        .then(done)
        .catch(function () {
          legacyCopy(data);
          done();
        });
    } else {
      legacyCopy(data);
      done();
    }
  }
  function button(label, primary, onClick) {
    var b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "margin-top:8px;width:100%;padding:8px 12px;border-radius:8px;font-weight:bold;cursor:pointer;" +
      (primary
        ? "background:#1a5fd8;color:#fff;border:none"
        : "background:#fff;color:#1a5fd8;border:1px solid #1a5fd8");
    b.onclick = function () {
      onClick(b);
    };
    return b;
  }
  function giftText(list) {
    return list.length
      ? list.join(", ")
      : '<span style="color:#6b7486">không có đơn tặng</span>';
  }
  function render() {
    var box = document.getElementById("__grCaptureBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "__grCaptureBox";
      box.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;border:1px solid #d5dbe5;border-top:4px solid #1a5fd8;border-radius:10px;padding:12px 14px;font:13px/1.45 Arial,sans-serif;color:#1d2433;box-shadow:0 8px 24px rgba(0,0,0,.18);width:300px";
      document.body.appendChild(box);
    }
    var html =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:#1a5fd8">GR Capture – liên kết đơn tặng</b>' +
      '<span id="__grClose" title="Tắt GR Capture" style="cursor:pointer;color:#6b7486;font-size:16px;padding:0 4px">✕</span></div>';
    html +=
      '<div style="color:#6b7486;font-size:11px;margin-bottom:6px">Hộp thư: ' +
      rs +
      "</div>";
    if (seenFilter) {
      html +=
        '<div style="color:#6b7486;font-size:11px;margin-bottom:4px">Ô lọc đang đọc được: <b>' +
        seenFilter +
        "</b></div>";
    }
    if (!latest.length) {
      html +=
        '<div style="color:#6b7486">Lọc cột <b>Số đơn hàng</b> theo số đơn chính cần lấy.</div>';
    } else if (latest.length > 1) {
      html +=
        '<div style="color:#a15c00">Đang hiển thị ' +
        latest.length +
        " đơn. Hãy lọc theo đúng 1 số đơn chính để copy.</div>";
    } else {
      html +=
        '<div style="padding:4px 0"><b>' +
        latest[0].main +
        "</b>" +
        (isStNo(latest[0].main)
          ? ' <span style="color:#a15c00">· đơn ST, chuyển sang JDE để kiểm tra</span>'
          : " → " + giftText(latest[0].gifts)) +
        "</div>";
    }
    var keys = Object.keys(group);
    if (keys.length) {
      html +=
        '<div style="margin-top:8px;padding-top:6px;border-top:1px solid #eef1f5;color:#6b7486">Nhóm (' +
        keys.length +
        " đơn chính):</div>";
      keys.forEach(function (k) {
        html += "<div><b>" + k + "</b> → " + giftText(group[k]) + "</div>";
      });
    }
    box.innerHTML = html;
    box.querySelector("#__grClose").onclick = function () {
      window.__grCapture.stop();
    };
    if (latest.length === 1) {
      var one = {};
      one[latest[0].main] = latest[0].gifts;
      box.appendChild(
        button("Copy đơn " + latest[0].main + " (cho JDE)", true, function (b) {
          copy(one, b);
        }),
      );
      var det = details[latest[0].main];
      if (det) {
        var gp = buildGrPayload(latest[0].main, latest[0].gifts, det);
        var lineCount = gp.orders.reduce(function (n, o) {
          return n + o.lines.length;
        }, 0);
        box.appendChild(
          button(
            "Copy dữ liệu glassRUN (" + lineCount + " dòng, không qua JDE)",
            false,
            function (b) {
              copyData(gp, b);
            },
          ),
        );
      } else {
        var hint = document.createElement("div");
        hint.style.cssText = "color:#6b7486;font-size:12px;margin-top:6px";
        hint.textContent =
          'Không có JDE? Bấm "View Details" của đơn này để lấy dữ liệu glassRUN.';
        box.appendChild(hint);
      }
      if (!group[latest[0].main]) {
        box.appendChild(
          button(
            "+ Thêm vào nhóm (khi PO có nhiều đơn chính)",
            false,
            function () {
              group[latest[0].main] = latest[0].gifts;
              render();
            },
          ),
        );
      }
    }
    if (keys.length) {
      box.appendChild(
        button("Copy nhóm (" + keys.length + " đơn chính)", true, function (b) {
          copy(group, b);
        }),
      );
      box.appendChild(
        button("Xóa nhóm", false, function () {
          group = {};
          render();
        }),
      );
    }
  }
  function isStNo(no) {
    return /^\d{4}/.test(no) && Number(String(no).slice(0, 4)) < 6221;
  }
  function inspect(text) {
    if (
      !text ||
      typeof text !== "string" ||
      (text.indexOf("AssociatedOrder") < 0 && text.indexOf('"OrderNumber"') < 0)
    )
      return;
    try {
      var d = JSON.parse(text);
      if (!Array.isArray(d)) d = [d];
      var det = d.filter(function (o) {
        return (
          o && o.OrderNumber && o.OrderProductList && o.OrderProductList.length
        );
      });
      if (det.length === 1) {
        details[String(det[0].OrderNumber).trim()] = det[0];
        render();
        autoSend();
        return;
      }
      var rows = d.filter(function (o) {
        return (
          o &&
          o.OrderNumber &&
          ("AssociatedOrder" in o || isStNo(String(o.OrderNumber).trim())) &&
          !(o.OrderProductList && o.OrderProductList.length)
        );
      });
      if (!rows.length && d.length) return;
      sentSig = {};
      latest = rows.map(function (o) {
        return {
          main: String(o.OrderNumber).trim(),
          gifts: String(o.AssociatedOrder || "")
            .split("-")
            .map(function (s) {
              return s.trim();
            })
            .filter(function (s) {
              return /^\d+$/.test(s);
            }),
        };
      });
      var one = latest.length === 1 ? latest[0].main : "";
      if (one && one !== curMain && !Object.keys(group).length) {
        curMain = one;
        flowStart = Date.now();
        copies = 0;
      }
      render();
      autoSend();
    } catch (e) {}
  }
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", function () {
      try {
        if (this.responseType === "" || this.responseType === "text")
          inspect(this.responseText);
        else if (this.responseType === "json")
          inspect(JSON.stringify(this.response));
      } catch (e) {}
    });
    return origSend.apply(this, arguments);
  };
  if (origFetch) {
    window.fetch = function () {
      return origFetch.apply(this, arguments).then(function (r) {
        try {
          r.clone()
            .text()
            .then(inspect)
            .catch(function () {});
        } catch (e) {}
        return r;
      });
    };
  }
  var seenFilter = "";
  function orderHeader() {
    var nodes = document.querySelectorAll("body *");
    var best = null;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.children.length) continue;
      if (
        (n.textContent || "").replace(/\s+/g, " ").trim().toLowerCase() !==
        "order number"
      )
        continue;
      var r = n.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (!best || r.top < best.top) best = r;
    }
    return best;
  }
  function readOrderFilter() {
    var hr = orderHeader();
    if (!hr) return "";
    var box = document.getElementById("__grCaptureBox");
    var inputs = document.querySelectorAll("input");
    var pick = null;
    var pickTop = 1e9;
    var mid = 0;
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (box && box.contains(el)) continue;
      if (el.type === "hidden" || el.type === "checkbox") continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      mid = r.left + r.width / 2;
      if (mid < hr.left - 20 || mid > hr.right + 20) continue;
      if (r.top < hr.bottom - 4 || r.top - hr.bottom > 120) continue;
      if (r.top < pickTop) {
        pickTop = r.top;
        pick = el;
      }
    }
    if (!pick) return "";
    var v = (pick.value || "").trim();
    return /^\d{8}$/.test(v) ? v : "";
  }
  function watchFilter() {
    var v = readOrderFilter();
    if (v !== seenFilter) {
      seenFilter = v;
      render();
    }
    if (!v || !isStNo(v)) return;
    if (latest.length === 1 && latest[0].main === v) return;
    latest = [{ main: v, gifts: [] }];
    if (v !== curMain && !Object.keys(group).length) {
      curMain = v;
      flowStart = Date.now();
      copies = 0;
    }
    sentSig = {};
    render();
    autoSend();
  }
  watchTimer = setInterval(watchFilter, 700);
  render();
  rGet("op=ping")
    .then(function () {
      rs = "✔ đã kết nối hộp thư";
      render();
      autoSend();
    })
    .catch(function () {
      rs = "✗ không kết nối được hộp thư, dùng nút Copy bên dưới";
      render();
    });
})();
