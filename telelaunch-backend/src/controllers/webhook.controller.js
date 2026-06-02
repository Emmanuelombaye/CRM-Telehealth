// ============================================================
// controllers/webhook.controller.js
// Meta Lead Ads webhook handler
// ============================================================
const crypto = require("crypto");
const prisma = require("../config/db");
const { addLeadToQueue } = require("../jobs/leadProcessor.job");
const { getIO } = require("../sockets");

// ── GET /webhook/meta ────────────────────────────────────────
// Meta calls this once to verify your endpoint is valid.
// Must respond with hub.challenge for verification to pass.
exports.verifyMetaWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("✅ Meta webhook verified");
    return res.status(200).send(challenge);
  }

  console.warn("⚠️  Meta webhook verification failed — token mismatch");
  return res.status(403).json({ error: "Verification failed" });
};

// ── POST /webhook/meta ───────────────────────────────────────
// Meta sends lead data here every time a lead fills out an ad form.
exports.handleMetaWebhook = async (req, res) => {
  // Step 1: Verify HMAC signature (security — reject forged requests)
  const signature = req.headers["x-hub-signature-256"];
  if (!verifyMetaSignature(req.body, signature)) {
    console.warn("⚠️  Invalid Meta webhook signature — request rejected");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Meta requires a 200 response quickly (< 5 seconds)
  // Respond immediately, process in background
  res.status(200).json({ received: true });

  // Resolve Organization Id from query param or fallback to first Organization
  const orgQuery = req.query.org;
  let organizationId;

  try {
    if (orgQuery) {
      const orgExists = await prisma.organization.findUnique({ where: { id: orgQuery } });
      if (orgExists) organizationId = orgQuery;
    }

    if (!organizationId) {
      const firstOrg = await prisma.organization.findFirst();
      organizationId = firstOrg?.id;
    }
  } catch (err) {
    console.error("❌ Failed to resolve organization for webhook:", err.message);
    return;
  }

  if (!organizationId) {
    console.error("❌ Webhook aborted: No Organization exists in the database to bind the lead to.");
    return;
  }

  // Step 2: Parse the raw body
  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch (e) {
    console.error("❌ Failed to parse Meta webhook payload:", e.message);
    return;
  }

  console.log("📩 Meta webhook received:", JSON.stringify(payload, null, 2));

  // Step 3: Extract lead data from Meta's nested payload structure
  try {
    const entries = payload.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const value = change.value;
        const leads = value.leads || [];

        for (const metaLead of leads) {
          await processMetaLead(metaLead, value, organizationId);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error processing Meta webhook:", error);
  }
};

// ── Helper: Process a single Meta lead ───────────────────────
async function processMetaLead(metaLead, context, organizationId) {
  // Meta returns field_data as an array of {name, values} objects
  // Normalize it into a simple key:value map
  const fields = {};
  (metaLead.field_data || []).forEach((field) => {
    fields[field.name] = field.values?.[0] || "";
  });

  const name =
    fields["full_name"] ||
    `${fields["first_name"] || ""} ${fields["last_name"] || ""}`.trim() ||
    "Unknown";

  const phone = fields["phone_number"] || fields["phone"] || "";
  const email = fields["email"] || "";

  if (!phone && !email) {
    console.warn("⚠️  Meta lead missing both phone and email — skipping");
    return;
  }

  // Create lead in database bound to organization
  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email: email || null,
      source: "meta",
      formName: context.form_name || null,
      adId: context.ad_id ? String(context.ad_id) : null,
      campaignId: context.campaign_id ? String(context.campaign_id) : null,
      organizationId,
    },
  });

  // Activity log
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      action: "webhook_received",
      metadata: {
        source: "meta",
        metaLeadId: metaLead.id,
        formName: context.form_name,
        adId: context.ad_id,
      },
    },
  });

  console.log(`✅ Meta lead saved: ${lead.name} (${lead.phone}) for Organization: ${organizationId}`);

  // Queue automation (SMS + Email)
  await addLeadToQueue(lead);

  // Notify dashboard in real-time
  const io = getIO();
  if (io) {
    io.to("dashboard").emit("lead:new", lead);
  }
}

// ── Helper: Verify HMAC-SHA256 signature from Meta ───────────
function verifyMetaSignature(rawBody, signatureHeader) {
  if (!process.env.META_APP_SECRET) return true; // skip in dev if not set
  if (!signatureHeader) return false;

  const [, signature] = signatureHeader.split("=");
  const expected = crypto
    .createHmac("sha256", process.env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}
