(() => {
  if (window.__gmailHelperLoaded) return;
  window.__gmailHelperLoaded = true;

  const STORAGE_KEY = "templates";
  const DRAFT_KEY = "draftHtml";
  const TOOLBAR_BUTTON_CLASS = "gh-helper-toolbar-btn";
  const ROOT_ID = "gh-helper-root";

  let activeTemplateId = null;
  let statusTimer = null;

  const html = String.raw;

  function uid() {
    return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function getTemplates() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  }

  async function setTemplates(templates) {
    await chrome.storage.local.set({ [STORAGE_KEY]: templates });
  }

  async function getDraft() {
    const data = await chrome.storage.local.get(DRAFT_KEY);
    return typeof data[DRAFT_KEY] === "string" ? data[DRAFT_KEY] : "";
  }

  async function setDraft(value) {
    await chrome.storage.local.set({ [DRAFT_KEY]: value });
  }

  function findComposeBodies() {
    return Array.from(
      document.querySelectorAll('div[aria-label="Message Body"][contenteditable="true"], div[g_editable="true"][role="textbox"]')
    );
  }

  function findActiveComposeBody() {
    const bodies = findComposeBodies();
    if (!bodies.length) return null;

    const active = document.activeElement;
    if (active && bodies.includes(active)) return active;

    const dialog = active?.closest?.('div[role="dialog"]');
    if (dialog) {
      const inDialog = bodies.find((body) => dialog.contains(body));
      if (inDialog) return inDialog;
    }

    return bodies[bodies.length - 1];
  }

  function findToolbarForBody(body) {
    const dialog = body.closest('div[role="dialog"]') || body.closest("form") || document;
    const candidates = Array.from(
      dialog.querySelectorAll('div[role="toolbar"], tr, td')
    );

    for (const el of candidates) {
      if (el.querySelector('div[command="Bold"], div[data-tooltip*="Formatting"], div[aria-label*="Formatting"]')) {
        return el;
      }
    }

    const formattingBtn = dialog.querySelector(
      'div[aria-label*="Formatting options"], div[data-tooltip*="Formatting options"], div[command="Bold"]'
    );
    return formattingBtn?.parentElement || null;
  }

  function ensureToolbarButtons() {
    for (const body of findComposeBodies()) {
      const toolbar = findToolbarForBody(body);
      if (!toolbar || toolbar.querySelector(`.${TOOLBAR_BUTTON_CLASS}`)) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.className = `gh-helper-btn ${TOOLBAR_BUTTON_CLASS}`;
      button.title = "Insert HTML with Gmail Helper";
      button.setAttribute("aria-label", "Insert HTML with Gmail Helper");
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h10M4 17h13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M16 10l4 2-4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>HTML</span>
      `;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPanel();
      });

      toolbar.appendChild(button);
    }
  }

  function getRoot() {
    return document.getElementById(ROOT_ID);
  }

  function setStatus(message, isError = false) {
    const el = getRoot()?.querySelector("[data-status]");
    if (!el) return;
    el.textContent = message || "";
    el.style.color = isError ? "#d93025" : "#5f6368";
    clearTimeout(statusTimer);
    if (message) {
      statusTimer = setTimeout(() => {
        if (el.textContent === message) el.textContent = "";
      }, 3500);
    }
  }

  function updatePreview() {
    const root = getRoot();
    if (!root) return;
    const editor = root.querySelector("[data-editor]");
    const preview = root.querySelector("[data-preview]");
    if (!editor || !preview) return;
    preview.srcdoc = editor.value || "<!doctype html><html><body></body></html>";
  }

  function renderTemplates(templates) {
    const list = getRoot()?.querySelector("[data-templates]");
    if (!list) return;

    if (!templates.length) {
      list.innerHTML = `<div class="gh-helper-empty">No saved templates yet. Write some HTML and click <strong>Save template</strong>.</div>`;
      return;
    }

    list.innerHTML = templates
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .map((template) => {
        const updated = template.updatedAt
          ? new Date(template.updatedAt).toLocaleDateString()
          : "Saved";
        const active = template.id === activeTemplateId ? " active" : "";
        return html`
          <div class="gh-helper-template${active}" data-template-id="${escapeHtml(template.id)}">
            <span class="gh-helper-template-name">${escapeHtml(template.name)}</span>
            <span class="gh-helper-template-meta">${escapeHtml(updated)}</span>
            <div class="gh-helper-template-actions">
              <button type="button" data-load-id="${escapeHtml(template.id)}">Load</button>
              <button type="button" data-delete-id="${escapeHtml(template.id)}">Delete</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function refreshTemplates() {
    renderTemplates(await getTemplates());
  }

  async function saveTemplate() {
    const root = getRoot();
    const nameInput = root.querySelector("[data-template-name]");
    const editor = root.querySelector("[data-editor]");
    const name = (nameInput.value || "").trim();
    const content = editor.value || "";

    if (!name) {
      setStatus("Enter a template name first.", true);
      nameInput.focus();
      return;
    }
    if (!content.trim()) {
      setStatus("HTML is empty — nothing to save.", true);
      return;
    }

    const templates = await getTemplates();
    const existing = templates.find((t) => t.id === activeTemplateId || t.name.toLowerCase() === name.toLowerCase());
    const now = Date.now();

    if (existing) {
      existing.name = name;
      existing.html = content;
      existing.updatedAt = now;
      activeTemplateId = existing.id;
    } else {
      const template = { id: uid(), name, html: content, updatedAt: now, createdAt: now };
      templates.push(template);
      activeTemplateId = template.id;
    }

    await setTemplates(templates);
    await refreshTemplates();
    setStatus(`Saved “${name}”.`);
  }

  async function loadTemplate(id) {
    const templates = await getTemplates();
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    const root = getRoot();
    root.querySelector("[data-editor]").value = template.html || "";
    root.querySelector("[data-template-name]").value = template.name || "";
    activeTemplateId = template.id;
    await setDraft(template.html || "");
    updatePreview();
    await refreshTemplates();
    setStatus(`Loaded “${template.name}”.`);
  }

  async function deleteTemplate(id) {
    const templates = await getTemplates();
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    if (!confirm(`Delete template “${template.name}”?`)) return;

    const next = templates.filter((t) => t.id !== id);
    await setTemplates(next);
    if (activeTemplateId === id) activeTemplateId = null;
    await refreshTemplates();
    setStatus(`Deleted “${template.name}”.`);
  }

  function insertHtmlIntoCompose(rawHtml) {
    const body = findActiveComposeBody();
    if (!body) {
      throw new Error("Open a Gmail compose window first.");
    }

    body.focus();

    const selection = window.getSelection();
    let inserted = false;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (body.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = rawHtml;
        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        inserted = true;
      }
    }

    if (!inserted) {
      try {
        inserted = document.execCommand("insertHTML", false, rawHtml);
      } catch (_) {
        inserted = false;
      }
    }

    if (!inserted) {
      body.innerHTML = `${body.innerHTML}${rawHtml}`;
    }

    body.dispatchEvent(new InputEvent("input", { bubbles: true }));
    body.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function insertIntoGmail() {
    const editor = getRoot()?.querySelector("[data-editor]");
    const content = editor?.value || "";
    if (!content.trim()) {
      setStatus("HTML is empty — nothing to insert.", true);
      return;
    }

    try {
      insertHtmlIntoCompose(content);
      await setDraft(content);
      setStatus("Inserted into Gmail compose.");
      closePanel();
    } catch (error) {
      setStatus(error.message || "Could not insert HTML.", true);
    }
  }

  function closePanel() {
    getRoot()?.remove();
  }

  async function openPanel() {
    if (getRoot()) {
      getRoot().querySelector("[data-editor]")?.focus();
      return;
    }

    const draft = await getDraft();
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = html`
      <div class="gh-helper-overlay" data-overlay>
        <div class="gh-helper-modal" role="dialog" aria-modal="true" aria-label="Gmail Helper">
          <div class="gh-helper-header">
            <h1>Gmail Helper</h1>
            <div class="gh-helper-header-actions">
              <button type="button" class="gh-helper-btn-ghost" data-upload>Upload .html</button>
              <button type="button" class="gh-helper-icon-btn" data-close aria-label="Close">×</button>
            </div>
          </div>
          <div class="gh-helper-body">
            <aside class="gh-helper-sidebar">
              <div class="gh-helper-sidebar-header">
                <span>Templates</span>
              </div>
              <div class="gh-helper-templates" data-templates></div>
            </aside>
            <section class="gh-helper-pane">
              <div class="gh-helper-pane-label">HTML</div>
              <textarea class="gh-helper-editor" data-editor spellcheck="false" placeholder="Paste or write your HTML email here…"></textarea>
            </section>
            <section class="gh-helper-pane">
              <div class="gh-helper-pane-label">Preview</div>
              <iframe class="gh-helper-preview" data-preview title="HTML preview" sandbox=""></iframe>
            </section>
          </div>
          <div class="gh-helper-footer">
            <div class="gh-helper-footer-left">
              <input class="gh-helper-input" data-template-name placeholder="Template name" />
              <button type="button" class="gh-helper-btn-secondary" data-save>Save template</button>
              <span class="gh-helper-status" data-status></span>
            </div>
            <div class="gh-helper-footer-right">
              <button type="button" class="gh-helper-btn-ghost" data-clear>Clear</button>
              <button type="button" class="gh-helper-btn-primary" data-insert>Insert into Gmail</button>
            </div>
          </div>
          <input class="gh-helper-file-input" data-file type="file" accept=".html,.htm,text/html" />
        </div>
      </div>
    `;

    document.documentElement.appendChild(root);

    const editor = root.querySelector("[data-editor]");
    editor.value = draft;
    updatePreview();
    await refreshTemplates();

    root.querySelector("[data-close]").addEventListener("click", closePanel);
    root.querySelector("[data-overlay]").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closePanel();
    });
    root.querySelector("[data-save]").addEventListener("click", saveTemplate);
    root.querySelector("[data-insert]").addEventListener("click", insertIntoGmail);
    root.querySelector("[data-clear]").addEventListener("click", async () => {
      editor.value = "";
      root.querySelector("[data-template-name]").value = "";
      activeTemplateId = null;
      await setDraft("");
      updatePreview();
      await refreshTemplates();
    });
    root.querySelector("[data-upload]").addEventListener("click", () => {
      root.querySelector("[data-file]").click();
    });
    root.querySelector("[data-file]").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      editor.value = text;
      const baseName = file.name.replace(/\.(html?|htm)$/i, "");
      root.querySelector("[data-template-name]").value = baseName;
      await setDraft(text);
      updatePreview();
      setStatus(`Loaded ${file.name}`);
      event.target.value = "";
    });

    editor.addEventListener("input", async () => {
      updatePreview();
      await setDraft(editor.value);
    });

    root.querySelector("[data-templates]").addEventListener("click", async (event) => {
      const loadId = event.target.getAttribute("data-load-id");
      const deleteId = event.target.getAttribute("data-delete-id");
      if (loadId) await loadTemplate(loadId);
      if (deleteId) await deleteTemplate(deleteId);
    });

    document.addEventListener(
      "keydown",
      function onKey(event) {
        if (event.key === "Escape" && getRoot()) {
          closePanel();
          document.removeEventListener("keydown", onKey, true);
        }
      },
      true
    );

    editor.focus();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "OPEN_PANEL") {
      openPanel();
      sendResponse({ ok: true });
      return true;
    }
    if (message?.type === "HAS_COMPOSE") {
      sendResponse({ ok: true, compose: findComposeBodies().length > 0 });
      return true;
    }
    return false;
  });

  const observer = new MutationObserver(() => ensureToolbarButtons());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureToolbarButtons();
  setInterval(ensureToolbarButtons, 1500);
})();
