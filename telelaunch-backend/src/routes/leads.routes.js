// ============================================================
// routes/leads.routes.js
// ============================================================
const router = require("express").Router();
const {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  deletelead,
  sendMessage,
} = require("../controllers/leads.controller");

// POST   /api/leads        — Create a new lead (manual entry)
router.post("/", createLead);

// GET    /api/leads        — List all leads (filter by status/source)
router.get("/", getLeads);

// GET    /api/leads/:id    — Get single lead + messages + activity
router.get("/:id", getLeadById);

// POST   /api/leads/:id/messages — Send manual SMS/Email message
router.post("/:id/messages", sendMessage);

// PATCH  /api/leads/:id    — Update status or fields
router.patch("/:id", updateLeadStatus);

// DELETE /api/leads/:id    — Soft delete (status = dead)
router.delete("/:id", deletelead);

module.exports = router;
