const fs = require("fs");
const path = require("path");

const ext = String.raw`C:\Users\mike\AppData\Local\Google\Chrome\User Data\Default\Extensions\pgdmhodlebnljmmknpicldhgdnllonmd\1.9.3_0`;
const keys = new Set();
const urls = new Set();

for (const f of fs.readdirSync(ext).filter((x) => x.endsWith(".js"))) {
  const t = fs.readFileSync(path.join(ext, f), "utf8");
  const tags = [];
  if (t.includes("chrome.storage")) tags.push("chrome.storage");
  if (t.includes("indexedDB")) tags.push("indexedDB");
  if (t.includes("localStorage")) tags.push("localStorage");
  if (t.includes("sendhtml.email")) tags.push("sendhtml");
  if (/template/i.test(t)) tags.push("template");
  if (tags.length) console.log(`${f}: ${tags.join(", ")}`);

  for (const m of t.matchAll(/["']([A-Za-z0-9_./:-]{3,80})["']/g)) {
    const s = m[1];
    const low = s.toLowerCase();
    if (["template", "storage", "sendhtml", "export", "import", "gallery", "draft", "user"].some((x) => low.includes(x))) {
      keys.add(s);
    }
  }
  for (const m of t.matchAll(/https?:\/\/[A-Za-z0-9._/-]+/g)) {
    if (/sendhtml|html2email|firebase|supabase|amazonaws|cloudflare/.test(m[0])) urls.add(m[0]);
  }
}

console.log("\nKEYS:");
[...keys].sort().slice(0, 150).forEach((x) => console.log(x));
console.log("\nURLS:");
[...urls].sort().forEach((x) => console.log(x));
console.log("\nMANIFEST:");
console.log(fs.readFileSync(path.join(ext, "manifest.json"), "utf8").slice(0, 3000));
