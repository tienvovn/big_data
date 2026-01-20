import express from "express";
import cors from "cors";
import morgan from "morgan";

const PORT = process.env.PORT || 3003;
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "pricing" }));

// MVP pricing: base + perKm
app.get("/estimate", (req, res) => {
  const distanceKm = Number(req.query.distanceKm || 5);
  const base = 15000;
  const perKm = 5000;
  const price = Math.round(base + perKm * Math.max(0, distanceKm));
  return res.json({ distanceKm, currency: "VND", price });
});

app.listen(PORT, () => console.log(`Pricing service listening on :${PORT}`));
