// ============================================================
// controllers/leads.controller.js
// Handles all CRM lead operations scoped to the active tenant
// ============================================================
const prisma = require("../config/db");
const { addLeadToQueue } = require("../jobs/leadProcessor.job");
const { getIO } = require("../sockets");

// ── POST /api/leads ──────────────────────────────────────────
// Create a lead manually (from website form, import, etc.)
exports.createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source = "manual" } = req.body;
    const organizationId = req.user.organizationId;

    // Basic validation
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    // Create lead in DB, bound to the user's organization
    const lead = await prisma.lead.create({
      data: { 
        name, 
        phone, 
        email, 
        source, 
        organizationId 
      },
    });

    // Log the creation activity
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        action: "lead_created",
        metadata: { source, method: "manual_api" },
      },
    });

    // Push to automation queue (SMS + Email will fire)
    await addLeadToQueue(lead);

    // Emit real-time event to connected dashboards
    const io = getIO();
    if (io) {
      io.to("dashboard").emit("lead:new", lead);
    }

    return res.status(201).json({
      success: true,
      lead,
      message: "Lead created and queued for automation",
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/leads ───────────────────────────────────────────
// List leads with optional filtering + pagination (tenant-scoped)
exports.getLeads = async (req, res, next) => {
  try {
    const {
      status,
      source,
      page = 1,
      limit = 50,
      search,
    } = req.query;

    const organizationId = req.user.organizationId;

    const where = { organizationId };
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { messages: true, activities: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return res.json({
      leads,
      pagination: {
        total,
        page: parseInt(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/leads/:id ───────────────────────────────────────
// Get full lead detail: lead + messages + activity log (tenant-scoped)
exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { 
        id: req.params.id,
        organizationId: req.user.organizationId 
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    return res.json(lead);
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/leads/:id ─────────────────────────────────────
// Update lead status or basic fields (tenant-scoped)
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const { status, name, phone, email } = req.body;
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Get current lead for activity log diff
    const current = await prisma.lead.findFirst({ 
      where: { id, organizationId } 
    });
    
    if (!current) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;

    const updated = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    // Log status change
    if (status && status !== current.status) {
      await prisma.activity.create({
        data: {
          leadId: id,
          action: "status_changed",
          metadata: { from: current.status, to: status },
        },
      });

      // Real-time update to dashboard
      const io = getIO();
      if (io) {
        io.to("dashboard").emit("lead:updated", updated);
      }
    }

    return res.json({ success: true, lead: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/leads/:id ────────────────────────────────────
// Soft delete — sets status to "dead" (tenant-scoped)
exports.deletelead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    // Ensure lead exists in organization
    const current = await prisma.lead.findFirst({ 
      where: { id, organizationId } 
    });

    if (!current) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { status: "dead" },
    });

    await prisma.activity.create({
      data: {
        leadId: id,
        action: "lead_deleted",
        metadata: { deletedAt: new Date().toISOString() },
      },
    });

    return res.json({ success: true, message: "Lead archived", lead });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/leads/:id/messages ─────────────────────────────
// Send a manual SMS or Email to a lead
const { sendSMS } = require("../services/twilio.service");
const { sendEmail } = require("../services/email.service");

exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, content, subject } = req.body;
    const organizationId = req.user.organizationId;

    if (!type || !content) {
      return res.status(400).json({ error: "Type (sms/email) and content are required" });
    }

    const lead = await prisma.lead.findFirst({
      where: { id, organizationId }
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    let result;
    if (type === "sms") {
      result = await sendSMS({
        leadId: id,
        to: lead.phone,
        body: content
      });
    } else if (type === "email") {
      if (!lead.email) {
        return res.status(400).json({ error: "Lead does not have an email address" });
      }
      result = await sendEmail({
        leadId: id,
        to: lead.email,
        subject: subject || "Update from TeleLaunch CRM",
        text: content
      });
    } else {
      return res.status(400).json({ error: "Invalid message type. Must be 'sms' or 'email'" });
    }

    const updatedLead = await prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        messages: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" } }
      }
    });

    const io = getIO();
    if (io) {
      io.to("dashboard").emit("lead:updated", updatedLead);
    }

    return res.json({
      success: result.success,
      message: "Message processed",
      lead: updatedLead
    });
  } catch (error) {
    next(error);
  }
};
