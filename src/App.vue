
<template>
  <div>
    当前页面: {{ currentURL.url }}
  </div>
  <div class="w-full h-12 flex items-center gap-1 p-2">
    <button 
      type="button" class="bg-blue-500 text-white"
      @click="onExtractData"
    >
      提取数据
    </button>
    <button 
      type="button"
      @click="onPromptAction"
    >
      {{ appMode === AppMode.Edit ? '保存结构定义' : '编辑结构定义' }}
    </button>
    <span class="flex-auto"></span>
    <button 
      type="button"
      @click="exportData"
    >
    导出
    </button>
    <button 
      type="button"
      @click="appMode = AppMode.Setting"
    >
    设置
    </button>
  </div>
  <div v-if="appMode === AppMode.Edit" class="w-full p-2">
    <textarea v-model="urlPrompt.prompt" class="w-full h-96 border-2 p-2" :placeholder="DEFAULT_EXTRACT_PROMPT"></textarea>
    <div class="flex items-center gap-1">
      <label class="w-24">投递目标</label>
      <input v-model="urlPrompt.sendTo" type="text" class="flex-auto border- p-1" placeholder="提取后可发送到的服务地址"/>
    </div>
    <div class="flex items-center gap-1">
      <label class="w-24">标签选择器</label>
      <input v-model="urlPrompt.selector" type="text" class="flex-auto border- p-1" placeholder="页面主要内容的选择器"/>
    </div>
  </div>
  <div v-if="appMode === AppMode.Setting" class="w-full p2 flex flex-col gap-2 p-2">
    <div class="flex items-center gap-1">
      <label class="w-24">大模型地址</label>
      <input v-model="llmSetting.url" type="text" class="flex-auto border-2 p-1" />
    </div>
    <div class="flex items-center gap-1">
      <label class="w-24">大模型密钥</label>
      <input v-model="llmSetting.key" type="text" class="flex-auto border-2 p-1" />
    </div>
    <div class="flex items-center gap-1">
      <label class="w-24">大模型模型名</label>
      <input v-model="llmSetting.model" type="text" class="flex-auto border-2 p-1" />
    </div>
    <div class="flex items-center gap-1">
      <label class="w-24">大模型服务商</label>
      <input v-model="llmSetting.provider" type="text" class="flex-auto border-2 p-1" />
    </div>
    <div class="flex justify-end">
      <button type="button" @click="appMode = AppMode.Extract">保存</button>
    </div>
    <div class="flex items-center gap-1">
      <button type="button" class=" text-red-500 w-full" @click="onClearDatas">清除所有数据</button>
    </div>
  </div>
  <div v-if="appMode !== AppMode.Setting" class="w-full p-2">
    <pre><code>{{ appLog}}</code></pre>
    <div class="flex justify-end items-center gap-2" v-if="contentData.length > 0">
      <div>
        <input type="checkbox" id="viewAsTable" v-model="viewAsTable" @click="onSwitchViewFormat" />
        <label for="viewAsTable">{{ viewAsTable ? 'JSON' : '表格' }}</label>
      </div>
      <button type="button" @click="exportExcel">Excel</button>
      <button type="button" @click="copyResult">复制</button>
    </div>
    <div v-if="viewAsTable" id="jsonTableHolder">
    </div>
    <pre v-else><code>{{ contentData}}</code></pre>
  </div>

</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, toRaw } from 'vue';
import { registerContentEventHandler, unregisterContentEventHandler, sendContentEvent, type LEvent, type LGetContentEvent, activatedTab } from './events';
import { forEachDBItems, loadAppSetting, loadUrlPrompt, make_uuid, clearDatas, saveAppSetting, saveUrlPrompt, saveUrlResult, type UrlPrompt } from './db';
import { DEFAULT_EXTRACT_PROMPT, extractDataByLLM, extractJSON, type LLMSetting } from './llm';
import { json_to_excel, json_to_html } from 'j2ew'


enum AppMode {
  Extract = 1,
  Edit = 2,
  Setting = 4,
}

type CurrentURL = {
  href: string,
  url: string,
  dataUrl: string,
  title: string,
}

