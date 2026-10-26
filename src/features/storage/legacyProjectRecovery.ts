import type { CompositionItem, LibraryComponent } from '../../types/composition'

type LegacyProjectSnapshot = {
  id: string
  name: string
  items: CompositionItem[]
  formatId: string
  size: 'S' | 'L'
  paletteId: string
  backgroundColor: string
  transparent: boolean
  includeBackground: boolean
  backdropId: 'solid' | 'desk' | 'paper' | 'buildplate'
  updatedAt: number
  recoverySource?: 'legacy-project-html'
  recoveryKey?: string
}

type LegacyObjectSpec = {
  symbol: keyof typeof SYMBOLS
  x: number
  y: number
  size: number
  rotation: number
}

const SYMBOLS = {
  book: '<g stroke="#1a1033" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M6 38 48 24 50 78 8 90Z" fill="#fff"/><path d="M94 38 52 24 50 78 92 90Z" fill="#fff"/><path d="M8 90 50 78 92 90v5L50 84 8 95Z" fill="#2a2147"/><path d="M16 46l26-8M16 56l26-8M58 38l26 8M58 48l26 8" stroke-width="1.5" fill="none"/><path d="M70 70v22l5-4 5 4V74z" fill="#ff8fb1"/></g>',
  phone: '<g stroke="#1a1033" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" transform="skewY(-10)"><rect x="32" y="14" width="36" height="76" rx="8" fill="#2a2147"/><rect x="37" y="20" width="26" height="62" rx="4" fill="#c9b8ff"/><path d="M43 34h14M43 42h9" stroke="#fff"/></g>',
  puzzle: '<path d="M20 36h22a8 8 0 1 1 16 0h22v22a8 8 0 1 0 0 16v12H58a8 8 0 1 1-16 0H20z" fill="#ff8fb1" stroke="#1a1033" stroke-width="3" stroke-linejoin="round" transform="rotate(-8 50 60)"/>',
  lamp: '<g stroke="#1a1033" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M14 84h46v8H14z" fill="#fff"/><path d="M14 84l8-8h46l-8 8z" fill="#ffe27a"/><path d="M38 76V50l24-22" fill="none" stroke-width="5"/><path d="M50 14h32l8 24H44z" fill="#fff"/><path d="M58 28h22l3 10H55z" fill="#ff8fb1"/></g>',
  phones: '<g stroke="#1a1033" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M18 62V50a32 32 0 0 1 64 0v12" fill="none" stroke-width="6"/><rect x="8" y="54" width="22" height="34" rx="10" fill="#fff"/><rect x="70" y="54" width="22" height="34" rx="10" fill="#fff"/><rect x="12" y="62" width="9" height="18" rx="4" fill="#ffe27a"/><rect x="79" y="62" width="9" height="18" rx="4" fill="#ffe27a"/></g>',
  note: '<g stroke="#1a1033" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" transform="skewY(-14)"><rect x="10" y="34" width="80" height="54" rx="5" fill="#ffe27a"/><path d="M10 44h80"/><path d="M22 56h42M22 66h30" stroke-width="2"/></g>',
  coin: '<g stroke="#1a1033" stroke-width="3"><ellipse cx="50" cy="66" rx="34" ry="15" fill="#c99a2e"/><ellipse cx="50" cy="58" rx="34" ry="15" fill="#ffe27a"/><ellipse cx="50" cy="58" rx="21" ry="8" fill="#fff3b8" stroke-width="2"/></g>',
  pen: '<g stroke="#1a1033" stroke-width="3" stroke-linejoin="round" transform="rotate(35 50 50)"><rect x="43" y="4" width="14" height="72" rx="4" fill="#ff8fb1"/><path d="M43 76h14l-7 18z" fill="#fff"/><rect x="43" y="14" width="14" height="9" fill="#2a2147"/></g>',
} as const

const DISPLAY_NAMES: Record<keyof typeof SYMBOLS, string> = {
  book: 'Книга',
  phone: 'Смартфон',
  puzzle: 'Пазл',
  lamp: 'Лампа',
  phones: 'Наушники',
  note: 'Блокнот',
  coin: 'Монета',
  pen: 'Ручка',
}

const ASSET_NAME_HINTS: Record<keyof typeof SYMBOLS, string[]> = {
  book: ['книга'],
  phone: ['смартфон', 'телефон'],
  puzzle: ['пазл'],
  lamp: ['лампа'],
  phones: ['наушники'],
  note: ['блокнот', 'заметки'],
  coin: ['монета'],
  pen: ['ручка', 'карандаш'],
}

