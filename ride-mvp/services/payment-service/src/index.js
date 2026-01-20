import express from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import amqp from "amqplib";

const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}

let ch;
const exchange = "events";
async function rabbitInit() {
  const conn = await amqp.connect(RABBITMQ_URL);
  ch = await conn.createChannel();
  await ch.assertExchange(exchange, "topic", { durable: false });
  console.log("[payment] Rabbit connected");
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "payment" }));

// MVP: simulate payment success
app.post("/pay", auth, async (req, res) => {
  const { rideId, amount } = req.body || {};
  if (!rideId || !amount) return res.status(400).json({ error: "rideId + amount required" });

  const evt = {
    type: "PaymentSuccess",
    rideId,
    amount: Number(amount),
    paidAt: new Date().toISOString(),
    payerId: req.user.sub
  };

  if (ch) {
    ch.publish(exchange, "PaymentSuccess", Buffer.from(JSON.stringify(evt)));
  }

  return res.json({ ok: true, event: evt });
});

rabbitInit().catch((e) => console.warn("[payment] Rabbit not ready yet:", e.message));
app.listen(PORT, () => console.log(`Payment service listening on :${PORT}`));
