import QRCode from "qrcode";
import bwipjs from "bwip-js/node";
import Table from "../models/Table.js";

function menuUrlForTable(tableId) {
  const raw = process.env.CLEINT_URL || "http://localhost:5173";
  const base = String(raw).replace(/\/+$/, "");
  const id = encodeURIComponent(String(tableId));
  return `${base}/menu/${id}`;
}

export const QRCodegen = async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await Table.findOne({
      _id: tableId,
      tenantId: req.tenantId,
    })
      .select("_id label")
      .lean();

    if (!table) {
      return res.status(404).json({ message: "Table not found for this tenant" });
    }

    const menuURL = menuUrlForTable(table._id);
    const qrImage = await QRCode.toDataURL(menuURL);

    res.status(200).json({
      message: "create successfull",
      tableId: String(table._id),
      label: table.label,
      link: menuURL,
      qrImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "QR generatioin failed" });
  }
};

export const barcodeCodegen = async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await Table.findOne({
      _id: tableId,
      tenantId: req.tenantId,
    })
      .select("_id label")
      .lean();

    if (!table) {
      return res.status(404).json({ message: "Table not found for this tenant" });
    }

    const menuURL = menuUrlForTable(table._id);

    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: menuURL,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: "center",
    });

    const barcodeImage = `data:image/png;base64,${png.toString("base64")}`;

    res.status(200).json({
      message: "create successfull",
      tableId: String(table._id),
      label: table.label,
      link: menuURL,
      barcodeImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Barcode generation failed" });
  }
};
