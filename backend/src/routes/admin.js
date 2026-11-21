import { Router } from "express";
import { db } from "../config/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// Create a catalog item. Product name/model must describe an Apple iPhone.
router.post("/products", async (req, res) => {
  const { name, model, description = "", base_price, image_url = null } = req.body || {};
  if (!name || !model || !String(model).toLowerCase().includes("iphone") ||
      !Number.isFinite(Number(base_price)) || Number(base_price) <= 0) {
    return res.status(422).json({
      success: false,
      error: { code: "INVALID_IPHONE_PRODUCT", message: "Provide an iPhone model, name, and positive price." }
    });
  }

  const { data, error } = await db.from("products").insert({
    name, model, description, base_price: Number(base_price), image_url
  }).select().single();

  if (error) return res.status(400).json({
    success: false, error: { code: "PRODUCT_CREATE_FAILED", message: error.message }
  });
  res.status(201).json({ success: true, data });
});

router.patch("/products/:id", async (req, res) => {
  const allowed = ["name", "model", "description", "base_price", "image_url", "is_active"];
  const update = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(update).length) {
    return res.status(422).json({
      success: false, error: { code: "EMPTY_UPDATE", message: "No editable product fields supplied." }
    });
  }
  if (update.model && !String(update.model).toLowerCase().includes("iphone")) {
    return res.status(422).json({
      success: false, error: { code: "IPHONE_ONLY", message: "Only iPhone models are allowed." }
    });
  }
  if (update.base_price !== undefined && (!Number.isFinite(Number(update.base_price)) || Number(update.base_price) <= 0)) {
    return res.status(422).json({
      success: false, error: { code: "INVALID_PRICE", message: "Price must be greater than zero." }
    });
  }

  const { data, error } = await db.from("products").update(update)
    .eq("id", req.params.id).select().single();
  if (error || !data) return res.status(404).json({
    success: false, error: { code: "PRODUCT_UPDATE_FAILED", message: "Product not found or update failed." }
  });
  res.json({ success: true, data });
});

// Stock adjustments are recorded in stock_movements by a database trigger/function.
router.post("/variants/:id/stock", async (req, res) => {
  const quantity = Number(req.body?.quantity);
  const reason = String(req.body?.reason || "").trim();
  if (!Number.isInteger(quantity) || quantity === 0 || !reason) {
    return res.status(422).json({
      success: false, error: { code: "INVALID_STOCK_ADJUSTMENT", message: "Provide a non-zero integer quantity and reason." }
    });
  }

  const { data, error } = await db.rpc("adjust_variant_stock", {
    p_variant_id: req.params.id,
    p_quantity_change: quantity,
    p_reason: reason,
    p_actor: req.user.id
  });
  if (error) return res.status(409).json({
    success: false, error: { code: "STOCK_ADJUSTMENT_FAILED", message: error.message }
  });
  res.json({ success: true, data });
});

export default router;
