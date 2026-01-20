import express from "express";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const pool = new Pool({ connectionString: DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "auth" }));

app.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email + password required" });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users(email, password_hash, full_name, role)
       VALUES($1,$2,$3,COALESCE($4,'customer'))
       RETURNING id, email, full_name, role`,
      [email.toLowerCase(), password_hash, fullName || null, role || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({ token, user });
  } catch (e) {
    if (String(e.message).includes("duplicate key")) return res.status(409).json({ error: "email already exists" });
    console.error(e);
    return res.status(500).json({ error: "internal" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email + password required" });

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, role FROM users WHERE email=$1`,
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) return res.status(401).json({ error: "invalid credentials" });
    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const user = { id: row.id, email: row.email, full_name: row.full_name, role: row.role };
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ token, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "internal" });
  }
});

app.listen(PORT, () => console.log(`Auth service listening on :${PORT}`));
