import type { LLMSetting } from "../llm";


export type UrlPrompt = {
  prompt: string,
  sendTo?: string,
  selector?: string,
  llm?: {
    provider: string,
    model: string,
  }
}

export type AppSetting = {
  llm: LLMSetting
}

export async function make_uuid(sign?: string) : Promise<string> {
  // current timestamp in ms
  let uuid = BigInt(Date.now()).toString(16).padStart(8, '0');

  if (!sign){
    let rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    sign = rand[0].toString(16).padStart(8, '0');
  }else{
    const sha256 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sign));
    sign = Array.from(new Uint8Array(sha256.slice(0, 8))).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return uuid+sign;
}

function expandResult(key: string, data: any): any {
  if (key.startsWith('data://') && typeof data === 'string') {
    return data.split('\n').map(row => {
      try {
        return JSON.parse(row);
      } catch (error) {
        return row;
      }
    });
  }else{
    return data;
  }
}

export async function forEachDBItems(callback: (url: string, data: any, isLast?: boolean, percent?: number ) => Promise<void>) {

  if (!chrome?.storage) {
    console.error('chrome.storage not found');
    return;
  }
  if (chrome.storage.local.getKeys) {
    // use less memory
    const allKeys = await chrome.storage.local.getKeys();
    let i = 0;
    const total = allKeys.length;
    for (const key of allKeys) {
      let data = key === 'llmExtract' ? {} : await chrome.storage.local.get(key);
      data = key === 'llmExtract' ? {} : data[key];
      await callback(key, expandResult(key, data), i === total - 1, i / total);
      i++;
    }
  }else{
    // may use more memory
    const datas = await chrome.storage.local.get(null);
    let i = 0;
    const total = Object.keys(datas).length;
    for (const key in datas) {
      let data = key === 'llmExtract' ? {} : datas[key];
      await callback(key, expandResult(key, data), i === total - 1, i / total);
    }
  }
}


export async function loadUrlPrompt(url: string): Promise<UrlPrompt | undefined> {

  if (chrome?.storage) {
    // chrome extension environment
    const data = await chrome.storage.local.get(url);
    return data[url] as UrlPrompt;
  }else{
    // browser environment
    const data = localStorage.getItem(url);
    if (data) {
      return JSON.parse(data) as UrlPrompt;
    }
    return undefined;
  }
}

export async function loadUrlResult(dataUrl: string): Promise<string | ''> {
  if (chrome?.storage) {
    // chrome extension environment
    const data = await chrome.storage.local.get(dataUrl);
    const rows = data[dataUrl] as string;
    if (!rows) {
      return ''
    }
    return rows;
  }else{
    // browser environment
    const data = localStorage.getItem(dataUrl);
    if (data) {
      return data;
    }
    return '';
  }
}

export async function saveUrlPrompt(url: string, data: UrlPrompt): Promise<void> {
  if (chrome?.storage) {
    // chrome extension environment
    await chrome.storage.local.set({[url]: data});
  }else{
    // browser environment
    const jsonData = JSON.stringify(data);
    localStorage.setItem(url, jsonData);
  }
}

export async function saveUrlResult(dataUrl: string, data: string): Promise<void> {
  const oldDatas = await loadUrlResult(dataUrl);
  const newData = oldDatas + '\n' + data;
  if (chrome?.storage) {
    // chrome extension environment
    await chrome.storage.local.set({[dataUrl]: newData});
  }else{
    // browser environment
    localStorage.setItem(dataUrl, newData);
  }
}

export async function saveAppSetting(data: AppSetting): Promise<void> {
  if (chrome?.storage) {
    // chrome extension environment
    await chrome.storage.sync.set({llmExtract: data});
  }else{
    // browser environment
    const jsonData = JSON.stringify(data);
    localStorage.setItem('llmExtract', jsonData);
  }
}

export async function loadAppSetting(): Promise<AppSetting | undefined> {
  if (chrome?.storage) {
    // chrome extension environment
    const data = await chrome.storage.sync.get('llmExtract');
    return data['llmExtract'] as AppSetting;
  }else{
    // browser environment
    const data = localStorage.getItem('llmExtract');
    if (data) {
      return JSON.parse(data) as AppSetting;
    }
    return undefined;
  }
}


export function safeFileName(url: string): string {
  return encodeURIComponent(url)
}


export async function clearDatas(keys?: string[] | string ): Promise<void> {
  if (chrome?.storage) {
    // chrome extension environment
    if (keys) {
      await chrome.storage.local.remove(keys)
    }else{
      await chrome.storage.local.clear();
    }
  }else{
    // browser environment

  }
}