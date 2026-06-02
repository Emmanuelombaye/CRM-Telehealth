# 🚀 TeleLaunch CRM — Backend

Production-grade Node.js CRM + lead automation backend.

## What this does

When a lead comes in from **Meta Lead Ads**, your **website**, or **manual entry**:

1. ✅ Lead is stored in PostgreSQL
2. 📱 SMS sent via Twilio (instant)
3. 📧 Welcome email sent via SendGrid
4. 📋 All activity logged to database
5. ⚡ Dashboard updates live via Socket.io

---

## Prerequisites

| Service | Purpose | Get it |
|---|---|---|
| **PostgreSQL** | Main database | [postgresql.org](https://postgresql.org) or Docker |
| **Redis** | BullMQ job queue | [redis.io](https://redis.io) or Docker |
| **Twilio** | SMS | [twilio.com](https://twilio.com) |
| **SendGrid** | Email | [sendgrid.com](https://sendgrid.com) |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
copy .env.example .env
# Edit .env with your real credentials
```

### 3. Set up database
```bash
# Run Prisma migration (creates all tables)
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# (Optional) Seed with test data
node prisma/seed.js
```

### 4. Start the server
```bash
npm run dev
```

Server will be live at: `http://localhost:5000`

---

## API Reference

### Leads

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/leads` | Create a lead manually |
| `GET` | `/api/leads` | List all leads |
| `GET` | `/api/leads/:id` | Get lead + messages + activity |
| `PATCH` | `/api/leads/:id` | Update status/fields |
| `DELETE` | `/api/leads/:id` | Archive lead |

**Query params for GET /api/leads:**
- `?status=new` — filter by status (new, contacted, qualified, closed, dead)
- `?source=meta` — filter by source
- `?search=john` — search by name/phone/email
- `?page=1&limit=50` — pagination

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/webhook/meta` | Meta verification handshake |
| `POST` | `/webhook/meta` | Receive Meta lead ads data |

---

## Socket.io Events

Connect from your frontend:
```js
const socket = io("http://localhost:5000");
socket.emit("join:dashboard"); // Subscribe to live updates

socket.on("lead:new", (lead) => { /* new lead arrived */ });
socket.on("lead:updated", (lead) => { /* lead status changed */ });
socket.on("lead:automation_complete", ({ lead, results }) => { /* SMS+email done */ });
```

---

## Meta Webhook Setup

1. Deploy this backend to a public URL (e.g., Railway, Render, AWS)
2. Go to **Meta Developer App → Webhooks**
3. Set Callback URL: `https://yourserver.com/webhook/meta`
4. Set Verify Token: (must match `META_VERIFY_TOKEN` in your `.env`)
5. Subscribe to `leadgen` field

---

## Lead Status Flow

```
new → contacted → qualified → closed
             ↓
            dead (archived)
```

---

## Project Structure

```
src/
├── server.js          # Entry point — HTTP + Socket.io + Worker
├── app.js             # Express setup, middleware, routes
├── config/
│   ├── db.js          # Prisma singleton
│   └── redis.js       # Redis/BullMQ connection
├── routes/
│   ├── leads.routes.js
│   └── webhooks.routes.js
├── controllers/
│   ├── leads.controller.js   # All lead CRUD logic
│   └── webhook.controller.js # Meta webhook handler
├── services/
│   ├── twilio.service.js     # SMS via Twilio
│   └── email.service.js      # Email via SendGrid
├── jobs/
│   └── leadProcessor.job.js  # BullMQ queue + worker
└── sockets/
    └── index.js              # Socket.io real-time layer

prisma/
├── schema.prisma  # Database models
└── seed.js        # Test data seeder
```
