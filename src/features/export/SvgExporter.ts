import type { CanvasObject } from '../../types/svg'

export function namespaceSvgIds(markup: string, namespace: string) {
  const document = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml')
  const elements = [document.documentElement, ...Array.from(document.querySelectorAll('*'))]
  const ids = new Map<string, string>()
  for (const element of elements) {
    const id = element.getAttribute('id')
    if (id) ids.set(id, `${namespace}-${id}`)
  }
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === 'id') {
        element.setAttribute(attribute.name, ids.get(attribute.value) ?? attribute.value)
        continue
      }
      const value = attribute.value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (_match, quote: string, id: string) => `url(${quote}#${ids.get(id) ?? id}${quote})`)
      const reference = value.replace(/^#(.+)$/, (_match, id: string) => `#${ids.get(id) ?? id}`)
      const labelled = attribute.name.startsWith('aria-')
        ? reference.split(/\s+/).map((id) => ids.get(id) ?? id).join(' ')
        : reference
      element.setAttribute(attribute.name, labelled)
    }
  }
  document.querySelectorAll('style').forEach((style) => {
    let text = style.textContent ?? ''
    for (const [id, namespacedId] of ids) text = text.replaceAll(`#${id}`, `#${namespacedId}`)
    text = text.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (_match, quote: string, id: string) => `url(${quote}#${ids.get(id) ?? id}${quote})`)
    style.textContent = text
  })
  return document.documentElement.innerHTML
}

