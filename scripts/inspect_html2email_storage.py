import re
from pathlib import Path

ext = Path(r"C:\Users\mike\AppData\Local\Google\Chrome\User Data\Default\Extensions\pgdmhodlebnljmmknpicldhgdnllonmd\1.9.3_0")
keys = set()
urls = set()
file_hits = []

for p in ext.glob("*.js"):
    t = p.read_text(encoding="utf-8", errors="ignore")
    tags = []
    if "chrome.storage" in t:
        tags.append("chrome.storage")
    if "indexedDB" in t:
        tags.append("indexedDB")
    if "localStorage" in t:
        tags.append("localStorage")
    if "sendhtml.email" in t:
        tags.append("sendhtml.email")
    if re.search(r"template", t, re.I):
        tags.append("template")
    if tags:
        file_hits.append(f"{p.name} ({p.stat().st_size // 1024}KB): {', '.join(tags)}")

    for m in re.findall(r"[\"']([A-Za-z0-9_./:-]{3,80})[\"']", t):
        low = m.lower()
        if any(x in low for x in ("template", "storage", "indexed", "sendhtml", "export", "import", "gallery", "draft", "user")):
            keys.add(m)
    for m in re.findall(r"https?://[A-Za-z0-9._/-]+", t):
        if any(x in m for x in ("sendhtml", "html2email", "firebase", "supabase", "amazonaws", "cloudflare")):
            urls.add(m)

print("FILE HITS:")
print("\n".join(file_hits[:80]))
print("\nKEYS:")
print("\n".join(sorted(keys)[:150]))
print("\nURLS:")
print("\n".join(sorted(urls)))

manifest = (ext / "manifest.json").read_text(encoding="utf-8", errors="ignore")
print("\nMANIFEST PERMS SNIPPET:")
for line in manifest.splitlines():
    if any(x in line.lower() for x in ("permission", "storage", "host", "optional")):
        print(line)
