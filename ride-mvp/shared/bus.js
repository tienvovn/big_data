// rabbitmq publish 
import amqplib from "amqplib";

export async function getChannel(rabbitUrl) {
  const conn = await amqplib.connect(rabbitUrl);
  const ch = await conn.createChannel();
  return { conn, ch };
}

export async function publishEvent(ch, exchange, routingKey, payload) {
  await ch.assertExchange(exchange, "topic", { durable: true });
  const buf = Buffer.from(JSON.stringify(payload));
  ch.publish(exchange, routingKey, buf, { contentType: "application/json" });
}

export async function subscribeEvent(ch, exchange, queueName, bindings, handler) {
  await ch.assertExchange(exchange, "topic", { durable: true });
  const q = await ch.assertQueue(queueName, { durable: true });

  for (const key of bindings) {
    await ch.bindQueue(q.queue, exchange, key);
  }

  await ch.consume(q.queue, async (msg) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      await handler(data, msg.fields.routingKey);
      ch.ack(msg);
    } catch (e) {
      console.error("Handler error:", e);
      ch.nack(msg, false, false);
    }
  });
}
