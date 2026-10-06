const fs = require("fs");
const path = require("path");

const ext = String.raw`C:\Users\mike\AppData\Local\Google\Chrome\User Data\Default\Extensions\pgdmhodlebnljmmknpicldhgdnllonmd\1.9.3_0`;
const metaPath = path.join(ext, "templates", "metadata.json");
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

function walk(obj, out = []) {
  if (Array.isArray(obj)) {
    for (const item of obj) walk(item, out);
    return out;
  }
  if (obj && typeof obj === "object") {
    const name = obj.name || obj.title || obj.label;
    if (typeof name === "string" && /14/.test(name)) out.push(obj);
    for (const v of Object.values(obj)) walk(v, out);
  }
  return out;
}

const hits = walk(meta);
console.log("metadata hits:", hits.length);
for (const h of hits) {
  console.log(JSON.stringify({ name: h.name, title: h.title, id: h.id, file: h.file || h.path || h.html || h.filename, category: h.category }, null, 2));
}

const allNames = [];
function collectNames(obj) {
  if (Array.isArray(obj)) return obj.forEach(collectNames);
  if (obj && typeof obj === "object") {
    if (typeof obj.name === "string") allNames.push(obj.name);
    Object.values(obj).forEach(collectNames);
  }
}
collectNames(meta);
console.log("\nAll template names:");
allNames.sort().forEach((n) => console.log("-", n));

// search filenames/content under templates/
function walkDir(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(p);
    else if (/14|day/i.test(ent.name)) console.log("file:", p);
    else if (ent.isFile() && ent.name.endsWith(".html")) {
      const t = fs.readFileSync(p, "utf8");
      if (/14\s*[- ]?\s*day/i.test(t) || /14 day/i.test(ent.name)) console.log("content hit:", p);
    }
  }
}
console.log("\nFilesystem search:");
walkDir(path.join(ext, "templates"));

// check sync storage folder
const sync = String.raw`C:\Users\mike\AppData\Local\Google\Chrome\User Data\Default\Sync Extension Settings\pgdmhodlebnljmmknpicldhgdnllonmd`;
console.log("\nSync settings exists:", fs.existsSync(sync));
if (fs.existsSync(sync)) {
  for (const f of fs.readdirSync(sync)) {
    const st = fs.statSync(path.join(sync, f));
    console.log(f, st.size);
  }
}
