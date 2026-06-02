// ============================================================
// jobs/leadProcessor.job.js
// BullMQ Queue + Worker or In-Memory Mock for lead automation
//
// FLOW: New Lead → SMS → Email → Activity Log → Socket.io
// ============================================================
const { sendSMS } = require("../services/twilio.service");
const { sendEmail, buildWelcomeEmail } = require("../services/email.service");
const { getIO } = require("../sockets");
const prisma = require("../config/db");

const QUEUE_NAME = "lead-processor";
const useRedis = process.env.USE_REDIS !== "false";

// ── Shared Processing Logic ─────────────────────────────────
async function processLeadJob(jobData) {
  const { leadId, lead } = jobData;
  console.log(`⚙️  Processing lead: ${lead.name} (${leadId})`);

  const results = {
    sms: null,
    email: null,
  };

  // ── Step 1: Send SMS ──────────────────────────────────
  if (lead.phone) {
    const smsBody = buildSMSMessage(lead);
    results.sms = await sendSMS({
      leadId,
      to: lead.phone,
      body: smsBody,
    });
  } else {
    console.log(`⏭️  No phone for lead ${leadId} — skipping SMS`);
  }

  // ── Step 2: Send Email ────────────────────────────────
  if (lead.email) {
    const { subject, text, html } = buildWelcomeEmail(lead);
    results.email = await sendEmail({
      leadId,
      to: lead.email,
      subject,
      text,
      html,
    });
  } else {
    console.log(`⏭️  No email for lead ${leadId} — skipping email`);
  }

  // ── Step 3: Update lead status to "contacted" ─────────
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "contacted" },
  });

  await prisma.activity.create({
    data: {
      leadId,
      action: "automation_complete",
      metadata: {
        smsResult: results.sms,
        emailResult: results.email,
      },
    },
  });

  // ── Step 4: Notify dashboard via Socket.io ────────────
  const io = getIO();
  if (io) {
    // Fetch the updated lead to send full data
    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    io.to("dashboard").emit("lead:automation_complete", {
      lead: updatedLead,
      results,
    });

    io.to("dashboard").emit("lead:updated", updatedLead);
  }

  console.log(`✅ Automation complete for: ${lead.name}`);
  return results;
}

// Helper: Build the welcome SMS message
function buildSMSMessage(lead) {
  const firstName = lead.name.split(" ")[0];
  return `Hi ${firstName}! Thanks for your interest in TeleLaunch. A team member will reach out shortly. Reply STOP to opt out.`;
}

// ── Setup Queue & Worker depending on USE_REDIS ──────────────
let leadQueue;
let worker;

if (useRedis) {
  const { Queue, Worker } = require("bullmq");
  const connection = require("../config/redis");

  // ── Queue ─────────────────────────────────────────────────────
  leadQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,          // Retry up to 3 times on failure
      backoff: {
        type: "exponential",
        delay: 5000,        // Wait 5s, then 10s, then 20s before retry
      },
      removeOnComplete: {
        age: 24 * 3600,     // Keep completed jobs for 24 hours
        count: 500,         // Keep last 500 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days for debugging
      },
    },
  });

  /**
   * Add a lead to the automation queue.
   */
  exports.addLeadToQueue = async (lead) => {
    const job = await leadQueue.add(
      "process-new-lead",
      { leadId: lead.id, lead },
      {
        jobId: `lead-${lead.id}`, // Deduplicate: prevent double-processing
      }
    );
    console.log(`📥 Lead ${lead.name} queued — Job ID: ${job.id}`);
    return job;
  };

  /**
   * Start the background worker.
   */
  exports.startWorker = () => {
    if (worker) return; // Already running

    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        return await processLeadJob(job.data);
      },
      {
        connection,
        concurrency: 5,
      }
    );

    worker.on("completed", (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      console.error("❌ Worker error:", err.message);
    });

    console.log("🔧 BullMQ worker started — listening for leads...");
  };

  exports.leadQueue = leadQueue;

} else {
  console.log("⚠️  Redis is disabled. Using In-Memory Mock Queue for Lead Processing.");

  exports.addLeadToQueue = async (lead) => {
    const jobId = `mock-lead-${lead.id}-${Date.now()}`;
    console.log(`📥 Lead ${lead.name} queued (In-Memory) — Job ID: ${jobId}`);

    // Run the worker task asynchronously in memory
    setImmediate(async () => {
      try {
        await processLeadJob({ leadId: lead.id, lead });
      } catch (err) {
        console.error(`❌ Mock automation failed for lead ${lead.name}:`, err.message);
      }
    });

    return { id: jobId };
  };

  exports.startWorker = () => {
    console.log("🔧 In-memory mock worker started — listening for leads...");
  };

  exports.leadQueue = {
    add: async () => ({ id: `mock-manual-${Date.now()}` }),
  };
}
