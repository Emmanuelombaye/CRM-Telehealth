// ============================================================
// routes/settings.routes.js — Organization Settings Routes
// ============================================================
const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");

router.get("/", settingsController.getSettings);
router.patch("/", settingsController.updateSettings);

module.exports = router;
