import { Router } from "express";
import { db } from "../config/supabase.js";

const router = Router();

// Public catalog: iPhone-only products, searchable and paginated.
router.get("/", async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "12", 10), 1), 50);
    const from = (page - 1) * limit;
    const search = String(req.query.search || "").trim();

    let query = db.from("products")
      .select("id,name,model,description,base_price,image_url,is_active,created_at", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (search) query = query.or(`name.ilike.%${search}%,model.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data,
      meta: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) }
    });
  } catch (error) {
    res.status(500).json({
      success: false, error: { code: "PRODUCT_LIST_FAILED", message: "Unable to load iPhones." }
    });
  }
});

router.get("/:id", async (req, res) => {
  const { data, error } = await db.from("products")
    .select("*, product_variants(*)")
    .eq("id", req.params.id)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false, error: { code: "PRODUCT_NOT_FOUND", message: "iPhone not found." }
    });
  }
  res.json({ success: true, data });
});

export default router;
