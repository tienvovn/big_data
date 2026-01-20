import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const AUTH_URL = process.env.AUTH_URL;
const PRICING_URL = process.env.PRICING_URL;
const RIDE_URL = process.env.RIDE_URL;
const PAYMENT_URL = process.env.PAYMENT_URL;

// ===== Simple auth middleware =====
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ===== Proxy routes =====
app.use("/auth", createProxyMiddleware({ target: AUTH_URL, changeOrigin: true }));
app.use("/pricing", createProxyMiddleware({ target: PRICING_URL, changeOrigin: true }));

app.use(
  "/rides",
  requireAuth,
  createProxyMiddleware({
    target: RIDE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader("x-user-id", req.user.userId);
    },
  })
);

app.use(
  "/payments",
  requireAuth,
  createProxyMiddleware({
    target: PAYMENT_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader("x-user-id", req.user.userId);
    },
  })
);

app.use("/payments", requireAuth, createProxyMiddleware({ target: PAYMENT_URL, changeOrigin: true }));

app.get("/health", (req, res) => res.json({ ok: true }));

const server = app.listen(8080, () => console.log("Gateway on :8080"));

// ===== WebSocket (clients subscribe realtime) =====
const wss = new WebSocketServer({ server, path: "/ws" });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: "WELCOME", msg: "connected" }));

  ws.on("close", () => clients.delete(ws));
});

// ===== tiny in-memory broadcast API for notification-service =====
// Notification-service will call POST /internal/broadcast
app.post("/internal/broadcast", (req, res) => {
  const payload = req.body;
  const data = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
  res.json({ ok: true, clients: clients.size });
});
