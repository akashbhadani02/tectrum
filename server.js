const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");
require("dotenv").config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*" }));
app.use(express.json({ limit: "10mb" }));

const leadSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  leadInDate: String, clientName: String, clientMobile: String,
  architectName: String, architectMobile: String, salesPerson: String,
  leadGivenBy: String, quotation: String, amount: String, dealed: String,
  hotLead: String, address: String, area: String, currentStatus: String,
  nextFollowUpDate: String
}, { timestamps: true, versionKey: false });

const Lead = mongoose.model("Lead", leadSchema);
const FIELDS = ["id","leadInDate","clientName","clientMobile","architectName","architectMobile","salesPerson","leadGivenBy","quotation","amount","dealed","hotLead","address","area","currentStatus","nextFollowUpDate"];

function normalize(input = {}) {
  const out = {};
  for (const key of FIELDS) {
    let value = input[key];
    if (value === undefined || value === null || value === "") value = null;
    if (key === "id" && value !== null) value = String(value);
    else if (value !== null) value = String(value).trim();
    out[key] = value;
  }
  if (!out.id) out.id = String(Date.now());
  return out;
}

app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/api/leads", async (_, res, next) => {
  try { res.json(await Lead.find().sort({ id: 1 }).lean()); } catch (e) { next(e); }
});
app.post("/api/leads", async (req, res, next) => {
  try {
    const data = normalize(req.body);
    const exists = await Lead.findOne({ id: data.id });
    if (exists) return res.status(409).json({ error: "Lead ID already exists. Use update instead." });
    const lead = await Lead.create(data);
    res.status(201).json(lead);
  } catch (e) { next(e); }
});
app.put("/api/leads/:id", async (req, res, next) => {
  try {
    const data = normalize({ ...req.body, id: req.params.id });
    const lead = await Lead.findOneAndUpdate({ id: String(req.params.id) }, data, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  } catch (e) { next(e); }
});
app.delete("/api/leads/:id", async (req, res, next) => {
  try {
    const deleted = await Lead.findOneAndDelete({ id: String(req.params.id) });
    if (!deleted) return res.status(404).json({ error: "Lead not found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer).pipe(csv()).on("data", row => rows.push(row)).on("end", () => resolve(rows)).on("error", reject);
  });
}

app.post("/api/leads/import", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const name = req.file.originalname.toLowerCase();
    let rows;
    if (name.endsWith(".json")) {
      const parsed = JSON.parse(req.file.buffer.toString("utf8"));
      rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.leads) ? parsed.leads : []);
    } else if (name.endsWith(".csv")) {
      rows = await parseCsv(req.file.buffer);
    } else return res.status(400).json({ error: "Only JSON and CSV files are supported" });

    if (!rows.length) return res.status(400).json({ error: "No valid rows found" });
    const operations = rows.map(raw => {
      const doc = normalize(raw);
      return { updateOne: { filter: { id: doc.id }, update: { $set: doc }, upsert: true } };
    });
    const result = await Lead.bulkWrite(operations, { ordered: false });
    res.json({ ok: true, inserted: result.upsertedCount || 0, updated: result.modifiedCount || 0, total: rows.length });
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.code === 11000) return res.status(409).json({ error: "Duplicate Lead ID" });
  res.status(500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
