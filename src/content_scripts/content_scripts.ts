import { registerContentEventHandler, sendBackgroundEvent, type LEvent } from "../events";
import { cleanup } from "./cleanup";

async function onBackgroundEvent(event: LEvent, _sender: chrome.runtime.MessageSender, _sendResponse: (response?: any) => void) {
  console.log('onBackgroundEvent', event);
  switch(event.kind) {
    case 'getContent':
      const selector = event.selector || 'body';
      const content = cleanup(selector, event.format);
      const kind = 'onContent';
      const url = `${window.location.origin}${window.location.pathname}`;
      sendBackgroundEvent({ kind, content, url });
      break;
  }
}

registerContentEventHandler(onBackgroundEvent);
