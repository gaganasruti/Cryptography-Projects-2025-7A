// backend/server.js
const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "temp/" });

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Memory storage for files
let fileDB = {}; // id -> { origName, encPath, key, iv, hash }

app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;
  const origName = req.file.originalname;

  // AES key + IV
  const key = crypto.randomBytes(32); // AES-256
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  const input = fs.readFileSync(filePath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

  const encFilePath = path.join(uploadsDir, Date.now() + "-" + origName + ".enc");
  fs.writeFileSync(encFilePath, encrypted);

  // Create hash (for display only)
  const hash = crypto.createHash("sha256").update(encrypted).digest("hex");

  const fileId = Date.now().toString();
  fileDB[fileId] = { origName, encPath: encFilePath, key, iv };

  // Clean temp
  fs.unlinkSync(filePath);

  res.json({
    fileId,
    fileName: origName,
    encryptedText: encrypted.toString("hex"), // show encrypted file content
    hash,
    key: key.toString("hex"),
    iv: iv.toString("hex"),
  });
});

// Decrypt + download
app.get("/download/:id", (req, res) => {
  const fileId = req.params.id;
  const fileInfo = fileDB[fileId];

  if (!fileInfo) return res.status(404).send("File not found");

  const { origName, encPath, key, iv } = fileInfo;

  const encrypted = fs.readFileSync(encPath);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  res.setHeader("Content-Disposition", `attachment; filename=${origName}`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(decrypted);
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
