const statusEl = document.getElementById("status");
const templatesEl = document.getElementById("templates");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const openBtn = document.getElementById("open-editor");

function setStatus(message, isError = false) {
  statusEl.textContent = message || "";
  statusEl.classList.toggle("error", Boolean(isError));
}

async function loadTemplates() {
  const data = await chrome.storage.local.get("templates");
  const templates = Array.isArray(data.templates) ? data.templates : [];
  countEl.textContent = String(templates.length);
  templatesEl.innerHTML = "";

  if (!templates.length) {
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  templates
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach((template) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = template.name;
      name.title = template.name;

      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Delete";
      del.addEventListener("click", async () => {
        if (!confirm(`Delete “${template.name}”?`)) return;
        const next = (await chrome.storage.local.get("templates")).templates || [];
        await chrome.storage.local.set({
          templates: next.filter((item) => item.id !== template.id),
        });
        await loadTemplates();
      });

      li.append(name, del);
      templatesEl.appendChild(li);
    });
}

async function openEditorInGmail() {
  setStatus("");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes("mail.google.com")) {
    setStatus("Open Gmail first, then try again.", true);
    chrome.tabs.create({ url: "https://mail.google.com/" });
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" });
    window.close();
  } catch (_) {
    setStatus("Reload the Gmail tab, then try again.", true);
  }
}

openBtn.addEventListener("click", openEditorInGmail);
loadTemplates();
