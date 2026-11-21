import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import productsRouter from "./routes/products.js";
import adminRouter from "./routes/admin.js";
import tradeInsRouter from "./routes/tradeins.js";
import assistantRouter from "./routes/assistant.js";

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "20kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));

app.get("/api/v1/health", (_req, res) => {
  res.json({ success: true, data: { status: "iPhoneHub API is running" } });
});
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/trade-ins", tradeInsRouter);
app.use("/api/v1/ai", assistantRouter);

app.use((req, res) => res.status(404).json({
  success: false, error: { code: "NOT_FOUND", message: "API endpoint not found." }
}));

app.use((err, _req, res, _next) => {
  console.error("API error:", err.message);
  res.status(500).json({
    success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." }
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`iPhoneHub API running on http://localhost:${port}`));
