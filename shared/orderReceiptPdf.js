import html2pdf from "html2pdf.js/dist/html2pdf.bundle.min.js";
import QRCode from "qrcode";

function escapeHtml(raw) {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readEnv(name, fallback = "") {
  try {
    const v = import.meta.env?.[name];
    return typeof v === "string" ? v.trim() : fallback;
  } catch {
    return fallback;
  }
}

function fmtMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.00";
  return x.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Interpret total as VAT-inclusive at 15%. */
function vatSplitFromInclusive(totalIncl) {
  const t = Number(totalIncl);
  if (!Number.isFinite(t) || t <= 0) return { net: 0, vat: 0, total: 0 };
  const net = Math.round((t / 1.15) * 100) / 100;
  const vat = Math.round((t - net) * 100) / 100;
  return { net, vat, total: t };
}

function orderDisplayNo(order) {
  if (order?.dailyOrderNumber != null) return String(order.dailyOrderNumber);
  const id = order?._id ? String(order._id) : "";
  return id.slice(-6).toUpperCase() || "—";
}

export const RECEIPT_CSS = `
  .tt-r { width: 260px; max-width: 100%; padding: 12px 10px 20px; margin: 0 auto; background: #fff; color: #111;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 11px; line-height: 1.38; box-sizing: border-box; overflow-wrap: break-word; word-break: break-word; }
  .tt-r-biz { text-align: center; font-weight: 700; font-size: 15px; margin-bottom: 6px; letter-spacing: 0.02em; }
  .tt-r-sub { text-align: center; font-size: 10px; margin-bottom: 4px; color: #222; }
  .tt-r-taxid { text-align: center; font-size: 10px; margin-bottom: 4px; }
  .tt-r-simp { text-align: center; font-size: 10px; font-weight: 600; margin: 8px 0; }
  .tt-r-ordbox { border: 2px solid #000; text-align: center; padding: 8px 6px; margin: 8px 0; }
  .tt-r-ordlb { font-size: 9px; }
  .tt-r-ordno { font-size: 22px; font-weight: 800; }
  .tt-r-kv { font-size: 10px; margin: 4px 0; text-align: center; word-break: break-word; }
  .tt-r-sep { border-top: 1px dashed #000; margin: 8px 0; }
  .tt-r-tbl { width: 100%; max-width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9px; }
  .tt-r-tbl th { border-bottom: 1px solid #000; padding: 6px 2px 5px; font-weight: 700; vertical-align: bottom; }
  .tt-r-tbl td { border-bottom: 1px dotted #ccc; padding: 5px 2px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
  .tt-r-q { width: 17%; text-align: left; }
  .tt-r-it { width: 57%; text-align: left; padding-left: 6px; padding-right: 4px;
    overflow-wrap: anywhere; word-break: break-word; hyphens: auto; }
  .tt-r-pr { width: 26%; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .tt-r-totrow { display: flex; justify-content: space-between; align-items: baseline; gap: 8px 10px; flex-wrap: wrap;
    font-size: 10px; margin: 5px 0; font-variant-numeric: tabular-nums; }
  .tt-r-totrow > span:first-child { min-width: 0; flex: 1 1 55%; overflow-wrap: break-word; padding-right: 4px; }
  .tt-r-totrow > span:last-child { flex: 0 0 auto; text-align: right; white-space: nowrap; align-self: flex-end; }
  .tt-r-grand { font-weight: 800; font-size: 12px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
  .tt-r-note { font-size: 9px; text-align: center; color: #333; margin: 6px 0 4px; }
  .tt-r-addr { text-align: center; font-size: 9px; margin-top: 10px; color: #222; }
  .tt-r-qr { text-align: center; margin-top: 14px; }
  .tt-r-qr img { display: inline-block; }
  .tt-r-thx { text-align: center; margin-top: 12px; font-size: 10px; font-weight: 600; }
`;

/**
 * @param {Record<string, unknown>} order
 * @param {Date} [printTime]
 * @param {{ businessName?: string, logoUrl?: string }} [opts]
 * @returns {Promise<{ wrap: HTMLElement, root: HTMLElement }>}
 */
export async function buildReceiptRoot(order, printTime = new Date(), opts = {}) {
  if (!order || typeof order !== "object") {
    throw new Error("Invalid order");
  }

  const cashAmt = Number(order.cashAmount) || 0;
  const cardAmt = Number(order.cardAmount) || 0;
  const isSplit = order.paymentMethod === "split" || (cashAmt > 0 && cardAmt > 0);

  let methodLabel = "Cash";
  if (isSplit) {
    methodLabel = `Split (Cash: ${fmtMoney(cashAmt)} · Card: ${fmtMoney(cardAmt)})`;
  } else if (order.paymentMethod === "card" || cardAmt > 0) {
    methodLabel = "Card / Network";
  } else {
    methodLabel = "Cash";
  }

  const statusLabel = order.paymentStatus === "paid" ? "PAID" : "UNPAID (Collect Cash)";

  const linesTotal = (order.items || []).reduce((acc, it) => {
    const q = Number(it?.quantity) || 0;
    const p = Number(it?.price) || 0;
    return acc + q * p;
  }, 0);

  const total = Number(order.totalPrice) || linesTotal;
  const { net, vat } = vatSplitFromInclusive(total);

  const qtyTotal = (order.items || []).reduce(
    (acc, it) => acc + (Number(it?.quantity) || 0),
    0,
  );

  let fallbackBizName = "TableTab";
  let fallbackTaxNumber = "";
  try {
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("tabletab_public_tenant_name");
      if (stored) fallbackBizName = stored;
      const storedTax = sessionStorage.getItem("tabletab_public_tenant_tax_number");
      if (storedTax) fallbackTaxNumber = storedTax;
    }
  } catch (e) {}

  const businessName =
    opts.businessName ||
    opts.cafeName ||
    order?.businessName ||
    order?.cafeName ||
    readEnv("VITE_RECEIPT_BUSINESS_NAME", fallbackBizName);
  const logoUrl = opts.logoUrl || null;
  const branchLine = readEnv(
    "VITE_RECEIPT_BRANCH_LINE",
    "Branch 1 · Main location",
  );
  const taxId =
    opts.taxNumber ||
    opts.taxId ||
    order?.taxNumber ||
    order?.taxId ||
    fallbackTaxNumber ||
    readEnv("VITE_RECEIPT_TAX_ID", "");
  const addressLine = readEnv("VITE_RECEIPT_ADDRESS", "");

  const orderedAt = order.createdAt ? new Date(order.createdAt) : printTime;

  let qrSrc = "";
  try {
    const payload = order.invoiceSerial || order._id || String(total);
    qrSrc = await QRCode.toDataURL(String(payload), {
      width: 220,
      margin: 1,
      color: { dark: "#000000", light: "#ffffffff" },
    });
  } catch {
    /* optional */
  }

  const invoiceKv = order.invoiceSerial
    ? `Invoice: ${escapeHtml(order.invoiceSerial)}`
    : "Invoice: —";

  const discountAmt = Number(order.discountAmount || (order.discountType === "fixed" ? order.discount : 0) || 0);
  const displaySubtotal = linesTotal > 0 ? linesTotal : total;

  const rows = (order.items || [])
    .map((it) => {
      const q = Number(it?.quantity) || 0;
      const p = Number(it?.price) || 0;
      const lineAmt = q * p;
      return `<tr>
        <td class="tt-r-q">${q}</td>
        <td class="tt-r-it">${escapeHtml(it?.name ?? "Item")}</td>
        <td class="tt-r-pr">${fmtMoney(lineAmt)}</td>
      </tr>`;
    })
    .join("");

  const mismatch =
    Math.abs(linesTotal - total) > 0.05 && discountAmt <= 0
      ? `<div class="tt-r-note">Line items subtotal ${fmtMoney(linesTotal)} · Amount charged ${fmtMoney(total)}</div>`
      : "";

  const styleEl = document.createElement("style");
  styleEl.textContent = RECEIPT_CSS;

  const bizHeader = logoUrl
    ? `<div class="tt-r-logo" style="text-align:center; margin-bottom: 6px;"><img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" style="max-width: 120px; max-height: 80px; display: inline-block; filter: grayscale(100%);" /><div class="tt-r-biz" style="margin-top: 4px;">${escapeHtml(businessName)}</div></div>`
    : `<div class="tt-r-biz">${escapeHtml(businessName)}</div>`;

  const wrap = document.createElement("div");
  wrap.className = "tt-r";
  wrap.innerHTML = `
    ${bizHeader}
    <div class="tt-r-sub">${escapeHtml(branchLine)}</div>
    ${
      taxId
        ? `<div class="tt-r-taxid">VAT Reg / Tax No.: ${escapeHtml(taxId)}</div>`
        : ""
    }
    <div class="tt-r-simp">Simplified tax invoice</div>
    <div class="tt-r-ordbox">
      <span class="tt-r-ordlb">ORDER NO.</span><br/>
      <span class="tt-r-ordno">${escapeHtml(orderDisplayNo(order))}</span>
    </div>
    <div class="tt-r-kv">Printed: ${escapeHtml(printTime.toLocaleString())}</div>
    <div class="tt-r-kv">Ordered: ${escapeHtml(orderedAt.toLocaleString())}</div>
    <div class="tt-r-sep"></div>
    <div class="tt-r-kv">Guest: ${escapeHtml(order.customerName || "—")}</div>
    <div class="tt-r-kv">${invoiceKv}</div>
    <div class="tt-r-kv">Type: Dine-in · Table ${escapeHtml(String(order.tableId ?? "—"))}</div>
    <div class="tt-r-kv">Payment Method: ${escapeHtml(methodLabel)}</div>
    <div class="tt-r-kv">Payment Status: ${escapeHtml(statusLabel)}</div>
    ${mismatch}
    <div class="tt-r-sep"></div>
    <table class="tt-r-tbl">
      <thead><tr>
        <th class="tt-r-q">Qty</th>
        <th class="tt-r-it">Item</th>
        <th class="tt-r-pr">Price</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tt-r-sep"></div>
    <div class="tt-r-totrow"><span>Subtotal</span><span>${fmtMoney(displaySubtotal)} ﷼</span></div>
    ${
      discountAmt > 0
        ? `<div class="tt-r-totrow" style="color: #16a34a;"><span>Discount</span><span>-${fmtMoney(discountAmt)} ﷼</span></div>`
        : ""
    }
    <div class="tt-r-totrow tt-r-grand"><span>Total</span><span>${fmtMoney(total)} ﷼</span></div>
    ${
      isSplit
        ? `
          <div class="tt-r-totrow" style="font-weight: 600;"><span>💵 Paid Cash</span><span>${fmtMoney(cashAmt)}</span></div>
          <div class="tt-r-totrow" style="font-weight: 600;"><span>💳 Paid Card / Network</span><span>${fmtMoney(cardAmt)}</span></div>
        `
        : `
          <div class="tt-r-totrow"><span>Payment (${escapeHtml(methodLabel)})</span><span>${escapeHtml(statusLabel)}</span></div>
        `
    }
    <div class="tt-r-kv">Total units (qty sum): ${qtyTotal}</div>
    ${
      addressLine
        ? `<div class="tt-r-addr">${escapeHtml(addressLine)}</div>`
        : ""
    }
    ${
      qrSrc
        ? `<div class="tt-r-qr"><img src="${qrSrc}" alt="" width="156" height="156" /></div>`
        : ""
    }
    <div class="tt-r-thx">Thank you — visit again</div>
  `;

  const root = document.createElement("div");
  root.className = "tt-receipt-root";
  root.appendChild(styleEl);
  root.appendChild(wrap);

  return { wrap, root };
}

