const fs = require("fs");
const path = require("path");

const root = String.raw`C:\Users\mike\AppData\Local\Google\Chrome\User Data\Default`;
const needle = Buffer.from("14 day");
const needle2 = Buffer.from("14-day");
const needle3 = Buffer.from("14day");
const needle4 = Buffer.from("savedTemplates");

const skipDir = new Set(["Cache", "Code Cache", "GPUCache", "ShaderCache", "GrShaderCache", "Service Worker", "blob_storage"]);

let checked = 0;
const hits = [];

function scanFile(file) {
  checked++;
  let buf;
  try {
    const st = fs.statSync(file);
    if (!st.isFile() || st.size === 0 || st.size > 40 * 1024 * 1024) return;
    buf = fs.readFileSync(file);
  } catch {
    return;
  }
  const labels = [];
  if (buf.includes(needle)) labels.push("14 day");
  if (buf.includes(needle2)) labels.push("14-day");
  if (buf.includes(needle3)) labels.push("14day");
  if (buf.includes(needle4)) labels.push("savedTemplates");
  if (labels.length) hits.push({ file, labels, size: buf.length });
}

function walk(dir, depth = 0) {
  if (depth > 6) return;
  let ents;
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of ents) {
    if (skipDir.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, depth + 1);
    else scanFile(p);
  }
}

const targets = [
  path.join(root, "Local Extension Settings"),
  path.join(root, "Sync Extension Settings"),
  path.join(root, "IndexedDB"),
  path.join(root, "Local Storage"),
  path.join(root, "Session Storage"),
  path.join(root, "Extension State"),
  path.join(root, "Extensions", "pgdmhodlebnljmmknpicldhgdnllonmd"),
];

for (const t of targets) {
  if (fs.existsSync(t)) walk(t);
}

console.log("files checked:", checked);
console.log("hits:", hits.length);
for (const h of hits) console.log(`${h.labels.join(",")}\t${h.size}\t${h.file}`);
