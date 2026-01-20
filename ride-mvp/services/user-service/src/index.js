import express from "express";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

const PORT = process.env.PORT || 3002;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

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

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "user" }));

app.get("/me", auth, async (req, res) => {
  const userId = req.user.sub;
  const r = await pool.query(
    `SELECT id, email, full_name, role, created_at FROM users WHERE id=$1`,
    [userId]
  );
  if (r.rowCount === 0) return res.status(404).json({ error: "not found" });
  return res.json({ user: r.rows[0] });
});

app.listen(PORT, () => console.log(`User service listening on :${PORT}`));
