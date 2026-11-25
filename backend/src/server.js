
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import productsRouter from "./routes/products.js";
import adminRouter from "./routes/admin.js";
import tradeInsRouter from "./routes/tradeins.js";
import assistantRouter from "./routes/assistant.js";
import authRouter from "./routes/auth.js";

const app = express();

// 1. Security
app.use(helmet());

// 2. CORS configuration
const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  "http://localhost:5173"
)
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Idempotency-Key"
  ]
}));

// 3. Request body parser
app.use(express.json({ limit: "20kb" }));

// 4. Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200
}));

app.get("/", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to iPhoneHub API!",
    status: "Server is running",
    healthCheck: "/api/v1/health"
  });
});

// 5. Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "iPhoneHub API is running"
    }
  });
});

// 6. API routes
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/trade-ins", tradeInsRouter);
app.use("/api/v1/ai", assistantRouter);
app.use("/api/v1/auth", authRouter);

// 7. Not found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "API endpoint not found."
    }
  });
});

// 8. Error handler
app.use((err, _req, res, _next) => {
  console.error("API error:", err.message);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred."
    }
  });
});

// 9. Start server
const port = process.env.PORT || 5000;

app.listen(port, "0.0.0.0", () => {
  console.log(`iPhoneHub API running on port ${port}`);
});
