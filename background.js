chrome.runtime.onInstalled.addListener(() => {
  console.log("Gmail Helper installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
