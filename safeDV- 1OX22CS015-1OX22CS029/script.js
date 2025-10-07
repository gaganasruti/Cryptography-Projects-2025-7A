// ------------------------- Utilities -------------------------
const onlyLetters = s => s.toUpperCase().replace(/[^A-Z]/g, "");
const assertKey = k => onlyLetters(k).replace(/J/g, "I"); // Playfair uses I/J merged

function clampShift(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return ((x % 26) + 26) % 26;
}

// ------------------------- Caesar ----------------------------
function caesarEncrypt(text, shift) {
  shift = clampShift(shift);
  let out = "";
  for (const ch of text.toUpperCase()) {
    if (ch >= "A" && ch <= "Z") {
      const c = ch.charCodeAt(0) - 65;
      out += String.fromCharCode(((c + shift) % 26) + 65);
    } else if (ch === " ") {
      out += " ";
    }
  }
  return out.replace(/\s+/g, " "); // keep single spaces for readability
}

function caesarDecrypt(text, shift) {
  return caesarEncrypt(text, 26 - clampShift(shift));
}

// ------------------------- Playfair --------------------------
function buildPlayfairTable(keyword) {
  const alpha = "ABCDEFGHIKLMNOPQRSTUVWXYZ"; // no J
  const seen = new Set();
  const order = [];

  const pushUnique = ch => {
    if (!seen.has(ch)) { seen.add(ch); order.push(ch); }
  };

  for (const ch0 of assertKey(keyword)) pushUnique(ch0);
  for (const ch of alpha) pushUnique(ch);

  // build table & positions
  const table = [];
  const pos = {};
  for (let r = 0; r < 5; r++) {
    table[r] = [];
    for (let c = 0; c < 5; c++) {
      const ch = order[r * 5 + c];
      table[r][c] = ch;
      pos[ch] = { r, c };
    }
  }
  return { table, pos };
}

function normalizeForPlayfair(text) {
  // letters only, J->I
  return onlyLetters(text).replace(/J/g, "I");
}

function makeDigraphs(plain) {
  const pairs = [];
  for (let i = 0; i < plain.length;) {
    const a = plain[i];
    let b = plain[i + 1];

    if (!b) {
      // pad last
      pairs.push([a, "X"]);
      i += 1;
    } else if (a === b) {
      // split double letters with X (or Q if already X)
      const filler = a === "X" ? "Q" : "X";
      pairs.push([a, filler]);
      i += 1;
    } else {
      pairs.push([a, b]);
      i += 2;
    }
  }
  return pairs;
}

function playfairEncrypt(plaintext, keyword) {
  const { table, pos } = buildPlayfairTable(keyword);
  const clean = normalizeForPlayfair(plaintext);
  const pairs = makeDigraphs(clean);

  const res = [];
  for (const [a, b] of pairs) {
    const pa = pos[a], pb = pos[b];
    if (pa.r === pb.r) {
      // same row → right
      res.push(table[pa.r][(pa.c + 1) % 5], table[pb.r][(pb.c + 1) % 5]);
    } else if (pa.c === pb.c) {
      // same col → down
      res.push(table[(pa.r + 1) % 5][pa.c], table[(pb.r + 1) % 5][pb.c]);
    } else {
      // rectangle → swap columns
      res.push(table[pa.r][pb.c], table[pb.r][pa.c]);
    }
  }
  return res.join("");
}

function playfairDecrypt(cipher, keyword) {
  const { table, pos } = buildPlayfairTable(keyword);
  const clean = normalizeForPlayfair(cipher);
  if (clean.length % 2 === 1) {
    // if someone pasted odd-length, ignore last char
    clean.slice(0, -1);
  }

  const res = [];
  for (let i = 0; i < clean.length; i += 2) {
    const a = clean[i], b = clean[i + 1];
    const pa = pos[a], pb = pos[b];

    if (pa.r === pb.r) {
      // same row → left
      res.push(table[pa.r][(pa.c + 4) % 5], table[pb.r][(pb.c + 4) % 5]);
    } else if (pa.c === pb.c) {
      // same col → up
      res.push(table[(pa.r + 4) % 5][pa.c], table[(pb.r + 4) % 5][pb.c]);
    } else {
      // rectangle → swap columns
      res.push(table[pa.r][pb.c], table[pb.r][pa.c]);
    }
  }

  // optional: try to remove filler X/Q when they were used to split doubles or pad.
  return res.join("");
}

// ------------------------- Hybrid ---------------------------
function hybridEncrypt(secret, caesarShift, pfKey) {
  const ca = caesarEncrypt(secret, caesarShift);
  const pf = playfairEncrypt(ca, pfKey);
  return pf;
}

function hybridDecrypt(cipher, caesarShift, pfKey) {
  const pf = playfairDecrypt(cipher, pfKey);
  const ca = caesarDecrypt(pf, caesarShift);
  return ca;
}

// ------------------------- UI Wiring ------------------------
const $ = id => document.getElementById(id);
$("btnEncrypt").addEventListener("click", () => {
  const cover = $("coverText").value.trim();
  const secret = $("secretText").value.trim();
  const pfKey = $("pfKeyEnc").value.trim();
  const shift = clampShift($("caesarEnc").value);

  if (!secret) { alert("Enter a secret distress message."); return; }
  if (!pfKey) { alert("Enter a Playfair keyword."); return; }

  const cipher = hybridEncrypt(secret, shift, pfKey);

  const message =
`${cover || "Shopping List:\n- Milk\n- Rice\n- Bread"}
Secret: ${cipher}`;

  $("encryptedOutput").value = message;

  // Quality of life: auto-fill NGO input with just the cipher part
  $("encryptedInput").value = cipher;
});

$("btnDecrypt").addEventListener("click", () => {
  const raw = $("encryptedInput").value.trim();
  const pfKey = $("pfKeyDec").value.trim();
  const shift = clampShift($("caesarDec").value);

  if (!raw) { alert("Paste encrypted text (or the whole disguised message)."); return; }
  if (!pfKey) { alert("Enter a Playfair keyword."); return; }

  // Accept either the raw cipher or the full disguised message.
  const match = raw.match(/Secret:\s*([A-Z]+)/i);
  const cipher = match ? match[1].toUpperCase() : onlyLetters(raw);

  if (!cipher) { alert("Could not find any ciphertext letters (A–Z)."); return; }

  const plain = hybridDecrypt(cipher, shift, pfKey);
  $("decryptedOutput").value = plain;
});
