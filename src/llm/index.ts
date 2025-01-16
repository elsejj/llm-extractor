
export type LLMSetting = {
  url: string,
  key: string,
  model: string,
  provider?: string,
}


// export const DEFAULT_EXTRACT_PROMPT: string = `请从下面 <data></data> 中的HTML格式的数据中提取出有效的信息, 信息的格式是符合以下的 'typescript' 中 'Data' 的定义的JSON结构:
// \`\`\`typescript

// type Data = {
//   // 请在这里定义你的数据结构
// }

// \`\`\`

// 数据内容如下:

// `;

export const DEFAULT_EXTRACT_PROMPT = `type Data = {
  // 请在这里定义你的数据结构
}
`



export async function* extractDataByLLM(setting: LLMSetting, prompt: string, data: string): AsyncGenerator<string, void, unknown> {
  const headers: any = {
    'Content-Type': 'application/json',
    'x-portkey-provider': setting.provider || ''
  }
  if (setting.key) {
    headers['Authorization'] = `Bearer ${setting.key}`
  }
  const baseURL = setting.url.endsWith('/') ? setting.url : `${setting.url}/`

  let t1 = Date.now()
  const req = {
    model: setting.model,
    messages: [
      {
        role: 'system',
        content: 'please read the HTML in <data></data>, then extract the data as JSON, the JSON should match the `typescript` `Data` definition from user message, please notice the comment in the type definition if any, it will tell you how to extract data. \n'
           + '<data>' + data + '</data>'
      },
      {
        role: 'user',
        content: '```typescript\n' + `${prompt}` + '\n```'
      }
    ],
    stream: true,
    stream_options: {
      include_usage: true
    },
    response_format: {
      type: "json_object",
    },
  }

  const url = `${baseURL}chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(req)
  })

  if (!res.status || res.status !== 200) {
    throw new Error(`Failed to send data to LLM, status: ${res.status}, message: ${await res.text()}`)
  }

  let usage: any = null
  const reader = res.body?.getReader()
  if (reader) {
    let decoder = new TextDecoder()
    let buffer: Uint8Array = new Uint8Array()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        const lastLF = value.lastIndexOf(0x0A)
        buffer = Uint8Array.from([...buffer, ...value.subarray(0, lastLF + 1)])
        const lines = decoder.decode(buffer, { stream: true }).split('\n')
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i]
          if (!line.startsWith('data:')) {
            continue
          }
          const data = line.substring(5).trim()
          if (data === '[DONE]') {
            break
          }
          try {
            let chunk = JSON.parse(data)
            if (chunk.choices && chunk.choices.length > 0) {
              const s = chunk.choices[0].delta?.content
              if (s) {
                yield s
              }
            }
            if (chunk.usage) {
              usage = chunk.usage
              usage.time_used = ((Date.now() - t1) / 1000).toFixed(2)
            }
          }catch(e) {
            // some data is not JSON, just ignore
            continue
          }
        }
        buffer = value.subarray(lastLF + 1)
      }
    }
  }
  if (usage) {
    const s = `//usage: ${JSON.stringify(usage)}`
    yield s
  }
}


export function extractJSON(llmResponse: string): string {
  const firstCurly = llmResponse.indexOf('{')
  const lastCurly = llmResponse.lastIndexOf('}')
  const firstSquare = llmResponse.indexOf('[')
  const lastSquare = llmResponse.lastIndexOf(']')

  if (firstCurly === -1 && firstSquare === -1) {
    return llmResponse 
  }
  if (firstCurly === -1 && firstSquare !== -1) {
    return llmResponse.substring(firstSquare, lastSquare + 1)
  }
  if (firstCurly !== -1 && firstSquare === -1) {
    return llmResponse.substring(firstCurly, lastCurly + 1)
  }
  if (firstCurly < firstSquare) {
    return llmResponse.substring(firstCurly, lastCurly + 1)
  }else{
    return llmResponse.substring(firstSquare, lastSquare + 1)
  }
}