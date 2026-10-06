# Gmail Helper

A free, local-only Chrome extension for writing HTML emails in Gmail: edit HTML, live-preview it, save reusable templates, and insert into the compose window.

No account. No paywall. Templates stay in your browser (`chrome.storage.local`).

## Features

- **HTML editor** in a Gmail compose toolbar button (`HTML`)
- **Live preview** before you insert
- **Save / load / delete templates**
- **Upload `.html` files** into the editor
- **Insert into Gmail** at the cursor (or into the active compose body)

## Install (unpacked)

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select this folder (`Gmail-Helper`)
5. Open [Gmail](https://mail.google.com/), start a compose, and click **HTML** in the toolbar

Pin the extension from the puzzle-piece menu if you want quick access to the popup.

## Usage

1. Compose a new email (or reply)
2. Click **HTML** in the compose toolbar
3. Paste or write HTML on the left; preview updates on the right
4. Optionally name and **Save template**
5. Click **Insert into Gmail**

The extension popup lists saved templates and can reopen the editor when you are already on a Gmail tab.

## Privacy

- Runs only on `https://mail.google.com/*`
- Stores templates and the current draft locally in Chrome
- Does not send your HTML or templates to any server

## Development

Manifest V3. Main pieces:

- `manifest.json` — extension config
- `content/content.js` — Gmail toolbar button, modal editor, insert logic
- `content/panel.css` — editor UI styles
- `popup/` — extension popup
- `background.js` — service worker

## License

MIT
