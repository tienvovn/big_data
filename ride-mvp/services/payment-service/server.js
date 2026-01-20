import express from "express";
import amqplib from "amqplib";
import { publishEvent } from "../../shared/bus.js";

const app = express();
app.use(express.json());

const RABBIT_URL = process.env.RABBIT_URL;
const conn = await amqplib.connect(RABBIT_URL);
const ch = await conn.createChannel();
const EXCHANGE = "ride.events";

app.post("/payments/pay", async (req, res) => {
  const { rideId, amount } = req.body;
  // MVP: giả lập thanh toán luôn thành công
  await publishEvent(ch, EXCHANGE, "payment.success", { rideId, amount, paidAt: Date.now() });
  res.json({ ok: true, rideId, amount });
});

app.listen(3004, () => console.log("payment-service on :3004"));
