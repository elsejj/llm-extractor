export function cleanup(parent?: string, format: 'text' | 'html' = 'text') : string {
  const elementsToRemove = [
    'script',
    'style',
    'noscript',
    'iframe',
    'svg',
    'img',
    'audio',
    'video',
    'canvas',
    'map',
    'source',
    'dialog',
    'menu',
    'menuitem',
    'track',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'select',
    'textarea',
    'label',
    'option',
    'optgroup',
    'aside',
    'footer',
    'header',
    'nav',
    'head',
  ]

  const attributesToRemove = [
    'style',
    'src',
    'alt',
    'title',
    'role',
    'aria-',
    'tabindex',
    'on',
    'data-',
    'class'
  ]

  if (!parent) {
    parent = 'body'
  }

  const parentNodes = document.querySelectorAll(parent);

  if (parentNodes.length === 0) {
    return ''
  }

  const rows : string[] = []

  for(let i = 0; i < parentNodes.length; i++) {
    let parent = parentNodes[i]
    if (!parent) {
      continue
    }

    parent = parent.cloneNode(true) as HTMLElement

    const elementTree = parent.querySelectorAll('*')

    elementTree.forEach((element) => {
      if (elementsToRemove.includes(element.tagName.toLowerCase())) {
        element.remove()
      }

      Array.from(element.attributes).forEach((attr) => {
        if (attributesToRemove.some((a) => attr.name.startsWith(a))) {
          element.removeAttribute(attr.name)
        }
      })
    })
    if (format === 'text' && parent.textContent) {
      rows.push(parent.textContent.replace(/[ \t]+/g, ' '))
    }else {
      rows.push(parent.innerHTML.replace(/[ \t]+/g, ' '))
    }
  }

  return rows.join('\n')
}