import express from "express";
import pg from "pg";
import { createClient } from "redis";
import amqplib from "amqplib";
import { publishEvent, subscribeEvent } from "../../shared/bus.js";

const app = express();
app.use(express.json());

const PG_URL = process.env.PG_URL;
const REDIS_URL = process.env.REDIS_URL;
const RABBIT_URL = process.env.RABBIT_URL;

const pool = new pg.Pool({ connectionString: PG_URL });

await pool.query(`
  CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    price_estimate INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT NOW()
  );
`);

const redis = createClient({ url: REDIS_URL });
await redis.connect();

// RabbitMQ setup
const conn = await amqplib.connect(RABBIT_URL);
const ch = await conn.createChannel();
const EXCHANGE = "ride.events";

// consume PaymentSuccess -> confirm ride
await subscribeEvent(
  ch,
  EXCHANGE,
  "ride-service.queue",
  ["payment.success"],
  async (data) => {
    const { rideId } = data;
    await pool.query("UPDATE rides SET status='CONFIRMED' WHERE id=$1", [rideId]);
    await publishEvent(ch, EXCHANGE, "ride.status.changed", { rideId, status: "CONFIRMED" });
  }
);

app.post("/rides", async (req, res) => {
  // gateway verify JWT, so we trust header x-user-id set by gateway? (MVP: use token payload via header)
  // For MVP: userId passed from gateway through header:
  const userId = req.headers["x-user-id"] || "unknown";

  const { origin, destination, priceEstimate } = req.body;
  const r = await pool.query(
    "INSERT INTO rides(user_id, origin, destination, price_estimate) VALUES($1,$2,$3,$4) RETURNING *",
    [userId, origin, destination, priceEstimate]
  );

  const ride = r.rows[0];
  await redis.set(`ride:${ride.id}`, JSON.stringify(ride), { EX: 60 });

  await publishEvent(ch, EXCHANGE, "ride.created", { rideId: ride.id, userId });
  res.json(ride);
});

app.get("/rides/:id", async (req, res) => {
  const id = req.params.id;
  const cached = await redis.get(`ride:${id}`);
  if (cached) return res.json({ ...JSON.parse(cached), cached: true });

  const r = await pool.query("SELECT * FROM rides WHERE id=$1", [id]);
  if (r.rowCount === 0) return res.status(404).json({ error: "not found" });
  res.json(r.rows[0]);
});

app.listen(3003, () => console.log("ride-service on :3003"));
