const fs = require("fs");
const path = require("path");

const logPath =
  String.raw`C:\Users\mike\AppData\Local\Google\Chrome\User Data\Default\Local Extension Settings\pgdmhodlebnljmmknpicldhgdnllonmd\000003.log`;
const outDir = String.raw`C:\Users\mike\Gmail-Helper\imported-from-html2email`;

const text = fs.readFileSync(logPath, "utf8");
const marker = "savedTemplates";
const markerAt = text.indexOf(marker);
if (markerAt < 0) {
  console.error("savedTemplates key not found");
  process.exit(1);
}

let start = text.indexOf("{", markerAt + marker.length);
if (start < 0) {
  console.error("JSON object after savedTemplates not found");
  process.exit(1);
}

function extractJsonObject(source, from) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  return null;
}

function sanitizeJsonControlChars(raw) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);
    if (inStr) {
      if (esc) {
        out += ch;
        esc = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        esc = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inStr = false;
        continue;
      }
      if (code <= 0x1f) {
        if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "\t") out += "\\t";
        else out += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}

const raw = extractJsonObject(text, start);
if (!raw) {
  console.error("Could not extract JSON object");
  process.exit(1);
}

let map;
try {
  map = JSON.parse(sanitizeJsonControlChars(raw));
} catch (err) {
  console.error("JSON parse failed:", err.message);
  process.exit(1);
}

const templates = Object.values(map).map((t) => ({
  id: t.id || `imported_${t.name || "template"}`,
  name: t.name || "Imported template",
  html: t.html || "",
  category: t.category || "",
  updatedAt: t.modifiedAt || t.updatedAt || Date.now(),
  createdAt: t.createdAt || Date.now(),
  source: "html2email",
}));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "templates.json"), JSON.stringify(templates, null, 2), "utf8");

const gmailHelperShape = {
  templates: templates.map(({ id, name, html, updatedAt, createdAt }) => ({
    id,
    name,
    html,
    updatedAt,
    createdAt,
  })),
};
fs.writeFileSync(path.join(outDir, "gmail-helper-import.json"), JSON.stringify(gmailHelperShape, null, 2), "utf8");

for (const t of templates) {
  const safe = String(t.name).replace(/[<>:"/\\|?*]+/g, "_").slice(0, 80) || "template";
  fs.writeFileSync(path.join(outDir, `${safe}.html`), t.html || "", "utf8");
  console.log(`OK: ${t.name} (${t.html.length} chars)`);
}

console.log(`\nWrote ${templates.length} template(s) to ${outDir}`);
