// ============================================================
// services/twilio.service.js
// SMS sending via Twilio REST API
// ============================================================
const twilio = require("twilio");
const prisma = require("../config/db");

let client;

// Lazily initialize client so missing env vars only error at send-time
function getClient() {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured in .env");
    }
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return client;
}

/**
 * Send an SMS to a lead.
 *
 * @param {object} params
 * @param {string} params.leadId   - Lead ID for activity logging
 * @param {string} params.to       - Recipient phone number (E.164 format: +1XXXXXXXXXX)
 * @param {string} params.body     - SMS message content
 * @returns {object} { success, messageSid, error }
 */
exports.sendSMS = async ({ leadId, to, body }) => {
  // Normalize phone number — ensure E.164 format
  const normalizedPhone = normalizePhone(to);
  if (!normalizedPhone) {
    console.error(`❌ Invalid phone number for lead ${leadId}: ${to}`);
    return { success: false, error: "Invalid phone number format" };
  }

  // Create message record first (pending status)
  const message = await prisma.message.create({
    data: {
      leadId,
      type: "sms",
      content: body,
      status: "pending",
    },
  });

  try {
    const twilioMessage = await getClient().messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedPhone,
    });

    // Update message record with success
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "sent",
        externalId: twilioMessage.sid,
      },
    });

    // Activity log
    await prisma.activity.create({
      data: {
        leadId,
        action: "sms_sent",
        metadata: {
          to: normalizedPhone,
          messageSid: twilioMessage.sid,
          preview: body.substring(0, 50),
        },
      },
    });

    console.log(`📱 SMS sent to ${normalizedPhone} — SID: ${twilioMessage.sid}`);
    return { success: true, messageSid: twilioMessage.sid };
  } catch (err) {
    // Update message record with failure
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "failed",
        errorCode: String(err.code || ""),
        errorMsg: err.message,
      },
    });

    await prisma.activity.create({
      data: {
        leadId,
        action: "sms_failed",
        metadata: { error: err.message, code: err.code },
      },
    });

    console.error(`❌ SMS failed for lead ${leadId}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Normalize phone to E.164 format.
 * Handles US numbers: strips non-digits, adds +1 if 10 digits.
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");

  // Already has country code (11 digits for US)
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // 10-digit US number
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // International: trust it as-is if starts with +
  if (phone.startsWith("+") && digits.length > 10) {
    return `+${digits}`;
  }

  return null; // Can't normalize
}
