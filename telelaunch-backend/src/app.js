// ============================================================
// app.js — Express application setup
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

// Route imports
const authRoutes = require("./routes/auth.routes");
const leadsRoutes = require("./routes/leads.routes");
const webhooksRoutes = require("./routes/webhooks.routes");
const tasksRoutes = require("./routes/tasks.routes");
const campaignsRoutes = require("./routes/campaigns.routes");
const settingsRoutes = require("./routes/settings.routes");
const { requireAuth } = require("./middlewares/auth.middleware");

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ],
  credentials: true,
}));

// IMPORTANT: raw body must be parsed BEFORE express.json()
// for webhook signature verification
app.use("/webhook", express.raw({ type: "application/json" }));

// Standard JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (dev mode)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "TeleLaunch CRM API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/leads", requireAuth, leadsRoutes);
app.use("/api/tasks", requireAuth, tasksRoutes);
app.use("/api/campaigns", requireAuth, campaignsRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);
app.use("/webhook", webhooksRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

module.exports = app;
