import mongoose from "mongoose";
import QRCode from "qrcode";
import bwipjs from "bwip-js/node";
import Table from "../models/Table.js";
import Tenant from "../models/Tenant.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findTableByReference(tenantId, tableRef) {
  const value = String(tableRef || "").trim();
  if (!value) return null;

  const baseFilter = { tenantId };
  if (mongoose.Types.ObjectId.isValid(value)) {
    return await Table.findOne({
      ...baseFilter,
      _id: new mongoose.Types.ObjectId(value),
    })
      .select("_id label code")
      .lean();
  }

  const exactRegex = new RegExp(`^${escapeRegex(value)}$`, "i");
  return await Table.findOne({
    ...baseFilter,
    $or: [{ code: exactRegex }, { label: exactRegex }],
  })
    .select("_id label code")
    .lean();
}

function menuUrlForTable(tableCodeOrLabel, tenantSlug) {
  const raw = process.env.CLIENT_URL || process.env.CLEINT_URL || "http://localhost:5172";
  const base = String(raw).replace(/\/+$/, "");
  const slug = String(tenantSlug || "").trim();
  const tableRef = String(tableCodeOrLabel || "").trim();
  const path = slug
    ? `/menu/${encodeURIComponent(slug)}`
    : `/menu/${encodeURIComponent(tableRef)}`;
  const query = tableRef && slug ? `?table=${encodeURIComponent(tableRef)}` : "";
  return `${base}${path}${query}`;
}

export const QRCodegen = async (req, res) => {
  try {
    const tableRef = String(req.params.tableId || req.query.table || "").trim();
    const tmeta = await Tenant.findById(req.tenantId).select("slug").lean();
    const tenantSlug = tmeta?.slug || "";

    let tableCodeOrLabel = "";
    if (tableRef) {
      let table = await findTableByReference(req.tenantId, tableRef);
      if (!table) {
        // Auto-create the table so it exists for the tenant
        table = await Table.create({
          tenantId: req.tenantId,
          label: tableRef,
          code: tableRef,
        });
      }
      tableCodeOrLabel = table.code?.trim() || table.label || String(table._id);
    }

    const menuURL = menuUrlForTable(tableCodeOrLabel, tenantSlug);
    const qrImage = await QRCode.toDataURL(menuURL);

    const responsePayload = {
      message: "QR code generated successfully",
      tableRef,
      link: menuURL,
      qrImage,
    };

    if (tableRef) {
      responsePayload.tableId = tableRef;
      responsePayload.label = tableCodeOrLabel;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "QR generatioin failed" });
  }
};

export const barcodeCodegen = async (req, res) => {
  try {
    const tableRef = String(req.params.tableId || req.query.table || "").trim();
    const tmeta = await Tenant.findById(req.tenantId).select("slug").lean();
    const tenantSlug = tmeta?.slug || "";

    let tableCodeOrLabel = "";
    if (tableRef) {
      let table = await findTableByReference(req.tenantId, tableRef);
      if (!table) {
        // Auto-create the table so it exists for the tenant
        table = await Table.create({
          tenantId: req.tenantId,
          label: tableRef,
          code: tableRef,
        });
      }
      tableCodeOrLabel = table.code?.trim() || table.label || String(table._id);
    }

    const menuURL = menuUrlForTable(tableCodeOrLabel, tenantSlug);

    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: menuURL,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: "center",
    });

    const barcodeImage = `data:image/png;base64,${png.toString("base64")}`;

    const responsePayload = {
      message: "Barcode generated successfully",
      link: menuURL,
      barcodeImage,
    };

    if (tableRef) {
      responsePayload.tableId = tableRef;
      responsePayload.label = tableCodeOrLabel;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Barcode generation failed" });
  }
};
