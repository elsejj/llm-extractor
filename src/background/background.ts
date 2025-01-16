chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.kind) {
    console.log('background.ts: Received message:', message, sender, sendResponse);
  }
});