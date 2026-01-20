import express from "express";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const MONGO_URL = process.env.MONGO_URL;

const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db();
const users = db.collection("users");

app.post("/auth/register", async (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const exists = await users.findOne({ email });
  if (exists) return res.status(409).json({ error: "email exists" });

  await users.insertOne({ email, password, fullName: fullName || "", role: role || "customer" });
  res.json({ ok: true });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const u = await users.findOne({ email, password });
  if (!u) return res.status(401).json({ error: "invalid credentials" });

  const token = jwt.sign({ userId: String(u._id), email: u.email, role: u.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(3001, () => console.log("auth-service on :3001"));