const contentData = ref<string>('');
const appLog = ref<string>('');
const urlPrompt = ref<UrlPrompt>({ prompt: ''});
const appMode = ref<AppMode>(AppMode.Extract);
const llmSetting = ref<LLMSetting>({
  url: 'https://api.openai.com/v1',
  key: 'sk_xxxxxx',
  model: 'gpt-4o-mini',
  provider: 'openai',
});
const currentURL = ref<CurrentURL>({href: '', url: '', dataUrl: '', title: ''});
const viewAsTable = ref<boolean>(false);


async function loadSetting() {
  const setting = await loadAppSetting();
  console.log('loadAppSetting', setting);
  if (setting) {
    llmSetting.value = setting.llm;
  }
  const url = await getCurrentUrl();
  const urlChanged = currentURL.value.url !== url.url;
  currentURL.value = url;
  if (urlChanged) {
    urlPrompt.value = await loadUrlPrompt(currentURL.value.url) || { prompt: '' };
    contentData.value = ''
    appLog.value = '';
  }
}

async function saveSetting() {
  await saveUrlPrompt(currentURL.value.url, urlPrompt.value);
  const setting = {
    llm: toRaw(llmSetting.value),
  }
  await saveAppSetting(setting);
}

onMounted(async () => {
  registerContentEventHandler(contentEventHandle)
  await loadSetting();
});

onUnmounted(async () => {
  unregisterContentEventHandler(contentEventHandle)
});


async function onExtractData() {
  if (appMode.value !== AppMode.Extract) {
    await saveSetting();
  }
  const url = await getCurrentUrl();
  if (currentURL.value.url !== url.url) {
    // url changed
    await loadSetting();
  }
  appMode.value = AppMode.Extract;
  const event: LGetContentEvent = {
    kind: 'getContent',
    selector: urlPrompt.value.selector,
    format: 'html',
  }
  try{
    await sendContentEvent(event);
  }catch(e){
    appLog.value = `提取数据失败, 请刷新网页后重试`;
  }
}

function contentEventHandle(event: LEvent, sender: chrome.runtime.MessageSender, _sendResponse: (response: any) => void) {
  console.log('contentEventHandle', event, sender, _sendResponse);
  switch (event.kind) {
    case 'onContent':
      onContentChanged(event.content).then(() => {
        console.log('onContentChanged done');
      }).catch((e) => {
        console.error('onContentChanged error', e);
      });
      break;
    case 'onUrlChange': {
      (async () => {
        if (event.url !== currentURL.value.url && event.url.startsWith('http')) {
          await saveSetting();
          await loadSetting();
        }
      })();
      break;
    }
  }
}

