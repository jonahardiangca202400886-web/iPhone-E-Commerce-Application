  import { authClient, db } from "../config/supabase.js";

  export async function requireAuth(req, res, next) {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) {
        return res.status(401).json({
          success: false, error: { code: "UNAUTHENTICATED", message: "Bearer token required." }
        });
      }

      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data?.user) {
        return res.status(401).json({
          success: false, error: { code: "INVALID_TOKEN", message: "Your session is invalid or expired." }
        });
      }

      req.user = data.user;
      next();
    } catch {
      res.status(401).json({
        success: false, error: { code: "AUTH_FAILED", message: "Could not authenticate this request." }
      });
    }
  }

  export async function requireAdmin(req, res, next) {
    try {
      const { data, error } = await db
        .from("profiles")
        .select("role")
        .eq("id", req.user.id)
        .single();

      if (error || data?.role !== "admin") {
        return res.status(403).json({
          success: false, error: { code: "FORBIDDEN", message: "Administrator access required." }
        });
      }
      next();
    } catch {
      res.status(500).json({
        success: false, error: { code: "ROLE_CHECK_FAILED", message: "Could not verify user role." }
      });
    }
  }
