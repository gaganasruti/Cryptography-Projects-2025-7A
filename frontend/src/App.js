// frontend/src/App.jsx
import React, { useEffect, useState } from "react";

/*
  Client-side cryptography app (no backend).
  - AES-GCM (256) for encryption/decryption
  - SHA-256 for hashing (integrity)
  - Stores everything in localStorage per-file
  - Allows tampering ciphertext, decrypting, downloading
*/

const STORAGE_KEY = "crypto_files_v1";

/* --------- helpers: base64 & buffers --------- */
function b64FromBuffer(buf) {
  const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function bufferFromB64(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function hexFromBuffer(buf) {
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------- WebCrypto helpers ------- */
async function generateAesKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function exportKeyToB64(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return b64FromBuffer(raw);
}

async function importKeyFromB64(b64) {
  const raw = bufferFromB64(b64);
  return crypto.subtle.importKey("raw", raw.buffer, "AES-GCM", true, ["encrypt", "decrypt"]);
}

async function sha256Hex(arrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return hexFromBuffer(digest);
}

/* read file helper */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = (e) => resolve(e.target.result);
    fr.onerror = (e) => reject(e);
    fr.readAsArrayBuffer(file);
  });
}

/* localStorage helpers */
function loadStoredFiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed parsing storage", e);
    return [];
  }
}
function saveStoredFiles(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* id */
function uid() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

/* --------- Component --------- */
export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [storedFiles, setStoredFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editorText, setEditorText] = useState(""); // editable ciphertext (base64)
  const [decryptResult, setDecryptResult] = useState(null); // { success, message, blobUrl? }
  const [status, setStatus] = useState("");

  // load on mount
  useEffect(() => {
    const list = loadStoredFiles();
    setStoredFiles(list);
  }, []);

  // when selected record changes, load its ciphertext into editor
  useEffect(() => {
    if (!selectedId) {
      setEditorText("");
      setDecryptResult(null);
      return;
    }
    const rec = storedFiles.find((r) => r.id === selectedId);
    if (rec) {
      setEditorText(rec.encryptedB64);
      setDecryptResult(null);
    }
  }, [selectedId, storedFiles]);

  /* Upload & encrypt */
  const handleEncryptAndSave = async () => {
    if (!selectedFile) {
      alert("Choose a file (.txt or .pdf) first.");
      return;
    }

    // allowed types by extension and common mime
    const name = selectedFile.name.toLowerCase();
    const allowedExt = name.endsWith(".txt") || name.endsWith(".pdf");
    const allowedMime = selectedFile.type === "text/plain" || selectedFile.type === "application/pdf";
    if (!allowedExt && !allowedMime) {
      alert("Only .txt and .pdf files are allowed.");
      return;
    }

    try {
      setStatus("Reading file...");
      const arrayBuf = await readFileAsArrayBuffer(selectedFile);

      setStatus("Hashing content (SHA-256)...");
      const hashHex = await sha256Hex(arrayBuf);

      setStatus("Generating AES key and IV...");
      const key = await generateAesKey();
      const keyB64 = await exportKeyToB64(key);
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

      setStatus("Encrypting...");
      const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, arrayBuf);

      const encryptedB64 = b64FromBuffer(cipherBuf);
      const ivB64 = b64FromBuffer(iv.buffer);

      const record = {
        id: uid(),
        name: selectedFile.name,
        mimeType: selectedFile.type || (name.endsWith(".pdf") ? "application/pdf" : "text/plain"),
        encryptedB64,
        ivB64,
        keyB64,
        hashHex,
        createdAt: new Date().toISOString(),
        size: selectedFile.size,
      };

      const updated = [...storedFiles, record];
      setStoredFiles(updated);
      saveStoredFiles(updated);

      setSelectedId(record.id);
      setStatus("Saved encrypted file to localStorage.");
      setSelectedFile(null);
    } catch (err) {
      console.error("Encrypt/save failed:", err);
      alert("Encryption failed. See console for details.");
      setStatus("");
    }
  };

  /* Persist editorText modifications back to storage */
  const persistEditorToStorage = () => {
    if (!selectedId) return;
    const updated = storedFiles.map((r) => (r.id === selectedId ? { ...r, encryptedB64: editorText } : r));
    setStoredFiles(updated);
    saveStoredFiles(updated);
    setStatus("Edited ciphertext saved to localStorage.");
  };

  /* Decrypt editorText using stored key/iv for selected record */
  const handleDecryptEditor = async () => {
    if (!selectedId) return alert("Select a stored file.");
    const rec = storedFiles.find((r) => r.id === selectedId);
    if (!rec) return alert("Record missing.");

    try {
      setStatus("Importing key...");
      const key = await importKeyFromB64(rec.keyB64);

      // parse ciphertext & iv
      const cipherBytes = bufferFromB64(editorText);
      const ivBytes = bufferFromB64(rec.ivB64);

      setStatus("Attempting decryption...");
      const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, cipherBytes);

      // verify hash of decrypted matches stored hash
      setStatus("Verifying integrity (SHA-256)...");
      const gotHash = await sha256Hex(plainBuf);
      const ok = gotHash === rec.hashHex;

      // create blob and URL for download / view
      const blob = new Blob([plainBuf], { type: rec.mimeType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);

      setDecryptResult({ success: true, message: ok ? "Decryption + integrity check passed." : "Decryption succeeded but integrity mismatch!", url, blob, ok });
      setStatus("");
    } catch (err) {
      console.warn("Decrypt error:", err);
      // try to show raw decode fallback
      try {
        const cipherBytes = bufferFromB64(editorText);
        const maybeText = new TextDecoder().decode(cipherBytes);
        setDecryptResult({ success: false, message: "Decryption failed (tampered or wrong key). Showing raw decoded bytes as text:", rawText: maybeText });
      } catch (e) {
        setDecryptResult({ success: false, message: "Decryption failed and raw decode failed." });
      }
      setStatus("");
    }
  };

  const downloadDecrypted = () => {
    if (!decryptResult || !decryptResult.success || !decryptResult.url) return;
    const rec = storedFiles.find((r) => r.id === selectedId);
    const filename = rec ? rec.name : "decrypted_file";
    const link = document.createElement("a");
    link.href = decryptResult.url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(decryptResult.url), 5000);
  };

  const downloadEncryptedFile = (rec) => {
    const bytes = bufferFromB64(rec.encryptedB64);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${rec.name}.enc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleDelete = (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm("Delete this file's record from localStorage?")) return;
    const updated = storedFiles.filter((r) => r.id !== id);
    setStoredFiles(updated);
    saveStoredFiles(updated);
    if (selectedId === id) {
      setSelectedId(null);
      setEditorText("");
      setDecryptResult(null);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "18px auto", fontFamily: "system-ui, Arial" }}>
      <h1>Client-side Crypto File Manager (AES-GCM + SHA-256)</h1>
      

      <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 16 }}>
        <h3>Encrypt & Save (local only)</h3>
        <input
          type="file"
          accept=".txt, .pdf, text/plain, application/pdf"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        <button onClick={handleEncryptAndSave} style={{ marginLeft: 12, padding: "6px 12px" }}>
          Encrypt & Save to localStorage
        </button>
        {selectedFile && <div style={{ marginTop: 8 }}>Selected: {selectedFile.name} ({(selectedFile.size/1024).toFixed(1)} KB)</div>}
        <div style={{ marginTop: 8, color: "#666" }}>{status}</div>
      </section>

      <div style={{ display: "flex", gap: 18 }}>
        <div style={{ width: 320 }}>
          <h3>Stored Files</h3>
          {storedFiles.length === 0 && <p>No files stored yet.</p>}
          <ul style={{ paddingLeft: 12 }}>
            {storedFiles.map((r) => (
              <li key={r.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <strong style={{ cursor: "pointer" }} onClick={() => setSelectedId(r.id)}>{r.name}</strong>
                    <div style={{ fontSize: 12, color: "#666" }}>{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setSelectedId(r.id); setEditorText(r.encryptedB64); }}>Edit</button>
                    <button onClick={() => downloadEncryptedFile(r)}>Enc</button>
                    <button onClick={() => { setSelectedId(r.id); handleDecryptEditor(); }}>Dec</button>
                    <button onClick={() => handleDelete(r.id)} style={{ color: "crimson" }}>Del</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Ciphertext Editor & Decrypt</h3>
          {!selectedId ? (
            <div>Select a stored file to view/edit ciphertext.</div>
          ) : (
            <>
              <div style={{ marginBottom: 8 }}>
                <strong>Selected:</strong> {storedFiles.find((s) => s.id === selectedId)?.name}
              </div>

              <label style={{ display: "block", marginBottom: 6 }}>Ciphertext (base64) — editable to test tampering</label>
              <textarea
                style={{ width: "100%", height: 160, fontFamily: "monospace" }}
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
              />

              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={() => { persistEditorToStorage(); }}>Save Edited Ciphertext</button>
                <button onClick={() => handleDecryptEditor()}>Attempt Decrypt</button>
                <button onClick={() => {
                  const rec = storedFiles.find((r) => r.id === selectedId);
                  if (rec) setEditorText(rec.encryptedB64);
                }}>Reset</button>
              </div>

              <div style={{ marginTop: 12, padding: 8, border: "1px solid #eee", borderRadius: 6 }}>
                <div style={{ fontSize: 13 }}>
                  <b>Stored Key (base64):</b>
                  <div style={{ wordBreak: "break-all", fontFamily: "monospace", marginTop: 6 }}>
                    {storedFiles.find((s) => s.id === selectedId)?.keyB64}
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <b>Stored IV (base64):</b>
                  <div style={{ wordBreak: "break-all", fontFamily: "monospace", marginTop: 6 }}>
                    {storedFiles.find((s) => s.id === selectedId)?.ivB64}
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <b>SHA-256 Hash (hex) of original file:</b>
                  <div style={{ wordBreak: "break-all", fontFamily: "monospace", marginTop: 6 }}>
                    {storedFiles.find((s) => s.id === selectedId)?.hashHex}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {decryptResult && decryptResult.success && (
                  <div style={{ padding: 10, border: "1px solid #cfe9d8", background: "#f7fff4" }}>
                    <div><strong>Decryption succeeded.</strong> {decryptResult.ok ? "(integrity OK)" : "(integrity mismatch)"}</div>
                    <div style={{ marginTop: 8 }}>
                      <button onClick={downloadDecrypted}>Download Decrypted</button>
                    </div>
                  </div>
                )}

                {decryptResult && !decryptResult.success && (
                  <div style={{ padding: 10, border: "1px solid #f8d7da", background: "#fff5f6" }}>
                    <div><strong>Decryption failed.</strong></div>
                    {decryptResult.rawText ? (
                      <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{decryptResult.rawText}</pre>
                    ) : (
                      <div style={{ marginTop: 8 }}>{decryptResult.message}</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      
    </div>
  );
}
