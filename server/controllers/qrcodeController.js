import QRCode from "qrcode";
import dotenv from "dotenv";
import bwipjs from "bwip-js/node";

dotenv.config();

function menuUrlForTable(tableId) {
  const raw = process.env.CLEINT_URL || "http://localhost:5173";
  const base = String(raw).replace(/\/+$/, "");
  const id = encodeURIComponent(String(tableId));
  return `${base}/menu/${id}`;
}

export const QRCodegen = async (req, res) => {
  try {
    const { tableId } = req.params;
    const menuURL = menuUrlForTable(tableId);
    const qrImage = await QRCode.toDataURL(menuURL);

    res.status(200).json({
      message: "create successfull",
      tableId,
      link: menuURL,
      qrImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "QR generatioin failed" });
  }
};

/** Linear CODE128 barcode (PNG data URL) — encodes the same menu link as the QR endpoint. */
export const barcodeCodegen = async (req, res) => {
  try {
    const { tableId } = req.params;
    const menuURL = menuUrlForTable(tableId);

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
      tableId,
      link: menuURL,
      barcodeImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Barcode generation failed" });
  }
};