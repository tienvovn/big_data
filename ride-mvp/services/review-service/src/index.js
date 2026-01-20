import express from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const PORT = process.env.PORT || 3007;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

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

const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db("rideapp");
const reviews = db.collection("reviews");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "review" }));

app.post("/", auth, async (req, res) => {
  const { rideId, rating, comment } = req.body || {};
  if (!rideId || !rating) return res.status(400).json({ error: "rideId + rating required" });
  const doc = {
    rideId,
    rating: Number(rating),
    comment: comment || "",
    userId: req.user.sub,
    createdAt: new Date()
  };
  await reviews.insertOne(doc);
  return res.status(201).json({ ok: true });
});

app.get("/", async (req, res) => {
  const rideId = req.query.rideId;
  const q = rideId ? { rideId } : {};
  const list = await reviews.find(q).sort({ createdAt: -1 }).limit(50).toArray();
  return res.json({ reviews: list });
});

app.listen(PORT, () => console.log(`Review service listening on :${PORT}`));
