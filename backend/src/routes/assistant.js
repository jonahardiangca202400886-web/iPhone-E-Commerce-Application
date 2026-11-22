
import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { db } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

async function recommendProducts(req, res) {
  try {
    const prompt = String(req.body?.message || "").trim();

    if (!prompt || prompt.length > 500) {
      return res.status(422).json({
        success: false,
        message: "Message must be 1–500 characters."
      });
    }

    const { data: products, error } = await db
      .from("products")
      .select("id,name,model,description,base_price")
      .eq("is_active", true)
      .limit(30);

    if (error) throw error;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "Gemini AI is not configured."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: `
You are iPhoneHub's product recommendation assistant.

Recommend products ONLY from this database catalog.
Never invent product names, IDs, or prices.

Return valid JSON containing:
- productIds: array of product IDs
- explanation: short recommendation explanation

Customer request:
${prompt}

Database catalog:
${JSON.stringify(products)}
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(result.text || "{}");

    const allowedIds = new Set(
      products.map(product => String(product.id))
    );

    const selectedIds = Array.isArray(parsed.productIds)
      ? parsed.productIds.filter(id =>
          allowedIds.has(String(id))
        )
      : [];

    const verifiedProducts = products.filter(product =>
      selectedIds.includes(String(product.id))
    );

    return res.json({
      success: true,
      data: {
        explanation: String(
          parsed.explanation ||
          "Here are matching iPhones from our catalog."
        ),
        products: verifiedProducts
      }
    });

  } catch (error) {
    console.error("Gemini assistant error:", error.message);

    return res.status(503).json({
      success: false,
      message: "The Gemini recommendation assistant is temporarily unavailable."
    });
  }
}

router.post("/", recommendProducts);
router.post("/recommend", recommendProducts);

export default router;
