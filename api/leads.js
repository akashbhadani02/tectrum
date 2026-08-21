const mongoose = require("mongoose");
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const FIELDS = [
  "id","leadInDate","clientName","clientMobile","architectName","architectMobile",
  "salesPerson","leadGivenBy","quotation","amount","dealed","hotLead","address",
  "area","currentStatus","nextFollowUpDate"
];

const schema = new mongoose.Schema(
  Object.fromEntries(FIELDS.map(f => [f, { type: String, default: "" }])),
  { timestamps: true, versionKey: false }
);
schema.index({ id: 1 }, { unique: true });
const Lead = mongoose.models.Lead || mongoose.model("Lead", schema);

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in Vercel Environment Variables.");
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: 10
  });
}

function normalize(input = {}) {
  const out = {};
  for (const f of FIELDS) out[f] = input[f] == null ? "" : String(input[f]).trim();
  if (!out.id) out.id = String(Date.now());
  return out;
}

function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer)
      .pipe(csv())
      .on("data", row => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function routeParts(req) {
  return (req.url || "")
    .split("?")[0]
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await connectDB();

    const parts = routeParts(req);
    const action = parts[2] || "";

    if (req.method === "GET") {
      const data = await Lead.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json(data);
    }

    if (req.method === "POST" && action === "import") {
      return upload.single("file")(req, res, async err => {
        try {
          if (err) throw err;
          if (!req.file) return res.status(400).json({ error: "No file uploaded." });

          const name = req.file.originalname.toLowerCase();
          let rows = [];

          if (name.endsWith(".json")) {
            const parsed = JSON.parse(req.file.buffer.toString("utf8"));
            rows = Array.isArray(parsed) ? parsed : (parsed.leads || []);
          } else if (name.endsWith(".csv")) {
            rows = await parseCsv(req.file.buffer);
          } else {
            return res.status(400).json({ error: "Only JSON and CSV files are supported." });
          }

          if (!rows.length) return res.status(400).json({ error: "No records found." });

          const ops = rows.map(row => {
            const doc = normalize(row);
            return {
              updateOne: {
                filter: { id: doc.id },
                update: { $set: doc },
                upsert: true
              }
            };
          });

          const result = await Lead.bulkWrite(ops, { ordered: false });
          return res.json({
            ok: true,
            total: rows.length,
            inserted: result.upsertedCount || 0,
            updated: result.modifiedCount || 0
          });
        } catch (e) {
          return res.status(400).json({ error: e.message });
        }
      });
    }

    const id = decodeURIComponent(action);

    if (req.method === "POST") {
      const doc = normalize(req.body);
      if (await Lead.exists({ id: doc.id })) {
        return res.status(409).json({ error: "A lead with this ID already exists." });
      }
      return res.status(201).json(await Lead.create(doc));
    }

    if (req.method === "PUT") {
      if (!id) return res.status(400).json({ error: "Missing lead ID." });
      const doc = normalize({ ...req.body, id });
      const updated = await Lead.findOneAndUpdate(
        { id },
        { $set: doc },
        { new: true, runValidators: true }
      );
      if (!updated) return res.status(404).json({ error: "Lead not found." });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "Missing lead ID." });
      const deleted = await Lead.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ error: "Lead not found." });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    console.error(e);
    const msg = String(e.message || e);
    if (/authentication failed|bad auth/i.test(msg)) {
      return res.status(500).json({
        error: "MongoDB authentication failed. Check the Atlas Database User username/password in the Vercel MONGODB_URI."
      });
    }
    if (/Could not connect|ENOTFOUND|server selection/i.test(msg)) {
      return res.status(500).json({
        error: "Could not connect to MongoDB Atlas. Check Atlas Network Access and MONGODB_URI."
      });
    }
    return res.status(500).json({ error: msg });
  }
};
