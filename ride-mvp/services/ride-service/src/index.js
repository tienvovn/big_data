import express from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import amqp from "amqplib";

const PORT = process.env.PORT || 3004;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

const pool = new Pool({ connectionString: DATABASE_URL });

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

// --- RabbitMQ publisher ---
let ch;
const exchange = "events";
async function rabbitInit() {
  const conn = await amqp.connect(RABBITMQ_URL);
  ch = await conn.createChannel();
  await ch.assertExchange(exchange, "topic", { durable: false });
  console.log("[ride] Rabbit connected");

  // consumer: PaymentSuccess -> set ride status to CONFIRMED
  const q = await ch.assertQueue("ride_service_payment", { durable: false, autoDelete: true });
  await ch.bindQueue(q.queue, exchange, "PaymentSuccess");
  ch.consume(q.queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      const { rideId } = payload;
      if (rideId) {
        await pool.query(
          `UPDATE rides SET status='CONFIRMED', updated_at=now() WHERE id=$1`,
          [rideId]
        );
        const r = await pool.query(`SELECT customer_id, status FROM rides WHERE id=$1`, [rideId]);
        if (r.rowCount) {
          const evt = {
            type: "RideStatusChanged",
            rideId,
            status: r.rows[0].status,
            customerId: r.rows[0].customer_id
          };
          ch.publish(exchange, "RideStatusChanged", Buffer.from(JSON.stringify(evt)));
        }
      }
    } catch (e) {
      console.error("[ride] consume PaymentSuccess error", e);
    } finally {
      ch.ack(msg);
    }
  });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "ride" }));

// Create ride (customer)
app.post("/", auth, async (req, res) => {
  const customerId = req.user.sub;
  const { origin, destination, priceEstimate } = req.body || {};
  if (!origin || !destination || !priceEstimate) {
    return res.status(400).json({ error: "origin + destination + priceEstimate required" });
  }

  const result = await pool.query(
    `INSERT INTO rides(customer_id, origin, destination, price_estimate, status)
     VALUES($1,$2,$3,$4,'CREATED')
     RETURNING id, customer_id, origin, destination, price_estimate, status, created_at`,
    [customerId, origin, destination, Number(priceEstimate)]
  );

  const ride = result.rows[0];

  if (ch) {
    const evt = {
      type: "RideCreated",
      rideId: ride.id,
      customerId: ride.customer_id,
      origin: ride.origin,
      destination: ride.destination,
      priceEstimate: ride.price_estimate,
      status: ride.status
    };
    ch.publish(exchange, "RideCreated", Buffer.from(JSON.stringify(evt)));
  }

  return res.status(201).json({ ride });
});

// List my rides
app.get("/", auth, async (req, res) => {
  const customerId = req.user.sub;
  const r = await pool.query(
    `SELECT id, origin, destination, price_estimate, status, created_at, updated_at
     FROM rides WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [customerId]
  );
  return res.json({ rides: r.rows });
});

// Driver updates status (in MVP: any authenticated user can call)
app.patch("/:id/status", auth, async (req, res) => {
  const rideId = req.params.id;
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status required" });

  await pool.query(`UPDATE rides SET status=$1, updated_at=now() WHERE id=$2`, [status, rideId]);
  const r = await pool.query(`SELECT customer_id, status FROM rides WHERE id=$1`, [rideId]);
  if (!r.rowCount) return res.status(404).json({ error: "not found" });

  if (ch) {
    const evt = {
      type: "RideStatusChanged",
      rideId,
      status: r.rows[0].status,
      customerId: r.rows[0].customer_id
    };
    ch.publish(exchange, "RideStatusChanged", Buffer.from(JSON.stringify(evt)));
  }

  return res.json({ ok: true });
});

rabbitInit().catch((e) => console.warn("[ride] Rabbit not ready yet:", e.message));
app.listen(PORT, () => console.log(`Ride service listening on :${PORT}`));
