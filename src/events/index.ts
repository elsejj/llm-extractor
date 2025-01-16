

export type LGetContentEvent = {
  kind: 'getContent',
  selector?: string,
  format?: 'text' | 'html',
}

export type LOnContentEvent = {
  kind: 'onContent',
  content: string,
  url: string,
}

export type LOnUrlChangeEvent = {
  kind: 'onUrlChange',
  url: string,
}


export type LEvent = LGetContentEvent | LOnContentEvent | LOnUrlChangeEvent;


export async function activatedTab(): Promise<chrome.tabs.Tab | undefined> {
  if (!chrome?.tabs) {
    return undefined;
  }
  const tabs = await chrome.tabs.query({active: true, currentWindow: true})
  if (tabs.length === 0) {
    console.error('No active tab found');
    return undefined;
  }
  return tabs[0];
}


// send event to current active tab
export async function sendContentEvent(event: LEvent) {

  const tab = await activatedTab();
  if (!tab || !tab.id) {
    console.error('No tab id found');
    return;
  }
  return await chrome.tabs.sendMessage(tab.id, event);
}

// send event from content script to background script
export async function sendBackgroundEvent(event: LEvent) {
  return await chrome.runtime.sendMessage(event);
}

export type LEventHandler = (event: LEvent, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void

export function registerContentEventHandler(handler:LEventHandler) {
  if (!chrome?.runtime) {
    console.warn('not in chrome extension environment');
    return;
  }
  chrome.runtime.onMessage.addListener(handler);

  if (chrome?.tabs?.onUpdated && chrome?.tabs?.onActivated) {
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        handler({kind: 'onUrlChange', url: tab.url || ''}, {tab: tab}, () => {});
      }
    })
    chrome.tabs.onActivated.addListener(({tabId}) => {
      chrome.tabs.get(tabId, (tab) => {
        handler({kind: 'onUrlChange', url: tab.url || ''}, {tab: tab}, () => {});
      });
    })
  }
}

export function unregisterContentEventHandler(handler: LEventHandler) {
  if (!chrome?.runtime) {
    console.warn('not in chrome extension environment');
    return;
  }
  chrome.runtime.onMessage.removeListener(handler);
}

