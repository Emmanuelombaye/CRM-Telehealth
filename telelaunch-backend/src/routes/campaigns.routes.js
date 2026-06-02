// ============================================================
// routes/campaigns.routes.js — Campaigns Route Configuration
// ============================================================
const express = require("express");
const router = express.Router();
const campaignsController = require("../controllers/campaigns.controller");

router.get("/", campaignsController.getAll);
router.post("/", campaignsController.create);
router.post("/:id/send", campaignsController.send);

module.exports = router;
