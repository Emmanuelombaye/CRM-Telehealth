// ============================================================
// routes/webhooks.routes.js
// ============================================================
const router = require("express").Router();
const {
  verifyMetaWebhook,
  handleMetaWebhook,
} = require("../controllers/webhook.controller");

// GET  /webhook/meta — Meta's verification handshake (required before webhook goes live)
router.get("/meta", verifyMetaWebhook);

// POST /webhook/meta — Receive lead data from Meta Lead Ads
router.post("/meta", handleMetaWebhook);

module.exports = router;
