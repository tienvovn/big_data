import amqp from "amqplib";
import axios from "axios";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const GATEWAY_INTERNAL_URL = process.env.GATEWAY_INTERNAL_URL || "http://localhost:8080";

const exchange = "events";

async function notify(userId, event) {
  try {
    await axios.post(`${GATEWAY_INTERNAL_URL}/internal/notify`, { userId, event });
  } catch (e) {
    console.error("[notify] failed to call gateway", e.message);
  }
}

async function main() {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(exchange, "topic", { durable: false });

  const q = await ch.assertQueue("notification_service", { durable: false, autoDelete: true });
  await ch.bindQueue(q.queue, exchange, "RideCreated");
  await ch.bindQueue(q.queue, exchange, "RideStatusChanged");

  console.log("[notification] listening RideCreated + RideStatusChanged");

  ch.consume(q.queue, async (msg) => {
    if (!msg) return;
    try {
      const rk = msg.fields.routingKey;
      const payload = JSON.parse(msg.content.toString());

      if (rk === "RideCreated") {
        await notify(payload.customerId, {
          type: "RideCreated",
          rideId: payload.rideId,
          status: payload.status,
          origin: payload.origin,
          destination: payload.destination,
          priceEstimate: payload.priceEstimate
        });
      }

      if (rk === "RideStatusChanged") {
        await notify(payload.customerId, {
          type: "RideStatusChanged",
          rideId: payload.rideId,
          status: payload.status
        });
      }
    } catch (e) {
      console.error("[notification] consume error", e);
    } finally {
      ch.ack(msg);
    }
  });
}

main().catch((e) => {
  console.error("[notification] fatal", e);
  process.exit(1);
});
