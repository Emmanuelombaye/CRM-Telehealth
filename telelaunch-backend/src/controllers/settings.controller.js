// ============================================================
// controllers/settings.controller.js — Organization Settings
// ============================================================
const prisma = require("../config/db");

/**
 * Retrieve organization settings, credits, and safe credentials descriptors.
 */
exports.getSettings = async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });

    if (!org) {
      return res.status(404).json({ error: "Organization not found." });
    }

    // Helper to mask secrets for safe frontend consumption
    const maskSecret = (val) => {
      if (!val) return "";
      if (val.length <= 8) return "********";
      return `${val.slice(0, 4)}...${val.slice(-4)}`;
    };

    res.json({
      settings: {
        id: org.id,
        name: org.name,
        smsCredits: org.smsCredits,
        emailCredits: org.emailCredits,
        createdAt: org.createdAt,
        // Send safe descriptors of the custom API keys
        hasCustomTwilio: !!(org.twilioSid && org.twilioToken && org.twilioPhone),
        twilioSid: maskSecret(org.twilioSid),
        twilioPhone: org.twilioPhone || "",
        hasCustomSendGrid: !!org.sendgridApiKey,
        sendgridFrom: org.sendgridFrom || "",
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update custom Twilio / SendGrid integration credentials for the tenant.
 */
exports.updateSettings = async (req, res, next) => {
  const { name, twilioSid, twilioToken, twilioPhone, sendgridApiKey, sendgridFrom } = req.body;

  try {
    const dataToUpdate = {};

    if (name !== undefined) dataToUpdate.name = name;
    
    // Only update Twilio/SendGrid fields if the user provided values (avoids overwriting with empty fields)
    if (twilioSid) dataToUpdate.twilioSid = twilioSid.trim();
    if (twilioToken) dataToUpdate.twilioToken = twilioToken.trim();
    if (twilioPhone) dataToUpdate.twilioPhone = twilioPhone.trim();
    if (sendgridApiKey) dataToUpdate.sendgridApiKey = sendgridApiKey.trim();
    if (sendgridFrom) dataToUpdate.sendgridFrom = sendgridFrom.trim().toLowerCase();

    const updatedOrg = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: dataToUpdate,
    });

    console.log(`⚙️ Settings Updated: Org "${updatedOrg.name}" (${updatedOrg.id}) updated credentials.`);
    
    res.json({
      message: "Organization integrations updated successfully!",
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        smsCredits: updatedOrg.smsCredits,
        emailCredits: updatedOrg.emailCredits,
      }
    });
  } catch (err) {
    next(err);
  }
};