/**
 * Renders receipt into container (preview).
 * @param {HTMLElement | null} container
 * @param {Record<string, unknown>} order
 * @param {Date} printTime
 * @param {{ businessName?: string, logoUrl?: string }} [opts]
 */
export async function mountReceiptPreview(container, order, printTime, opts = {}) {
  if (!container || !order) return;
  container.innerHTML = "";
  const { root } = await buildReceiptRoot(order, printTime, opts);
  container.appendChild(root);
}

/**
 * @param {Record<string, unknown>} order
 * @param {{ printTime?: Date, businessName?: string, logoUrl?: string }} [opts] Use same print time as preview so PDF matches screen.
 */
export async function downloadOrderReceiptPdf(order, opts = {}) {
  if (!order || typeof order !== "object") return;

  const printTime =
    opts.printTime instanceof Date ? opts.printTime : new Date();

  const host = document.createElement("div");
  host.setAttribute("data-tt-receipt-host", "");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";

  const { wrap, root } = await buildReceiptRoot(order, printTime, opts);
  host.appendChild(root);
  document.body.appendChild(host);

  const fname =
    (order.invoiceSerial &&
      `Receipt-${String(order.invoiceSerial).replace(/[^\w.-]+/g, "_")}`) ||
    `Receipt-order-${orderDisplayNo(order)}`;

  const opt = {
    margin: [5, 4, 5, 4],
    filename: `${fname}.pdf`,
    image: { type: "jpeg", quality: 0.93 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: [72, 297], orientation: "p" },
    pagebreak: { mode: ["css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(wrap).save();
  } finally {
    document.body.removeChild(host);
  }
}

/**
 * Direct thermal printer / browser slip printing via hidden iframe.
 * Prints only the formatted 80mm receipt without UI elements.
 * @param {Record<string, unknown>} order
 * @param {{ printTime?: Date, businessName?: string, logoUrl?: string }} [opts]
 */
export async function printOrderReceipt(order, opts = {}) {
  if (!order || typeof order !== "object") return;
  const printTime = opts.printTime instanceof Date ? opts.printTime : new Date();

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const { wrap, root } = await buildReceiptRoot(order, printTime, opts);

    const printStyles = `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        width: 100%;
        max-width: 80mm;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      }
      .tt-receipt-root {
        width: 100%;
        max-width: 80mm;
        margin: 0 auto;
        display: flex;
        justify-content: center;
      }
      .tt-r {
        width: 100% !important;
        max-width: 80mm !important;
        padding: 6mm 3mm 10mm !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        font-size: 11px !important;
      }
      .tt-r-biz {
        font-size: 16px !important;
      }
      .tt-r-ordno {
        font-size: 24px !important;
      }
      .tt-r-qr img {
        width: 140px !important;
        height: 140px !important;
      }
    `;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt #${orderDisplayNo(order)}</title><style>${printStyles}</style></head><body></body></html>`);
    doc.close();

    doc.body.appendChild(root);

    // Wait briefly for fonts and images (QR code) to render
    await new Promise((resolve) => setTimeout(resolve, 300));

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } catch (err) {
    console.error("Print error:", err);
    window.print();
  } finally {
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 4000);
  }
}
