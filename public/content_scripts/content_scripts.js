// src/events/index.ts
async function sendBackgroundEvent(event) {
  return await chrome.runtime.sendMessage(event);
}
function registerContentEventHandler(handler) {
  if (!chrome?.runtime) {
    console.warn("not in chrome extension environment");
    return;
  }
  chrome.runtime.onMessage.addListener(handler);
  if (chrome?.tabs?.onUpdated && chrome?.tabs?.onActivated) {
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete") {
        handler({ kind: "onUrlChange", url: tab.url || "" }, { tab }, () => {
        });
      }
    });
    chrome.tabs.onActivated.addListener(({ tabId }) => {
      chrome.tabs.get(tabId, (tab) => {
        handler({ kind: "onUrlChange", url: tab.url || "" }, { tab }, () => {
        });
      });
    });
  }
}

// src/content_scripts/cleanup.ts
function cleanup(parent, format = "text") {
  const elementsToRemove = [
    "script",
    "style",
    "noscript",
    "iframe",
    "svg",
    "img",
    "audio",
    "video",
    "canvas",
    "map",
    "source",
    "dialog",
    "menu",
    "menuitem",
    "track",
    "object",
    "embed",
    "form",
    "input",
    "button",
    "select",
    "textarea",
    "label",
    "option",
    "optgroup",
    "aside",
    "footer",
    "header",
    "nav",
    "head"
  ];
  const attributesToRemove = [
    "style",
    "src",
    "alt",
    "title",
    "role",
    "aria-",
    "tabindex",
    "on",
    "data-",
    "class"
  ];
  if (!parent) {
    parent = "body";
  }
  const parentNodes = document.querySelectorAll(parent);
  if (parentNodes.length === 0) {
    return "";
  }
  const rows = [];
  for (let i = 0;i < parentNodes.length; i++) {
    let parent2 = parentNodes[i];
    if (!parent2) {
      continue;
    }
    parent2 = parent2.cloneNode(true);
    const elementTree = parent2.querySelectorAll("*");
    elementTree.forEach((element) => {
      if (elementsToRemove.includes(element.tagName.toLowerCase())) {
        element.remove();
      }
      Array.from(element.attributes).forEach((attr) => {
        if (attributesToRemove.some((a) => attr.name.startsWith(a))) {
          element.removeAttribute(attr.name);
        }
      });
    });
    if (format === "text" && parent2.textContent) {
      rows.push(parent2.textContent.replace(/[ \t]+/g, " "));
    } else {
      rows.push(parent2.innerHTML.replace(/[ \t]+/g, " "));
    }
  }
  return rows.join(`
`);
}

// src/content_scripts/content_scripts.ts
async function onBackgroundEvent(event, _sender, _sendResponse) {
  console.log("onBackgroundEvent", event);
  switch (event.kind) {
    case "getContent":
      const selector = event.selector || "body";
      const content = cleanup(selector, event.format);
      const kind = "onContent";
      const url = `${window.location.origin}${window.location.pathname}`;
      sendBackgroundEvent({ kind, content, url });
      break;
  }
}
registerContentEventHandler(onBackgroundEvent);