const LEGACY_PROJECTS: Array<{
  key: string
  name: string
  color: string
  day: number
  objects: LegacyObjectSpec[]
}> = [
  { key: '1', name: 'Лампа и заметки', color: '#d8ccfa', day: 26, objects: [{ symbol: 'lamp', x: 8, y: 10, size: 66, rotation: -4 }, { symbol: 'note', x: 58, y: 8, size: 34, rotation: 6 }, { symbol: 'pen', x: 64, y: 50, size: 40, rotation: 0 }, { symbol: 'coin', x: 14, y: 62, size: 26, rotation: 0 }] },
  { key: '2', name: 'Урок: основы SVG', color: '#ffe9a8', day: 25, objects: [{ symbol: 'book', x: 30, y: 8, size: 68, rotation: -6 }, { symbol: 'puzzle', x: 62, y: 40, size: 50, rotation: 8 }, { symbol: 'phone', x: 6, y: 40, size: 48, rotation: 0 }] },
  { key: '3', name: 'Без названия', color: '#d8ccfa', day: 26, objects: [] },
  { key: '4', name: 'Обложка подкаста', color: '#ffd0e0', day: 24, objects: [{ symbol: 'phones', x: 34, y: 12, size: 64, rotation: 0 }, { symbol: 'note', x: 6, y: 52, size: 38, rotation: -8 }, { symbol: 'coin', x: 68, y: 56, size: 30, rotation: 0 }] },
  { key: '5', name: 'Открытка к осени', color: '#bfeedd', day: 22, objects: [{ symbol: 'book', x: 8, y: 18, size: 58, rotation: 4 }, { symbol: 'pen', x: 60, y: 12, size: 46, rotation: 0 }, { symbol: 'puzzle', x: 52, y: 52, size: 40, rotation: -6 }] },
  { key: '6', name: 'Карточка курса', color: '#ffe9a8', day: 20, objects: [{ symbol: 'phone', x: 14, y: 12, size: 60, rotation: -4 }, { symbol: 'lamp', x: 46, y: 18, size: 62, rotation: 0 }, { symbol: 'coin', x: 70, y: 60, size: 28, rotation: 0 }] },
  { key: '7', name: 'Афиша встречи', color: '#d8ccfa', day: 18, objects: [{ symbol: 'puzzle', x: 10, y: 16, size: 62, rotation: -10 }, { symbol: 'phones', x: 48, y: 8, size: 58, rotation: 0 }, { symbol: 'book', x: 60, y: 50, size: 44, rotation: 6 }] },
  { key: '8', name: 'Тест палитры', color: '#ffd0e0', day: 15, objects: [{ symbol: 'coin', x: 12, y: 30, size: 42, rotation: 0 }, { symbol: 'note', x: 44, y: 12, size: 50, rotation: -6 }] },
]

function makeRecoveredItem(projectKey: string, spec: LegacyObjectSpec, index: number, assets: LibraryComponent[]): CompositionItem {
  const asset = assets.find((candidate) => candidate.role === 'main'
    && candidate.detailSize === 'L'
    && ASSET_NAME_HINTS[spec.symbol].some((hint) => candidate.name.toLocaleLowerCase('ru').includes(hint)))
  const width = spec.size / 100 * 1200
  const id = asset?.id ?? `recovered-html-${spec.symbol}`
  return {
    ...(asset ?? {
      id,
      name: DISPLAY_NAMES[spec.symbol],
      category: 'Восстановленные проекты',
      width: 100,
      height: 100,
      source: 'Восстановлено из сохранённого списка Pixo',
      imported: true,
      role: 'main' as const,
      familyId: `recovered-html-${spec.symbol}`,
      detailSize: 'L' as const,
      tags: [],
    }),
    name: DISPLAY_NAMES[spec.symbol],
    objectId: `recovered-html-${projectKey}-${index}`,
    assetId: id,
    x: spec.x / 100 * 1200,
    y: spec.y / 100 * 800,
    width,
    height: width,
    rotation: spec.rotation,
    opacity: 1,
    visible: true,
    locked: false,
    markup: SYMBOLS[spec.symbol],
    viewBox: '0 0 100 100',
    sourceFileId: `recovered-project-html:${spec.symbol}`,
    layoutMode: 'manual',
  }
}

export function mergeRecoveredLegacyProjects<T extends LegacyProjectSnapshot>(projects: T[], assets: LibraryComponent[], paletteId: string): T[] {
  const next = [...projects]
  for (const recovered of LEGACY_PROJECTS) {
    const snapshot: LegacyProjectSnapshot = {
      id: `pixo-legacy-project-${recovered.key}`,
      name: recovered.name,
      items: recovered.objects.map((object, index) => makeRecoveredItem(recovered.key, object, index, assets)),
      formatId: 'wide',
      size: 'L',
      paletteId,
      backgroundColor: recovered.color,
      transparent: false,
      includeBackground: true,
      backdropId: 'solid',
      updatedAt: Date.UTC(2026, 9, recovered.day, 12),
      recoverySource: 'legacy-project-html',
      recoveryKey: recovered.key,
    }
    const index = next.findIndex((project) => project.id === snapshot.id
      || project.name.trim().toLocaleLowerCase('ru') === snapshot.name.toLocaleLowerCase('ru'))
    if (index < 0) {
      next.push(snapshot as T)
      continue
    }
    const existing = next[index]
    next[index] = { ...existing, ...snapshot, id: existing.id, name: existing.name } as T
  }
  return next
}
