import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import amqp from "amqplib";

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// --- WebSocket (Customer/Driver apps subscribe here) ---
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

// Socket auth: client sends { token } in auth
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing token"));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
    return next();
  } catch (e) {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user.sub;
  // Room per user to push notifications
  socket.join(`user:${userId}`);
  socket.emit("connected", { userId });
});

// Internal endpoint for Notification Service
app.post("/internal/notify", (req, res) => {
  const { userId, event } = req.body || {};
  if (!userId || !event) return res.status(400).json({ error: "userId + event required" });
  io.to(`user:${userId}`).emit("event", event);
  return res.json({ ok: true });
});

// Health
app.get("/health", (_req, res) => res.json({ ok: true, service: "gateway" }));

// --- API Gateway routing (REST) ---
const routes = [
  { path: "/auth", target: "http://auth-service:3001" },
  { path: "/users", target: "http://user-service:3002" },
  { path: "/pricing", target: "http://pricing-service:3003" },
  { path: "/rides", target: "http://ride-service:3004" },
  { path: "/payments", target: "http://payment-service:3005" },
  { path: "/reviews", target: "http://review-service:3007" }
];

for (const r of routes) {
  app.use(
    r.path,
    createProxyMiddleware({
      target: r.target,
      changeOrigin: true,
      pathRewrite: { [`^${r.path}`]: "" }
    })
  );
}

// --- Optional: listen to RabbitMQ events directly (handy for debugging) ---
async function startRabbitConsumer() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  const exchange = "events";
  await ch.assertExchange(exchange, "topic", { durable: false });
  const q = await ch.assertQueue("gateway_debug", { exclusive: false, durable: false, autoDelete: true });
  await ch.bindQueue(q.queue, exchange, "#");

  ch.consume(q.queue, (msg) => {
    if (!msg) return;
    try {
      const rk = msg.fields.routingKey;
      const data = JSON.parse(msg.content.toString());
      console.log(`[gateway] event ${rk}`, data);
    } catch {}
    ch.ack(msg);
  });
}

startRabbitConsumer().catch((e) => console.warn("Rabbit consumer not ready yet:", e.message));

server.listen(PORT, () => {
  console.log(`API Gateway listening on :${PORT}`);
});
