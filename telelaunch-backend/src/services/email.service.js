// ============================================================
// services/email.service.js
// Transactional email via SendGrid
// ============================================================
const sgMail = require("@sendgrid/mail");
const prisma = require("../config/db");

// Initialize SendGrid API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send a transactional email to a lead.
 *
 * @param {object} params
 * @param {string} params.leadId   - Lead ID for logging
 * @param {string} params.to       - Recipient email address
 * @param {string} params.subject  - Email subject line
 * @param {string} params.text     - Plain text body
 * @param {string} params.html     - HTML body (optional, falls back to text)
 * @returns {object} { success, messageId, error }
 */
exports.sendEmail = async ({ leadId, to, subject, text, html }) => {
  if (!to || !to.includes("@")) {
    console.log(`⏭️  Skipping email for lead ${leadId} — no valid email`);
    return { success: false, error: "No valid email address" };
  }

  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SendGrid API key not configured in .env");
  }

  // Create message record
  const message = await prisma.message.create({
    data: {
      leadId,
      type: "email",
      content: text,
      subject,
      status: "pending",
    },
  });

  const msg = {
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || "hello@telelaunch.com",
      name: process.env.SENDGRID_FROM_NAME || "TeleLaunch CRM",
    },
    subject,
    text,
    html: html || `<p>${text.replace(/\n/g, "<br>")}</p>`,
  };

  try {
    const [response] = await sgMail.send(msg);
    const messageId = response.headers["x-message-id"] || "";

    await prisma.message.update({
      where: { id: message.id },
      data: { status: "sent", externalId: messageId },
    });

    await prisma.activity.create({
      data: {
        leadId,
        action: "email_sent",
        metadata: { to, subject, messageId },
      },
    });

    console.log(`📧 Email sent to ${to} — Subject: "${subject}"`);
    return { success: true, messageId };
  } catch (err) {
    const errorMsg = err.response?.body?.errors?.[0]?.message || err.message;

    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "failed",
        errorCode: String(err.code || ""),
        errorMsg: errorMsg,
      },
    });

    await prisma.activity.create({
      data: {
        leadId,
        action: "email_failed",
        metadata: { error: errorMsg },
      },
    });

    console.error(`❌ Email failed for lead ${leadId}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Build the welcome email content for a new lead.
 * Customize this template to match TeleLaunch brand.
 */
exports.buildWelcomeEmail = (lead) => {
  const subject = `Welcome to TeleLaunch — We'll be in touch shortly!`;

  const text = `Hi ${lead.name},

Thanks for your interest! A member of our team will reach out to you shortly.

In the meantime, feel free to reply to this email with any questions.

— The TeleLaunch Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .header { background: #1a1a2e; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { background: #f9f9f9; padding: 32px; border-radius: 0 0 8px 8px; }
    .cta { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #7c3aed; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 TeleLaunch</h1>
    </div>
    <div class="body">
      <h2>Hi ${lead.name},</h2>
      <p>Thanks for your interest! We've received your information and a member of our team will reach out to you shortly.</p>
      <p>We look forward to connecting with you!</p>
      <p>— The TeleLaunch Team</p>
    </div>
    <div class="footer">
      <p>TeleLaunch CRM · You're receiving this because you submitted a form.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
};
