import mongoose from "mongoose";
import Category from "../models/Category.js";

function tenantFilter(req) {
  return { tenantId: req.tenantId };
}

/**
 * List categories for the active tenant (optional outlet filter via X-Branch-Id).
 */
export async function listCategories(req, res) {
  try {
    const base = tenantFilter(req);
    const q = { ...base };
    if (req.branchId) {
      q.$or = [{ branchId: null }, { branchId: req.branchId }];
    }
    const rows = await Category.find(q).sort({ sortOrder: 1, name: 1 }).lean();
    res.status(200).json({ categories: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to list categories", error: error.message });
  }
}

export async function createCategory(req, res) {
  try {
    const { name, slug, sortOrder, branchId } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    let branchOid = null;
    if (branchId != null && branchId !== "") {
      if (!mongoose.Types.ObjectId.isValid(String(branchId))) {
        return res.status(400).json({ message: "Invalid branchId" });
      }
      branchOid = new mongoose.Types.ObjectId(String(branchId));
    }

    const doc = await Category.create({
      tenantId: req.tenantId,
      branchId: branchOid,
      name: String(name).trim(),
      slug: (slug || String(name)).toLowerCase().replace(/\s+/g, "-"),
      sortOrder: Number(sortOrder) || 0,
    });

    res.status(201).json({ message: "Category created", category: doc });
  } catch (error) {
    res.status(500).json({ message: "Create failed", error: error.message });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const deleted = await Category.findOneAndDelete({
      _id: id,
      tenantId: req.tenantId,
    });

    if (!deleted) return res.status(404).json({ message: "Category not found" });

    res.status(200).json({ message: "Deleted", category: deleted });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
}
