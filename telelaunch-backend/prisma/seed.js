// ============================================================
// prisma/seed.js — Seed test data for development
// Run: node prisma/seed.js
// ============================================================
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data (dev only)
  await prisma.activity.deleteMany();
  await prisma.message.deleteMany();
  await prisma.lead.deleteMany();

  // Resolve or create default Organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "TeleLaunch Workspace (Demo)",
      },
    });
    console.log(`🌱 Created Organization for seeding: ${org.name}`);
  }

  // Create sample leads bound to the organization
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: "Maria Gonzalez",
        phone: "+14155551234",
        email: "maria@example.com",
        source: "meta",
        status: "new",
        formName: "Summer Campaign Form",
        adId: "120201234567890",
        organizationId: org.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "James Wilson",
        phone: "+13105559876",
        email: "james@example.com",
        source: "website",
        status: "contacted",
        organizationId: org.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Sarah Chen",
        phone: "+16175551111",
        email: null,
        source: "manual",
        status: "qualified",
        organizationId: org.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Robert Diaz",
        phone: "+17025554444",
        email: "robert@example.com",
        source: "meta",
        status: "closed",
        formName: "Q2 Lead Form",
        organizationId: org.id,
      },
    }),
  ]);

  // Add activities for each lead
  for (const lead of leads) {
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        action: "lead_created",
        metadata: { source: lead.source },
      },
    });
  }

  // Add a sample SMS message
  await prisma.message.create({
    data: {
      leadId: leads[0].id,
      type: "sms",
      content: "Hi Maria! Thanks for your interest in TeleLaunch. A team member will reach out shortly.",
      status: "sent",
      externalId: "SM_test_123",
    },
  });

  await prisma.activity.create({
    data: {
      leadId: leads[0].id,
      action: "sms_sent",
      metadata: { preview: "Hi Maria! Thanks for your interest..." },
    },
  });

  console.log(`✅ Seeded ${leads.length} leads`);
  console.log("Leads created:");
  leads.forEach((l) => console.log(`  - ${l.name} (${l.source}) [${l.status}]`));
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