async function onContentChanged(content:string) {
  appLog.value = "开始提取数据, 请稍后...";
  contentData.value = '';
  viewAsTable.value = false;

  let usage: any = {};
  try {
    const settings = toRaw(llmSetting.value);
    const prompt = toRaw(urlPrompt.value.prompt);
    const data = content
    const usageKeyword = '//usage:';
    for await (const chunk of extractDataByLLM(settings, prompt, data)) {

      if (chunk.startsWith(usageKeyword)) {
        try {
          usage = JSON.parse(chunk.slice(usageKeyword.length));
        } catch (e) {
          console.error('parse usage error', e);
        }
      } else {
        if (contentData.value.length === 0) {
          contentData.value = chunk.trim();
        } else {
          contentData.value += chunk;
        }
      }
    }
    contentData.value = extractJSON(contentData.value)
    const bodyObj = {
      uuid: await make_uuid(currentURL.value.href),
      href: currentURL.value.href,
      url: currentURL.value.url,
      data: contentData.value,
      usage,
    }
    try {
      // if data is json, parse it
      const data = JSON.parse(bodyObj.data);
      bodyObj.data = data;
    } catch (e) {
      console.error('parse data error', e);
    }
    const body = JSON.stringify(bodyObj);
    if (urlPrompt.value.sendTo) {
      appLog.value = `提取数据完成, 开始提交...`;
      await fetch(urlPrompt.value.sendTo, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
    }
    await saveUrlResult(currentURL.value.dataUrl, body);
    let usageText = ''
    if (usage.prompt_tokens) {
      usageText = `输入:${usage.prompt_tokens} 输出:${usage.completion_tokens} 耗时:${usage.time_used}`;
    }
    appLog.value = `提取数据完成. ${usageText}`;
  }
  catch (e) {
    appLog.value = `提取数据失败: ${e}`;
  }
}

async function getCurrentUrl() : Promise<CurrentURL> {
  const tab = await activatedTab();
  const url : CurrentURL = {
    href: '',
    url: '',
    dataUrl: '',
    title: '',
  }
  if (!tab || !tab.url) {
    console.error('activated tab is null');
    url.href = window.location.href;
    url.url = `${window.location.origin}${window.location.pathname}`;
  }else{
    const u = new URL(tab.url);
    url.href = tab.url;
    url.url = `${u.origin}${u.pathname}`;
    url.title = tab.title || '';
  }
  // replace schema as 'data'
  url.dataUrl = url.url.replace(/^https?:\/\//, 'data://');
  return url;
}

async function onPromptAction() {
  if (appMode.value === AppMode.Edit) {
    // do save
    await saveSetting();
    appMode.value = AppMode.Extract;
  } else {
    await loadSetting();
    appMode.value = AppMode.Edit;
  }
}

async function exportData() {
  //@ts-ignore
  if (window.showSaveFilePicker) {

    const opts = {
      types: [
        {
          description: "JSON Lines",
          accept: { 
            "text/plain": [".txt", ".jsonl"], 
          },
        },
        {
          description: "JSON File",
          accept: { 
            "application/json": [".json"], 
          },
        }
      ],
      suggestedName: 'llmExtractData.jsonl',
    };
    // @ts-ignore
    const fileHandle = await window.showSaveFilePicker(opts);
    const file = await fileHandle.getFile();
    if (!file) {
      appLog.value = '保存失败';
      return;
    }
    const isJSON = file.name.endsWith('.json');
    const endLine = isJSON ? ',\n' : '\n';
    const lastEndLine = isJSON ? '\n' : '';
    const writable = await fileHandle.createWritable();
    if (isJSON){
      await writable.write("[\n");
    }
    await forEachDBItems(async (key, data, isLast) => {
      const kind = key.startsWith('data://') ? 'data' : 'prompt';
      if (kind === 'prompt') {
        data.kind = kind;
        if (!data.url) {
          data.url = key;
        }
      }else{
        if (Array.isArray(data)) {
          data = {
            kind: "data",
            url: key,
            data: data,
          }
        }else{
          data = {kind: "other"}
        }
      }
      const line = JSON.stringify(data) + (isLast ? lastEndLine : endLine);
      await writable.write(line);
    });
    if (isJSON){
      await writable.write("]");
    }
    await writable.close();
  }
}

function timeoutLog(text: string, timeout: number = 3000) {
  const oldLog = appLog.value;
  appLog.value = text;
  setTimeout(() => {
    appLog.value = oldLog;
  }, timeout);
}

async function copyResult() {
  try {
    if (viewAsTable.value) {
      const html = json_to_html(contentData.value, '');
      const data =  [new ClipboardItem({ 
        'text/plain': new Blob([html], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })];
      await navigator.clipboard.write(data)
    }else{
      await navigator.clipboard.writeText(contentData.value);
    }
    timeoutLog('复制成功!');
  } catch (e) {
    timeoutLog(`复制失败: ${e}`);
  }
}

async function exportExcel() {
  try {
    const opts = {
      types: [
        {
          description: "Excel File",
          accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
          },
        }
      ],
      suggestedName: currentURL.value.title ? `${currentURL.value.title}.xlsx` : 'datas.xlsx',
    };
    // @ts-ignore
    const fileHandle = await window.showSaveFilePicker(opts);

    const writable = await fileHandle.createWritable();
    const data = json_to_excel(contentData.value);

    await writable.write(data);
    await writable.close();
    timeoutLog('导出成功!');
  }catch(e){
    timeoutLog(`导出失败: ${e}`);
  }
}

async function onClearDatas() {
  await clearDatas();
  alert('清除成功');
}

async function onSwitchViewFormat() {
  setTimeout(() => {
    console.log('onSwitchViewFormat', viewAsTable.value);
    if (viewAsTable.value) {
      const jsonTableHolder = document.getElementById('jsonTableHolder');
      if (jsonTableHolder) {
        jsonTableHolder.innerHTML = json_to_html(contentData.value, 'jsonTable');
      }
    }
  }, 200);
}

</script>

<style scoped>
</style>
