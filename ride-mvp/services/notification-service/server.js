import amqplib from "amqplib";
import fetch from "node-fetch";
import { createClient } from "redis";
import { subscribeEvent } from "../../shared/bus.js";

const RABBIT_URL = process.env.RABBIT_URL;
const REDIS_URL = process.env.REDIS_URL;
const CHANNEL = process.env.CHANNEL || "ride-events";

const redis = createClient({ url: REDIS_URL });
await redis.connect();

const conn = await amqplib.connect(RABBIT_URL);
const ch = await conn.createChannel();
const EXCHANGE = "ride.events";

async function pushToGateway(payload) {
  // gateway service name in docker network is "gateway"
  await fetch("http://gateway:8080/internal/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

await subscribeEvent(
  ch,
  EXCHANGE,
  "notification-service.queue",
  ["ride.created", "ride.status.changed"],
  async (data, routingKey) => {
    const payload = { type: routingKey, data, ts: Date.now() };
    await redis.publish(CHANNEL, JSON.stringify(payload)); // optional
    await pushToGateway(payload); // realtime to clients via gateway ws
    console.log("Notify:", payload);
  }
);

console.log("notification-service running");
