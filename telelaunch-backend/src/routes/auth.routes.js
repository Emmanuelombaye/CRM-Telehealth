// ============================================================
// routes/auth.routes.js — Multi-tenant Session & Onboarding
// ============================================================
const express = require("express");
const router = express.Router();
const prisma = require("../config/db");
const { requireAuth } = require("../middlewares/auth.middleware");

/**
 * Register a new Organization (Company/Tenant) and its Admin user.
 * This is the onboarding starting point.
 */
router.post("/register", async (req, res, next) => {
  const { email, orgName } = req.body;

  if (!email || !orgName) {
    return res.status(400).json({ error: "Email and Organization Name are required." });
  }

  try {
    // 1. Create the new Organization
    const organization = await prisma.organization.create({
      data: {
        name: orgName,
      },
    });

    // 2. Create the Admin user under that organization
    // For development fallback/mock sessions, we generate a mock ID from the email
    const cleanEmail = email.trim().toLowerCase();
    const userId = `mock-user-${cleanEmail.replace(/[^a-zA-Z0-9]/g, "")}`;

    // Ensure we don't have a user duplicate
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { organization: true },
    });

    if (user) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    user = await prisma.user.create({
      data: {
        id: userId,
        email: cleanEmail,
        role: "admin",
        organizationId: organization.id,
      },
      include: { organization: true },
    });

    console.log(`🏢 SaaS Registration: Created new Tenant "${orgName}" & User "${cleanEmail}"`);

    // Return the user and their custom dev bearer token!
    res.status(201).json({
      message: "Organization registered successfully!",
      token: `mock-user-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organization: user.organization,
      },
    });
  } catch (err) {
    console.error("❌ Onboarding registration error:", err);
    next(err);
  }
});

/**
 * Returns the current active session user and their organization.
 */
router.get("/session", requireAuth, (req, res) => {
  res.json({
    user: req.user,
  });
});

/**
 * Lists all active organizations and users in development mode.
 * Extremely useful for testing tenant-switching directly in the frontend!
 */
router.get("/organizations", async (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not allowed in production mode." });
  }

  try {
    const orgs = await prisma.organization.findMany({
      include: {
        users: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ organizations: orgs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
