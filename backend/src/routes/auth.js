
import { Router } from "express";
import { db } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const { data, error } = await db
    .from("profiles")
    .select("full_name,role")
    .eq("id", req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      error: { code: "PROFILE_LOOKUP_FAILED", message: "Could not load account profile." }
    });
  }
  if (!data) {
    return res.status(404).json({
      success: false,
      error: { code: "PROFILE_NOT_FOUND", message: "Account profile is not available." }
    });
  }

  return res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      full_name: data.full_name,
      role: data.role
    }
  });
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(422).json({
        success: false,
        message: "All fields are required."
      });
    }

    if (password.length < 8) {
      return res.status(422).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }
      }
    });

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Registration successful. Check your email if verification is required.",
      data: {
        user: data.user,
        session: data.session
      }
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return res.json({
      success: true,
      message: "Login successful.",
      data: {
        user: data.user,
        access_token: data.session.access_token
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password."
    });
  }
});

export default router;
