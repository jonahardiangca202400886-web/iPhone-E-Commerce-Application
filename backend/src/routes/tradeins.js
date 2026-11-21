import { Router } from "express";
import { db } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Customer submits an iPhone trade-in request for staff review.
router.post("/", async (req, res) => {
  const { iphone_model, storage, condition, battery_health, notes = "" } = req.body || {};
  const health = Number(battery_health);

  if (!iphone_model || !String(iphone_model).toLowerCase().includes("iphone") ||
      !storage || !["excellent", "good", "fair", "poor"].includes(condition) ||
      !Number.isInteger(health) || health < 1 || health > 100) {
    return res.status(422).json({
      success: false,
      error: { code: "INVALID_TRADE_IN", message: "Enter a valid iPhone model, storage, condition, and battery health (1–100)." }
    });
  }

  const { data, error } = await db.from("trade_in_requests").insert({
    customer_id: req.user.id, iphone_model, storage, condition,
    battery_health: health, notes
  }).select().single();

  if (error) return res.status(400).json({
    success: false, error: { code: "TRADE_IN_FAILED", message: "Could not submit trade-in request." }
  });
  res.status(201).json({ success: true, data });
});

router.get("/mine", async (req, res) => {
  const { data, error } = await db.from("trade_in_requests")
    .select("*").eq("customer_id", req.user.id).order("created_at", { ascending: false });
  if (error) return res.status(500).json({
    success: false, error: { code: "TRADE_IN_LIST_FAILED", message: "Could not load your requests." }
  });
  res.json({ success: true, data });
});

export default router;
