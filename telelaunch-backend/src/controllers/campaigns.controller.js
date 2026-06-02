// ============================================================
// controllers/campaigns.controller.js — Bulk Campaign Outreaches
// ============================================================
const prisma = require("../config/db");
const twilio = require("twilio");
const sgMail = require("@sendgrid/mail");
const { getIO } = require("../sockets");

/**
 * Retrieve all campaigns scoped to the active tenant.
 */
exports.getAll = async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new draft campaign under the active tenant.
 */
exports.create = async (req, res, next) => {
  const { name, type, content, subject } = req.body;

  if (!name || !type || !content) {
    return res.status(400).json({ error: "Name, type (sms/email), and content are required." });
  }

  if (type === "email" && !subject) {
    return res.status(400).json({ error: "Email campaigns require a subject line." });
  }

  try {
    const campaign = await prisma.campaign.create({
      data: {
        organizationId: req.user.organizationId,
        name,
        type,
        content,
        subject,
        status: "draft",
      },
    });

    console.log(`📢 Campaign Draft Created: "${name}" (${type})`);
    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger background execution of a bulk campaign.
 */
exports.send = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1. Fetch organization and verify credentials/credits
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: req.user.organizationId },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found or unauthorized." });
    }

    if (campaign.status === "running" || campaign.status === "complete") {
      return res.status(400).json({ error: `Campaign is already ${campaign.status}.` });
    }

    // 2. Check credits limits
    if (campaign.type === "sms" && org.smsCredits <= 0) {
      return res.status(400).json({ error: "Insufficient SMS Credits. Please top up." });
    }
    if (campaign.type === "email" && org.emailCredits <= 0) {
      return res.status(400).json({ error: "Insufficient Email Credits. Please top up." });
    }

    // 3. Mark campaign as running
    const runningCampaign = await prisma.campaign.update({
      where: { id },
      data: { status: "running" },
    });

    // 4. Retrieve all leads under organization
    const leads = await prisma.lead.findMany({
      where: { organizationId: req.user.organizationId },
    });

    if (leads.length === 0) {
      await prisma.campaign.update({
        where: { id },
        data: { status: "complete" },
      });
      return res.json({ message: "Campaign complete. No leads found to contact.", campaign: { ...runningCampaign, status: "complete" } });
    }

    // 5. Fire background worker processing so HTTP call returns immediately
    setImmediate(async () => {
      console.log(`⚡ Background worker: Running Bulk Campaign "${campaign.name}" (${leads.length} leads)...`);
      
      let sentCount = 0;
      let failCount = 0;

      // Extract integration overrides or fall back to globals
      const twSid = org.twilioSid || process.env.TWILIO_ACCOUNT_SID;
      const twToken = org.twilioToken || process.env.TWILIO_AUTH_TOKEN;
      const twPhone = org.twilioPhone || process.env.TWILIO_PHONE_NUMBER;
      const sgKey = org.sendgridApiKey || process.env.SENDGRID_API_KEY;
      const sgFrom = org.sendgridFrom || process.env.SENDGRID_FROM_EMAIL;

      // Initialize clients dynamically
      let twilioClient = null;
      if (campaign.type === "sms" && twSid && twToken && !twSid.startsWith("ACxxxxx")) {
        twilioClient = twilio(twSid, twToken);
      }

      if (campaign.type === "email" && sgKey && !sgKey.startsWith("SG.xxxx")) {
        sgMail.setApiKey(sgKey);
      }

      // Loop and dispatch to all leads
      for (const lead of leads) {
        // Evaluate customizable variables, e.g. "Hi [Lead Name]!" -> "Hi John Doe!"
        const parsedContent = campaign.content.replace(/\[Lead Name\]/gi, lead.name);

        let success = false;
        let extId = null;
        let errCode = null;
        let errMsg = null;

        try {
          if (campaign.type === "sms") {
            if (twilioClient && lead.phone) {
              const twRes = await twilioClient.messages.create({
                body: parsedContent,
                from: twPhone,
                to: lead.phone,
              });
              extId = twRes.sid;
              success = true;
            } else {
              // Dev-mode Simulation
              extId = `sim-sms-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              success = true;
            }
          } else {
            // Email dispatch
            if (sgKey && !sgKey.startsWith("SG.xxxx") && lead.email) {
              await sgMail.send({
                to: lead.email,
                from: sgFrom,
                subject: campaign.subject,
                text: parsedContent,
              });
              extId = `sendgrid-${Date.now()}`;
              success = true;
            } else {
              // Dev-mode Simulation
              extId = `sim-email-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              success = true;
            }
          }
        } catch (err) {
          console.error(`❌ Campaign dispatch error for lead ${lead.id}:`, err.message);
          success = false;
          errCode = err.code || "DISPATCH_ERROR";
          errMsg = err.message;
        }

        // Log message record
        await prisma.message.create({
          data: {
            leadId: lead.id,
            type: campaign.type,
            content: parsedContent,
            ...(campaign.type === "email" && { subject: campaign.subject }),
            status: success ? "delivered" : "failed",
            externalId: extId,
            errorCode: errCode,
            errorMsg: errMsg,
          },
        });

        // Log activity timeline
        await prisma.activity.create({
          data: {
            leadId: lead.id,
            action: campaign.type === "sms" ? "sms_sent" : "email_sent",
            metadata: {
              campaignId: campaign.id,
              status: success ? "delivered" : "failed",
            },
          },
        });

        if (success) {
          sentCount++;
        } else {
          failCount++;
        }
      }

      // Update remaining organization credit balances
      const creditsToDeduct = sentCount;
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          ...(campaign.type === "sms"
            ? { smsCredits: { decrement: creditsToDeduct } }
            : { emailCredits: { decrement: creditsToDeduct } }),
        },
      });

      // Mark campaign complete in DB
      const finalCampaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: "complete",
          sentCount,
          failCount,
        },
      });

      console.log(`✅ Bulk Campaign "${campaign.name}" Complete! Sent: ${sentCount}, Failed: ${failCount}`);

      // Broadcast complete stats to all active dashboards via WebSocket!
      const io = getIO();
      if (io) {
        io.to("dashboard").emit("campaign:complete", {
          campaign: finalCampaign,
          smsCredits: org.smsCredits - (campaign.type === "sms" ? creditsToDeduct : 0),
          emailCredits: org.emailCredits - (campaign.type === "email" ? creditsToDeduct : 0),
        });
      }
    });

    res.json({
      message: "Bulk campaign execution started in the background.",
      campaign: { ...campaign, status: "running" }
    });
  } catch (err) {
    next(err);
  }
};