export function measureCompositionBounds(objects: CanvasObject[]) {
  const artwork = objects.filter((item) => item.visible && !item.isFrame && !item.isGroup && !item.contentBoundsEmpty && item.width > 0 && item.height > 0)
  if (!artwork.length) return null

  const bounds = artwork.map((item) => {
    const angle = (item.rotation * Math.PI) / 180
    const halfWidth = Math.abs(Math.cos(angle)) * item.width / 2 + Math.abs(Math.sin(angle)) * item.height / 2
    const halfHeight = Math.abs(Math.sin(angle)) * item.width / 2 + Math.abs(Math.cos(angle)) * item.height / 2
    const centerX = item.x + item.width / 2
    const centerY = item.y + item.height / 2
    return { left: centerX - halfWidth, top: centerY - halfHeight, right: centerX + halfWidth, bottom: centerY + halfHeight }
  })

  const left = Math.min(...bounds.map((bound) => bound.left))
  const top = Math.min(...bounds.map((bound) => bound.top))
  const right = Math.max(...bounds.map((bound) => bound.right))
  const bottom = Math.max(...bounds.map((bound) => bound.bottom))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function serializeComposition(objects: CanvasObject[], transparentBackground: boolean, backgroundColor = '#101114', width = 1440, height = 900, viewBoxX = 0, viewBoxY = 0, backdropId: 'solid' | 'desk' | 'paper' | 'buildplate' = 'solid', surfaceColors: string[] = [backgroundColor]) {
  const document = window.document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null)
  const root = document.documentElement
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  root.setAttribute('width', `${width}px`)
  root.setAttribute('height', `${height}px`)
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  root.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`)
  if (!transparentBackground) {
    const makeElement = (name: string, attributes: Record<string, string>) => {
      const element = document.createElementNS(root.namespaceURI, name)
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
      return element
    }
    const background = document.createElementNS(root.namespaceURI, 'rect')
    background.setAttribute('x', String(viewBoxX))
    background.setAttribute('y', String(viewBoxY))
    background.setAttribute('width', '100%')
    background.setAttribute('height', '100%')
    if (backdropId === 'desk' || backdropId === 'paper' || backdropId === 'buildplate') {
      const definitions = document.createElementNS(root.namespaceURI, 'defs')
      const pattern = makeElement('pattern', {
        id: 'pixo-surface-pattern', patternUnits: 'userSpaceOnUse',
        width: backdropId === 'buildplate' ? '30' : backdropId === 'paper' ? '28' : '240',
        height: backdropId === 'buildplate' ? '30' : backdropId === 'paper' ? '28' : '160',
      })
      const patternWidth = backdropId === 'buildplate' ? '30' : backdropId === 'paper' ? '28' : '240'
      const patternHeight = backdropId === 'buildplate' ? '30' : backdropId === 'paper' ? '28' : '160'
      const surfaceDetail = surfaceColors[1] ?? surfaceColors[0] ?? backgroundColor
      const surfaceHighlight = surfaceColors[2] ?? surfaceColors[0] ?? backgroundColor
      pattern.append(makeElement('rect', { width: patternWidth, height: patternHeight, fill: backgroundColor }))
      if (backdropId === 'desk') {
        pattern.append(
          makeElement('path', { d: 'M0 18 C52 12 93 25 145 17 S205 12 240 20 M0 62 C48 55 88 68 142 60 S201 57 240 64 M0 112 C55 105 98 118 153 110 S208 108 240 116 M36 0 C30 38 43 74 37 116 M177 18 C169 57 184 96 176 148', fill: 'none', stroke: surfaceDetail, 'stroke-opacity': '.34', 'stroke-width': '2' }),
          makeElement('path', { d: 'M0 38 C56 32 102 45 159 37 S211 34 240 41 M0 88 C47 82 97 94 145 87 S201 84 240 91', fill: 'none', stroke: surfaceHighlight, 'stroke-opacity': '.6', 'stroke-width': '1.5' }),
        )
      } else if (backdropId === 'paper') {
        pattern.append(
          makeElement('path', { d: 'M0 0 H28 M0 0 V28', fill: 'none', stroke: surfaceDetail, 'stroke-opacity': '.34', 'stroke-width': '1' }),
          makeElement('circle', { cx: '14', cy: '14', r: '1', fill: surfaceHighlight, 'fill-opacity': '.6' }),
        )
      } else {
        pattern.append(
          makeElement('circle', { cx: '15', cy: '15', r: '6', fill: surfaceDetail, 'fill-opacity': '.34' }),
          makeElement('circle', { cx: '13.5', cy: '13.5', r: '4', fill: surfaceHighlight, 'fill-opacity': '.6' }),
          makeElement('circle', { cx: '15', cy: '15', r: '6', fill: 'none', stroke: surfaceDetail, 'stroke-opacity': '.34', 'stroke-width': '1' }),
        )
      }
      definitions.append(pattern)
      root.append(definitions)
      background.setAttribute('fill', 'url(#pixo-surface-pattern)')
    } else {
      background.setAttribute('fill', backgroundColor)
    }
    root.append(background)
  }
  for (const item of objects.filter((object) => object.visible)) {
    const group = document.createElementNS(root.namespaceURI, 'g')
    group.setAttribute('transform', `translate(${item.x} ${item.y}) translate(${item.width / 2} ${item.height / 2}) rotate(${item.rotation}) scale(${item.flipX ? -1 : 1} ${item.flipY ? -1 : 1}) translate(${-item.width / 2} ${-item.height / 2})`)
    group.setAttribute('opacity', String(item.opacity))
    const wrapper = document.createElementNS(root.namespaceURI, 'svg')
    wrapper.setAttribute('width', String(item.width))
    wrapper.setAttribute('height', String(item.height))
    wrapper.setAttribute('viewBox', item.viewBox)
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${namespaceSvgIds(item.markup, item.objectId)}</svg>`, 'image/svg+xml')
    const artwork = Array.from(parsed.documentElement.childNodes).map((child) => document.importNode(child, true))
    const erasures = item.erasures ?? []
    if (erasures.length) {
      const [viewX, viewY, viewWidth, viewHeight] = item.viewBox.trim().split(/[\s,]+/).map(Number)
      const safeViewBox = [viewX, viewY, viewWidth, viewHeight].every(Number.isFinite) && viewWidth > 0 && viewHeight > 0
        ? { x: viewX, y: viewY, width: viewWidth, height: viewHeight }
        : { x: 0, y: 0, width: item.width, height: item.height }
      const maskId = `pixo-eraser-${item.objectId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
      const defs = document.createElementNS(root.namespaceURI, 'defs')
      const mask = document.createElementNS(root.namespaceURI, 'mask')
      mask.setAttribute('id', maskId)
      mask.setAttribute('maskUnits', 'userSpaceOnUse')
      mask.setAttribute('maskContentUnits', 'userSpaceOnUse')
      mask.setAttribute('x', String(safeViewBox.x))
      mask.setAttribute('y', String(safeViewBox.y))
      mask.setAttribute('width', String(safeViewBox.width))
      mask.setAttribute('height', String(safeViewBox.height))
      const maskBackground = document.createElementNS(root.namespaceURI, 'rect')
      maskBackground.setAttribute('x', String(safeViewBox.x))
      maskBackground.setAttribute('y', String(safeViewBox.y))
      maskBackground.setAttribute('width', String(safeViewBox.width))
      maskBackground.setAttribute('height', String(safeViewBox.height))
      maskBackground.setAttribute('fill', 'white')
      mask.append(maskBackground)
      for (const stroke of erasures) {
        const path = document.createElementNS(root.namespaceURI, 'path')
        path.setAttribute('d', stroke.d)
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', 'black')
        path.setAttribute('stroke-width', String(stroke.strokeWidth))
        path.setAttribute('stroke-linecap', 'round')
        path.setAttribute('stroke-linejoin', 'round')
        mask.append(path)
      }
      defs.append(mask)
      const artworkGroup = document.createElementNS(root.namespaceURI, 'g')
      artworkGroup.setAttribute('mask', `url(#${maskId})`)
      artworkGroup.append(...artwork)
      wrapper.append(defs, artworkGroup)
    } else {
      wrapper.append(...artwork)
    }
    group.append(wrapper)
    root.append(group)
  }
  return new XMLSerializer().serializeToString(document)
}
