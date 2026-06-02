// ============================================================
// controllers/tasks.controller.js — Scoped Tasks Logic
// ============================================================
const prisma = require("../config/db");

/**
 * Retrieve all tasks scoped to the active tenant.
 */
exports.getAll = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { organizationId: req.user.organizationId },
      include: {
        lead: {
          select: { id: true, name: true, phone: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new task under the active tenant.
 */
exports.create = async (req, res, next) => {
  const { title, dueDate, leadId } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Task title is required." });
  }

  try {
    const task = await prisma.task.create({
      data: {
        organizationId: req.user.organizationId,
        title,
        status: "pending",
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(leadId && { leadId }),
      },
      include: {
        lead: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`📋 Task Created: "${title}" for Org ${req.user.organizationId}`);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing task (toggle status/title) with tenant isolation check.
 */
exports.update = async (req, res, next) => {
  const { id } = req.params;
  const { title, status, dueDate } = req.body;

  try {
    // 1. Verify ownership
    const existing = await prisma.task.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Task not found or unauthorized access." });
    }

    // 2. Perform the update
    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        lead: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a task with tenant isolation check.
 */
exports.delete = async (req, res, next) => {
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Task not found or unauthorized access." });
    }

    await prisma.task.delete({
      where: { id },
    });

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    next(err);
  }
};
