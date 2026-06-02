// ============================================================
// sockets/index.js — Socket.io real-time layer
// Dashboard connects here to get live lead updates
// ============================================================
const { Server } = require("socket.io");

let io;

/**
 * Initialize Socket.io and attach to the HTTP server.
 * Called once at startup from server.js.
 */
exports.initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Dashboard clients join the "dashboard" room to receive lead events
    socket.on("join:dashboard", () => {
      socket.join("dashboard");
      console.log(`📺 ${socket.id} joined dashboard`);
      socket.emit("joined", { room: "dashboard", socketId: socket.id });
    });

    // Support agents can join a specific lead's "room" for detailed updates
    socket.on("join:lead", (leadId) => {
      socket.join(`lead:${leadId}`);
      console.log(`📋 ${socket.id} joined lead room: ${leadId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} — ${reason}`);
    });

    // Client can ping to check connection
    socket.on("ping", () => socket.emit("pong", { ts: Date.now() }));
  });

  console.log("🔌 Socket.io initialized");
  return io;
};

/**
 * Get the Socket.io instance from anywhere in the app.
 * Usage: const io = getIO(); io.to("dashboard").emit("lead:new", data);
 */
exports.getIO = () => io;

/**
 * Emit an event to all dashboard clients.
 * Convenience wrapper for use in controllers/services.
 */
exports.emitToDashboard = (event, data) => {
  if (io) {
    io.to("dashboard").emit(event, data);
  }
};
