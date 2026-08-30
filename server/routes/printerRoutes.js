import express from "express";
import net from "net";

const router = express.Router();

/**
 * Helper to send raw buffer or ESC/POS commands to a network thermal printer
 * @param {string} host - Printer IP address
 * @param {number} port - Printer Port (usually 9100)
 * @param {Buffer} data - Binary ESC/POS data
 * @param {number} timeoutMs - Connection timeout
 */
function sendToNetworkPrinter(host, port = 9100, data, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (!host) {
      return reject(new Error("Printer IP address is required"));
    }

    const socket = new net.Socket();
    let isFinished = false;

    socket.setTimeout(timeoutMs);

    socket.connect(Number(port) || 9100, host, () => {
      socket.write(data, () => {
        // Allow brief time for buffer to flush
        setTimeout(() => {
          if (!isFinished) {
            isFinished = true;
            socket.destroy();
            resolve({ success: true });
          }
        }, 300);
      });
    });

    socket.on("timeout", () => {
      if (!isFinished) {
        isFinished = true;
        socket.destroy();
        reject(new Error(`Connection to printer at ${host}:${port} timed out`));
      }
    });

    socket.on("error", (err) => {
      if (!isFinished) {
        isFinished = true;
        socket.destroy();
        reject(new Error(`Failed to connect to printer at ${host}:${port} - ${err.message}`));
      }
    });
  });
}

/**
 * Generate standard ESC/POS bytes for a test receipt
 */
function buildEscPosTestReceipt(businessName = "TableTab POS") {
  const ESC = "\x1b";
  const GS = "\x1d";

  let out = "";
  // Initialize printer
  out += `${ESC}@`;
  // Center alignment
  out += `${ESC}a\x01`;
  // Double height & width for header
  out += `${ESC}!\x30`;
  out += `${businessName}\n`;
  // Normal font
  out += `${ESC}!\x00`;
  out += `Network Thermal Printer Connected!\n`;
  out += `--------------------------------\n`;
  out += `Status: OK / Online\n`;
  out += `Port: 9100 (RAW ESC/POS)\n`;
  out += `Time: ${new Date().toLocaleString()}\n`;
  out += `--------------------------------\n`;
  out += `TableTab POS Ready for Orders!\n\n\n\n`;
  // Cut paper (GS V 66 0)
  out += `${GS}V\x42\x00`;

  return Buffer.from(out, "ascii");
}

/**
 * Generate standard ESC/POS bytes for an actual order
 */
function buildEscPosOrderReceipt(order, businessName = "TableTab POS", taxNumber = "") {
  const ESC = "\x1b";
  const GS = "\x1d";

  const resolvedTaxNo = taxNumber || order?.taxNumber || "";

  let out = "";
  // Initialize
  out += `${ESC}@`;
  // Center alignment
  out += `${ESC}a\x01`;
  // Double size for title
  out += `${ESC}!\x30`;
  out += `${businessName}\n`;
  // Normal font
  out += `${ESC}!\x00`;
  if (resolvedTaxNo) {
    out += `VAT / Tax No: ${resolvedTaxNo}\n`;
  }
  out += `Simplified Tax Invoice / فاتورة ضريبية\n`;
  out += `================================\n`;

  // Order Number Box (Large)
  const orderNo = order.dailyOrderNumber || (order._id ? String(order._id).slice(-4) : "1");
  out += `${ESC}!\x30`;
  out += `ORDER #${orderNo}\n`;
  out += `${ESC}!\x00`;
  out += `================================\n`;

  // Details
  out += `${ESC}a\x00`; // Left align
  out += `Date: ${new Date(order.createdAt || Date.now()).toLocaleString()}\n`;
  if (order.invoiceSerial) out += `Invoice: ${order.invoiceSerial}\n`;
  out += `Customer: ${order.customerName || "Counter Guest"}\n`;
  out += `Table: ${order.tableId || 1}\n`;
  out += `Payment: ${String(order.paymentMethod || "cash").toUpperCase()} (PAID)\n`;
  out += `--------------------------------\n`;

  // Items table header
  out += `Qty  Item                  Price\n`;
  out += `--------------------------------\n`;

  const items = Array.isArray(order.items) ? order.items : [];
  for (const it of items) {
    const qty = String(it.quantity || 1).padEnd(4, " ");
    const name = String(it.name || "Item").slice(0, 18).padEnd(20, " ");
    const price = Number((it.price || 0) * (it.quantity || 1)).toFixed(2).padStart(8, " ");
    out += `${qty}${name}${price}\n`;
  }

  out += `--------------------------------\n`;

  // Totals
  const total = Number(order.totalPrice || 0).toFixed(2);
  const itemsSum = (order.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.price) || 0), 0);
  const subtotal = itemsSum > 0 ? itemsSum.toFixed(2) : total;

  out += `Subtotal:                ${subtotal.padStart(8, " ")} SAR\n`;
  out += `${ESC}!\x20`; // Bold total
  out += `TOTAL:                   ${total.padStart(8, " ")} SAR\n`;
  out += `${ESC}!\x00`; // Normal

  out += `================================\n`;
  out += `${ESC}a\x01`; // Center
  out += `Thank You For Visiting!\n\n\n\n`;

  // Cut paper
  out += `${GS}V\x42\x00`;

  return Buffer.from(out, "utf-8");
}

/**
 * POST /api/printer/test-connection
 * Tests IP connection and sends a test print slip
 */
router.post("/test-connection", async (req, res) => {
  try {
    const { ip, port = 9100, businessName } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: "Printer IP is required" });
    }

    const testData = buildEscPosTestReceipt(businessName || "TableTab POS");
    await sendToNetworkPrinter(ip.trim(), Number(port) || 9100, testData);

    return res.json({
      success: true,
      message: `Successfully connected to printer at ${ip}:${port} and printed test slip.`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/printer/print-order
 * Prints an order directly to the thermal printer IP
 */
router.post("/print-order", async (req, res) => {
  try {
    const { ip, port = 9100, order, businessName, taxNumber } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: "Printer IP is required" });
    }
    if (!order) {
      return res.status(400).json({ success: false, message: "Order data is required" });
    }

    const receiptData = buildEscPosOrderReceipt(order, businessName || "TableTab POS", taxNumber);
    await sendToNetworkPrinter(ip.trim(), Number(port) || 9100, receiptData);

    return res.json({
      success: true,
      message: `Receipt printed successfully to ${ip}:${port}`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

export default router;
