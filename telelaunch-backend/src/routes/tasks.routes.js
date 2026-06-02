// ============================================================
// routes/tasks.routes.js — Tasks Endpoint Routing
// ============================================================
const express = require("express");
const router = express.Router();
const tasksController = require("../controllers/tasks.controller");

router.get("/", tasksController.getAll);
router.post("/", tasksController.create);
router.patch("/:id", tasksController.update);
router.delete("/:id", tasksController.delete);

module.exports = router;
