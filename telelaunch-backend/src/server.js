// ============================================================
// server.js — HTTP + Socket.io server bootstrap
// ============================================================
require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initSocket } = require("./sockets");
const { startWorker } = require("./jobs/leadProcessor.job");

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Attach Socket.io to the same HTTP server
initSocket(server);

// Start BullMQ background worker
startWorker();

// Start listening
server.listen(PORT, "0.0.0.0", () => {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   TeleLaunch CRM API — ONLINE        ║");
  console.log(`║   Port    : ${PORT}                       ║`);
  console.log(`║   Mode    : ${process.env.NODE_ENV || "development"}              ║`);
  console.log("╚══════════════════════════════════════╝");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
