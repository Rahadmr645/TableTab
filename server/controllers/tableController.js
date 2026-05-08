import mongoose from "mongoose";
import Table from "../models/Table.js";

export async function listTables(req, res) {
  try {
    const q = { tenantId: req.tenantId };
    if (req.branchId) q.branchId = req.branchId;
    const tables = await Table.find(q).sort({ label: 1 }).lean();
    res.status(200).json({ tables });
  } catch (error) {
    res.status(500).json({ message: "Failed to list tables", error: error.message });
  }
}

export async function createTable(req, res) {
  try {
    const { label, code, branchId } = req.body;
    if (!label) return res.status(400).json({ message: "label is required" });

    let branchOid = null;
    if (branchId != null && branchId !== "") {
      if (!mongoose.Types.ObjectId.isValid(String(branchId))) {
        return res.status(400).json({ message: "Invalid branchId" });
      }
      branchOid = new mongoose.Types.ObjectId(String(branchId));
    }

    const doc = await Table.create({
      tenantId: req.tenantId,
      branchId: branchOid,
      label: String(label).trim(),
      code: String(code || "").trim(),
    });

    res.status(201).json({ message: "Table created", table: doc });
  } catch (error) {
    res.status(500).json({ message: "Create failed", error: error.message });
  }
}

export async function deleteTable(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const deleted = await Table.findOneAndDelete({ _id: id, tenantId: req.tenantId });
    if (!deleted) return res.status(404).json({ message: "Table not found" });

    res.status(200).json({ message: "Deleted", table: deleted });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
}
