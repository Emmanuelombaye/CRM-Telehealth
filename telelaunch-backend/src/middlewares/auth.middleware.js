// ============================================================
// middlewares/auth.middleware.js — Supabase Auth Guard
// ============================================================
const ws = require("ws");
global.WebSocket = ws; // Polyfill for Node.js environments

const { createClient } = require("@supabase/supabase-js");
const prisma = require("../config/db");

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

/**
 * Ensures a default demo organization and user profile exist.
 * This guarantees a seamless developer experience without breaking.
 */
async function ensureDefaultTenant() {
  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    console.log("🌱 Database is empty. Bootstrapping default Organization and Demo User...");
    const defaultOrg = await prisma.organization.create({
      data: {
        name: "TeleLaunch Workspace (Demo)",
      },
    });

    const defaultUser = await prisma.user.create({
      data: {
        id: "demo-user-id",
        email: "demo@telelaunch.com",
        role: "admin",
        organizationId: defaultOrg.id,
      },
    });

    console.log(`✅ Created default Organization: ${defaultOrg.name} (${defaultOrg.id})`);
    console.log(`✅ Created default User: ${defaultUser.email}`);
    return { defaultOrg, defaultUser };
  }

  const defaultOrg = await prisma.organization.findFirst();
  const defaultUser = await prisma.user.findFirst({
    where: { organizationId: defaultOrg.id },
  });

  return { defaultOrg, defaultUser };
}

/**
 * Authentication Guard Middleware
 * Verifies Bearer tokens via Supabase Auth and fetches tenant context.
 * Falls back to Demo User in development if no token is provided.
 */
const requireAuth = async (req, res, next) => {
  try {
    // Ensure default workspace/user exists
    const { defaultUser } = await ensureDefaultTenant();

    const authHeader = req.headers.authorization;

    // Mock User Development Fallback: check for Bearer mock-user-<userId>
    if (authHeader && authHeader.startsWith("Bearer mock-user-")) {
      if (process.env.NODE_ENV !== "production") {
        const userId = authHeader.split("Bearer mock-user-")[1];
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { organization: true },
        });
        if (dbUser) {
          req.user = dbUser;
          return next();
        }
      }
    }

    // Development Fallback: if no token is supplied, authorize as Demo User
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (process.env.NODE_ENV !== "production") {
        req.user = defaultUser;
        return next();
      }
      return res.status(401).json({ error: "Unauthorized: Missing Bearer Token" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase Auth service
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or Expired Token" });
    }

    // Retrieve database user profile including organization details
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true },
    });

    // Auto-create database profile for first-time Supabase logins
    if (!dbUser) {
      console.log(`👤 First login detected for Supabase User: ${user.email}. Initializing profile...`);
      const defaultOrg = await prisma.organization.findFirst();
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          role: "agent",
          organizationId: defaultOrg.id,
        },
        include: { organization: true },
      });
    }

    req.user = dbUser;
    next();
  } catch (err) {
    console.error("❌ Authentication error:", err.message);
    res.status(500).json({ error: "Internal Authentication Server Error" });
  }
};

module.exports = {
  requireAuth,
  ensureDefaultTenant,
};
