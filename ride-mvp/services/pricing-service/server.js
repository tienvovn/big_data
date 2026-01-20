import express from "express";
const app = express();

app.get("/pricing/estimate", (req, res) => {
  const distanceKm = Number(req.query.distanceKm || 0);
  const base = 10000;
  const perKm = 6000;
  const estimate = Math.round(base + distanceKm * perKm);
  res.json({ distanceKm, estimate });
});

app.listen(3002, () => console.log("pricing-service on :3002"));
